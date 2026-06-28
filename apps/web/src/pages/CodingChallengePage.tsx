import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Loader2, Play, CheckCircle2, XCircle, ChevronRight,
  AlertTriangle, FileText, ArrowLeft, Sparkles,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import CodeEditor from "@/components/CodeEditor";
import { executeCode } from "@/services/compiler";
import { questionBankService, codeEvaluationService } from "@/services/enterprise";
import { logger } from "@/lib/logger";

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  description?: string;
}

interface TestResult {
  caseId: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error?: string;
  isHidden?: boolean;
}

interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  tags: string[];
  starterCode: Record<string, string>;
  testCases: TestCase[];
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-green-400 border-green-500/30 bg-green-500/10",
  medium: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  hard: "text-red-400 border-red-500/30 bg-red-500/10",
  expert: "text-purple-400 border-purple-500/30 bg-purple-500/10",
};

export default function CodingChallengePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState<string>("// Write your code here...");
  const [language, setLanguage] = useState("javascript");

  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string | null>(null);
  const [consoleError, setConsoleError] = useState<string | null>(null);

  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<"console" | "tests" | "eval">("console");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    questionBankService.getQuestion(id)
      .then((data: any) => {
        const q = data.question || data.data || data;
        setQuestion(q);
        const starterMap = q.starterCode || {};
        const starter = starterMap[language] || starterMap.javascript || "// Write your code here...";
        setCode(starter);
      })
      .catch((err: Error) => {
        logger.error(err, "Failed to load question");
        setError("Failed to load coding challenge");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (question?.starterCode?.[language]) {
      setCode(question.starterCode[language]);
    }
  }, [language]);

  const handleRunTests = async () => {
    if (!question || running) return;
    setRunning(true);
    setTestResults(null);
    setConsoleOutput(null);
    setConsoleError(null);
    setActiveTab("tests");

    const results: TestResult[] = [];

    for (const tc of question.testCases) {
      try {
        const res = await executeCode(language, `${code}\n\n${tc.input}`);
        const actual = (res.run?.output || res.run?.stdout || "").trim();
        const expected = tc.expectedOutput.trim();
        results.push({
          caseId: tc.id,
          input: tc.input,
          expectedOutput: expected,
          actualOutput: actual,
          passed: actual === expected,
          isHidden: tc.isHidden,
        });
      } catch (err: unknown) {
        results.push({
          caseId: tc.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: "",
          passed: false,
          error: String(err),
        });
      }
    }

    setTestResults(results);
    setRunning(false);
  };

  const handleRunCode = async () => {
    setConsoleOutput(null);
    setConsoleError(null);
    setTestResults(null);
    setActiveTab("console");

    try {
      const res = await executeCode(language, code);
      setConsoleOutput(res.run?.output || res.run?.stdout || "(no output)");
    } catch (err: unknown) {
      setConsoleError(String(err));
    }
  };

  const handleSubmit = async () => {
    if (!question || evaluating) return;
    setEvaluating(true);
    setEvalResult(null);
    setActiveTab("eval");

    try {
      const res = await codeEvaluationService.evaluateCode({
        code,
        language,
        problemStatement: question.description,
        testCases: question.testCases.map(tc => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
        })),
      });
      setEvalResult(res.evaluation || res.data || res);
    } catch (err: unknown) {
      logger.error(err, "Evaluation failed");
      setEvalResult({ error: String(err) });
    }
    setEvaluating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto" />
          <p className="text-slate-400 text-sm">Loading challenge...</p>
        </div>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-slate-300">{error || "Challenge not found"}</p>
          <Button variant="outline" onClick={() => navigate("/questions")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Questions
          </Button>
        </div>
      </div>
    );
  }

  const passedCount = testResults?.filter(r => r.passed).length || 0;
  const totalCount = testResults?.length || 0;

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-gray-900/50 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/questions")} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              {question.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={DIFFICULTY_COLORS[question.difficulty] || "text-slate-400"}>
            {question.difficulty}
          </Badge>
          <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs">
            {question.category}
          </Badge>
          {testResults && (
            <Badge className={passedCount === totalCount ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
              {passedCount}/{totalCount} passed
            </Badge>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[45%] border-r border-white/10 flex flex-col bg-gray-900/30">
          <ScrollArea className="flex-1 p-6">
            <div className="prose prose-invert max-w-none space-y-6">
              <div
                className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-mono text-xs"
                dangerouslySetInnerHTML={{ __html: question.description.replace(/\n/g, "<br/>") }}
              />

              {question.testCases.filter(tc => !tc.isHidden).length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Examples</h3>
                  <div className="space-y-2">
                    {question.testCases.filter(tc => !tc.isHidden).map(tc => (
                      <Card key={tc.id} className="bg-gray-800/50 border-slate-700/50 p-3">
                        <div className="space-y-1 text-xs font-mono">
                          <div><span className="text-slate-500">Input:</span> <span className="text-yellow-300">{tc.input}</span></div>
                          <div><span className="text-slate-500">Output:</span> <span className="text-green-400">{tc.expectedOutput}</span></div>
                          {tc.description && <div className="text-slate-500 italic">{tc.description}</div>}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            <CodeEditor code={code} setCode={(v) => setCode(v ?? code)} language={language} setLanguage={setLanguage} />
          </div>

          <div className="h-[220px] shrink-0 bg-[#1e1e1e] border-t border-white/10 flex flex-col">
            <div className="flex items-center gap-1 px-3 py-1.5 bg-[#252526] border-b border-white/10 shrink-0">
              {[
                { key: "console", label: "Console", icon: Play },
                { key: "tests", label: "Test Results", icon: activeTab === "tests" && testResults ? (passedCount === totalCount ? CheckCircle2 : XCircle) : CheckCircle2 },
                { key: "eval", label: "AI Evaluation", icon: Sparkles },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-t transition-colors ${
                    activeTab === tab.key
                      ? "bg-[#1e1e1e] text-white border-t-2 border-blue-500"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <tab.icon className="w-3 h-3" />
                  {tab.label}
                </button>
              ))}

              <div className="flex-1" />

              <Button size="sm" onClick={handleRunCode} className="h-6 text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-200 gap-1">
                <Play className="w-2.5 h-2.5" /> Run
              </Button>
              <Button size="sm" onClick={handleRunTests} disabled={running} className="h-6 text-[10px] bg-blue-600 hover:bg-blue-500 text-white gap-1">
                {running ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <BadgeCheck className="w-2.5 h-2.5" />}
                {running ? "Running..." : "Run Tests"}
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={evaluating} className="h-6 text-[10px] bg-green-600 hover:bg-green-500 text-white gap-1">
                {evaluating ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                {evaluating ? "Evaluating..." : "Submit"}
              </Button>
            </div>

            <div className="flex-1 overflow-hidden">
              {activeTab === "console" && (
                <ScrollArea className="h-full p-3 font-mono text-xs">
                  {!consoleOutput && !consoleError && (
                    <div className="flex items-center justify-center h-full text-slate-600">
                      <Terminal className="w-6 h-6 mr-2 opacity-50" />
                      Run your code to see output
                    </div>
                  )}
                  {consoleError && <div className="text-red-400 whitespace-pre-wrap">{consoleError}</div>}
                  {consoleOutput && <div className="text-slate-300 whitespace-pre-wrap">{consoleOutput}</div>}
                </ScrollArea>
              )}

              {activeTab === "tests" && (
                <ScrollArea className="h-full p-3">
                  {!testResults && (
                    <div className="flex items-center justify-center h-full text-slate-600 text-xs">
                      Click "Run Tests" to execute against test cases
                    </div>
                  )}
                  {testResults && (
                    <div className="space-y-1.5">
                      {testResults.map(r => (
                        <div key={r.caseId} className={`flex items-start gap-2 p-2 rounded text-xs ${
                          r.passed ? "bg-green-950/20" : "bg-red-950/20"
                        }`}>
                          {r.passed
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                            : <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                          }
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-300 mb-0.5">
                              {r.isHidden ? "Hidden Test" : `Test: ${r.input}`}
                            </div>
                            {!r.passed && !r.error && (
                              <div className="text-slate-500 space-y-0.5">
                                <div>Expected: <span className="text-green-400">{r.expectedOutput}</span></div>
                                <div>Actual: <span className="text-red-400">{r.actualOutput}</span></div>
                              </div>
                            )}
                            {r.error && <div className="text-red-400">{r.error}</div>}
                          </div>
                        </div>
                      ))}
                      <div className={`text-xs font-semibold pt-2 text-center ${
                        passedCount === totalCount ? "text-green-400" : "text-red-400"
                      }`}>
                        {passedCount}/{totalCount} test cases passed
                      </div>
                    </div>
                  )}
                </ScrollArea>
              )}

              {activeTab === "eval" && (
                <ScrollArea className="h-full p-3">
                  {!evalResult && !evaluating && (
                    <div className="flex items-center justify-center h-full text-slate-600 text-xs">
                      Click "Submit" for AI evaluation
                    </div>
                  )}
                  {evaluating && (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Evaluating your code with AI...
                    </div>
                  )}
                  {evalResult?.error && (
                    <div className="text-red-400 text-xs">{evalResult.error}</div>
                  )}
                  {evalResult?.scores && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-5 gap-2">
                        {Object.entries(evalResult.scores).map(([key, val]) => (
                          <div key={key} className="bg-gray-800/50 rounded p-2 text-center">
                            <div className="text-[10px] text-slate-500 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1')}</div>
                            <div className={`text-sm font-bold ${
                              (val as number) >= 80 ? "text-green-400" : (val as number) >= 60 ? "text-yellow-400" : "text-red-400"
                            }`}>{val as number}%</div>
                          </div>
                        ))}
                      </div>
                      {evalResult.feedback?.strengths?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-green-400 mb-1">Strengths</h4>
                          <ul className="space-y-0.5">
                            {evalResult.feedback.strengths.map((s: string, i: number) => (
                              <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                                <ChevronRight className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />{s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {evalResult.feedback?.improvements?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-yellow-400 mb-1">Improvements</h4>
                          <ul className="space-y-0.5">
                            {evalResult.feedback.improvements.map((s: string, i: number) => (
                              <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                                <ChevronRight className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0" />{s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Terminal(props: { className?: string; children?: React.ReactNode }) {
  return (
    <svg className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
