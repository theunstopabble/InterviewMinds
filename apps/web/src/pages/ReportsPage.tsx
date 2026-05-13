import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportService } from '../services/enterprise';

interface Report {
  reportId: string;
  candidate: { name: string; email: string };
  overallScore: number;
  recommendation: string;
  interviews: { role: string; type: string; score: number }[];
  generatedAt: string;
}

function getCurrentUserId(): string {
  // @ts-ignore - Clerk global
  return window.Clerk?.user?.id || 'default-user';
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'json'>('pdf');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    // Get user ID from Clerk
    // @ts-ignore
    window.Clerk?.user?.get('id').then((id: string) => {
      const uid = id || getCurrentUserId();
      setUserId(uid);
      loadReports(uid);
    }).catch(() => {
      const uid = getCurrentUserId();
      setUserId(uid);
      loadReports(uid);
    });
  }, []);

  const loadReports = async (uid: string) => {
    setLoading(true);
    try {
      const data = await reportService.getCandidateReports(uid).catch(() => ({ reports: [] }));
      setReports(data.reports || []);
    } catch (e) {
      console.error('Error loading reports:', e);
    }
    setLoading(false);
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      await reportService.generate(userId, []).catch(() => {});
      loadReports(userId);
    } catch (e) {
      console.error('Error generating report:', e);
    }
    setLoading(false);
  };

  const downloadReport = async (reportId: string) => {
    try {
      if (exportFormat === 'pdf') {
        await reportService.downloadPDF(reportId);
      } else if (exportFormat === 'csv') {
        const data = await reportService.downloadCSV([reportId]);
        const blob = new Blob([data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportId}.csv`;
        a.click();
      } else {
        const data = await reportService.downloadJSON([reportId]);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportId}.json`;
        a.click();
      }
    } catch (e) {
      console.error('Error downloading report:', e);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRecommendationBadge = (rec: string) => {
    if (rec.toLowerCase().includes('strong hire')) return 'bg-green-600';
    if (rec.toLowerCase().includes('hire')) return 'bg-green-500/30 text-green-400';
    if (rec.toLowerCase().includes('neutral')) return 'bg-yellow-500/30 text-yellow-400';
    return 'bg-red-500/30 text-red-400';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">📊 Reports</h1>
            <p className="text-gray-400 mt-1">Generate and export candidate reports</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
            >
              ← Back
            </button>
            <button
              onClick={generateReport}
              className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition"
            >
              + Generate Report
            </button>
          </div>
        </div>

        {/* Export Format Selector */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-gray-800 rounded-xl">
          <span className="text-gray-400">Export Format:</span>
          <div className="flex gap-2">
            {[
              { key: 'pdf', label: '📄 PDF', desc: 'Print-ready' },
              { key: 'csv', label: '📊 CSV', desc: 'Spreadsheet' },
              { key: 'json', label: '📋 JSON', desc: 'Data export' },
            ].map((format) => (
              <button
                key={format.key}
                onClick={() => setExportFormat(format.key as any)}
                className={`px-4 py-2 rounded-lg transition ${
                  exportFormat === format.key
                    ? 'bg-blue-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {format.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {reports.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-8 text-center">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-xl font-semibold mb-2">No Reports Yet</h3>
                <p className="text-gray-400 mb-4">Complete interviews to generate reports</p>
                <button
                  onClick={generateReport}
                  className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition"
                >
                  Generate Sample Report
                </button>
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.reportId}
                  className="bg-gray-800 rounded-xl p-4 hover:bg-gray-750 transition cursor-pointer"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-semibold text-lg">{report.candidate.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm ${getRecommendationBadge(report.recommendation)}`}>
                          {report.recommendation.split(' - ')[0]}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{report.candidate.email}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">
                          Interviews: {report.interviews.length}
                        </span>
                        <span className="text-gray-500">
                          Generated: {new Date(report.generatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getScoreColor(report.overallScore)}`}>
                        {report.overallScore}
                        <span className="text-lg text-gray-500">/100</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadReport(report.reportId);
                        }}
                        className="mt-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm transition"
                      >
                        Download {exportFormat.toUpperCase()}
                      </button>
                    </div>
                  </div>

                  {report.interviews.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">Interview Breakdown:</div>
                      <div className="flex gap-4">
                        {report.interviews.map((interview, i) => (
                          <div key={i} className="bg-gray-700 rounded-lg p-2 px-3">
                            <div className="text-xs text-gray-400">{interview.role}</div>
                            <div className="font-medium">{interview.score}/100</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Report Detail Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Candidate Report</h2>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700">
                <div>
                  <h3 className="text-xl font-semibold">{selectedReport.candidate.name}</h3>
                  <p className="text-gray-400">{selectedReport.candidate.email}</p>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${getScoreColor(selectedReport.overallScore)}`}>
                    {selectedReport.overallScore}
                  </div>
                  <div className="text-gray-500">Overall Score</div>
                </div>
              </div>

              {/* Recommendation */}
              <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Recommendation</div>
                <div className="font-medium">{selectedReport.recommendation}</div>
              </div>

              {/* Interview Summary */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Interview Summary</h4>
                <div className="space-y-2">
                  {selectedReport.interviews.map((interview, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div>
                        <div className="font-medium">{interview.role}</div>
                        <div className="text-sm text-gray-400">{interview.type}</div>
                      </div>
                      <div className={`text-xl font-bold ${getScoreColor(interview.score)}`}>
                        {interview.score}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => downloadReport(selectedReport.reportId)}
                  className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition"
                >
                  Download {exportFormat.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}