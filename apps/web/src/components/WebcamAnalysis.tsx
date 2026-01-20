import { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import { Loader2, Video, VideoOff, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function WebcamAnalysis({
  onEmotionUpdate,
}: {
  onEmotionUpdate?: (emotion: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string>("Neutral");

  // ✅ FIX: Interval Ref to clear timer properly on unmount
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Load AI Models
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models"; // Public folder path
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

  // 2. Start Video
  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsVideoOn(true);
      })
      .catch((err) => console.error("Camera Error:", err));
  };

  // 3. Stop Video (Robust Function)
  const stopTracks = () => {
    // 🛑 Stop Hardware Camera
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => {
        track.stop(); // Light off
      });
      videoRef.current.srcObject = null;
      setIsVideoOn(false);
    }

    // 🛑 Stop AI Loop
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // ✅ 4. CLEANUP: Jab Component Unmount ho (Page Change/End Interview)
  useEffect(() => {
    return () => {
      stopTracks(); // Cleanup function
    };
  }, []);

  // 5. AI Loop (Detect Emotions)
  const handleVideoPlay = () => {
    // Clear existing interval if any to prevent duplicates
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;

      // Stop if video is paused or ended
      if (videoRef.current.paused || videoRef.current.ended) return;

      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (detections.length > 0) {
        // Get dominant emotion
        const expressions = detections[0].expressions;
        const maxEmotion = Object.keys(expressions).reduce((a, b) =>
          // @ts-ignore
          expressions[a] > expressions[b] ? a : b,
        );

        setCurrentEmotion(maxEmotion);
        if (onEmotionUpdate) onEmotionUpdate(maxEmotion);
      }
    }, 1000); // Check every 1 second
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-800 group">
      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        muted
        onPlay={handleVideoPlay}
        className={`w-full h-full object-cover ${
          isVideoOn ? "opacity-100" : "opacity-0"
        }`}
      />
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />

      {/* Fallback / Loading UI */}
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

      {/* Emotion Badge (Top Left) */}
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

      {/* Controls (Bottom Right) */}
      <div className="absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant={isVideoOn ? "destructive" : "default"}
          onClick={isVideoOn ? stopTracks : startVideo} // ✅ Uses robust stop function
          disabled={!isModelLoaded}
          className="h-7 text-xs gap-1"
        >
          {isVideoOn ? "Stop Cam" : "Start Cam"}
        </Button>
      </div>
    </div>
  );
}
