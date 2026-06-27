import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";

interface UseSpeechReturn {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string, gender?: "male" | "female") => Promise<void>;
  cancelSpeech: () => void;
  setTranscript: (transcript: string) => void;
  ttsProvider: "azure" | "browser" | "none";
}

export const useSpeech = (): UseSpeechReturn => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [ttsProvider, setTtsProvider] = useState<"azure" | "browser" | "none">("none");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const browserUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isAzureAvailable = (): boolean => {
    return !!import.meta.env.VITE_API_URL;
  };

  const speakWithBrowser = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!("speechSynthesis" in window)) {
        reject(new Error("Browser TTS not supported"));
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.lang.startsWith("en-") || v.lang.startsWith("hi-")
      ) || voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utterance.onerror = (event) => {
        setIsSpeaking(false);
        reject(new Error(event.error));
      };

      browserUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const speakWithAzure = useCallback(async (text: string, gender: "male" | "female" = "female"): Promise<void> => {
    const response = await api.post(
      "/tts/speak",
      { text, gender },
      { responseType: "blob" }
    );

    if (audioRef.current) {
      audioRef.current.pause();
      setIsSpeaking(false);
    }

    setIsSpeaking(true);

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }

    const audioUrl = URL.createObjectURL(response.data);
    audioUrlRef.current = audioUrl;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.preload = "auto";

    audio.onended = () => setIsSpeaking(false);
    audio.onplay = () => setIsSpeaking(true);
    audio.onerror = (e) => {
      logger.error("Audio Playback Error", e);
      setIsSpeaking(false);
    };

    await audio.play();
  }, []);

  useEffect(() => {
    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: new () => unknown;
      webkitSpeechRecognition?: new () => unknown;
    };
    
    const RecognitionClass = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (RecognitionClass) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition: any = new RecognitionClass();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          const result = event.results[0];
          if (result.isFinal) {
            setTranscript(result[0].transcript);
          }
        };

        recognitionRef.current = recognition;
      } catch (e) {
        console.warn("Speech recognition initialization failed:", e);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch { /* ignore */ }
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        logger.error("Mic Start Error:", e);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const speak = useCallback(
    async (text: string, gender: "male" | "female" = "female") => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsSpeaking(false);
      }
      window.speechSynthesis.cancel();

      if (isAzureAvailable()) {
        try {
          setTtsProvider("azure");
          await speakWithAzure(text, gender);
        } catch (azureError) {
          console.warn("Azure TTS failed, falling back to browser:", azureError);
          try {
            setTtsProvider("browser");
            await speakWithBrowser(text);
          } catch (browserError) {
            logger.error("Browser TTS also failed:", browserError);
            setTtsProvider("none");
            throw new Error("Both Azure and browser TTS failed");
          }
        }
      } else {
        setTtsProvider("browser");
        await speakWithBrowser(text);
      }
    },
    [speakWithAzure, speakWithBrowser]
  );

  const cancelSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
    setTranscript,
    ttsProvider,
  };
};