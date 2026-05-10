import express from "express";
import axios from "axios";
import { createHash } from "crypto";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";
import { codeExecutions } from "../lib/metrics";
import { validateBody, CompilerRequestSchema } from "../lib/validation";
import { cacheGet, cacheSet } from "../lib/redis";
import { pistonCircuitBreaker } from "../lib/circuitBreaker";

const router = express.Router();

const MAX_CODE_LENGTH = 50000; // 50KB limit

const LANGUAGE_MAP: Record<string, string> = {
  javascript: "18.15.0",
  typescript: "5.0.3",
  python: "3.10.0",
  java: "15.0.2",
  c: "10.2.0",
  cpp: "10.2.0",
  go: "1.16.2",
  rust: "1.68.2",
};

router.post("/execute", requireAuth, validateBody(CompilerRequestSchema), async (req, res) => {
  const { language, code } = req.body;

  if (!language || !code) {
    return res.status(400).json({ error: "Language and Code are required" });
  }

  if (typeof code !== "string" || code.length > MAX_CODE_LENGTH) {
    return res.status(400).json({ error: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters` });
  }

  const version = LANGUAGE_MAP[language];
  if (!version) {
    return res.status(400).json({ error: "Unsupported language" });
  }

  const circuitState = pistonCircuitBreaker.getState();
  if (circuitState.state === "open") {
    logger.warn({ nextAttempt: circuitState.nextAttempt }, "Piston circuit breaker open");
    return res.status(503).json({
      error: "Code execution service temporarily unavailable",
      retryAfter: Math.ceil((circuitState.nextAttempt - Date.now()) / 1000),
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const cacheKey = createHash("sha256").update(`${language}:${code}`).digest("hex");
    const cached = await cacheGet<Record<string, unknown>>("compiler", cacheKey);
    if (cached) {
      logger.debug({ cacheKey }, "compiler cache hit");
      codeExecutions.inc({ language, status: "cached" });
      clearTimeout(timeoutId);
      res.json(cached);
      return;
    }

    const response = await pistonCircuitBreaker.execute(async () => {
      return axios.post(
        "https://emkc.org/api/v2/piston/execute",
        {
          language: language,
          version: version,
          files: [
            {
              content: code,
            },
          ],
        },
        { 
          timeout: 15000,
          signal: controller.signal,
        },
      );
    });

    clearTimeout(timeoutId);
    await cacheSet("compiler", cacheKey, response.data, 3600);
    codeExecutions.inc({ language, status: "fresh" });
    res.json(response.data);
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : "Unknown error";
    
    if (msg.includes("abort")) {
      return res.status(504).json({ error: "Code execution timed out" });
    }
    
    logger.error({ err: msg }, "compiler request failed");
    
    const circuitState = pistonCircuitBreaker.getState();
    if (circuitState.state === "open") {
      return res.status(503).json({
        error: "Code execution service unavailable",
        retryAfter: Math.ceil((circuitState.nextAttempt - Date.now()) / 1000),
      });
    }
    
    res.status(500).json({
      error: "Failed to execute code",
      details: msg,
    });
  }
});

export default router;