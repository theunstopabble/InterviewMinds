import { logger } from "./logger";

export interface ReportConfig {
  title: string;
  type: "candidate" | "interviewer" | "session" | "department" | "company";
  dateRange: { start: Date; end: Date };
  metrics: string[];
  filters?: Record<string, unknown>;
}

export interface GeneratedReport {
  id: string;
  config: ReportConfig;
  generatedAt: Date;
  data: Record<string, unknown>;
  summary: {
    totalSessions: number;
    averageScore: number;
    completionRate: number;
    topPerformers: string[];
  };
}

export interface DashboardWidget {
  id: string;
  type: "chart" | "metric" | "table" | "list";
  title: string;
  data: unknown;
  config?: Record<string, unknown>;
}

export function generateReport(config: ReportConfig): GeneratedReport {
  const mockData: Record<string, unknown> = {};
  
  if (config.metrics.includes("completion")) mockData.completionRate = 0.87;
  if (config.metrics.includes("score")) mockData.averageScore = 72;
  if (config.metrics.includes("engagement")) mockData.engagementScore = 81;

  const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id: reportId,
    config,
    generatedAt: new Date(),
    data: mockData,
    summary: {
      totalSessions: 156,
      averageScore: 72,
      completionRate: 87,
      topPerformers: ["Alice Johnson", "Bob Smith", "Charlie Davis"],
    },
  };
}

export function createDashboard(
  userId: string,
  role: "candidate" | "interviewer" | "admin"
): { widgets: DashboardWidget[]; layout: string[] } {
  const commonWidgets: DashboardWidget[] = [
    {
      id: "upcoming_sessions",
      type: "list",
      title: "Upcoming Sessions",
      data: [
        { id: "1", candidate: "John Doe", time: "2026-05-14T10:00:00Z" },
        { id: "2", candidate: "Jane Smith", time: "2026-05-14T14:00:00Z" },
      ],
    },
    {
      id: "recent_performance",
      type: "metric",
      title: "Recent Performance",
      data: { score: 85, trend: "+5%" },
    },
  ];

  if (role === "admin") {
    return {
      widgets: [
        ...commonWidgets,
        {
          id: "company_overview",
          type: "chart",
          title: "Company Overview",
          data: {
            totalInterviews: 1247,
            avgScore: 71,
            completionRate: 89,
          },
        },
        {
          id: "department_metrics",
          type: "table",
          title: "Department Metrics",
          data: [
            { dept: "Engineering", sessions: 450, avgScore: 74 },
            { dept: "Sales", sessions: 320, avgScore: 68 },
            { dept: "Marketing", sessions: 180, avgScore: 72 },
          ],
        },
      ],
      layout: ["company_overview", "recent_performance", "upcoming_sessions", "department_metrics"],
    };
  }

  if (role === "interviewer") {
    return {
      widgets: [
        ...commonWidgets,
        {
          id: "my_candidates",
          type: "list",
          title: "My Candidates",
          data: [
            { name: "Alice Brown", status: "pending", score: 78 },
            { name: "Bob Wilson", status: "completed", score: 82 },
          ],
        },
      ],
      layout: ["recent_performance", "my_candidates", "upcoming_sessions"],
    };
  }

  return {
    widgets: commonWidgets,
    layout: ["upcoming_sessions", "recent_performance"],
  };
}

export function exportReport(
  reportId: string,
  format: "pdf" | "csv" | "excel" | "json"
): { url: string; expiresAt: Date } {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);

  return {
    url: `https://api.interviewminds.com/exports/${reportId}.${format}`,
    expiresAt: expiry,
  };
}

export function scheduleReport(
  config: ReportConfig,
  frequency: "daily" | "weekly" | "monthly"
): { scheduleId: string; nextRun: Date } {
  const scheduleId = `schedule_${Date.now()}`;
  
  const nextRun = new Date();
  if (frequency === "daily") nextRun.setDate(nextRun.getDate() + 1);
  else if (frequency === "weekly") nextRun.setDate(nextRun.getDate() + 7);
  else nextRun.setMonth(nextRun.getMonth() + 1);

  logger.info(`Report scheduled: ${scheduleId}, frequency: ${frequency}`);

  return { scheduleId, nextRun };
}