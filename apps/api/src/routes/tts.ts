import express from "express";
import sdk from "microsoft-cognitiveservices-speech-sdk";
import { logger } from "../lib/logger";
import { validateBody, TTSRequestSchema } from "../lib/validation";
import { requireAuth } from "../middleware/auth";
import { azureSpeechCircuitBreaker } from "../lib/circuitBreaker";

const router = express.Router();

const escapeXML = (unsafe: string) => {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
};

interface TTSRequest {
  text: string;
  gender: string;
  language?: string;
}

function getAzureSpeechConfig() {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  
  if (!key || !region) {
    throw new Error("Azure Speech configuration missing");
  }
  
  return sdk.SpeechConfig.fromSubscription(key, region);
}

router.post(
  "/speak",
  requireAuth,
  validateBody(TTSRequestSchema),
  async (req: express.Request, res: express.Response) => {
    const circuitState = azureSpeechCircuitBreaker.getState();
    
    if (circuitState.state === "open") {
      logger.warn({ nextAttempt: circuitState.nextAttempt }, "Azure TTS circuit breaker open");
      return res.status(503).json({
        error: "TTS service temporarily unavailable",
        retryAfter: Math.ceil((circuitState.nextAttempt - Date.now()) / 1000),
      });
    }

    try {
      const { text, gender, language = "english" } = req.body as TTSRequest;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      if (text.length > 10000) {
        return res.status(400).json({ error: "Text exceeds maximum length of 10000 characters" });
      }

      const speechConfig = getAzureSpeechConfig();

      let voiceName = "";
      if (language === "hinglish") {
        voiceName = gender === "male" ? "hi-IN-MadhurNeural" : "hi-IN-SwaraNeural";
      } else {
        voiceName = gender === "male" ? "en-IN-PrabhatNeural" : "en-IN-NeerjaNeural";
      }

      speechConfig.speechSynthesisVoiceName = voiceName;

      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, undefined);
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
      </speak>`;

      const closeAll = (...synths: sdk.SpeechSynthesizer[]) => {
        synths.forEach((s) => {
          try { s.close(); } catch { /* ignore */ }
        });
      };

      const result = await azureSpeechCircuitBreaker.execute(() => {
        return new Promise<sdk.SpeechSynthesisResult>((resolve, reject) => {
          synthesizer.speakSsmlAsync(
            ssml,
            (result) => resolve(result),
            (err) => reject(err),
          );
        });
      });

      if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
        const audioBuffer = Buffer.from(result.audioData);
        res.set("Content-Type", "audio/mpeg");
        closeAll(synthesizer);
        return res.send(audioBuffer);
      }

      throw new Error(result.errorDetails || "SSML synthesis failed");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error({ err: errorMessage }, "TTS synthesis failed");

      const circuitState = azureSpeechCircuitBreaker.getState();
      if (circuitState.state === "open") {
        return res.status(503).json({
          error: "TTS service unavailable",
          retryAfter: Math.ceil((circuitState.nextAttempt - Date.now()) / 1000),
        });
      }

      return res.status(500).json({ 
        error: "TTS generation failed",
        details: errorMessage,
      });
    }
  },
);

export default router;