import { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import { Loader2, VideoOff, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner"; // ✅ Import Toast for notifications

export default function WebcamAnalysis({
  onEmotionUpdate,
  isInterviewActive, // ✅ New Prop: Controls Recording
  onRecordingComplete, // ✅ New Prop: Returns Video Blob
}: {
  onEmotionUpdate?: (emotion: string) => void;
  isInterviewActive?: boolean;
  onRecordingComplete?: (blob: Blob) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 🎥 Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false); // ✅ Recording State
  const [currentEmotion, setCurrentEmotion] = useState<string>("Neutral");

  // Timer Ref
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Load AI Models
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelLoaded(true);
        console.log("✅ AI Models Loaded");
      } catch (err) {
        console.error("❌ Model Load Error:", err);
      }
    };
    loadModels();
  }, []);

  // 2. Control Recording based on Interview Status
  useEffect(() => {
    if (isInterviewActive && isVideoOn && !isRecording) {
      startRecording();
    } else if (!isInterviewActive && isRecording) {
      stopRecording();
    }
  }, [isInterviewActive, isVideoOn]);

  // 3. Start Video (Camera + Mic)
  const startVideo = async () => {
    try {
      // ✅ Request Audio + Video
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Mute locally to avoid echo, but stream has audio
        videoRef.current.muted = true;
      }
      setIsVideoOn(true);
    } catch (err) {
      console.error("Camera Error:", err);
      toast.error("Camera/Mic access denied");
    }
  };

  // 4. Start Recording Logic
  const startRecording = () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;

    const stream = videoRef.current.srcObject as MediaStream;
    // Use supported mime type
    const mimeType = MediaRecorder.isTypeSupported("video/webm; codecs=vp9")
      ? "video/webm; codecs=vp9"
      : "video/webm";

    const mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      console.log("📼 Recording Finished. Size:", blob.size);
      if (onRecordingComplete) onRecordingComplete(blob);
    };

    mediaRecorder.start();
    setIsRecording(true);
    toast.info("🔴 Recording Started");
  };

  // 5. Stop Recording Logic
  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("Recording Saved Locally");
    }
  };

  // 6. Stop Everything (Robust Stop)
  const stopTracks = () => {
    // Stop recording first
    if (isRecording) stopRecording();

    // Stop Hardware Camera/Mic
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => {
        track.stop(); // Light off
      });
      videoRef.current.srcObject = null;
      setIsVideoOn(false);
    }

    // Stop AI Loop
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // 7. Cleanup on Unmount
  useEffect(() => {
    return () => {
      stopTracks();
    };
  }, []);

  // 8. AI Loop (Face Analysis)
  const handleVideoPlay = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      if (videoRef.current.paused || videoRef.current.ended) return;

      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (detections.length > 0) {
        const expressions = detections[0].expressions;
        const maxEmotion = Object.keys(expressions).reduce((a, b) =>
          // @ts-ignore
          expressions[a] > expressions[b] ? a : b,
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
          {isModelLoaded ? (
            <VideoOff className="w-10 h-10" />
          ) : (
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          )}
          <span className="text-xs">
            {isModelLoaded ? "Camera Off" : "Loading AI Models..."}
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

      {/* Controls */}
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
