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

// ✅ Interface matching Phase 4 Backend (Interview.ts)
interface InterviewData {
  score: number; // 0-100
  feedback: string;
  metrics: { subject: string; A: number; fullMark: number }[];
  messages: { role: string; text: string }[];
  createdAt: string;
}

export default function FeedbackPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<InterviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        // Backend GET /api/interview/:id
        const res = await api.get(`/interview/${id}`);
        setData(res.data);
      } catch (error) {
        console.error("Error fetching feedback:", error);
        toast.error("Could not load feedback.");
      } finally {
        setLoading(false);
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

  // 🧠 DERIVED DATA LOGIC
  const ratingOutOf10 = Math.round(data.score / 10); // Convert 0-100 to 0-10

  // Use real metrics from backend, or fallback if empty
  const chartData =
    data.metrics.length > 0
      ? data.metrics
      : [
          { subject: "Technical", A: 0, fullMark: 100 },
          { subject: "Communication", A: 0, fullMark: 100 },
          { subject: "Problem Solving", A: 0, fullMark: 100 },
        ];

  // Dynamic Strengths based on Metrics (> 70 is strong)
  const strengths = data.metrics
    .filter((m) => m.A >= 70)
    .map((m) => `Strong proficiency in ${m.subject}`);

  // Dynamic Improvements based on Metrics (< 70 needs work)
  const improvements = data.metrics
    .filter((m) => m.A < 70)
    .map((m) => `Needs focus on ${m.subject}`);

  // Fallbacks if lists are empty
  if (strengths.length === 0)
    strengths.push("Consistent performance across board");
  if (improvements.length === 0)
    improvements.push("Keep practicing to maintain edge");

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 🟢 Header Section */}
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
              className="gap-2 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20"
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
          {/* 👈 Left Column: Score & Radar Chart */}
          <div className="lg:col-span-1 space-y-8">
            {/* 1. Circular Score Card */}
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-slate-200 text-lg uppercase tracking-wide">
                  Overall Score
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative w-48 h-48 flex items-center justify-center">
                  {/* Background Circle */}
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
                    {/* Progress Circle */}
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      className={`${
                        ratingOutOf10 >= 7
                          ? "text-green-500"
                          : ratingOutOf10 >= 4
                            ? "text-yellow-500"
                            : "text-red-500"
                      } transition-all duration-1000 ease-out`}
                      strokeDasharray={502}
                      strokeDashoffset={502 - (502 * ratingOutOf10) / 10}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center animate-in zoom-in duration-500">
                    <span className="text-6xl font-bold text-white">
                      {ratingOutOf10}
                    </span>
                    <span className="text-sm text-slate-400 uppercase font-semibold tracking-wider">
                      out of 10
                    </span>
                  </div>
                </div>

                <Badge
                  className={`mt-6 px-6 py-2 text-lg font-medium border-0 ${
                    ratingOutOf10 >= 8
                      ? "bg-green-500/20 text-green-400"
                      : ratingOutOf10 >= 5
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {ratingOutOf10 >= 8
                    ? "Excellent"
                    : ratingOutOf10 >= 5
                      ? "Good"
                      : "Needs Improvement"}
                </Badge>
              </CardContent>
            </Card>

            {/* 2. Skills Radar Chart */}
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

          {/* 👉 Right Column: Detailed Feedback */}
          <div className="lg:col-span-2 space-y-8">
            {/* 3. AI Summary */}
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

            {/* 4. Strengths & Weaknesses Grid */}
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

            {/* 5. Transcript Area */}
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl">Interview Transcript</CardTitle>
                <CardDescription>
                  Review exactly what was discussed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full rounded-xl border border-slate-800 p-6 bg-slate-950/30">
                  {data.messages &&
                    data.messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`mb-6 flex ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`flex flex-col max-w-[80%] ${
                            msg.role === "user" ? "items-end" : "items-start"
                          }`}
                        >
                          <span className="text-xs text-slate-500 mb-1 uppercase font-bold tracking-wider">
                            {msg.role === "user" ? "You" : "AI Interviewer"}
                          </span>
                          <div
                            className={`p-4 rounded-2xl text-sm leading-relaxed ${
                              msg.role === "user"
                                ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-900/20"
                                : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"
                            }`}
                          >
                            {msg.text}
                          </div>
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
          </div>
        </div>
      </div>
    </div>
  );
}
