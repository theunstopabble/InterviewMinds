import express from "express";
import dotenv from "dotenv";
import sdk from "microsoft-cognitiveservices-speech-sdk";
import { logger } from "../lib/logger";
import { validateBody, TTSRequestSchema } from "../lib/validation";
import { requireAuth } from "../middleware/auth";

dotenv.config();

const router = express.Router();

// Helper to sanitize text for SSML (Avoids XML errors)
const escapeXML = (unsafe: string) => {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
};

interface TTSRequest {
  text: string;
  gender: string;
  language?: string;
}

router.post(
  "/speak",
  requireAuth,
  validateBody(TTSRequestSchema),
  async (req: express.Request, res: express.Response) => {
    try {
      const { text, gender, language = "english" } = req.body as TTSRequest;

      if (!text) return res.status(400).json({ error: "Text is required" });

      const speechConfig = sdk.SpeechConfig.fromSubscription(
        process.env.AZURE_SPEECH_KEY!,
        process.env.AZURE_SPEECH_REGION!,
      );

      // 🧠 LOGIC: Best Neural Voices for India
      let voiceName = "";

      // Azure supports specific "Styles" for some voices (chat, cheerful, etc.)
      // We will try to apply a conversational style via SSML if supported.
      if (language === "hinglish") {
        voiceName =
          gender === "male" ? "hi-IN-MadhurNeural" : "hi-IN-SwaraNeural";
      } else {
        voiceName =
          gender === "male" ? "en-IN-PrabhatNeural" : "en-IN-NeerjaNeural";
      }

      speechConfig.speechSynthesisVoiceName = voiceName;

      // 2. Synthesizer Setup
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, undefined);

      // ✨ MAGIC: Use SSML for Human-Like Prosody
      // Rate="1.0" -> Normal Speed
      // Pitch="default" -> Natural Pitch
      // We wrap the text in SSML to force the Neural engine to treat it as a conversation.

      const safeText = escapeXML(text);

      const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-IN">
        <voice name="${voiceName}">
          <mstts:express-as style="chat">
            <prosody rate="1.05" pitch="default">
              ${safeText}
            </prosody>
          </mstts:express-as>
        </voice>
      </speak>
    `;

      // 3. Generate Audio using SSML (Not plain text)
      const closeAll = (...synths: sdk.SpeechSynthesizer[]) => {
        synths.forEach((s) => {
          try { s.close(); } catch { /* ignore */ }
        });
      };

      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            const audioBuffer = Buffer.from(result.audioData);
            res.set("Content-Type", "audio/mpeg");
            res.send(audioBuffer);
            closeAll(synthesizer);
          } else {
            logger.error({ errorDetails: result.errorDetails }, "Azure SSML error");

            // Fallback: If SSML fails (rare), try plain text
            logger.warn("Falling back to plain text TTS");
            const fallbackSynthesizer = new sdk.SpeechSynthesizer(
              speechConfig,
              undefined,
            );
            fallbackSynthesizer.speakTextAsync(text, (fbResult) => {
              if (fbResult.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                const fbBuffer = Buffer.from(fbResult.audioData);
                res.set("Content-Type", "audio/mpeg");
                res.send(fbBuffer);
              } else {
                logger.error({ errorDetails: fbResult.errorDetails }, "fallback TTS error");
                res.status(500).json({ error: "TTS generation failed" });
              }
              closeAll(synthesizer, fallbackSynthesizer);
            }, (fbErr) => {
              logger.error({ err: fbErr }, "fallback synthesis error");
              closeAll(synthesizer, fallbackSynthesizer);
              res.status(500).json({ error: "TTS Error" });
            });
          }
        },
        (err) => {
          logger.error({ err }, "synthesis error");
          closeAll(synthesizer);
          res.status(500).json({ error: "TTS Error" });
        },
      );
    } catch (error: unknown) {
      logger.error({ err: (error as Error).message }, "TTS server error");
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

export default router;
