import { Router } from "express";
import {
  predictAttritionRisk,
  predictJobPerformance,
  optimizeInterviewDuration,
  matchBestInterviewer,
} from "../lib/predictiveAnalytics";
import {
  analyzeSentiment,
  analyzeConversation,
  compareCandidateSentiment,
} from "../lib/sentimentAnalysis";
import {
  generateReport,
  createDashboard,
  exportReport,
  scheduleReport,
} from "../lib/reportingService";
import {
  aggregateMetrics,
  aggregateTimeSeries,
  calculatePercentile,
  calculateMovingAverage,
  computeCorrelation,
} from "../lib/metricsAggregator";
import {
  detectAnomalies,
  checkThreshold,
  detectSessionAnomalies,
  predictAnomaly,
} from "../lib/anomalyDetector";
import { requireAuth } from "../middleware/auth";
import { InterviewModel } from "../models/Interview";
import { ResumeModel } from "../models/Resume";

const router = Router();

router.post("/predict/attrition", requireAuth, (req, res) => {
  const { previousJobChanges, tenure, reasonsForLeaving, salaryExpectation, marketCompensation } = req.body;
  const result = predictAttritionRisk({
    previousJobChanges,
    tenure,
    reasonsForLeaving,
    salaryExpectation,
    marketCompensation,
  });
  res.json({ success: true, data: result });
});

router.post("/predict/performance", requireAuth, (req, res) => {
  const { experience, education, skills, previousRoles, interviewScore, communicationScore, technicalScore, culturalFit } = req.body;
  const result = predictJobPerformance({
    experience,
    education,
    skills,
    previousRoles,
    interviewScore,
    communicationScore,
    technicalScore,
    culturalFit,
  });
  res.json({ success: true, data: result });
});

router.post("/optimize/interview-duration", requireAuth, (req, res) => {
  const { jobLevel, candidateExperience, technicalComplexity } = req.body;
  const result = optimizeInterviewDuration(jobLevel, candidateExperience, technicalComplexity);
  res.json({ success: true, data: result });
});

router.post("/match/interviewer", requireAuth, (req, res) => {
  const { candidate, interviewers } = req.body;
  const result = matchBestInterviewer(candidate, interviewers);
  res.json({ success: true, data: result });
});

router.post("/sentiment/analyze", requireAuth, (req, res) => {
  const { text } = req.body;
  const result = analyzeSentiment(text);
  res.json({ success: true, data: result });
});

router.post("/sentiment/conversation", requireAuth, (req, res) => {
  const { responses } = req.body;
  const result = analyzeConversation(responses);
  res.json({ success: true, data: result });
});

router.post("/sentiment/compare", requireAuth, (req, res) => {
  const { candidateResponses, idealResponses } = req.body;
  const result = compareCandidateSentiment(candidateResponses, idealResponses);
  res.json({ success: true, data: result });
});

