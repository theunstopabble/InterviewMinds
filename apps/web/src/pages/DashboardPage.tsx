import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { Plus, LayoutDashboard, Trophy, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton"; // ✨ Latest UX
import { toast } from "sonner";

export default function DashboardPage() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get("/interview/history/all");
        setInterviews(res.data);
      } catch (error) {
        toast.error("Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Stats calculate karna
  const totalInterviews = interviews.length;
  const avgRating =
    totalInterviews > 0
      ? (
          interviews.reduce(
            (acc, curr) => acc + (curr.feedback?.rating || 0),
            0
          ) / totalInterviews
        ).toFixed(1)
      : "N/A";

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
              Your Dashboard
            </h1>
            <p className="text-slate-400">
              Track your progress and past interviews.
            </p>
          </div>
          <Button
            onClick={() => navigate("/")}
            className="gap-2 bg-blue-600 hover:bg-blue-500"
          >
            <Plus className="w-4 h-4" /> New Interview
          </Button>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Average Rating
              </CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20 bg-slate-800" />
              ) : (
                <div className="text-2xl font-bold">{avgRating} / 10</div>
              )}
            </CardContent>
          </Card>

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
                    ? new Date(interviews[0].date).toLocaleDateString()
                    : "No activity"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Interviews List */}
        <h2 className="text-xl font-semibold text-slate-200 mt-8">
          Recent History
        </h2>

        <div className="grid gap-4">
          {loading ? (
            // Skeleton Loader (Latest Tech Feel)
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
            <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-lg">
              No interviews found. Start your first one!
            </div>
          ) : (
            // Real Data
            interviews.map((interview) => (
              <div
                key={interview._id}
                onClick={() => navigate(`/feedback/${interview._id}`)}
                className="group flex items-center justify-between p-5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/80 hover:border-blue-500/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                      interview.feedback.rating >= 8
                        ? "bg-green-500/20 text-green-400"
                        : interview.feedback.rating >= 5
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {interview.feedback.rating}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                      Technical Interview
                    </h3>
                    <p className="text-sm text-slate-500">
                      {new Date(interview.date).toLocaleDateString()} •{" "}
                      {new Date(interview.date).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge
                    variant="outline"
                    className="hidden md:flex border-slate-700 text-slate-400"
                  >
                    {interview.feedback.summary.substring(0, 30)}...
                  </Badge>
                  <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
