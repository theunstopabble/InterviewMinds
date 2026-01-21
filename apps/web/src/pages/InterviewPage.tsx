import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Send,
  StopCircle,
  Sparkles,
  Settings2,
  Volume2,
  Loader2,
  MonitorX,
  Languages,
  User,
  Zap,
  Brain,
  Smile,
  ShieldAlert,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";

interface Message {
  role: "user" | "ai";
  content: string;
}

// 🎭 PERSONA CONFIGURATION
const PERSONA_DETAILS: Record<
  string,
  { name: string; gender: "male" | "female"; description: string }
> = {
  strict: {
    name: "Vikram",
    gender: "male",
    description: "Senior Staff Engineer. Direct, strict, & technical.",
  },
  friendly: {
    name: "Neha",
    gender: "female",
    description: "Engineering Manager. Supportive & encouraging.",
  },
  system: {
    name: "Sam",
    gender: "male",
    description: "System Architect. Focuses on scalability & design.",
  },
};

export default function InterviewPage() {
  const navigate = useNavigate();

  // --- STATES ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  // ⚙️ CONTROLS STATE (Configured in Modal)
  const [persona, setPersona] = useState("strict");
  const [difficulty, setDifficulty] = useState("medium");
  const [languageMode, setLanguageMode] = useState("english");

  // 🎥 Phase 6: Video & Emotion State
  const [userEmotion, setUserEmotion] = useState("Neutral");
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [showSetup, setShowSetup] = useState(true);

  const recordedBlobRef = useRef<Blob | null>(null);
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

  const { warning } = useAudioAnalysis(isListening);
  const { violationCount, lastViolation } = useProctoring(isInterviewStarted);

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
  const getCurrentPersonaName = () =>
    PERSONA_DETAILS[persona]?.name || "Interviewer";

  // Debug Emotion
  useEffect(() => {
    if (userEmotion && userEmotion !== "Neutral") {
      console.log("Emotion:", userEmotion);
    }
  }, [userEmotion]);

  // --- 0. MOBILE CHECK ---
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    if (window.innerWidth < 1024) return;
    const resumeId = localStorage.getItem("resumeId");
    if (!resumeId) {
      toast.error("No resume found");
      navigate("/");
      return;
    }
  }, []);

  const handleStartInterview = () => {
    setShowSetup(false);
    setIsInterviewStarted(true);

    if (!hasInitialized.current) {
      hasInitialized.current = true;
      const initialPrompt =
        languageMode === "hinglish"
          ? "Start the technical interview based on my resume. Please speak in Hinglish (Mix of Hindi and English) to make it comfortable."
          : "Start the technical interview based on my resume.";

      handleAIResponse(initialPrompt, true);
    }
  };

  // --- 2. VOICE SYNC ---
  useEffect(() => {
    if (transcript) setInput(transcript);
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
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- 5. SPACEBAR MIC ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tagName = document.activeElement?.tagName.toLowerCase();
      const isEditable =
        document.activeElement?.getAttribute("contenteditable") === "true";
      if (tagName === "input" || tagName === "textarea" || isEditable) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!isListening && !isLoading && !showSetup) startListening();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const tagName = document.activeElement?.tagName.toLowerCase();
      const isEditable =
        document.activeElement?.getAttribute("contenteditable") === "true";
      if (tagName === "input" || tagName === "textarea" || isEditable) return;
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
      console.error(err);
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
        difficulty: difficulty,
        language: languageMode,
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
        console.error(e);
        toast.error("Error ending session");
        setIsSaving(false);
      }
    }, 2000);
  };

  if (isMobile) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-center p-6 text-white">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse border border-red-500/20">
          <MonitorX className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Desktop Required</h1>
        <p className="text-slate-400 max-w-md text-lg">
          Please open <strong>InterviewMinds</strong> on a Laptop or PC.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] w-full bg-black text-white overflow-hidden relative">
      {/* 🟢 SETUP MODAL (Expanded with Persona & Difficulty) */}
      <Dialog open={showSetup} onOpenChange={() => {}}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-2xl shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Settings2 className="w-6 h-6 text-blue-500" />
              Interview Setup
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure your interviewer, difficulty, and language.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 1. Language Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Languages className="w-4 h-4 text-blue-400" /> Preferred
                Language
              </Label>
              <RadioGroup
                value={languageMode}
                onValueChange={setLanguageMode}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem
                    value="english"
                    id="english"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="english"
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-700 bg-slate-800/50 p-4 hover:bg-slate-700/80 hover:text-white peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-500/10 peer-data-[state=checked]:text-blue-400 cursor-pointer transition-all"
                  >
                    <span className="text-2xl mb-2">🇺🇸</span>
                    <span className="font-semibold">English</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="hinglish"
                    id="hinglish"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="hinglish"
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-700 bg-slate-800/50 p-4 hover:bg-slate-700/80 hover:text-white peer-data-[state=checked]:border-purple-500 peer-data-[state=checked]:bg-purple-500/10 peer-data-[state=checked]:text-purple-400 cursor-pointer transition-all"
                  >
                    <span className="text-2xl mb-2">🇮🇳</span>
                    <span className="font-semibold">Hinglish</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* 2. Persona Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                  <User className="w-4 h-4 text-green-400" /> Select Interviewer
                </Label>
                <RadioGroup
                  value={persona}
                  onValueChange={setPersona}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="strict"
                      id="strict"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="strict"
                      className="flex flex-1 items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3 hover:bg-slate-700 cursor-pointer peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:text-green-400"
                    >
                      <div className="flex items-center gap-3">
                        <ShieldAlert className="w-5 h-5 opacity-70" />
                        <div>
                          <div className="font-semibold">Vikram (Strict)</div>
                          <div className="text-xs text-slate-400">
                            Senior Staff Engineer
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="friendly"
                      id="friendly"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="friendly"
                      className="flex flex-1 items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3 hover:bg-slate-700 cursor-pointer peer-data-[state=checked]:border-pink-500 peer-data-[state=checked]:text-pink-400"
                    >
                      <div className="flex items-center gap-3">
                        <Smile className="w-5 h-5 opacity-70" />
                        <div>
                          <div className="font-semibold">Neha (Friendly)</div>
                          <div className="text-xs text-slate-400">
                            Engineering Manager
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="system"
                      id="system"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="system"
                      className="flex flex-1 items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3 hover:bg-slate-700 cursor-pointer peer-data-[state=checked]:border-yellow-500 peer-data-[state=checked]:text-yellow-400"
                    >
                      <div className="flex items-center gap-3">
                        <Brain className="w-5 h-5 opacity-70" />
                        <div>
                          <div className="font-semibold">Sam (System)</div>
                          <div className="text-xs text-slate-400">
                            System Architect
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* 3. Difficulty Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" /> Select Difficulty
                </Label>
                <RadioGroup
                  value={difficulty}
                  onValueChange={setDifficulty}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="easy"
                      id="easy"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="easy"
                      className="w-full text-center rounded-lg border border-slate-700 bg-slate-800/50 p-3 hover:bg-slate-700 cursor-pointer peer-data-[state=checked]:border-blue-400 peer-data-[state=checked]:text-blue-400 font-medium"
                    >
                      Easy
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="medium"
                      id="medium"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="medium"
                      className="w-full text-center rounded-lg border border-slate-700 bg-slate-800/50 p-3 hover:bg-slate-700 cursor-pointer peer-data-[state=checked]:border-yellow-400 peer-data-[state=checked]:text-yellow-400 font-medium"
                    >
                      Medium
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="hard"
                      id="hard"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="hard"
                      className="w-full text-center rounded-lg border border-slate-700 bg-slate-800/50 p-3 hover:bg-slate-700 cursor-pointer peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:text-red-500 font-medium"
                    >
                      Hard
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-between gap-2 border-t border-white/10 pt-4">
            <Button
              onClick={() => navigate("/dashboard")}
              variant="ghost"
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartInterview}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg w-full sm:w-auto"
            >
              Start Interview <Sparkles className="w-4 h-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🟢 SAVING OVERLAY */}
      {isSaving && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center text-white">
          <Loader2 className="w-16 h-16 animate-spin text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold">Finishing Interview...</h2>
          <p className="text-slate-400 mt-2">
            Uploading video & generating AI feedback.
          </p>
        </div>
      )}

      {/* --- LEFT PANEL --- */}
      <div className="w-full lg:w-[40%] h-[45%] lg:h-full flex flex-col border-r border-white/10 bg-slate-950/50 relative order-1">
        {/* 🔥 HEADER CLEANUP: Dropdowns removed, Static Info Added */}
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
              disabled={isSaving || showSetup}
              className="h-7 gap-2 text-xs"
            >
              {isSaving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <StopCircle className="w-3 h-3" />
              )}{" "}
              End
            </Button>
          </div>

          {/* Static Info Badge (Cleaner Look) */}
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/50 p-2 rounded-md border border-white/5">
            <User className="w-3 h-3" />
            <span className="font-medium text-slate-200">
              {getCurrentPersonaName()}
            </span>
            <span className="text-slate-600">|</span>
            <Zap className="w-3 h-3" />
            <span className="capitalize">{difficulty}</span>
            <span className="text-slate-600">|</span>
            <Languages className="w-3 h-3" />
            <span className="capitalize">{languageMode}</span>
          </div>
        </div>

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
              <div
                className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border ${warning.includes("Good") ? "bg-green-500/20 text-green-400 border-green-500/50" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50 animate-bounce"}`}
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
          {isSpeaking && (
            <div className="absolute bottom-6 right-6 z-20 pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-slate-900/80 border border-blue-500 flex items-center justify-center shadow-lg animate-pulse">
                <Volume2 className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          )}
        </div>

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
