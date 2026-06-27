import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { analyticsService } from "../services/enterprise";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Download,
  ArrowLeft,
  Trophy,
  Target,
  Brain,
  AlertTriangle,
  Activity,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { logger } from "@/lib/logger";

const RANGES = [7, 14, 30, 60, 90];

const DIST_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4"];

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [days, setDays] = useState(30);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [dashboard, trendsData, performers] = await Promise.all([
        analyticsService.getDashboard().catch(() => null),
        analyticsService.getTrends(days).catch(() => ({ trends: [] })),
        analyticsService.getTopPerformers(10).catch(() => ({ performers: [] })),
      ]);
      setAnalytics(dashboard?.data || dashboard);
      setTrends(
        (trendsData?.trends || []).map((t: any) => ({
          ...t,
          count: t.interviews ?? t.count,
        }))
      );
      setTopPerformers(
        (performers?.performers || []).map((p: any) => ({
          ...p,
          trend: p.trend || "stable",
        }))
      );
    } catch (e) {
      logger.error("Error loading analytics:", e);
    }
    setLoading(false);
  };

  const handleExport = (format: 'json' | 'csv' = 'json') => {
    const data = {
      overview: analytics?.overview,
      scoreDistribution: analytics?.scoreDistribution,
      competencyScores: analytics?.competencyScores,
      trends,
      topPerformers,
      exportedAt: new Date().toISOString(),
    };

    if (format === 'csv') {
      const rows: string[][] = [];
      rows.push(['Category', 'Metric', 'Value']);
      if (analytics?.overview) {
        Object.entries(analytics.overview).forEach(([key, val]) => rows.push(['Overview', key, String(val)]));
      }
      if (analytics?.scoreDistribution) {
        Object.entries(analytics.scoreDistribution).forEach(([key, val]) => rows.push(['Score Distribution', key, String(val)]));
      }
      if (analytics?.competencyScores) {
        Object.entries(analytics.competencyScores).forEach(([key, val]) => rows.push(['Competency', key, String(val)]));
      }
      if (topPerformers?.length) {
        topPerformers.forEach((p: any) => rows.push(['Top Performer', p.name || '', String(p.score || '')]));
      }
      const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setShowExport(false);
  };

  const overview = analytics?.overview || {};
  const scoreDist = analytics?.scoreDistribution || {};
  const distData = [
    { name: "<60", value: scoreDist.below60 || 0 },
    { name: "60-69", value: scoreDist.range60_69 || 0 },
    { name: "70-79", value: scoreDist.range70_79 || 0 },
    { name: "80-89", value: scoreDist.range80_89 || 0 },
    { name: "90-100", value: scoreDist.range90_100 || 0 },
  ];

  const compData = analytics?.competencyScores
    ? Object.entries(analytics.competencyScores).map(([key, val]: [string, any]) => ({
        name: key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
        score: Math.round(val.average),
        trend: val.trend,
      }))
    : [];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                Analytics
              </h1>
            </div>
            <p className="text-slate-400 text-sm sm:text-base">
              Deep insights into interview performance, trends, and candidate metrics.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExport(!showExport)}
              className="border-slate-700 text-slate-300 hover:text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            {showExport && (
              <div className="absolute right-4 top-20 z-10 bg-slate-900 border border-slate-700 rounded-xl p-2 shadow-2xl">
                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Export as JSON
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Export as CSV
                </button>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 bg-slate-800 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-64 bg-slate-800 rounded-xl" />
              <Skeleton className="h-64 bg-slate-800 rounded-xl" />
            </div>
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gray-800/80 border-gray-700/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Total Interviews
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{overview.totalInterviews || 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/80 border-gray-700/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Completion Rate
                  </CardTitle>
                  <Target className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {Math.round(overview.completionRate || 0)}%
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/80 border-gray-700/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Average Score
                  </CardTitle>
                  <Trophy className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {Math.round(overview.averageScore || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/80 border-gray-700/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Avg Duration
                  </CardTitle>
                  <Clock className="h-4 w-4 text-cyan-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {Math.round(overview.averageDuration || 0)} <span className="text-sm font-normal text-slate-500">min</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Score Distribution Pie */}
              <Card className="bg-gray-800/80 border-gray-700/50">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    Score Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={distData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {distData.map((_, i) => (
                          <Cell key={i} fill={DIST_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                          color: "#e2e8f0",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Competency Scores */}
              <Card className="bg-gray-800/80 border-gray-700/50">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    Competency Scores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {compData.length > 0 ? (
                    compData.map((comp: any) => (
                      <div key={comp.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm text-slate-300">{comp.name}</span>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-xs",
                                comp.trend === "up" && "text-emerald-400",
                                comp.trend === "down" && "text-red-400",
                                comp.trend === "stable" && "text-slate-400"
                              )}
                            >
                              {comp.trend === "up" ? "↑" : comp.trend === "down" ? "↓" : "→"}
                            </span>
                            <span className="text-sm font-semibold text-white">{comp.score}%</span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                            style={{ width: `${comp.score}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                      No competency data available yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Trends Chart */}
            <Card className="bg-gray-800/80 border-gray-700/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Interview Trends
                  </CardTitle>
                  <div className="flex items-center gap-1 bg-slate-900/50 border border-slate-800 rounded-lg p-0.5">
                    {RANGES.map((r) => (
                      <button
                        key={r}
                        onClick={() => setDays(r)}
                        className={cn(
                          "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                          days === r
                            ? "bg-blue-600 text-white"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        {r}d
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={trends}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => {
                          const d = new Date(val);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 100]}
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                          color: "#e2e8f0",
                        }}
                        labelFormatter={(val) => new Date(val).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="count"
                        stroke="#8b5cf6"
                        fill="url(#colorCount)"
                        strokeWidth={2}
                        name="Interviews"
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="avgScore"
                        stroke="#22c55e"
                        fill="url(#colorScore)"
                        strokeWidth={2}
                        name="Avg Score"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
                    No trend data for this period
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Proctoring + Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Proctoring Metrics */}
              <Card className="bg-gray-800/80 border-gray-700/50">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Proctoring Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                      <div className="text-2xl font-bold text-red-400">
                        {analytics?.proctoring?.violations || 0}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Violations</div>
                    </div>
                    <div className="text-center p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                      <div className="text-2xl font-bold text-yellow-400">
                        {analytics?.proctoring?.flagRate || 0}%
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Flag Rate</div>
                    </div>
                    <div className="text-center p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                      <div className="text-2xl font-bold text-blue-400">
                        {Object.keys(analytics?.proctoring?.violationTypes || {}).length}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Types</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Performers */}
              <Card className="bg-gray-800/80 border-gray-700/50">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topPerformers.length > 0 ? (
                    <div className="space-y-2">
                      {topPerformers.map((performer: any, i: number) => (
                        <div
                          key={performer.candidateId || i}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800/50"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                                i === 0
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : i === 1
                                    ? "bg-slate-400/20 text-slate-300"
                                    : i === 2
                                      ? "bg-amber-700/20 text-amber-500"
                                      : "bg-slate-800 text-slate-400"
                              )}
                            >
                              #{i + 1}
                            </div>
                            <span className="text-sm text-slate-200">{performer.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge
                              className={cn(
                                "text-xs",
                                performer.score >= 90 && "bg-emerald-600/20 text-emerald-400 border-emerald-600/30",
                                performer.score >= 80 && performer.score < 90 && "bg-blue-600/20 text-blue-400 border-blue-600/30",
                                performer.score >= 70 && performer.score < 80 && "bg-amber-600/20 text-amber-400 border-amber-600/30",
                                performer.score < 70 && "bg-slate-700 text-slate-400 border-slate-600"
                              )}
                              variant="outline"
                            >
                              {performer.score}
                            </Badge>
                            <span
                              className={cn(
                                "text-xs",
                                performer.trend === "up" && "text-emerald-400",
                                performer.trend === "down" && "text-red-400",
                                performer.trend === "stable" && "text-slate-400"
                              )}
                            >
                              {performer.trend === "up" ? "↑" : performer.trend === "down" ? "↓" : "→"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                      No performer data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
