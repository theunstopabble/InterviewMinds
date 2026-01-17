import express from "express";
import axios from "axios";
import { requireAuth } from "../middleware/auth";

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

router.post("/execute", requireAuth, async (req, res) => {
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
    // Piston API ko code bhejo
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
      }
    );

    // Piston ka result wapas bhejo
    res.json(response.data);
  } catch (error: any) {
    console.error("Compiler Error:", error.message);
    res.status(500).json({
      error: "Failed to execute code",
      details: error.message,
    });
  }
});

export default router;
