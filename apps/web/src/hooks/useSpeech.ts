import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeech = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Initialize Speech Recognition
  useEffect(() => {
    const { webkitSpeechRecognition, SpeechRecognition } =
      window as unknown as IWindow;
    const Recognition = SpeechRecognition || webkitSpeechRecognition;

    if (Recognition) {
      const recognition = new Recognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const current = event.results[0][0].transcript;
        setTranscript(current);
      };
      recognitionRef.current = recognition;
    }

    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Mic Start Error:", e);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop();
  }, []);

  // ✅ UPDATED: GENDER SUPPORT ADDED
  // Ab ye function 'gender' bhi leta hai (Default: female)
  const speak = useCallback(
    async (text: string, gender: "male" | "female" = "female") => {
      try {
        // Stop any current audio
        if (audioRef.current) {
          audioRef.current.pause();
          setIsSpeaking(false);
        }

        setIsSpeaking(true);

        // 1. Backend API Call (with Text & Gender)
        const response = await api.post(
          "/tts/speak",
          { text, gender }, // <-- Backend ab gender use karega voice select karne ke liye
          { responseType: "blob" }, // Azure Blob Format
        );

        // 2. Blob se Playable URL banao
        const audioUrl = URL.createObjectURL(response.data);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        // Fast Load Settings
        audio.preload = "auto";

        // Event Handlers
        audio.onended = () => setIsSpeaking(false);
        audio.onplay = () => setIsSpeaking(true);
        audio.onerror = (e) => {
          console.error("Audio Playback Error", e);
          setIsSpeaking(false);
        };

        // 3. Play
        await audio.play();
      } catch (error) {
        console.error("TTS Error:", error);
        setIsSpeaking(false);
      }
    },
    [],
  );

  const cancelSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
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
  };
};
