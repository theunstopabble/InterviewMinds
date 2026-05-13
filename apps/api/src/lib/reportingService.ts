import { logger } from "./logger";
import { InterviewModel } from "../models/Interview";
import { AuditLogModel } from "../models/AuditLog";
import { Parser } from "json2csv";

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
    topPerformers: Array<{ userId: string; name: string; score: number }>;
  };
}

export interface DashboardWidget {
  id: string;
  type: "chart" | "metric" | "table" | "list";
  title: string;
  data: unknown;
  config?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  REAL REPORT GENERATION (queries MongoDB)                           */
/* ------------------------------------------------------------------ */

export async function generateReport(config: ReportConfig): Promise<GeneratedReport> {
  const { start, end } = config.dateRange;
  const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  /* base query */
  const baseQuery: Record<string, unknown> = {
    createdAt: { $gte: start, $lte: end },
  };

  /* fetch real aggregates */
  const totalSessions = await InterviewModel.countDocuments(baseQuery);
  const completedSessions = await InterviewModel.countDocuments({
    ...baseQuery,
    status: "completed",
  });
  const avgScoreAgg = await InterviewModel.aggregate([
    { $match: { ...baseQuery, score: { $gt: 0 } } },
    { $group: { _id: null, avg: { $avg: "$score" } } },
  ]);
  const averageScore = avgScoreAgg.length ? Math.round(avgScoreAgg[0].avg as number) : 0;
  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  /* top performers (by score, distinct userId) */
  const topAgg = await InterviewModel.aggregate([
    { $match: { ...baseQuery, score: { $gt: 0 } } },
    { $sort: { score: -1 } },
    { $group: { _id: "$userId", bestScore: { $first: "$score" } } },
    { $sort: { bestScore: -1 } },
    { $limit: 5 },
  ]);
  const topPerformers = topAgg.map((t) => ({
    userId: String(t._id),
    name: String(t._id).slice(0, 8),
    score: Math.round(t.bestScore as number),
  }));

  /* build data payload based on requested metrics */
  const data: Record<string, unknown> = {};

  if (config.metrics.includes("completion")) {
    data.completionRate = completionRate;
  }
  if (config.metrics.includes("score")) {
    data.averageScore = averageScore;
  }
  if (config.metrics.includes("engagement")) {
    /* engagement = message count per session */
    const msgAgg = await InterviewModel.aggregate([
      { $match: baseQuery },
      { $project: { msgCount: { $size: { $ifNull: ["$messages", []] } } } },
      { $group: { _id: null, avg: { $avg: "$msgCount" } } },
    ]);
    data.engagementScore = msgAgg.length ? Math.round(msgAgg[0].avg as number) : 0;
  }
  if (config.metrics.includes("sessions")) {
    data.totalSessions = totalSessions;
  }
  if (config.metrics.includes("trend")) {
    const trend = await InterviewModel.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
          avgScore: { $avg: "$score" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    data.trend = trend;
  }

  logger.info({ reportId, totalSessions, averageScore }, "Report generated from DB");

  return {
    id: reportId,
    config,
    generatedAt: new Date(),
    data,
    summary: {
      totalSessions,
      averageScore,
      completionRate,
      topPerformers,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  REAL DASHBOARD (queries MongoDB)                                   */
/* ------------------------------------------------------------------ */

export async function createDashboard(
  userId: string,
  role: "candidate" | "interviewer" | "admin"
): Promise<{
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
  widgets: DashboardWidget[];
  layout: string[];
}> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let query: Record<string, unknown> = { createdAt: { $gte: thirtyDaysAgo } };
  if (role === "candidate") {
    query = { ...query, userId };
  }

  const totalInterviews = await InterviewModel.countDocuments(query);
  const completedCount = await InterviewModel.countDocuments({ ...query, status: "completed" });
  const avgScoreAgg = await InterviewModel.aggregate([
    { $match: { ...query, score: { $gt: 0 } } },
    { $group: { _id: null, avg: { $avg: "$score" } } },
  ]);
  const averageScore = avgScoreAgg.length ? Math.round(avgScoreAgg[0].avg as number) : 0;

  /* completion rate */
  const completionRate = totalInterviews > 0 ? Math.round((completedCount / totalInterviews) * 100) : 0;

  /* avg duration = avg message count * 2 min (heuristic) */
  const msgAgg = await InterviewModel.aggregate([
    { $match: query },
    { $project: { msgCount: { $size: { $ifNull: ["$messages", []] } } } },
    { $group: { _id: null, avg: { $avg: "$msgCount" } } },
  ]);
  const averageDuration = msgAgg.length ? Math.round((msgAgg[0].avg as number) * 2) : 0;

  /* score distribution */
  const distAgg = await InterviewModel.aggregate([
    { $match: { ...query, score: { $gt: 0 } } },
    {
      $bucket: {
        groupBy: "$score",
        boundaries: [0, 60, 70, 80, 90, 101],
        default: "other",
        output: { count: { $sum: 1 } },
      },
    },
  ]);
  const distMap = new Map<string, number>();
  for (const b of distAgg) {
    distMap.set(String(b._id), b.count as number);
  }

  const scoreDistribution = {
    below60: distMap.get("0") || 0,
    range60_69: distMap.get("60") || 0,
    range70_79: distMap.get("70") || 0,
    range80_89: distMap.get("80") || 0,
    range90_100: distMap.get("90") || 0,
  };

  /* recent interviews for widgets */
  const recent = await InterviewModel.find(query)
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const recentList = recent.map((r) => ({
    id: String(r._id),
    userId: r.userId,
    status: r.status,
    score: r.score || 0,
    createdAt: r.createdAt,
  }));

  const commonWidgets: DashboardWidget[] = [
    {
      id: "recent_sessions",
      type: "list",
      title: "Recent Sessions",
      data: recentList,
    },
    {
      id: "performance_metric",
      type: "metric",
      title: "Average Score",
      data: { score: averageScore, trend: "-" },
    },
  ];

  if (role === "admin") {
    /* admin sees system-wide stats */
    const auditCount = await AuditLogModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    return {
      overview: {
        totalInterviews,
        completionRate,
        averageScore,
        averageDuration,
      },
      scoreDistribution,
      widgets: [
        ...commonWidgets,
        {
          id: "system_overview",
          type: "chart",
          title: "System Overview",
          data: {
            totalInterviews,
            avgScore: averageScore,
            completionRate,
            auditEvents: auditCount,
          },
        },
        {
          id: "score_dist_chart",
          type: "chart",
          title: "Score Distribution",
          data: [
            { range: "90-100", count: scoreDistribution.range90_100 },
            { range: "80-89", count: scoreDistribution.range80_89 },
            { range: "70-79", count: scoreDistribution.range70_79 },
            { range: "60-69", count: scoreDistribution.range60_69 },
            { range: "<60", count: scoreDistribution.below60 },
          ],
        },
      ],
      layout: ["system_overview", "performance_metric", "recent_sessions", "score_dist_chart"],
    };
  }

  if (role === "interviewer") {
    return {
      overview: {
        totalInterviews,
        completionRate,
        averageScore,
        averageDuration,
      },
      scoreDistribution,
      widgets: [
        ...commonWidgets,
        {
          id: "candidate_list",
          type: "list",
          title: "Recent Candidates",
          data: recentList.map((r) => ({
            userId: r.userId,
            status: r.status,
            score: r.score,
          })),
        },
      ],
      layout: ["performance_metric", "candidate_list", "recent_sessions"],
    };
  }

  /* candidate role */
  return {
    overview: {
      totalInterviews,
      completionRate,
      averageScore,
      averageDuration,
    },
    scoreDistribution,
    widgets: commonWidgets,
    layout: ["recent_sessions", "performance_metric"],
  };
}

/* ------------------------------------------------------------------ */
/*  EXPORT (generates real CSV / JSON in-memory)                         */
/* ------------------------------------------------------------------ */

export async function exportReport(
  reportId: string,
  format: "pdf" | "csv" | "excel" | "json"
): Promise<{ content: string; mimeType: string; filename: string }> {
  const report = await InterviewModel.find().sort({ createdAt: -1 }).limit(1000).lean();

  if (format === "csv") {
    const parser = new Parser({
      fields: ["_id", "userId", "status", "score", "feedback", "createdAt"],
    });
    const csv = parser.parse(report);
    return {
      content: csv,
      mimeType: "text/csv",
      filename: `report_${reportId}.csv`,
    };
  }

  if (format === "json") {
    return {
      content: JSON.stringify(report, null, 2),
      mimeType: "application/json",
      filename: `report_${reportId}.json`,
    };
  }

  if (format === "excel") {
    const parser = new Parser({
      fields: ["_id", "userId", "status", "score", "feedback", "createdAt"],
    });
    const csv = parser.parse(report);
    return {
      content: csv,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: `report_${reportId}.xlsx`,
    };
  }

  /* pdf — formatted text report (no PDF library available) */
  const lines = [
    `InterviewMinds Report: ${reportId}`,
    `Generated: ${new Date().toISOString()}`,
    `Total Records: ${report.length}`,
    "",
    "---",
    "",
  ];
  for (const r of report) {
    lines.push(`ID: ${r._id}`);
    lines.push(`User: ${r.userId}`);
    lines.push(`Status: ${r.status}`);
    lines.push(`Score: ${r.score ?? "N/A"}`);
    lines.push(`Feedback: ${r.feedback ?? "N/A"}`);
    lines.push(`Created: ${r.createdAt}`);
    lines.push("");
  }
  return {
    content: lines.join("\n"),
    mimeType: "text/plain",
    filename: `report_${reportId}.txt`,
  };
}

/* ------------------------------------------------------------------ */
/*  SCHEDULED REPORTS (persisted in MongoDB via a lightweight model)   */
/* ------------------------------------------------------------------ */

import mongoose from "mongoose";

const scheduledReportSchema = new mongoose.Schema({
  config: { type: Object, required: true },
  frequency: { type: String, enum: ["daily", "weekly", "monthly"], required: true },
  nextRun: { type: Date, required: true },
  lastRun: { type: Date, default: null },
  active: { type: Boolean, default: true },
  createdBy: { type: String, required: true },
}, { timestamps: true });

const ScheduledReportModel = mongoose.model("ScheduledReport", scheduledReportSchema);

export async function scheduleReport(
  config: ReportConfig,
  frequency: "daily" | "weekly" | "monthly",
  createdBy = "system"
): Promise<{ scheduleId: string; nextRun: Date }> {
  const nextRun = new Date();
  if (frequency === "daily") nextRun.setDate(nextRun.getDate() + 1);
  else if (frequency === "weekly") nextRun.setDate(nextRun.getDate() + 7);
  else nextRun.setMonth(nextRun.getMonth() + 1);

  const doc = await ScheduledReportModel.create({
    config,
    frequency,
    nextRun,
    createdBy,
  });

  logger.info({ scheduleId: doc._id, frequency, nextRun }, "Report scheduled in DB");

  return { scheduleId: String(doc._id), nextRun };
}

export async function getScheduledReports(createdBy?: string): Promise<unknown[]> {
  const q = createdBy ? { createdBy } : {};
  return ScheduledReportModel.find(q).sort({ nextRun: 1 }).lean();
}

export async function runDueReports(): Promise<number> {
  const now = new Date();
  const due = await ScheduledReportModel.find({ active: true, nextRun: { $lte: now } }).lean();

  let runCount = 0;
  for (const job of due) {
    try {
      await generateReport(job.config as ReportConfig);
      await ScheduledReportModel.updateOne(
        { _id: job._id },
        { lastRun: now, nextRun: calculateNextRun(job.frequency as string, now) }
      );
      runCount++;
    } catch (err) {
      logger.error({ err, scheduleId: job._id }, "Scheduled report failed");
    }
  }
  return runCount;
}

function calculateNextRun(frequency: string, from: Date): Date {
  const d = new Date(from);
  if (frequency === "daily") d.setDate(d.getDate() + 1);
  else if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d;
}