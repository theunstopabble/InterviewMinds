import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Send,
  Loader2,
  MonitorX,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import CodeEditor from "@/components/CodeEditor";
import { OutputConsole } from "@/components/OutputConsole";
import { executeCode } from "@/services/compiler";
import { useSpeech } from "@/hooks/useSpeech";
import WebcamAnalysis from "@/components/WebcamAnalysis";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";
import { useProctoring } from "@/hooks/useProctoring";
import ProctoringUI from "@/components/ProctoringUI";

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
  // Pehla variable 'value' hai, dusra 'function' hai
  const [userEmotion, setUserEmotion] = useState("Neutral");
  useEffect(() => {
    // console.log(userEmotion);
  }, [userEmotion]);

  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [showSetup, setShowSetup] = useState(true);

  const recordedBlobRef = useRef<Blob | null>(null);
  const isProcessing = useRef(false);
  const hasInitialized = useRef(false);

  // ✅ REFS for Scrolling Logic
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  const {
    isListening,
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

  // ✅ SMART SCROLL FUNCTION
  // Yeh function ensure karta hai ki naya message "Top" se dikhe
  const scrollToNewMessage = () => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start", // 👈 CRITICAL: Aligns top of message to top of view
      });
    }
  };

  useEffect(() => {
    // Thoda delay taaki DOM update ho jaye, phir scroll karo
    if (messages.length > 0) {
      setTimeout(scrollToNewMessage, 100);
    }
  }, [messages, isLoading]);

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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] w-full bg-[#0a0a0a] text-white overflow-hidden relative">
      <InterviewSetupModal
        open={showSetup}
        onStart={handleStartInterview}
        onCancel={() => navigate("/dashboard")}
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

      {/* --- LEFT PANEL (Interaction) --- */}
      <div className="w-full lg:w-[400px] xl:w-[450px] flex flex-col border-r border-white/10 bg-slate-950/50 relative order-1 z-10 shadow-xl">
        {/* 1. HEADER */}
        <div className="shrink-0 bg-slate-950 z-20">
          <InterviewHeader
            isSaving={isSaving}
            onEndInterview={endInterview}
            showSetup={showSetup}
            personaName={getCurrentPersonaName()}
            difficulty={difficulty}
            languageMode={languageMode}
          />
        </div>

        {/* 2. WEBCAM (Compact & Sticky) */}
        <div className="relative p-2 bg-black/60 border-b border-white/10 shrink-0 z-10 backdrop-blur-sm">
          <div className="relative rounded-lg overflow-hidden border border-white/10 shadow-2xl bg-black aspect-video max-h-[180px] mx-auto">
            <WebcamAnalysis
              onEmotionUpdate={setUserEmotion}
              isInterviewActive={isInterviewStarted}
              onRecordingComplete={(blob) => {
                recordedBlobRef.current = blob;
              }}
            />
            {/* Proctoring Overlay */}
            <div className="absolute top-2 right-2 pointer-events-none scale-75 origin-top-right">
              <ProctoringUI
                violationCount={violationCount}
                lastViolation={lastViolation}
              />
            </div>
          </div>

          {isListening && warning && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 w-full px-4 flex justify-center">
              <div className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border bg-yellow-500/20 text-yellow-400 border-yellow-500/50 backdrop-blur-md shadow-lg animate-bounce">
                <Sparkles className="w-3 h-3" /> {warning}
              </div>
            </div>
          )}
        </div>

        {/* 3. CHAT AREA (Scrollable) */}
        <div
          ref={chatContainerRef}
          className="flex-1 min-h-0 bg-slate-950/40 flex flex-col overflow-y-auto scroll-smooth relative"
        >
          {/* Top Shadow Gradient for visual separation */}
          <div className="sticky top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none" />

          <div className="flex-1 px-4 pb-4">
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  // ✅ Ref attached to the last message to anchor scroll
                  ref={i === messages.length - 1 ? lastMessageRef : null}
                  className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div
                    className={`flex flex-col max-w-[90%] ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <span className="text-[10px] text-slate-500 mb-1 px-1 font-medium tracking-wide uppercase">
                      {msg.role === "user" ? "You" : getCurrentPersonaName()}
                    </span>
                    <div
                      className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-md border ${
                        msg.role === "user"
                          ? "bg-blue-600 border-blue-500 text-white rounded-tr-sm"
                          : "bg-slate-800/80 border-slate-700 text-slate-100 rounded-tl-sm backdrop-blur-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div
                  ref={lastMessageRef}
                  className="flex justify-start w-full animate-pulse"
                >
                  <div className="bg-slate-800/50 p-3 rounded-2xl rounded-tl-sm border border-slate-800 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    <span className="text-xs text-slate-500">
                      AI is thinking...
                    </span>
                  </div>
                </div>
              )}
            </div>
            {/* Spacer to ensure last message is never hidden behind input */}
            <div className="h-6 w-full" />
          </div>
        </div>

        {/* 4. INPUT AREA */}
        <div className="p-4 border-t border-white/10 bg-slate-900/95 backdrop-blur-xl shrink-0 z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
          <div className="flex gap-3 items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={isListening ? stopListening : startListening}
              disabled={isSaving || showSetup}
              className={`h-11 w-11 shrink-0 rounded-full transition-all duration-300 border-slate-700 bg-slate-800 hover:bg-slate-700 ${isListening ? "text-red-500 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] bg-red-500/10" : "text-slate-400 hover:text-white"}`}
            >
              {isListening ? (
                <MicOff className="w-5 h-5 animate-pulse" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>

            <div className="flex-1 relative">
              <input
                className="w-full h-11 bg-slate-950 border border-slate-700 rounded-full px-5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-600"
                placeholder="Type or hold Space..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAIResponse(input)}
                disabled={isLoading || isSaving || showSetup}
              />
            </div>

            <Button
              onClick={() => handleAIResponse(input)}
              disabled={isLoading || !input.trim() || isSaving || showSetup}
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* --- RIGHT PANEL (Code) --- */}
      <div className="flex-1 flex flex-col bg-[#1e1e1e] order-2 h-full min-w-0">
        <div className="flex-1 overflow-hidden relative">
          <CodeEditor
            code={code || ""}
            setCode={setCode}
            language={language}
            setLanguage={setLanguage}
          />
        </div>
        <div className="h-[35%] min-h-[200px] border-t border-slate-700 bg-[#1e1e1e]">
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
