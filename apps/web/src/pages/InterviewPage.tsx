import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  ArrowLeft,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api"; // ✅ Secured API Interceptor
import { Button } from "@/components/ui/button"; // Shadcn Button
import { Card, CardContent } from "@/components/ui/card"; // Shadcn Card
import { Badge } from "@/components/ui/badge"; // Shadcn Badge
import { toast } from "sonner"; // ✅ Sonner Toast

export default function InterviewPage() {
  const navigate = useNavigate();

  // --- STATES ---
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState(
    "Hello! I am ready based on your resume. Tap the Mic to start."
  );
  const [history, setHistory] = useState<{ role: string; text: string }[]>([]);

  const recognitionRef = useRef<any>(null);

  // --- 1. SPEECH RECOGNITION SETUP ---
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        console.log("User said:", text);
        handleAIResponse(text);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech Error:", event.error);
        setIsListening(false);
        toast.error("Could not hear you. Please try again.");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      toast.error("Your browser does not support Voice Recognition.");
    }
  }, []);

  // --- 2. TEXT TO SPEECH (Improved) ---
  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    setIsAiSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    // Select best voice
    const preferredVoice = voices.find(
      (voice) =>
        voice.name.includes("Google US English") ||
        voice.name.includes("Google") ||
        voice.name.includes("Natural")
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsAiSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Load voices early
  useEffect(() => {
    window.speechSynthesis.getVoices();
  }, []);

  // --- 3. CORE INTERVIEW LOGIC (Secured) ---
  const handleAIResponse = async (userText: string) => {
    setIsThinking(true);

    try {
      const resumeId = localStorage.getItem("resumeId");

      if (!resumeId) {
        toast.error("Resume ID missing. Please upload again.");
        navigate("/");
        return;
      }

      // API Call (Interceptor adds Token)
      const res = await api.post("/chat", {
        message: userText,
        resumeId: resumeId,
        history: history,
      });

      const aiReply = res.data.reply;

      setAiResponse(aiReply);
      speak(aiReply);

      // Update History
      setHistory((prev) => [
        ...prev,
        { role: "user", text: userText },
        { role: "model", text: aiReply },
      ]);
    } catch (error) {
      console.error("API Error:", error);
      toast.error("AI connection failed. Trying again...");
    } finally {
      setIsThinking(false);
    }
  };

  // --- 4. END INTERVIEW LOGIC ---
  const handleEndInterview = async () => {
    if (history.length === 0) {
      navigate("/");
      return;
    }

    setIsThinking(true);
    const resumeId = localStorage.getItem("resumeId");

    try {
      toast.info("Generating your Performance Report...");
      const res = await api.post("/interview/end", {
        resumeId,
        history,
      });

      navigate(`/feedback/${res.data.id}`);
    } catch (error) {
      console.error("End Interview Error:", error);
      toast.error("Failed to generate report.");
      navigate("/");
    } finally {
      setIsThinking(false);
    }
  };

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      window.speechSynthesis.cancel();
      recognitionRef.current.start();
      setIsListening(true);
      setTranscript("");
    }
  };

  // --- UI RENDER (Sci-Fi Layout) ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white flex flex-col p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center z-10 mb-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 shadow-lg">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-200 tracking-wide">
              AI Interviewer
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Google L5 SDE Persona
            </p>
          </div>
        </div>

        <Button
          variant="destructive"
          onClick={handleEndInterview}
          disabled={isThinking}
          className="gap-2 shadow-lg shadow-red-500/10 hover:shadow-red-500/20 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
        >
          {isThinking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowLeft className="w-4 h-4" />
          )}
          End Session
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 max-w-2xl mx-auto w-full gap-10">
        {/* 🧠 AI Avatar / Visualizer */}
        <div className="relative group scale-110">
          {/* Outer Glow Ring (Status Dependent) */}
          <div
            className={`absolute inset-0 rounded-full blur-3xl transition-all duration-1000 opacity-40 ${
              isListening
                ? "bg-green-500"
                : isThinking
                ? "bg-purple-500"
                : isAiSpeaking
                ? "bg-blue-500"
                : "bg-transparent"
            }`}
          ></div>

          <div
            className={`relative w-64 h-64 rounded-full border-[6px] flex items-center justify-center bg-slate-950 shadow-2xl transition-all duration-500 ${
              isListening
                ? "border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                : isThinking
                ? "border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.3)]"
                : isAiSpeaking
                ? "border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                : "border-slate-800"
            }`}
          >
            {isThinking ? (
              <Loader2 className="w-24 h-24 text-purple-500 animate-spin" />
            ) : isAiSpeaking ? (
              /* Wave Animation */
              <div className="flex items-center gap-2 h-24">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-3 bg-blue-400 rounded-full animate-wave"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  ></div>
                ))}
              </div>
            ) : (
              <Volume2
                className={`w-24 h-24 transition-colors duration-300 ${
                  isListening ? "text-green-400" : "text-slate-600"
                }`}
              />
            )}
          </div>

          {/* Status Badge */}
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
            <Badge
              variant="outline"
              className={`px-4 py-1.5 text-sm font-medium backdrop-blur-md border-opacity-60 shadow-lg ${
                isListening
                  ? "border-green-500 text-green-300 bg-green-900/40"
                  : isThinking
                  ? "border-purple-500 text-purple-300 bg-purple-900/40"
                  : isAiSpeaking
                  ? "border-blue-500 text-blue-300 bg-blue-900/40"
                  : "border-slate-600 text-slate-400 bg-slate-800/80"
              }`}
            >
              {isListening
                ? "Listening..."
                : isThinking
                ? "Thinking..."
                : isAiSpeaking
                ? "Speaking..."
                : "Idle"}
            </Badge>
          </div>
        </div>

        {/* 💬 Chat Area */}
        <Card className="w-full bg-slate-900/60 border-slate-800/60 backdrop-blur-xl p-8 min-h-[160px] flex flex-col items-center justify-center text-center shadow-2xl rounded-2xl">
          <CardContent className="p-0 space-y-4">
            {transcript && (
              <p className="text-slate-400 italic text-sm animate-in fade-in slide-in-from-bottom-2">
                You: "{transcript}"
              </p>
            )}
            <p className="text-xl md:text-2xl text-slate-100 font-medium leading-relaxed tracking-wide">
              {aiResponse}
            </p>
          </CardContent>
        </Card>

        {/* 🎙️ Controls */}
        <div className="flex flex-col items-center gap-4">
          <Button
            size="icon"
            onClick={toggleMic}
            disabled={isThinking}
            className={`w-24 h-24 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 border-4 border-slate-900 ${
              isListening
                ? "bg-red-500 hover:bg-red-600 shadow-red-500/40 animate-pulse"
                : "bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-blue-500/30"
            }`}
          >
            {isListening ? (
              <MicOff className="w-10 h-10 text-white" />
            ) : (
              <Mic className="w-10 h-10 text-white" />
            )}
          </Button>
          <span className="text-slate-500 text-sm font-semibold uppercase tracking-wider">
            {isListening ? "Tap to Stop" : "Tap to Speak"}
          </span>
        </div>
      </div>
    </div>
  );
}
