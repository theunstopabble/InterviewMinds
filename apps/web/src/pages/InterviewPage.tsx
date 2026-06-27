import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Send, Loader2, MonitorX, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import CodeEditor from "@/components/CodeEditor";
import { OutputConsole } from "@/components/OutputConsole";
import { executeCode } from "@/services/compiler";
import { codeEvaluationService, codeAnalysisService, llmInterviewerService } from '@/services/enterprise';
import { useSpeech } from "@/hooks/useSpeech";
import WebcamAnalysis from "@/components/WebcamAnalysis";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";
import { useProctoring } from "@/hooks/useProctoring";
import ProctoringUI from "@/components/ProctoringUI";

import { PERSONA_DETAILS, BOILERPLATES } from "@/lib/interviewConstants";
import { InterviewSetupModal } from "@/components/interview/InterviewSetupModal";
import { InterviewHeader } from "@/components/interview/InterviewHeader";
import { logger } from "@/lib/logger";

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

  // Cleanup any pending end-interview timeout on unmount
  useEffect(() => {
    return () => {
      if (endInterviewTimeoutRef.current) {
        clearTimeout(endInterviewTimeoutRef.current);
      }
    };
  }, []);

  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [showSetup, setShowSetup] = useState(true);

  const recordedBlobRef = useRef<Blob | null>(null);
  const isProcessing = useRef(false);
  const hasInitialized = useRef(false);
  const endInterviewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ REFS for Scrolling Logic
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
    setTranscript,
  } = useSpeech();

  const { warning } = useAudioAnalysis(isListening, webcamStreamRef.current);
  const { violationCount, lastViolation } = useProctoring(isInterviewStarted);

  // --- EDITOR STATE ---
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState<string | undefined>(
    BOILERPLATES["javascript"],
  );
  const [output, setOutput] = useState<string | null>(null);
  const [execError, setExecError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [analysisTab, setAnalysisTab] = useState<'console' | 'eval' | 'security' | 'complexity' | 'llm'>('console');
  const [securityResult, setSecurityResult] = useState<any>(null);
  const [complexityResult, setComplexityResult] = useState<any>(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [complexityLoading, setComplexityLoading] = useState(false);
  const [llmFeedback, setLlmFeedback] = useState<any>(null);
  const [llmLoading, setLlmLoading] = useState(false);

  const getCurrentGender = () => PERSONA_DETAILS[persona]?.gender || "female";
  const getCurrentPersonaName = () =>
    PERSONA_DETAILS[persona]?.name || "Interviewer";

  // ✅ SMART SCROLL FUNCTION
  const scrollToNewMessage = () => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(scrollToNewMessage, 100);
      return () => clearTimeout(timer);
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
    if (isMobile) return;
    if (!localStorage.getItem("resumeId")) {
      toast.error("No resume found");
      navigate("/");
    }
  }, [navigate, isMobile]);

  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

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
    } catch {
      toast.error("Failed to connect to AI.");
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isProcessing.current = false;
      }, 500);
    }
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening, transcript, isLoading]);

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
    } catch (err: unknown) {
      setExecError((err as Error).toString() || "Execution failed");
      toast.error("Execution failed");
    } finally {
      setIsCompiling(false);
    }
  };

  const handleEvaluateCode = async () => {
    if (!code) return;
    setEvalLoading(true);
    setEvalResult(null);
    try {
      const result = await codeEvaluationService.evaluateCode({
        code,
        language,
        problemStatement: "Evaluate the candidate's code submission",
        candidateName: "Candidate",
      });
      setEvalResult(result.evaluation);
      toast.success("Code evaluated!");
    } catch {
      toast.error("Evaluation failed");
      setEvalResult(null);
    } finally {
      setEvalLoading(false);
    }
  };

  const endInterview = async () => {
    setIsSaving(true);
    cancelSpeech();
    setIsInterviewStarted(false);

    // Allow recording to finalize before stopping tracks
    await new Promise((resolve) => {
      endInterviewTimeoutRef.current = setTimeout(resolve, 1500);
    });

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
        const uploadToast = toast.loading("Uploading Video...");
        await api.post("/interview/upload-video", videoData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.dismiss(uploadToast);
        toast.success("Saved!");
      }
      navigate(`/feedback/${interviewId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      logger.error("End interview error:", msg);
      toast.error("Error ending session");
      setIsSaving(false);
    }
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

        {/* 2. WEBCAM (Refactored Layout to fix Clipping) */}
        <div className="relative p-2 bg-black/60 border-b border-white/10 shrink-0 z-10 backdrop-blur-sm">
          {/* Main Container for sizing */}
          <div className="relative aspect-video max-h-[180px] mx-auto shadow-2xl">
            {/* Layer 1: Video (Clipped/Rounded) */}
            <div className="rounded-lg overflow-hidden border border-white/10 bg-black w-full h-full relative">
              <WebcamAnalysis
                isInterviewActive={isInterviewStarted}
                onRecordingComplete={(blob) => {
                  recordedBlobRef.current = blob;
                }}
                onStreamReady={(stream) => {
                  webcamStreamRef.current = stream;
                }}
              />
            </div>

            {/* Layer 2: Proctoring UI (Not Clipped, Overlay) */}
            {/* Changed z-index and removed it from overflow-hidden div */}
            <div className="absolute top-2 right-2 pointer-events-none scale-75 origin-top-right z-20">
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
          <div className="sticky top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none" />

          <div className="flex-1 px-4 pb-4">
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div
                  key={i}
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
        <div className="h-[35%] min-h-[200px] border-t border-slate-700 bg-[#1e1e1e] flex flex-col">
          <div className="flex items-center gap-2 px-4 py-1 bg-[#252526] border-b border-slate-700 overflow-x-auto">
            <button onClick={() => setAnalysisTab('console')} className={`px-3 py-1 text-xs rounded whitespace-nowrap ${analysisTab === 'console' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>Console</button>
            <button onClick={() => setAnalysisTab('eval')} className={`px-3 py-1 text-xs rounded whitespace-nowrap ${analysisTab === 'eval' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>AI Evaluation</button>
            <button onClick={() => setAnalysisTab('security')} className={`px-3 py-1 text-xs rounded whitespace-nowrap ${analysisTab === 'security' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>Security</button>
            <button onClick={() => setAnalysisTab('complexity')} className={`px-3 py-1 text-xs rounded whitespace-nowrap ${analysisTab === 'complexity' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>Complexity</button>
            <button onClick={() => setAnalysisTab('llm')} className={`px-3 py-1 text-xs rounded whitespace-nowrap ${analysisTab === 'llm' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>LLM Chat</button>
          </div>

          {analysisTab === 'eval' ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {evalLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="ml-2 text-slate-400 text-sm">Evaluating code...</span>
                </div>
              ) : evalResult ? (
                <>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(evalResult.scores || {}).map(([key, val]: [string, any]) => (
                      <div key={key} className="bg-slate-800 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold" style={{ color: val >= 70 ? '#22c55e' : val >= 40 ? '#eab308' : '#ef4444' }}>{val}/100</div>
                        <div className="text-xs text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-slate-300 bg-slate-800 rounded-lg p-3">{evalResult.summary}</p>
                  <div className="grid grid-cols-2 gap-4">
                    {evalResult.feedback?.strengths?.length > 0 && (
                      <div className="bg-green-950/20 border border-green-900/30 rounded-lg p-3">
                        <h4 className="text-green-400 text-xs font-bold mb-2 uppercase tracking-wide">Strengths</h4>
                        <ul className="space-y-1">
                          {evalResult.feedback.strengths.map((s: string, i: number) => (
                            <li key={i} className="text-xs text-slate-300 flex gap-2"><span className="text-green-500 shrink-0">+</span> {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {evalResult.feedback?.improvements?.length > 0 && (
                      <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-3">
                        <h4 className="text-red-400 text-xs font-bold mb-2 uppercase tracking-wide">Improve</h4>
                        <ul className="space-y-1">
                          {evalResult.feedback.improvements.map((s: string, i: number) => (
                            <li key={i} className="text-xs text-slate-300 flex gap-2"><span className="text-red-500 shrink-0">-</span> {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {evalResult.complexity && (
                    <div className="bg-slate-800 rounded-lg p-3">
                      <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Complexity</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="text-slate-500">Time:</span> <span className="text-blue-400 font-mono">{evalResult.complexity.time}</span></div>
                        <div><span className="text-slate-500">Space:</span> <span className="text-blue-400 font-mono">{evalResult.complexity.space}</span></div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">{evalResult.complexity.explanation}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">Click "Evaluate Code" to analyze your solution</div>
              )}
              <button onClick={handleEvaluateCode} disabled={evalLoading || !code} className="w-full py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-sm font-bold hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 transition">
                {evalLoading ? 'Evaluating...' : '🚀 Evaluate My Code'}
              </button>
            </div>
          ) : analysisTab === 'security' ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {securityLoading ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /><span className="ml-2 text-slate-400 text-sm">Scanning code...</span></div>
              ) : securityResult ? (
                <div className="space-y-2">
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Issues Found: {securityResult.issues?.length || 0}</p>
                    {securityResult.issues?.map((iss: any, i: number) => (
                      <div key={i} className="mt-2 p-2 bg-red-950/20 border border-red-900/30 rounded text-xs text-slate-300">
                        <span className="text-red-400 font-bold">{iss.severity}: </span>{iss.message}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-slate-300 bg-slate-800 rounded-lg p-3">{securityResult.summary}</p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">Scan your code for security issues</div>
              )}
              <button onClick={async () => {
                if (!code) return;
                setSecurityLoading(true);
                try {
                  const r = await codeAnalysisService.securityScan?.(code, language) ?? await codeAnalysisService.analyze?.(code, language);
                  setSecurityResult(r);
                  toast.success('Security scan complete');
                } catch { toast.error('Security scan failed'); }
                setSecurityLoading(false);
              }} disabled={securityLoading || !code} className="w-full py-2 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg text-sm font-bold hover:from-red-500 hover:to-orange-500 disabled:opacity-50 transition">
                {securityLoading ? 'Scanning...' : '🔒 Security Scan'}
              </button>
            </div>
          ) : analysisTab === 'complexity' ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {complexityLoading ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /><span className="ml-2 text-slate-400 text-sm">Analyzing...</span></div>
              ) : complexityResult ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-400">Time</p>
                      <p className="text-lg font-bold text-blue-400 font-mono">{complexityResult.time || complexityResult.timeComplexity || '-'}</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-400">Space</p>
                      <p className="text-lg font-bold text-purple-400 font-mono">{complexityResult.space || complexityResult.spaceComplexity || '-'}</p>
                    </div>
                  </div>
                  {complexityResult.explanation && <p className="text-sm text-slate-300 bg-slate-800 rounded-lg p-3">{complexityResult.explanation}</p>}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">Analyze code complexity</div>
              )}
              <button onClick={async () => {
                if (!code) return;
                setComplexityLoading(true);
                try {
                  const r = await codeAnalysisService.analyze?.(code, language);
                  setComplexityResult(r);
                  toast.success('Complexity analysis complete');
                } catch { toast.error('Analysis failed'); }
                setComplexityLoading(false);
              }} disabled={complexityLoading || !code} className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg text-sm font-bold hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition">
                {complexityLoading ? 'Analyzing...' : '📊 Analyze Complexity'}
              </button>
            </div>
          ) : analysisTab === 'llm' ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {llmLoading ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /><span className="ml-2 text-slate-400 text-sm">Getting AI feedback...</span></div>
              ) : llmFeedback ? (
                <div className="space-y-3">
                  <div className="bg-slate-800 rounded-lg p-3">
                    <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase">LLM Interviewer Feedback</h4>
                    <p className="text-sm text-slate-200">{typeof llmFeedback === 'string' ? llmFeedback : llmFeedback.feedback || llmFeedback.reply || llmFeedback.summary}</p>
                  </div>
                  {llmFeedback.suggestions?.map((s: string, i: number) => (
                    <div key={i} className="bg-blue-950/20 border border-blue-900/30 rounded-lg p-3 text-xs text-slate-300">{s}</div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">Get LLM feedback on your code</div>
              )}
              <div className="flex gap-2">
                <button onClick={async () => {
                  if (!code) return;
                  setLlmLoading(true);
                  try {
                    const r = await llmInterviewerService.explainCode?.('default', code) ?? await llmInterviewerService.getFeedback?.('default');
                    setLlmFeedback(r);
                    toast.success('LLM feedback ready');
                  } catch { toast.error('LLM request failed'); }
                  setLlmLoading(false);
                }} disabled={llmLoading || !code} className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-sm font-bold hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 transition">
                  {llmLoading ? 'Loading...' : '🤖 Explain Code'}
                </button>
                <button onClick={async () => {
                  if (!code) return;
                  setLlmLoading(true);
                  try {
                    const r = await llmInterviewerService.getMetrics?.('default');
                    setLlmFeedback(r);
                    toast.success('Metrics retrieved');
                  } catch { toast.error('Metrics request failed'); }
                  setLlmLoading(false);
                }} disabled={llmLoading || !code} className="flex-1 py-2 bg-slate-700 rounded-lg text-sm font-bold hover:bg-slate-600 disabled:opacity-50 transition">
                  📈 Session Metrics
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <OutputConsole
                output={output}
                error={execError}
                isLoading={isCompiling}
                onRun={handleRunCode}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
