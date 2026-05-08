import { useEffect, useRef, useState } from "react";

export function useAudioAnalysis(isListening: boolean, externalStream?: MediaStream | null) {
  const [audioData, setAudioData] = useState({
    volume: 0,
    isSpeaking: false,
    warning: "", // e.g., "Too Quiet", "Speaking too fast"
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isListening) {
      startAnalysis();
    } else {
      stopAnalysis();
    }
    return () => stopAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  const startAnalysis = async () => {
    try {
      // Stop any previously held stream to avoid duplicate mic access
      if (streamRef.current && streamRef.current !== externalStream) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      let stream: MediaStream;
      if (externalStream && externalStream.getAudioTracks().length > 0) {
        stream = externalStream;
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      streamRef.current = stream;

      // Browser Audio Context Setup
      const AudioContext =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      source.connect(analyser);
      analyser.fftSize = 256;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;

      analyzeLoop();
    } catch (error) {
      console.error("Audio Analysis Error:", error);
    }
  };

  const stopAnalysis = () => {
    if (animationFrameRef.current)
      cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    sourceRef.current = null;
    analyserRef.current = null;
    setAudioData({ volume: 0, isSpeaking: false, warning: "" });
  };

  const analyzeLoop = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // 1. Calculate Volume (Average Amplitude)
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const average = sum / dataArray.length;
    const volume = Math.round(average); // 0 to 100 approx

    // 2. Generate Warnings
    let warning = "";
    let isSpeaking = false;

    if (volume > 10) {
      isSpeaking = true;
      if (volume < 20)
        warning = "Too Quiet 🔉"; // HireVue Logic: Confidence check
      else if (volume > 90) warning = "Too Loud 🔊";
      else warning = "Good Tone ✅";
    }

    setAudioData({ volume, isSpeaking, warning });
    animationFrameRef.current = requestAnimationFrame(analyzeLoop);
  };

  return audioData;
}
