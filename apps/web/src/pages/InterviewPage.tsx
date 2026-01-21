import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  Loader2,
  MonitorX,
  Sparkles,
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
import { useProctoring } from "@/hooks/useProctoring";
import ProctoringUI from "@/components/ProctoringUI";

// ✅ IMPORTS FROM NEW FILES
import { PERSONA_DETAILS, BOILERPLATES } from "@/lib/interviewConstants";
import { InterviewSetupModal } from "@/components/interview/InterviewSetupModal";
import { InterviewHeader } from "@/components/interview/InterviewHeader";

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
  const [isSaving, setIsSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  // ⚙️ CONTROLS STATE
  const [persona, setPersona] = useState("strict");
  const [difficulty, setDifficulty] = useState("medium");
  const [languageMode, setLanguageMode] = useState("english");

  // 🎥 Video & Emotion State
  const [userEmotion, setUserEmotion] = useState("Neutral");
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [showSetup, setShowSetup] = useState(true);

  const recordedBlobRef = useRef<Blob | null>(null);
  const isProcessing = useRef(false);
  const hasInitialized = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const { warning } = useAudioAnalysis(isListening);
  const { violationCount, lastViolation } = useProctoring(isInterviewStarted);

  // --- EDITOR STATE ---
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState<string | undefined>(
    BOILERPLATES["javascript"],
  );
  const [output, setOutput] = useState<string | null>(null);
  const [execError, setExecError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  const getCurrentGender = () => PERSONA_DETAILS[persona]?.gender || "female";
  const getCurrentPersonaName = () =>
    PERSONA_DETAILS[persona]?.name || "Interviewer";

  // ✅ HANDLERS & EFFECTS
  useEffect(() => {
    setCode(BOILERPLATES[language] || "// Language not supported");
  }, [language]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1024) return;
    if (!localStorage.getItem("resumeId")) {
      toast.error("No resume found");
      navigate("/");
    }
  }, []);

  const handleStartInterview = () => {
    setShowSetup(false);
    setIsInterviewStarted(true);
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      const initialPrompt =
        languageMode === "hinglish"
          ? "Start the technical interview based on my resume. Speak in Hinglish (Mix of Hindi/English)."
          : "Start the technical interview based on my resume.";
      handleAIResponse(initialPrompt, true);
    }
  };

  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

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

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Spacebar Mic Logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const isInput =
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA" ||
        el?.getAttribute("contenteditable") === "true";
      if (isInput) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!isListening && !isLoading && !showSetup) startListening();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const isInput =
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA" ||
        el?.getAttribute("contenteditable") === "true";
      if (isInput) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (isListening && !showSetup) stopListening();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isListening, isLoading, startListening, stopListening, showSetup]);

  const handleRunCode = async () => {
    if (!code) return;
    setIsCompiling(true);
    setOutput(null);
    setExecError(null);
    try {
      const result = await executeCode(language, code);
      if (result.run.code !== 0) setExecError(result.run.output);
      else setOutput(result.run.output);
      toast.success("Code Executed!");
    } catch (err: any) {
      setExecError(err.toString() || "Execution failed");
      toast.error("Execution failed");
    } finally {
      setIsCompiling(false);
    }
  };

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
        difficulty,
        language: languageMode,
      });
      const aiReply = res.data.reply;
      setMessages((prev) => [...prev, { role: "ai", content: aiReply }]);
      speak(aiReply, getCurrentGender());
    } catch (error) {
      toast.error("Failed to connect to AI.");
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isProcessing.current = false;
      }, 500);
    }
  };

  const endInterview = async () => {
    setIsSaving(true);
    cancelSpeech();
    setIsInterviewStarted(false);
    setTimeout(async () => {
      const resumeId = localStorage.getItem("resumeId");
      try {
        const res = await api.post("/interview/end", {
          resumeId,
          history: messages.map((m) => ({
            role: m.role === "ai" ? "model" : "user",
            text: m.content,
          })),
        });
        const interviewId = res.data.id;
        const blobToUpload = recordedBlobRef.current;
        if (blobToUpload) {
          const videoData = new FormData();
          videoData.append("video", blobToUpload, "interview.webm");
          videoData.append("interviewId", interviewId);
          toast.loading("Uploading Video...");
          await api.post("/interview/upload-video", videoData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          toast.dismiss();
          toast.success("Saved!");
        }
        navigate(`/feedback/${interviewId}`);
      } catch (e) {
        toast.error("Error ending session");
        setIsSaving(false);
      }
    }, 2000);
  };

  if (isMobile) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-center p-6 text-white">
        <MonitorX className="w-10 h-10 text-red-500 mb-4 animate-pulse" />
        <h1 className="text-3xl font-bold mb-2">Desktop Required</h1>
        <p className="text-slate-400">
          Please open InterviewMinds on a Laptop or PC.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] w-full bg-black text-white overflow-hidden relative">
      {/* 🟢 COMPONENTS */}
      <InterviewSetupModal
        open={showSetup}
        onStart={handleStartInterview}
        languageMode={languageMode}
        setLanguageMode={setLanguageMode}
        persona={persona}
        setPersona={setPersona}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
      />

      {isSaving && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center text-white">
          <Loader2 className="w-16 h-16 animate-spin text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold">Finishing Interview...</h2>
        </div>
      )}

      {/* --- LEFT PANEL --- */}
      <div className="w-full lg:w-[40%] h-[45%] lg:h-full flex flex-col border-r border-white/10 bg-slate-950/50 relative order-1">
        <InterviewHeader
          isSaving={isSaving}
          onEndInterview={endInterview}
          showSetup={showSetup}
          personaName={getCurrentPersonaName()}
          difficulty={difficulty}
          languageMode={languageMode}
        />

        {/* Webcam Area */}
        <div className="relative p-4 bg-slate-950/30 border-b border-white/10 shrink-0">
          <WebcamAnalysis
            onEmotionUpdate={setUserEmotion}
            isInterviewActive={isInterviewStarted}
            onRecordingComplete={(blob) => {
              recordedBlobRef.current = blob;
            }}
          />
          <ProctoringUI
            violationCount={violationCount}
            lastViolation={lastViolation}
          />
          {isListening && warning && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
              <div className="px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                <Sparkles className="w-3 h-3" /> {warning}
              </div>
            </div>
          )}
        </div>

        {/* Chat Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 pb-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-lg text-sm leading-relaxed ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none"}`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-white/10 bg-slate-900 shrink-0">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={isListening ? stopListening : startListening}
              disabled={isSaving || showSetup}
              className={`border-slate-700 bg-slate-800 hover:bg-slate-700 ${isListening ? "text-red-500 border-red-500 animate-pulse" : "text-slate-400"}`}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
            <input
              className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Type or hold Space to speak..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAIResponse(input)}
              disabled={isLoading || isSaving || showSetup}
            />
            <Button
              onClick={() => handleAIResponse(input)}
              disabled={isLoading || !input.trim() || isSaving || showSetup}
              size="icon"
              className="bg-blue-600 hover:bg-blue-500"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* --- RIGHT PANEL --- */}
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
