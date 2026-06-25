import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsService } from '../services/enterprise';

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [dashboard, trendsData, performers] = await Promise.all([
        analyticsService.getDashboard().catch(() => null),
        analyticsService.getTrends(30).catch(() => ({ trends: [] })),
        analyticsService.getTopPerformers(10).catch(() => ({ performers: [] })),
      ]);
      setAnalytics(dashboard?.data || dashboard);
      setTrends((trendsData?.trends || []).map((t: any) => ({ ...t, count: t.interviews ?? t.count })));
      setTopPerformers((performers?.performers || []).map((p: any) => ({ ...p, trend: p.trend || 'stable' })));
    } catch (e) {
      console.error('Error loading analytics:', e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-gray-400 mt-1">Interview performance insights and predictions</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
          >
            ← Back to Dashboard
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                title="Total Interviews"
                value={analytics?.overview?.totalInterviews || 0}
                icon="📊"
              />
              <StatCard
                title="Completion Rate"
                value={`${Math.round(analytics?.overview?.completionRate || 0)}%`}
                icon="✅"
              />
              <StatCard
                title="Average Score"
                value={Math.round(analytics?.overview?.averageScore || 0)}
                icon="📈"
              />
              <StatCard
                title="Avg Duration"
                value={`${Math.round(analytics?.overview?.averageDuration || 0)}min`}
                icon="⏱️"
              />
            </div>

            {/* Score Distribution */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">Score Distribution</h2>
                <div className="space-y-3">
                  {[
                    { range: '90-100', label: 'Excellent', key: 'range90_100' },
                    { range: '80-89', label: 'Very Good', key: 'range80_89' },
                    { range: '70-79', label: 'Good', key: 'range70_79' },
                    { range: '60-69', label: 'Average', key: 'range60_69' },
                    { range: '<60', label: 'Below', key: 'below60' },
                  ].map((item) => {
                    const count = analytics?.scoreDistribution?.[item.key] || 0;
                    const total = analytics?.overview?.totalInterviews || 1;
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div key={item.key} className="flex items-center gap-4">
                        <span className="w-16 text-gray-400">{item.range}</span>
                        <div className="flex-1 bg-gray-700 rounded-full h-4">
                          <div
                            className="bg-blue-500 h-4 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="w-12 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Competency Scores */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">Competency Scores</h2>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(analytics?.competencyScores || {}).map(([key, value]: [string, any]) => (
                    <div key={key} className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="capitalize">{key}</span>
                        <span className={`text-sm ${value.trend === 'up' ? 'text-green-500' : value.trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
                          {value.trend === 'up' ? '↑' : value.trend === 'down' ? '↓' : '→'} {Math.round(value.average)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${value.average}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Performers */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Top Performers</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-gray-700">
                      <th className="pb-3">Rank</th>
                      <th className="pb-3">Candidate</th>
                      <th className="pb-3">Score</th>
                      <th className="pb-3">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPerformers.map((performer, index) => (
                      <tr key={performer.candidateId} className="border-b border-gray-700">
                        <td className="py-3">#{index + 1}</td>
                        <td className="py-3">{performer.name}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded ${
                            performer.score >= 90 ? 'bg-green-600' :
                            performer.score >= 80 ? 'bg-blue-600' :
                            performer.score >= 70 ? 'bg-yellow-600' :
                            'bg-gray-600'
                          }`}>
                            {performer.score}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={performer.trend === 'up' ? 'text-green-500' : 'text-gray-400'}>
                            {performer.trend === 'up' ? '↑ Improving' : '→ Stable'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Proctoring Metrics */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Proctoring Metrics</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-700 rounded-lg">
                  <div className="text-3xl font-bold text-red-500">{analytics?.proctoring?.violations || 0}</div>
                  <div className="text-gray-400">Total Violations</div>
                </div>
                <div className="text-center p-4 bg-gray-700 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-500">{analytics?.proctoring?.flagRate || 0}%</div>
                  <div className="text-gray-400">Flag Rate</div>
                </div>
                <div className="text-center p-4 bg-gray-700 rounded-lg">
                  <div className="text-3xl font-bold text-blue-500">
                    {Object.keys(analytics?.proctoring?.violationTypes || {}).length}
                  </div>
                  <div className="text-gray-400">Violation Types</div>
                </div>
              </div>
            </div>

            {/* Trends Chart Placeholder */}
            {(() => {
              const maxCount = Math.max(...trends.map((d: any) => d.count), 1);
              return (
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Interview Trends (30 Days)</h2>
              <div className="h-64 flex items-end gap-2">
                {trends.slice(-14).map((day: any, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${(day.count / maxCount) * 100}%`, minHeight: '4px' }}
                    ></div>
                    <span className="text-xs text-gray-400 mt-2">{new Date(day.date).getDate()}</span>
                  </div>
                ))}
              </div>
            </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string | number; icon: string }) {
  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}