import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Send,
  StopCircle,
  Sparkles,
  Settings2,
  Volume2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import CodeEditor from "@/components/CodeEditor";
import { OutputConsole } from "@/components/OutputConsole";
import { executeCode } from "@/services/compiler";
import { useSpeech } from "@/hooks/useSpeech";
import WebcamAnalysis from "@/components/WebcamAnalysis";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";

interface Message {
  role: "user" | "ai";
  content: string;
}

// 🎭 PERSONA CONFIGURATION
const PERSONA_DETAILS: Record<
  string,
  { name: string; gender: "male" | "female" }
> = {
  strict: { name: "Vikram", gender: "male" },
  friendly: { name: "Neha", gender: "female" },
  system: { name: "Sam", gender: "male" },
};

export default function InterviewPage() {
  const navigate = useNavigate();

  // --- STATES ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ⚙️ CONTROLS STATE
  const [persona, setPersona] = useState("strict");
  const [difficulty, setDifficulty] = useState("medium");

  // 🎥 Phase 6: Video & Emotion State
  const [userEmotion, setUserEmotion] = useState("Neutral");
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  // ✅ Log emotion to satisfy TypeScript unused variable check
  useEffect(() => {
    if (userEmotion) {
      // console.log("Emotion:", userEmotion);
    }
  }, [userEmotion]);

  // 🔒 STRICT LOCKS
  const isProcessing = useRef(false);
  const hasInitialized = useRef(false);

  const {
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
    setTranscript,
  } = useSpeech();

  // 🎧 Phase 7: Audio Intelligence Hook
  const { warning } = useAudioAnalysis(isListening);

  // --- EDITOR STATE ---
  const [code, setCode] = useState<string | undefined>(
    "// Technical Interview Session\n// Problem: Write a function to reverse a string.\n\nfunction solution() {\n  // Write your code here\n  console.log('Hello from InterviewMinds!');\n}\n\nsolution();",
  );
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState<string | null>(null);
  const [execError, setExecError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const getCurrentGender = () => PERSONA_DETAILS[persona]?.gender || "female";

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    const resumeId = localStorage.getItem("resumeId");
    if (!resumeId) {
      toast.error("No resume found");
      navigate("/");
      return;
    }

    if (!hasInitialized.current) {
      hasInitialized.current = true;
      // Start Recording & Interview immediately
      setIsInterviewStarted(true);
      handleAIResponse(
        "Start the technical interview based on my resume.",
        true,
      );
    }
  }, []);

  // --- 2. VOICE SYNC ---
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // --- 3. AUTO-SUBMIT ---
  useEffect(() => {
    if (
      !isListening &&
      transcript.trim().length > 0 &&
      !isLoading &&
      !isProcessing.current
    ) {
      const timer = setTimeout(() => {
        if (!isProcessing.current) {
          handleAIResponse(transcript);
          setTranscript("");
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isListening, transcript, isLoading]);

  // --- 4. AUTO SCROLL ---
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // --- 5. SPACEBAR MIC TOGGLE (UX Improvement) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea or editor
      const tagName = document.activeElement?.tagName.toLowerCase();
      const isEditable =
        document.activeElement?.getAttribute("contenteditable") === "true";
      if (tagName === "input" || tagName === "textarea" || isEditable) return;

      if (e.code === "Space") {
        e.preventDefault(); // Prevent scrolling
        if (!isListening && !isLoading) startListening();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Ignore if typing
      const tagName = document.activeElement?.tagName.toLowerCase();
      const isEditable =
        document.activeElement?.getAttribute("contenteditable") === "true";
      if (tagName === "input" || tagName === "textarea" || isEditable) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (isListening) stopListening();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isListening, isLoading, startListening, stopListening]);

  // --- 6. RUN CODE ---
  const handleRunCode = async () => {
    if (!code) return;
    setIsCompiling(true);
    setOutput(null);
    setExecError(null);

    try {
      const result = await executeCode(language, code);
      if (result.run.code !== 0) {
        setExecError(result.run.output);
      } else {
        setOutput(result.run.output);
      }
      toast.success("Code Executed!");
    } catch (err: any) {
      console.error(err);
      setExecError(err.toString() || "Execution failed");
      toast.error("Execution failed");
    } finally {
      setIsCompiling(false);
    }
  };

  // --- 7. CORE CHAT LOGIC ---
  const handleAIResponse = async (userMessage: string, isInit = false) => {
    const trimmedMsg = userMessage.trim();
    if (!trimmedMsg) return;

    if (isProcessing.current) return;
    isProcessing.current = true;
    setIsLoading(true);

    const resumeId = localStorage.getItem("resumeId");

    if (!isInit) {
      setMessages((prev) => [...prev, { role: "user", content: trimmedMsg }]);
      setInput("");
      setTranscript("");
    }

    try {
      const res = await api.post("/chat", {
        message: trimmedMsg,
        resumeId,
        history: messages.map((m) => ({
          role: m.role === "ai" ? "model" : "user",
          text: m.content,
        })),
        mode: persona,
        difficulty: difficulty,
        // emotion: userEmotion // Future: Send emotion to backend
      });

      const aiReply = res.data.reply;
      setMessages((prev) => [...prev, { role: "ai", content: aiReply }]);
      speak(aiReply, getCurrentGender());
    } catch (error) {
      console.error(error);
      toast.error("Failed to connect to AI.");
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isProcessing.current = false;
      }, 500);
    }
  };

  // --- 8. END INTERVIEW ---
  const endInterview = async () => {
    cancelSpeech();
    setIsInterviewStarted(false); // 🛑 Stop Recording Trigger

    // Add a small delay to ensure recording stops and blob is generated
    setTimeout(async () => {
      const resumeId = localStorage.getItem("resumeId");
      try {
        toast.info("Generating Report...");

        // 📼 Log the recorded blob (Ready for AWS S3 upload in future)
        console.log("📼 Final Video Blob Ready:", recordedBlob);

        const res = await api.post("/interview/end", {
          resumeId,
          history: messages.map((m) => ({
            role: m.role === "ai" ? "model" : "user",
            text: m.content,
          })),
        });
        navigate(`/feedback/${res.data.id}`);
      } catch (e) {
        toast.error("Error ending session");
      }
    }, 1000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] w-full bg-black text-white overflow-hidden">
      {/* --- LEFT PANEL: Chat & Video Controls --- */}
      <div className="w-full lg:w-[40%] h-[45%] lg:h-full flex flex-col border-r border-white/10 bg-slate-950/50 relative order-1">
        {/* Header Section */}
        <div className="p-3 border-b border-white/10 flex flex-col gap-3 bg-slate-900/50 shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-slate-200">
                AI Interviewer
              </span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={endInterview}
              className="h-7 gap-2 text-xs"
            >
              <StopCircle className="w-3 h-3" /> End
            </Button>
          </div>

          {/* 🎛️ CONTROLS */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-md px-2 py-1 hover:border-blue-500/50 transition-colors">
              <Settings2 className="w-3 h-3 text-slate-400" />
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                className="bg-transparent text-xs text-white outline-none w-full cursor-pointer"
                disabled={isLoading || isSpeaking}
              >
                <option value="strict">Vikram (Strict)</option>
                <option value="friendly">Neha (HR)</option>
                <option value="system">Sam (System Design)</option>
              </select>
            </div>

            <div className="w-[100px] flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-md px-2 py-1 hover:border-blue-500/50 transition-colors">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="bg-transparent text-xs text-white outline-none w-full cursor-pointer"
                disabled={isLoading || isSpeaking}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        </div>

        {/* 🎥 NEW: Webcam Analysis Section */}
        <div className="relative p-4 bg-slate-950/30 border-b border-white/10 shrink-0">
          <WebcamAnalysis
            onEmotionUpdate={setUserEmotion}
            isInterviewActive={isInterviewStarted}
            onRecordingComplete={(blob) => setRecordedBlob(blob)}
          />

          {/* 🎤 AUDIO COACH (Phase 7) */}
          {isListening && warning && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
              <div
                className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-md transition-all flex items-center gap-2 border ${
                  warning.includes("Good")
                    ? "bg-green-500/20 text-green-400 border-green-500/50"
                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50 animate-bounce"
                }`}
              >
                {warning.includes("Quiet") ? (
                  <Volume2 className="w-3 h-3" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                {warning}
              </div>
            </div>
          )}

          {/* 🔊 Audio Visualizer (Overlay when speaking) */}
          {isSpeaking && (
            <div className="absolute bottom-6 right-6 z-20 pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-md border border-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
                <Volume2 className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          )}
        </div>

        {/* Chat Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 pb-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-lg text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-900/20"
                      : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input & Mic Controls */}
        <div className="p-4 border-t border-white/10 bg-slate-900 shrink-0">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={isListening ? stopListening : startListening}
              className={`border-slate-700 bg-slate-800 hover:bg-slate-700 ${
                isListening
                  ? "text-red-500 border-red-500 animate-pulse"
                  : "text-slate-400"
              }`}
              title="Hold Spacebar to speak"
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>

            <input
              className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="Type or hold Space to speak..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAIResponse(input)}
              disabled={isLoading}
            />

            <Button
              onClick={() => handleAIResponse(input)}
              disabled={isLoading || !input.trim()}
              size="icon"
              className="bg-blue-600 hover:bg-blue-500"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* --- RIGHT PANEL: Code Editor --- */}
      <div className="w-full lg:w-[60%] h-[55%] lg:h-full flex flex-col bg-[#1e1e1e] order-2">
        <div className="flex-1 overflow-hidden">
          <CodeEditor
            code={code || ""}
            setCode={setCode}
            language={language}
            setLanguage={setLanguage}
          />
        </div>

        <div className="h-[35%] min-h-[200px] border-t border-slate-700">
          <OutputConsole
            output={output}
            error={execError}
            isLoading={isCompiling}
            onRun={handleRunCode}
          />
        </div>
      </div>
    </div>
  );
}
