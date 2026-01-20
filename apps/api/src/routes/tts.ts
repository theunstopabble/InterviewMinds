import express from "express";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { requireAuth } from "../middleware/auth";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

router.post("/speak", requireAuth, async (req: any, res: any) => {
  try {
    // ✅ Updated: Ab hum text ke saath 'gender' bhi receive karenge
    const { text, gender } = req.body;

    if (!text) return res.status(400).json({ error: "Text is required" });

    // 1. Azure Config
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY!,
      process.env.AZURE_SPEECH_REGION!,
    );

    // 🧠 LOGIC: Dynamic Voice Selection
    // Agar Vikram/Sam hai (male) -> Prabhat
    // Agar Neha hai (female) -> Neerja
    const voiceName =
      gender === "male" ? "en-IN-PrabhatNeural" : "en-IN-NeerjaNeural";

    speechConfig.speechSynthesisVoiceName = voiceName;

    // 2. Synthesizer Setup
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, undefined);

    // 3. Generate Audio
    synthesizer.speakTextAsync(
      text,
      (result) => {
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          const audioBuffer = Buffer.from(result.audioData);

          // Audio bhej do (Blob format)
          res.set("Content-Type", "audio/mpeg");
          res.send(audioBuffer);

          synthesizer.close();
        } else {
          console.error("❌ Azure Error:", result.errorDetails);
          res.status(500).json({ error: "TTS Failed" });
          synthesizer.close();
        }
      },
      (err) => {
        console.error("❌ Synthesis Error:", err);
        synthesizer.close();
        res.status(500).json({ error: "TTS Error" });
      },
    );
  } catch (error: any) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
