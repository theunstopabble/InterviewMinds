import { useEffect, useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { api } from "@/lib/api";
import { analyticsService } from "@/services/enterprise";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Trophy,
  Clock,
  ArrowRight,
  Brain,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Play,
  BookOpen,
  Calendar,
  Settings,
  Zap,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from "recharts";
import { logger } from "@/lib/logger";

interface InterviewHistory {
  _id: string;
  score: number;
  feedback: string;
  createdAt: string;
  metrics: unknown[];
}

interface DashboardAnalytics {
  overview: {
    totalInterviews: number;
    completionRate: number;
    averageScore: number;
    averageDuration: number;
  };
  scoreDistribution: {
    range90_100: number;
    range80_89: number;
    range70_79: number;
    range60_69: number;
    below60: number;
  };
  competencyScores: Record<string, { average: number; trend: "up" | "down" | "stable" }>;
}

const quickActions = [
  { label: "New Interview", icon: Play, path: "/", color: "from-blue-600 to-purple-600" },
  { label: "Practice", icon: BookOpen, path: "/preparation", color: "from-emerald-600 to-teal-600" },
  { label: "Schedule", icon: Calendar, path: "/scheduling", color: "from-amber-600 to-orange-600" },
  { label: "Settings", icon: Settings, path: "/settings", color: "from-slate-600 to-slate-500" },
];

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

function DashboardPage() {
  const [interviews, setInterviews] = useState<InterviewHistory[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [historyRes, analyticsData] = await Promise.all([
          api.get("/interview/history"),
          analyticsService.getDashboard().catch(() => null),
        ]);
        setInterviews(historyRes.data);
        setAnalytics(analyticsData?.data || null);
      } catch (error) {
        logger.error("Failed to load dashboard:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalInterviews = interviews.length;
  const avgScore = analytics?.overview.averageScore ?? 0;
  const completionRate = analytics?.overview.completionRate ?? 0;
  const latestInterview = interviews[0] ?? null;

  const scoreDistData = analytics?.scoreDistribution
    ? [
        { name: "<60", value: analytics.scoreDistribution.below60, fill: "#ef4444" },
        { name: "60-69", value: analytics.scoreDistribution.range60_69, fill: "#f97316" },
        { name: "70-79", value: analytics.scoreDistribution.range70_79, fill: "#eab308" },
        { name: "80-89", value: analytics.scoreDistribution.range80_89, fill: "#22c55e" },
        { name: "90-100", value: analytics.scoreDistribution.range90_100, fill: "#06b6d4" },
      ]
    : [];

  const competencyData = analytics?.competencyScores
    ? Object.entries(analytics.competencyScores).map(([key, val]) => ({
        subject: key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
        score: val.average,
        fullMark: 100,
        trend: val.trend,
      }))
    : [];

  const scoreHistoryData = interviews
    .slice()
    .reverse()
    .slice(-10)
    .map((i, idx) => ({
      attempt: idx + 1,
      score: i.score || 0,
    }));

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <LayoutDashboard className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                Dashboard
              </h1>
            </div>
            <p className="text-slate-400 text-sm sm:text-base">
              Track your progress, review past interviews, and level up your skills.
            </p>
          </div>
          <Button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-500/20"
          >
            <Play className="w-4 h-4 mr-2 fill-current" />
            New Interview
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="group flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/80 hover:border-slate-700 transition-all duration-300"
              >
                <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} shrink-0`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  {action.label}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-slate-400 transition-colors" />
              </button>
            );
          })}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-800/80 border-gray-700/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Total Interviews
              </CardTitle>
              <LayoutDashboard className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20 bg-slate-800" />
              ) : (
                <div className="text-2xl font-bold text-white">{totalInterviews}</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-800/80 border-gray-700/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Avg Score
              </CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20 bg-slate-800" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold text-white">{avgScore}</div>
                  <span className="text-xs text-slate-500">/ 100</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-800/80 border-gray-700/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Completion Rate
              </CardTitle>
              <Target className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20 bg-slate-800" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold text-white">{completionRate}%</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-800/80 border-gray-700/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Latest Activity
              </CardTitle>
              <Clock className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-28 bg-slate-800" />
              ) : (
                <div className="text-sm font-medium text-slate-200">
                  {latestInterview
                    ? new Date(latestInterview.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "No activity yet"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Distribution */}
          <Card className="bg-gray-800/80 border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                Score Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-48 w-full bg-slate-800" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={scoreDistData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        color: "#e2e8f0",
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Competency Radar */}
          <Card className="bg-gray-800/80 border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                Competency Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-48 w-full bg-slate-800" />
              ) : competencyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={competencyData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.2}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        color: "#e2e8f0",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                  Complete interviews to see competency scores
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Competency Trends & Score History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Competency Detail Cards */}
          <div>
            <h2 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Skill Breakdown
            </h2>
            <div className="space-y-2">
              {loading
                ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full bg-slate-800 rounded-lg" />)
                : competencyData.map((comp) => (
                    <div
                      key={comp.subject}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-800/50 bg-slate-900/30"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-300">{comp.subject}</span>
                          <div className="flex items-center gap-2">
                            <TrendIcon trend={comp.trend} />
                            <span className="text-sm font-semibold text-white">{comp.score}%</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${comp.score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          {/* Score Trend Mini Chart */}
          <div>
            <h2 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Score Progression
            </h2>
            <Card className="bg-gray-800/80 border-gray-700/50">
              <CardContent className="pt-4">
                {loading ? (
                  <Skeleton className="h-36 w-full bg-slate-800" />
                ) : scoreHistoryData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={scoreHistoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="attempt" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                          color: "#e2e8f0",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ fill: "#8b5cf6", strokeWidth: 0 }}
                        activeDot={{ r: 4, fill: "#a78bfa" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-36 flex items-center justify-center text-slate-500 text-sm">
                    Complete more interviews to see your progression
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent History */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Recent Interviews
            </h2>
            {interviews.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/analytics")}
                className="text-slate-400 hover:text-white text-xs"
              >
                View All
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>

          <div className="grid gap-3">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-4 p-4 border border-slate-800 rounded-xl bg-slate-900/30"
                >
                  <Skeleton className="h-12 w-12 rounded-full bg-slate-800 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px] bg-slate-800" />
                    <Skeleton className="h-3 w-[200px] bg-slate-800" />
                  </div>
                </div>
              ))
            ) : interviews.length === 0 ? (
              <div className="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                <Brain className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                <p className="text-base font-medium text-slate-400 mb-1">No interviews yet</p>
                <p className="text-sm text-slate-500 mb-4">Start your first AI-powered interview and track your progress here.</p>
                <Button
                  onClick={() => navigate("/")}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
                >
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Start Your First Interview
                </Button>
              </div>
            ) : (
              interviews.slice(0, 5).map((interview) => (
                <div
                  key={interview._id}
                  onClick={() => navigate(`/feedback/${interview._id}`)}
                  className="group flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/80 hover:border-blue-500/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 shrink-0 ${
                        interview.score >= 80
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : interview.score >= 50
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}
                    >
                      {Math.round((interview.score || 0) / 10)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors truncate">
                        Technical Interview
                      </h3>
                      <p className="text-xs text-slate-500">
                        {new Date(interview.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        · {new Date(interview.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <Badge
                      variant="outline"
                      className="hidden sm:inline-flex border-slate-700 text-slate-400 bg-slate-950/50 max-w-[200px] truncate text-xs"
                    >
                      {interview.feedback?.substring(0, 40) || "No feedback"}
                      {interview.feedback && interview.feedback.length > 40 ? "..." : ""}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const DashboardWithErrorBoundary = () => (
  <ErrorBoundary>
    <DashboardPage />
  </ErrorBoundary>
);

export default DashboardWithErrorBoundary;
