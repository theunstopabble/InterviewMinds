import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import {
  CheckCircle2,
  AlertTriangle,
  Home,
  Loader2,
  Trophy,
  Target,
  Download,
  RotateCcw,
  Video,
  Brain,
  TrendingUp,
  AlertOctagon,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Star,
  Zap,
  Users,
  Code,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { feedbackService } from "@/services/enterprise";
import type { FeedbackResult } from "@/services/enterprise";
import { logger } from "@/lib/logger";

interface InterviewData {
  score: number;
  feedback: string;
  metrics: { subject: string; A: number; fullMark: number }[];
  messages: { role: string; text: string }[];
  createdAt: string;
  videoUrl?: string;
}

export default function FeedbackPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<InterviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiFeedback, setAiFeedback] = useState<FeedbackResult | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await api.get(`/interview/${id}`);
        setData(res.data);

        const messages = (res.data.messages || []).map((msg: any) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.text,
        }));

        const questions = (res.data.messages || [])
          .filter((msg: any) => msg.role !== "user")
          .map((msg: any) => ({
            question: msg.text,
            type: "behavioral",
            difficulty: "medium",
          }));

        const feedback = await feedbackService.generateFeedback({
          candidateName: "Candidate",
          role: "Technical Interview",
          interviewDate: res.data.createdAt,
          messages,
          questions,
          scores: res.data.score
            ? {
                overall: res.data.score,
                technical: res.data.score,
                communication: res.data.score,
                problemSolving: res.data.score,
              }
            : undefined,
        });
        setAiFeedback(feedback);
      } catch (error) {
        logger.error("Error fetching feedback:", error);
        toast.error("Could not load feedback.");
      } finally {
        setLoading(false);
        setFeedbackLoading(false);
      }
    };
    fetchFeedback();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <span className="ml-3 text-white text-lg font-medium">
          Generating Analysis...
        </span>
      </div>
    );
  }

  if (!data)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        No Data Found
      </div>
    );

  const ratingOutOf10 = Math.round(data.score / 10);

  const chartData =
    data.metrics.length > 0
      ? data.metrics
      : [
          { subject: "Content", A: 0, fullMark: 100 },
          { subject: "Communication", A: 0, fullMark: 100 },
          { subject: "Behavior", A: 0, fullMark: 100 },
          { subject: "Domain", A: 0, fullMark: 100 },
        ];

  const metrics = Array.isArray(data.metrics) ? data.metrics : [];

  let strengths = metrics
    .filter((m) => m.A >= 70)
    .map((m) => `Strong in ${m.subject}`);

  let improvements = metrics
    .filter((m) => m.A < 70)
    .map((m) => `Improve ${m.subject}`);

  if (strengths.length === 0) strengths = [...strengths, "Consistent effort shown"];
  if (improvements.length === 0)
    improvements = [...improvements, "Practice more to improve score"];

  if (aiFeedback) {
    strengths = aiFeedback.strengths.length > 0 ? aiFeedback.strengths : strengths;
    improvements = aiFeedback.areasForImprovement.length > 0 ? aiFeedback.areasForImprovement : improvements;
  }

  const categoryIcons: Record<string, typeof Brain> = {
    technicalSkills: Code,
    communication: MessageSquare,
    problemSolving: Zap,
    culturalFit: Users,
  };

  const categoryLabels: Record<string, string> = {
    technicalSkills: "Technical Skills",
    communication: "Communication",
    problemSolving: "Problem Solving",
    culturalFit: "Cultural Fit",
  };

  const hiringConfig: Record<string, { label: string; color: string; icon: typeof Star }> = {
    strong_yes: { label: "Strong Yes", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: Star },
    yes: { label: "Yes", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Star },
    maybe: { label: "Maybe", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Star },
    no: { label: "No", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: Star },
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Performance Analysis
            </h1>
            <p className="text-slate-400 mt-2">
              Here is how you performed in your AI Interview.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
              onClick={() => toast.info("PDF Export coming soon!")}
            >
              <Download className="w-4 h-4" /> Export PDF
            </Button>
            <Button
              onClick={() => navigate("/interview")}
              className="gap-2 bg-blue-600 hover:bg-blue-500 shadow-lg"
            >
              <RotateCcw className="w-4 h-4" /> Retry
            </Button>
            <Button
              onClick={() => navigate("/dashboard")}
              variant="secondary"
              className="gap-2"
            >
              <Home className="w-4 h-4" /> Home
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-1 space-y-8">
            {/* 1. Score Circle */}
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-slate-200 text-lg uppercase tracking-wide">
                  Overall Score
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      className="text-slate-800"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      className={`${ratingOutOf10 >= 7 ? "text-green-500" : ratingOutOf10 >= 4 ? "text-yellow-500" : "text-red-500"} transition-all duration-1000 ease-out`}
                      strokeDasharray={502}
                      strokeDashoffset={502 - (502 * ratingOutOf10) / 10}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-6xl font-bold text-white">
                      {ratingOutOf10}
                    </span>
                    <span className="text-sm text-slate-400 uppercase font-semibold">
                      out of 10
                    </span>
                  </div>
                </div>
                <Badge
                  className={`mt-6 px-6 py-2 text-lg font-medium border-0 ${ratingOutOf10 >= 8 ? "bg-green-500/20 text-green-400" : ratingOutOf10 >= 5 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}
                >
                  {ratingOutOf10 >= 8
                    ? "Excellent"
                    : ratingOutOf10 >= 5
                      ? "Good"
                      : "Needs Work"}
                </Badge>
              </CardContent>
            </Card>

            {/* 2. Radar Chart */}
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Target className="w-4 h-4" /> Skill Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] w-full -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius="70%"
                    data={chartData}
                  >
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tick={false}
                      axisLine={false}
                    />
                    <Radar
                      name="Candidate"
                      dataKey="A"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      fill="#8b5cf6"
                      fillOpacity={0.3}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#1e293b",
                        color: "#f1f5f9",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "#a78bfa" }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-2 space-y-8">
            {/* VIDEO PLAYER */}
            {data.videoUrl && (
              <Card className="bg-slate-900/50 border-slate-800 overflow-hidden shadow-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Video className="w-5 h-5 text-blue-400" /> Session
                    Recording
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl overflow-hidden border border-slate-700 bg-black aspect-video">
                    <video
                      src={data.videoUrl}
                      controls
                      className="w-full h-full object-contain"
                      playsInline
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Summary */}
            <Card className="bg-slate-900/50 border-slate-800 border-l-4 border-l-purple-500 shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Target className="w-6 h-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-xl">
                    AI Interviewer Summary
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 leading-relaxed text-lg font-light">
                  "{data.feedback}"
                </p>
              </CardContent>
            </Card>

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-green-950/10 border-green-900/30 shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-2 text-green-400">
                    <Trophy className="w-5 h-5" />
                    <CardTitle className="text-lg">Key Strengths</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {strengths.map((item, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-slate-300 items-start"
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-red-950/10 border-red-900/30 shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                    <CardTitle className="text-lg">
                      Areas for Improvement
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {improvements.map((item, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-slate-300 items-start"
                      >
                        <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-2" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Transcript */}
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl">Interview Transcript</CardTitle>
                <CardDescription>
                  Review exactly what was discussed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] w-full rounded-xl border border-slate-800 p-6 bg-slate-950/30">
                  {data.messages &&
                    data.messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"}`}
                        >
                          <p className="text-xs opacity-50 mb-1 uppercase font-bold">
                            {msg.role === "user" ? "You" : "AI Interviewer"}
                          </p>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  {(!data.messages || data.messages.length === 0) && (
                    <p className="text-center text-slate-500">
                      No transcript available.
                    </p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* AI-Generated Feedback Sections */}
            {feedbackLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="ml-3 text-slate-400 text-lg">
                  Generating AI feedback...
                </span>
              </div>
            )}

            {aiFeedback && !feedbackLoading && (
              <>
                {/* AI Score Breakdown */}
                <Card className="bg-slate-900/50 border-slate-800 border-l-4 border-l-blue-500 shadow-xl">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Brain className="w-6 h-6 text-blue-400" />
                      </div>
                      <CardTitle className="text-xl">
                        AI Score Breakdown
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {Object.entries(aiFeedback.categoryScores).map(([key, value]) => {
                      const CatIcon = categoryIcons[key] || Brain;
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-slate-300">
                              <CatIcon className="w-4 h-4 text-blue-400" />
                              <span className="text-sm font-medium">
                                {categoryLabels[key] || key}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-white">
                              {Math.round(value)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${
                                value >= 80
                                  ? "bg-green-500"
                                  : value >= 60
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${value}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Hiring Recommendation */}
                <Card className="bg-slate-900/50 border-slate-800 shadow-xl">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Briefcase className="w-6 h-6 text-purple-400" />
                      </div>
                      <CardTitle className="text-xl">
                        Hiring Recommendation
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      {(() => {
                        const config = hiringConfig[aiFeedback.recommendations.hiring] || hiringConfig.maybe;
                        const RecIcon = config.icon;
                        return (
                          <Badge className={`px-5 py-2 text-base font-semibold border ${config.color}`}>
                            <RecIcon className="w-4 h-4 mr-2" />
                            {config.label}
                          </Badge>
                        );
                      })()}
                      <span className="text-sm text-slate-400">
                        Overall Score: {Math.round(aiFeedback.overallScore)}%
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                        Next Steps
                      </h4>
                      <ul className="space-y-2">
                        {aiFeedback.recommendations.nextSteps.map((step, i) => (
                          <li key={i} className="flex gap-3 text-slate-300 items-start">
                            <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <span className="text-sm">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {aiFeedback.recommendations.suggestedRoles && aiFeedback.recommendations.suggestedRoles.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                          Suggested Roles
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {aiFeedback.recommendations.suggestedRoles.map((role, i) => (
                            <Badge key={i} className="bg-slate-800 text-slate-300 border-slate-700">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Red Flags */}
                {aiFeedback.redFlags.length > 0 && (
                  <Card className="bg-red-950/10 border-red-900/30 shadow-xl">
                    <CardHeader>
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertOctagon className="w-5 h-5" />
                        <CardTitle className="text-lg">Red Flags</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {aiFeedback.redFlags.map((flag, i) => (
                          <li key={i} className="flex gap-3 text-slate-300 items-start">
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span className="text-sm">{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Key Insights */}
                <Card className="bg-slate-900/50 border-slate-800 border-l-4 border-l-amber-500 shadow-xl">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 rounded-lg">
                        <Lightbulb className="w-6 h-6 text-amber-400" />
                      </div>
                      <CardTitle className="text-xl">Key Insights</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4">
                      {aiFeedback.keyInsights.map((insight, i) => (
                        <li key={i} className="flex gap-3 text-slate-300 items-start">
                          <TrendingUp className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <span className="text-sm">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Per-Question Analysis */}
                <Card className="bg-slate-900/50 border-slate-800 shadow-xl">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <MessageSquare className="w-6 h-6 text-indigo-400" />
                      </div>
                      <CardTitle className="text-xl">
                        Per-Question Analysis
                      </CardTitle>
                    </div>
                    <CardDescription>
                      Detailed breakdown of each question and your response.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {aiFeedback.detailedAnalysis.map((item) => (
                      <div
                        key={item.questionId}
                        className="border border-slate-800 rounded-xl overflow-hidden"
                      >
                        <button
                          onClick={() =>
                            setExpandedQuestion(
                              expandedQuestion === item.questionId ? null : item.questionId
                            )
                          }
                          className="w-full flex items-center justify-between p-4 bg-slate-800/30 hover:bg-slate-800/50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                                item.score >= 80
                                  ? "bg-green-500/20 text-green-400"
                                  : item.score >= 60
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {item.score}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-200 truncate">
                                {item.question}
                              </p>
                            </div>
                          </div>
                          <div className="ml-3 shrink-0">
                            {expandedQuestion === item.questionId ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </button>
                        {expandedQuestion === item.questionId && (
                          <div className="p-4 border-t border-slate-800 bg-slate-900/30 space-y-3">
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.score >= 80
                                    ? "bg-green-500"
                                    : item.score >= 60
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                }`}
                                style={{ width: `${item.score}%` }}
                              />
                            </div>
                            <p className="text-sm text-slate-300 leading-relaxed">
                              {item.feedback}
                            </p>
                            {item.keyPoints.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                                  Key Points
                                </p>
                                <ul className="space-y-1">
                                  {item.keyPoints.map((point, j) => (
                                    <li
                                      key={j}
                                      className="flex gap-2 text-sm text-slate-400 items-start"
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                                      <span>{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
