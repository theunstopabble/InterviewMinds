import express from "express";
import axios from "axios";
import { createHash } from "crypto";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";
import { codeExecutions } from "../lib/metrics";
import { validateBody, CompilerRequestSchema } from "../lib/validation";
import { cacheGet, cacheSet } from "../lib/redis";

const router = express.Router();

// Supported Languages & Versions (Piston API map)
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

  // Language check
  const version = LANGUAGE_MAP[language];
  if (!version) {
    return res.status(400).json({ error: "Unsupported language" });
  }

  try {
    // Cache key = SHA256(language + code)
    const cacheKey = createHash("sha256").update(`${language}:${code}`).digest("hex");
    const cached = await cacheGet<Record<string, unknown>>("compiler", cacheKey);
    if (cached) {
      logger.debug({ cacheKey }, "compiler cache hit");
      codeExecutions.inc({ language, status: "cached" });
      res.json(cached);
      return;
    }

    const response = await axios.post(
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
      { timeout: 15000 },
    );

    // Cache result for 1 hour (3600s)
    await cacheSet("compiler", cacheKey, response.data, 3600);
    codeExecutions.inc({ language, status: "fresh" });
    res.json(response.data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.error({ err: msg }, "compiler request failed");
    res.status(500).json({
      error: "Failed to execute code",
      details: msg,
    });
  }
});

export default router;