router.post("/report/generate", requireAuth, async (req, res, next) => {
  try {
    const config = req.body;
    const result = await generateReport(config);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get("/dashboard/:userId", requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.query as { role: "candidate" | "interviewer" | "admin" };
    const result = await createDashboard(userId, role || "candidate");
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get("/dashboard", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as any;
    const userId = authReq.user?.userId || authReq.user?.id || "current_user";
    const { role } = req.query as { role: "candidate" | "interviewer" | "admin" };
    const result = await createDashboard(userId, role || "candidate");
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get("/trends", requireAuth, async (req, res, next) => {
  try {
    const { days } = req.query as { days: string };
    const daysNum = parseInt(days) || 30;
    const authReq = req as any;
    const userId = authReq.user?.userId || authReq.user?.id;

    const start = new Date();
    start.setDate(start.getDate() - daysNum);

    let query: Record<string, unknown> = { createdAt: { $gte: start } };
    if (userId) query = { ...query, userId };

    const agg = await InterviewModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          interviews: { $sum: 1 },
          avgScore: { $avg: "$score" },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const trends = agg.map((t) => ({
      date: t._id,
      interviews: t.interviews,
      avgScore: t.avgScore ? Math.round(t.avgScore) : 0,
      completionRate: t.interviews > 0 ? Math.round((t.completed / t.interviews) * 100) : 0,
    }));

    res.json({ success: true, trends });
  } catch (err) {
    next(err);
  }
});

router.get("/top-performers", requireAuth, async (req, res, next) => {
  try {
    const { limit } = req.query as { limit: string };
    const limitNum = Math.min(parseInt(limit) || 10, 50);
    const authReq = req as any;
    const userId = authReq.user?.userId || authReq.user?.id;

    let query: Record<string, unknown> = { score: { $gt: 0 } };
    if (userId) query = { ...query, userId };

    const agg = await InterviewModel.aggregate([
      { $match: query },
      { $sort: { score: -1 } },
      { $group: { _id: "$userId", bestScore: { $first: "$score" }, count: { $sum: 1 } } },
      { $sort: { bestScore: -1 } },
      { $limit: limitNum },
    ]);

    const performers = agg.map((p, idx) => ({
      id: String(p._id),
      name: `User ${String(p._id).slice(0, 8)}`,
      score: Math.round(p.bestScore as number),
      interviews: p.count,
      improvement: "-",
    }));

    res.json({ success: true, performers });
  } catch (err) {
    next(err);
  }
});

router.post("/report/export", requireAuth, async (req, res, next) => {
  try {
    const { reportId, format } = req.body;
    const result = await exportReport(reportId, format);
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.setHeader("Content-Type", result.mimeType);
    res.send(result.content);
  } catch (err) {
    next(err);
  }
});

router.post("/report/schedule", requireAuth, async (req, res, next) => {
  try {
    const { config, frequency } = req.body;
    const authReq = req as any;
    const createdBy = authReq.user?.userId || authReq.user?.id || "system";
    const result = await scheduleReport(config, frequency, createdBy);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post("/metrics/aggregate", requireAuth, (req, res) => {
  const { values } = req.body;
  const result = aggregateMetrics(values);
  res.json({ success: true, data: result });
});

router.post("/metrics/timeseries", requireAuth, (req, res) => {
  const { data, interval } = req.body;
  const result = aggregateTimeSeries(data, interval);
  res.json({ success: true, data: result });
});

router.post("/metrics/percentile", requireAuth, (req, res) => {
  const { values, percentile } = req.body;
  const result = calculatePercentile(values, percentile);
  res.json({ success: true, data: { percentile, value: result } });
});

router.post("/metrics/moving-average", requireAuth, (req, res) => {
  const { data, windowSize } = req.body;
  const result = calculateMovingAverage(data, windowSize);
  res.json({ success: true, data: result });
});

router.post("/metrics/correlation", requireAuth, (req, res) => {
  const { x, y } = req.body;
  const result = computeCorrelation(x, y);
  res.json({ success: true, data: { correlation: result } });
});

router.post("/anomaly/detect", requireAuth, (req, res) => {
  const { values, method } = req.body;
  const result = detectAnomalies(values, method);
  res.json({ success: true, data: { anomalies: result.filter(a => a.isAnomaly), total: result.length } });
});

router.post("/anomaly/threshold", requireAuth, (req, res) => {
  const { value, config } = req.body;
  const result = checkThreshold(value, config);
  res.json({ success: true, data: result });
});

router.post("/anomaly/session", requireAuth, (req, res) => {
  const { sessionData, baseline } = req.body;
  const result = detectSessionAnomalies(sessionData, baseline);
  res.json({ success: true, data: { anomalies: result, count: result.length } });
});

router.post("/anomaly/predict", requireAuth, (req, res) => {
  const { historicalData, horizon } = req.body;
  const result = predictAnomaly(historicalData, horizon);
  res.json({ success: true, data: result });
});

/* ------------------------------------------------------------------ */
/*  PIPELINE (queries real Interview + Resume data)                      */
/* ------------------------------------------------------------------ */

router.get("/pipeline", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as any;
    const userId = authReq.user?.userId || authReq.user?.id;

    let query: Record<string, unknown> = {};
    if (userId) query = { userId };

    const interviews = await InterviewModel.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    /* pull resume names if available */
    const resumeIds = interviews.map((i) => i.resumeId).filter(Boolean);
    const resumes = await ResumeModel.find({ _id: { $in: resumeIds } }).select("_id fileName").lean();
    const resumeMap = new Map(resumes.map((r) => [String(r._id), r.fileName]));

    const candidates = interviews.map((i) => ({
      id: String(i._id),
      userId: i.userId,
      name: resumeMap.get(i.resumeId) || `Candidate ${i.userId?.slice(0, 6)}`,
      score: i.score || 0,
      stage: i.status === "completed" ? "completed" : "interview",
      tags: i.metrics?.map((m: any) => m.subject) || [],
      lastActivity: i.createdAt,
    }));

    res.json({ candidates, count: candidates.length });
  } catch (err) {
    next(err);
  }
});

router.put("/pipeline/candidate/:id/stage", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;
    const update: Record<string, unknown> = {};
    if (stage === "completed") update.status = "completed";
    else if (stage === "interview") update.status = "ongoing";
    const doc = await InterviewModel.findByIdAndUpdate(id, update, { new: true }).lean();
    res.json({ success: true, candidateId: id, newStage: stage, updated: !!doc });
  } catch (err) {
    next(err);
  }
});

router.post("/pipeline/candidate", requireAuth, async (req, res, next) => {
  try {
    const { name, email, role, tags } = req.body;
    const authReq = req as any;
    const userId = authReq.user?.userId || authReq.user?.id || "unknown";

    const doc = await InterviewModel.create({
      userId,
      resumeId: `manual_${Date.now()}`,
      status: "ongoing",
      score: 0,
      messages: [],
      metrics: (tags || []).map((t: string) => ({ subject: t, A: 0, fullMark: 100 })),
    });

    res.json({
      success: true,
      candidate: {
        id: String(doc._id),
        name,
        email,
        role,
        score: 0,
        stage: "new",
        tags: tags || [],
        lastActivity: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/pipeline/candidate/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await InterviewModel.findByIdAndDelete(id);
    res.json({ success: true, candidateId: id, deleted: !!result });
  } catch (err) {
    next(err);
  }
});

export default router;