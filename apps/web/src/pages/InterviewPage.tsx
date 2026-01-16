import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Send,
  StopCircle,
  Loader2,
  Sparkles,
  Volume2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import CodeEditor from "@/components/CodeEditor"; // ✅ Importing the Editor we just built

interface Message {
  role: "user" | "ai";
  content: string;
}

export default function InterviewPage() {
  const navigate = useNavigate();

  // --- STATES ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false); // AI Thinking
  const [isRecording, setIsRecording] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // --- EDITOR STATE ---
  const [code, setCode] = useState<string | undefined>(
    "// Technical Interview Session\n// Problem: Write a function to reverse a string.\n\nfunction solution() {\n  // Write your code here\n}"
  );
  const [language, setLanguage] = useState("javascript");

  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    const resumeId = localStorage.getItem("resumeId");
    if (!resumeId) {
      toast.error("No resume found");
      navigate("/");
      return;
    }
    // Start the session with a greeting
    if (messages.length === 0) {
      handleAIResponse("Start the technical interview based on my resume.", true);
    }
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // --- 2. VOICE SETUP ---
  const speakText = (text: string) => {
    window.speechSynthesis.cancel();
    setIsAiSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((v) => v.name.includes("Google") || v.name.includes("Natural"));
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.onend = () => setIsAiSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      toast.error("Voice not supported in this browser");
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.lang = "en-US";

    recognitionRef.current.onstart = () => setIsRecording(true);
    recognitionRef.current.onend = () => setIsRecording(false);
    
    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript); // Put voice text into input box
    };

    recognitionRef.current.start();
  };

  // --- 3. INTERACTION LOGIC ---
  const handleAIResponse = async (userMessage: string, isInit = false) => {
    if (!userMessage.trim()) return;

    const resumeId = localStorage.getItem("resumeId");
    
    // UI Update (Optimistic)
    if (!isInit) {
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setInput("");
    }
    
    setIsLoading(true);

    try {
      // Send Chat + Current Code Context to AI
      const res = await api.post("/chat", {
        message: userMessage,
        resumeId,
        history: messages.map(m => ({ role: m.role === "ai" ? "model" : "user", text: m.content })),
        // currentCode: code // (Future: Send code to AI so it can review it)
      });

      const aiReply = res.data.reply;
      
      setMessages((prev) => [...prev, { role: "ai", content: aiReply }]);
      speakText(aiReply);

    } catch (error) {
      toast.error("Failed to connect to AI.");
    } finally {
      setIsLoading(false);
    }
  };

  const endInterview = async () => {
    const resumeId = localStorage.getItem("resumeId");
    try {
      toast.info("Generating Report...");
      const res = await api.post("/interview/end", { 
        resumeId, 
        history: messages.map(m => ({ role: m.role === "ai" ? "model" : "user", text: m.content })) 
      });
      navigate(`/feedback/${res.data.id}`);
    } catch (e) {
        toast.error("Error ending session");
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full bg-black text-white overflow-hidden">
      
      {/* ================= LEFT SIDE: AI AVATAR & CHAT (40%) ================= */}
      <div className="w-[40%] flex flex-col border-r border-white/10 bg-slate-950/50 relative">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-slate-200">AI Interviewer</span>
          </div>
          <Button variant="destructive" size="sm" onClick={endInterview} className="h-8 gap-2 text-xs">
            <StopCircle className="w-3 h-3" /> End Session
          </Button>
        </div>

        {/* 🧠 AI Visualizer (Small) */}
        <div className="flex justify-center py-4 bg-slate-950/30">
             <div className={`relative w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                 isAiSpeaking ? "border-blue-500 shadow-lg shadow-blue-500/20 scale-110" : "border-slate-700"
             }`}>
                {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                ) : isAiSpeaking ? (
                    <Volume2 className="w-6 h-6 text-blue-400 animate-pulse" />
                ) : (
                    <div className="w-3 h-3 bg-slate-600 rounded-full" />
                )}
             </div>
        </div>

        {/* 💬 Chat History */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 pb-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] p-3 rounded-lg text-sm leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-900/20" 
                    : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* ⌨️ Input Area */}
        <div className="p-4 border-t border-white/10 bg-slate-900">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={startListening}
              className={`border-slate-700 bg-slate-800 hover:bg-slate-700 ${isRecording ? "text-red-500 border-red-500 animate-pulse" : "text-slate-400"}`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            
            <input
              className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="Type or speak..."
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

      {/* ================= RIGHT SIDE: CODE EDITOR (60%) ================= */}
      <div className="w-[60%] h-full flex flex-col bg-[#1e1e1e]">
        {/* We use the Component we created earlier */}
        <CodeEditor 
          code={code || ""} 
          setCode={setCode} 
          language={language} 
          setLanguage={setLanguage} 
        />
      </div>

    </div>
  );
}