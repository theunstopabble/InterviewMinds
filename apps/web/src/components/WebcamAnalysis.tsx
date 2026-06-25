import { useRef, useEffect, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import { Loader2, VideoOff, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function WebcamAnalysis({
  onEmotionUpdate,
  isInterviewActive,
  onRecordingComplete,
  onStreamReady,
}: {
  onEmotionUpdate?: (emotion: string) => void;
  isInterviewActive?: boolean;
  onRecordingComplete?: (blob: Blob) => void;
  onStreamReady?: (stream: MediaStream) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 🎥 Stream & Recorder Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string>("Neutral");
  const [modelError, setModelError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  // 1. Load AI Models & Auto-Start Camera
  const loadModels = useCallback(async (isRetry = false) => {
    const MODEL_URL = "/models";
    
    if (isRetry) {
      retryCountRef.current += 1;
      if (retryCountRef.current > MAX_RETRIES) {
        setModelError("Failed to load AI models after multiple attempts");
        toast.error("AI models unavailable. Please refresh the page.");
        return;
      }
      toast.warning(`Retrying model load (${retryCountRef.current}/${MAX_RETRIES})...`);
    }

    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      setIsModelLoaded(true);
      setModelError(null);
      console.log("✅ AI Models Loaded");
      startVideo();
    } catch (err) {
      console.error("❌ Model Load Error:", err);
      setModelError("Failed to load AI models");
      toast.error("Failed to load AI Models. Retrying...");
      setTimeout(() => loadModels(true), 2000);
    }
  }, []);

  useEffect(() => {
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startVideo = async () => {
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch {
        // Fallback: video-only if audio is already in use or blocked
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsVideoOn(true);
        onStreamReady?.(stream);
      }
    } catch (err) {
      console.error("Camera Error:", err);
      toast.error("Could not access camera");
    }
  };

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setIsVideoOn(false);
      if (videoRef.current) videoRef.current.srcObject = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    try {
      const recorder = new MediaRecorder(streamRef.current, {
        mimeType: "video/webm",
      });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        if (onRecordingComplete) onRecordingComplete(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Recording Error:", err);
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 2. Control Recording & Camera based on Interview Status
  useEffect(() => {
    if (isInterviewActive) {
      if (isVideoOn && !isRecording) {
        startRecording();
      }
    } else {
      // 🛑 Interview Ends -> Stop Recording -> Stop Camera
      if (isRecording) {
        stopRecording();
        // Thoda delay taaki last chunk save ho jaye, fir camera band karo
        setTimeout(() => stopTracks(), 500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInterviewActive, isVideoOn, isRecording]);

  // 7. Cleanup on Unmount
  useEffect(() => {
    return () => {
      stopTracks();
    };
  }, []);

  const handleVideoPlay = () => {
    if (!isModelLoaded || !videoRef.current) return;

    intervalRef.current = setInterval(async () => {
      if (
        !videoRef.current ||
        videoRef.current.paused ||
        videoRef.current.ended
      )
        return;

      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      // Canvas is reserved for future overlay drawing; alignment handled via CSS

      if (detections.length > 0) {
        const expressions = detections[0].expressions;
        const exps = expressions as unknown as Record<string, number>;
        const maxEmotion = Object.keys(expressions).reduce((a: string, b: string) =>
          exps[a] > exps[b] ? a : b,
        );

        setCurrentEmotion(maxEmotion);
        if (onEmotionUpdate) onEmotionUpdate(maxEmotion);
      }
    }, 1000);
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-800 group">
      {/* Video Feed (Mirrored) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onPlay={handleVideoPlay}
        className={`w-full h-full object-cover transform scale-x-[-1] ${
          isVideoOn ? "opacity-100" : "opacity-0"
        }`}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full transform scale-x-[-1]"
      />

      {/* ✅ Recording Indicator */}
      {isRecording && (
        <div className="absolute top-3 right-3 flex items-center gap-2 bg-red-500/20 border border-red-500/50 px-2 py-1 rounded-full animate-pulse z-20">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[10px] font-mono text-red-200 uppercase tracking-wider">
            REC
          </span>
        </div>
      )}

      {/* Fallback UI */}
      {!isVideoOn && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2">
          {modelError ? (
            <>
              <VideoOff className="w-10 h-10 text-red-500" />
              <span className="text-xs text-red-400">{modelError}</span>
              <Button
                size="sm"
                onClick={() => { setModelError(null); retryCountRef.current = 0; loadModels(); }}
                className="mt-2"
              >
                Retry
              </Button>
            </>
          ) : isModelLoaded ? (
            <VideoOff className="w-10 h-10" />
          ) : (
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          )}
          <span className="text-xs">
            {modelError ? "Error" : isModelLoaded ? "Starting Camera..." : "Loading AI Models..."}
          </span>
        </div>
      )}

      {/* Emotion Badge */}
      {isVideoOn && (
        <div className="absolute top-2 left-2 z-10">
          <Badge
            className={`
              gap-1 shadow-lg backdrop-blur-md
              ${
                currentEmotion === "happy"
                  ? "bg-green-500/80"
                  : currentEmotion === "sad" || currentEmotion === "fearful"
                    ? "bg-red-500/80"
                    : "bg-blue-500/80"
              }
            `}
          >
            <BrainCircuit className="w-3 h-3" />
            {currentEmotion.charAt(0).toUpperCase() + currentEmotion.slice(1)}
          </Badge>
        </div>
      )}

      {/* Manual Controls (Visible on hover) */}
      <div className="absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant={isVideoOn ? "destructive" : "default"}
          onClick={isVideoOn ? stopTracks : startVideo}
          disabled={!isModelLoaded}
          className="h-7 text-xs gap-1"
        >
          {isVideoOn ? "Stop Cam" : "Start Cam"}
        </Button>
      </div>
    </div>
  );
}
