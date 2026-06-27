import { useEffect, useRef, useState, useCallback } from "react";
import { logger } from "@/lib/logger";

interface AudioData {
  volume: number;
  isSpeaking: boolean;
  warning: string;
}

export function useAudioAnalysis(isListening: boolean, externalStream?: MediaStream | null) {
  const [audioData, setAudioData] = useState<AudioData>({
    volume: 0,
    isSpeaking: false,
    warning: "",
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isCleanupRef = useRef(false);

  const cleanup = useCallback(() => {
    if (isCleanupRef.current) return;
    isCleanupRef.current = true;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (streamRef.current && streamRef.current !== externalStream) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    sourceRef.current = null;
    analyserRef.current = null;
    setAudioData({ volume: 0, isSpeaking: false, warning: "" });
  }, [externalStream]);

  useEffect(() => {
    isCleanupRef.current = false;

    if (isListening) {
      startAnalysis();
    } else {
      cleanup();
    }

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  const startAnalysis = async () => {
    try {
      if (isCleanupRef.current) return;

      if (streamRef.current && streamRef.current !== externalStream) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      let stream: MediaStream;
      if (externalStream && externalStream.getAudioTracks().length > 0) {
        stream = externalStream;
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      if (isCleanupRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      const AudioContextClass = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as new () => AudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      source.connect(analyser);
      analyser.fftSize = 256;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;

      analyzeLoop();
    } catch (error) {
      logger.error("Audio Analysis Error:", error);
      if (!isCleanupRef.current) {
        setAudioData({ volume: 0, isSpeaking: false, warning: "" });
      }
    }
  };

  const analyzeLoop = () => {
    if (isCleanupRef.current || !analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const sum = dataArray.reduce((a, b) => a + b, 0);
    const average = sum / dataArray.length;
    const volume = Math.round(average);

    let warning = "";
    let isSpeaking = false;

    if (volume > 10) {
      isSpeaking = true;
      if (volume < 20) warning = "Too Quiet 🔉";
      else if (volume > 90) warning = "Too Loud 🔊";
      else warning = "Good Tone ✅";
    }

    if (!isCleanupRef.current) {
      setAudioData({ volume, isSpeaking, warning });
      animationFrameRef.current = requestAnimationFrame(analyzeLoop);
    }
  };

  return audioData;
}