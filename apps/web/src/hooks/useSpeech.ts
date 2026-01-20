import { useState, useEffect, useRef, useCallback } from "react";

// Types for Speech Recognition (Browser Native)
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const useSpeech = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");

  // Ref to store recognition instance
  const recognitionRef = useRef<any>(null);

  // 1. Initialize Speech Recognition
  useEffect(() => {
    const { webkitSpeechRecognition, SpeechRecognition } =
      window as unknown as IWindow;
    const Recognition = SpeechRecognition || webkitSpeechRecognition;

    if (Recognition) {
      const recognition = new Recognition();
      // ⚠️ CHANGE: 'continuous' ko FALSE kar diya taaki silence par ruk jaye
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptSegment = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptSegment + " ";
          } else {
            // Interim results (jo abhi type ho raha hai)
            // Hum ise seedha state mein bhej rahe hain taaki typing dikhe
          }
        }
        // Hum interim ko bhi transcript mein daal rahe hain taaki live dikhe
        const current = event.results[0][0].transcript;
        setTranscript(current);
      };

      recognitionRef.current = recognition;
    }
    // ✅ CLEANUP: Jab component hatega, toh aawaz band honi chahiye
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);
  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      setTranscript("");
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Mic error", e);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // ✅ NEW: Explicit Cancel Function
  const cancelSpeech = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1; // Normal speed
    utterance.pitch = 1;

    // AI ki aawaz thodi better select karein (Google US English)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.name.includes("Google US English") || v.name.includes("Male"),
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
    setTranscript, // Manual clear karne ke liye
  };
};
