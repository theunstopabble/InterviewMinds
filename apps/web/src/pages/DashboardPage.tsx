import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Plus, LayoutDashboard, Trophy, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// ✅ Define Type based on actual Backend Schema
interface InterviewHistory {
  _id: string;
  score: number; // 0-100
  feedback: string; // Text summary
  createdAt: string; // ISO Date string
  metrics: any[];
}

export default function DashboardPage() {
  const [interviews, setInterviews] = useState<InterviewHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // ✅ FIX: Correct Endpoint (/history)
        const res = await api.get("/interview/history");
        setInterviews(res.data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // 📊 Stats Calculation
  const totalInterviews = interviews.length;

  // Calculate Average Score (converted to 0-10 scale)
  const avgRating =
    totalInterviews > 0
      ? (
          interviews.reduce((acc, curr) => acc + (curr.score || 0), 0) /
          totalInterviews /
          10
        ).toFixed(1)
      : "N/A";

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
              Your Dashboard
            </h1>
            <p className="text-slate-400 mt-1">
              Track your progress and past interviews.
            </p>
          </div>
          <Button
            onClick={() => navigate("/")} // Navigate to Resume Upload (Start)
            className="gap-2 bg-blue-600 hover:bg-blue-500 text-white"
          >
            <Plus className="w-4 h-4" /> New Interview
          </Button>
        </div>

        {/* --- Stats Cards --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Interviews */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Total Interviews
              </CardTitle>
              <LayoutDashboard className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20 bg-slate-800" />
              ) : (
                <div className="text-2xl font-bold">{totalInterviews}</div>
              )}
            </CardContent>
          </Card>

          {/* Average Rating */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Avg. Performance
              </CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20 bg-slate-800" />
              ) : (
                <div className="text-2xl font-bold">
                  {avgRating}{" "}
                  <span className="text-sm text-slate-500">/ 10</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Latest Activity */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Latest Activity
              </CardTitle>
              <Clock className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-32 bg-slate-800" />
              ) : (
                <div className="text-sm text-slate-300">
                  {interviews.length > 0
                    ? new Date(interviews[0].createdAt).toLocaleDateString()
                    : "No activity yet"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* --- Recent History List --- */}
        <div>
          <h2 className="text-xl font-semibold text-slate-200 mb-4">
            Recent History
          </h2>

          <div className="grid gap-4">
            {loading ? (
              // Loading Skeletons
              [...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-4 p-4 border border-slate-800 rounded-lg bg-slate-900/30"
                >
                  <Skeleton className="h-12 w-12 rounded-full bg-slate-800" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px] bg-slate-800" />
                    <Skeleton className="h-4 w-[200px] bg-slate-800" />
                  </div>
                </div>
              ))
            ) : interviews.length === 0 ? (
              // Empty State
              <div className="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                <p>No interviews found.</p>
                <Button
                  variant="link"
                  onClick={() => navigate("/")}
                  className="text-blue-400 mt-2"
                >
                  Start your first one!
                </Button>
              </div>
            ) : (
              // Data List
              interviews.map((interview) => (
                <div
                  key={interview._id}
                  onClick={() => navigate(`/feedback/${interview._id}`)}
                  className="group flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/80 hover:border-blue-500/30 transition-all cursor-pointer gap-4"
                >
                  <div className="flex items-center gap-4">
                    {/* Score Circle */}
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 ${
                        interview.score >= 80
                          ? "bg-green-500/10 text-green-400 border-green-500/20"
                          : interview.score >= 50
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}
                    >
                      {Math.round(interview.score / 10)}
                    </div>

                    {/* Details */}
                    <div>
                      <h3 className="font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                        Technical Interview
                      </h3>
                      <p className="text-xs text-slate-500 flex gap-2 mt-1">
                        <span>
                          {new Date(interview.createdAt).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(interview.createdAt).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Feedback Summary & Arrow */}
                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <Badge
                      variant="outline"
                      className="hidden md:flex border-slate-700 text-slate-400 bg-slate-950/50 max-w-[300px] truncate"
                    >
                      {interview.feedback
                        ? interview.feedback.substring(0, 45) + "..."
                        : "No feedback available"}
                    </Badge>
                    <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
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
