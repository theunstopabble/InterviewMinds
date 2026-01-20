import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Send,
  StopCircle,
  Loader2,
  Sparkles,
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
import { useSpeech } from "@/hooks/useSpeech"; // ✅ Import Custom Hook

interface Message {
  role: "user" | "ai";
  content: string;
}

export default function InterviewPage() {
  const navigate = useNavigate();

  // --- STATES ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ✅ USE CUSTOM HOOK (No more manual logic here)
  const {
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    speak,
    cancelSpeech, // <--- YE RAHA
    setTranscript,
  } = useSpeech();

  // --- EDITOR & COMPILER STATE ---
  const [code, setCode] = useState<string | undefined>(
    "// Technical Interview Session\n// Problem: Write a function to reverse a string.\n\nfunction solution() {\n  // Write your code here\n  console.log('Hello from InterviewMinds!');\n}\n\nsolution();",
  );
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState<string | null>(null);
  const [execError, setExecError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    const resumeId = localStorage.getItem("resumeId");
    if (!resumeId) {
      toast.error("No resume found");
      navigate("/");
      return;
    }
    if (messages.length === 0) {
      handleAIResponse(
        "Start the technical interview based on my resume.",
        true,
      );
    }
  }, []);

  // --- 2. VOICE SYNC (Hook -> Input State) ---
  // Jab User bolega, Transcript update hoga -> Hum Input update karenge
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // ✅ NEW: AUTO-SUBMIT LOGIC (Jaise hi Mic off ho, bhej do)
  useEffect(() => {
    // Shart: Mic band ho chuka ho + Transcript mein kuch likha ho + AI abhi load na le raha ho
    if (!isListening && transcript.trim().length > 0 && !isLoading) {
      // Thoda sa delay (1 second) taaki user ko "Stop" feel ho, phir bhejein
      const timer = setTimeout(() => {
        handleAIResponse(transcript);
        setTranscript(""); // Hook ka transcript saaf karo
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [isListening, transcript]);

  // --- 4. RUN CODE LOGIC ---
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

  // --- 5. CHAT LOGIC ---
  const handleAIResponse = async (userMessage: string, isInit = false) => {
    if (!userMessage.trim()) return;

    const resumeId = localStorage.getItem("resumeId");

    if (!isInit) {
      setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
      setInput("");
      setTranscript(""); // ✅ Clear voice transcript after sending
    }

    setIsLoading(true);

    try {
      const res = await api.post("/chat", {
        message: userMessage,
        resumeId,
        history: messages.map((m) => ({
          role: m.role === "ai" ? "model" : "user",
          text: m.content,
        })),
      });

      const aiReply = res.data.reply;
      setMessages((prev) => [...prev, { role: "ai", content: aiReply }]);

      // ✅ SPEAK AI RESPONSE
      speak(aiReply);
    } catch (error) {
      toast.error("Failed to connect to AI.");
    } finally {
      setIsLoading(false);
    }
  };

  const endInterview = async () => {
    // ✅ STEP 1: Sabse pehle AI ko chup karao
    cancelSpeech(); 

    const resumeId = localStorage.getItem("resumeId");
    try {
      toast.info("Generating Report...");
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
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] w-full bg-black text-white overflow-hidden">
      {/* ================= LEFT SIDE: AI AVATAR & CHAT (40%) ================= */}
      <div className="w-full lg:w-[40%] h-[45%] lg:h-full flex flex-col border-r border-white/10 bg-slate-950/50 relative order-1">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-slate-200">AI Interviewer</span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={endInterview}
            className="h-8 gap-2 text-xs"
          >
            <StopCircle className="w-3 h-3" /> End Session
          </Button>
        </div>

        {/* AI Visualizer (Now connected to Hook) */}
        <div className="flex justify-center py-4 bg-slate-950/30">
          <div
            className={`relative w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
              isSpeaking
                ? "border-blue-500 shadow-lg shadow-blue-500/20 scale-110"
                : "border-slate-700"
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            ) : isSpeaking ? (
              <Volume2 className="w-6 h-6 text-blue-400 animate-pulse" />
            ) : (
              <div className="w-3 h-3 bg-slate-600 rounded-full" />
            )}
          </div>
        </div>

        {/* Chat History */}
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

        {/* Input Area */}
        <div className="p-4 border-t border-white/10 bg-slate-900">
          <div className="flex gap-2">
            {/* ✅ MIC BUTTON (Connected to Hook) */}
            <Button
              variant="outline"
              size="icon"
              onClick={isListening ? stopListening : startListening}
              className={`border-slate-700 bg-slate-800 hover:bg-slate-700 ${
                isListening
                  ? "text-red-500 border-red-500 animate-pulse"
                  : "text-slate-400"
              }`}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>

            <input
              className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="Type or speak..."
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Agar user manually type kare, toh hook ka transcript update mat karo
                // (Optional: Depends on logic, but currently safe)
              }}
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

      {/* ================= RIGHT SIDE: CODE EDITOR + CONSOLE (60%) ================= */}
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
