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

router.post("/report/generate", requireAuth, (req, res) => {
  const config = req.body;
  const result = generateReport(config);
  res.json({ success: true, data: result });
});

router.get("/dashboard/:userId", requireAuth, (req, res) => {
  const { userId } = req.params;
  const { role } = req.query as { role: "candidate" | "interviewer" | "admin" };
  const result = createDashboard(userId, role || "candidate");
  res.json({ success: true, data: result });
});

router.get("/dashboard", requireAuth, (req, res) => {
  const authReq = req as any;
  const userId = authReq.user?.userId || authReq.user?.id || "current_user";
  const { role } = req.query as { role: "candidate" | "interviewer" | "admin" };
  const result = createDashboard(userId, role || "candidate");
  res.json({ success: true, data: result });
});

router.get("/trends", requireAuth, (req, res) => {
  const { days } = req.query as { days: string };
  const daysNum = parseInt(days) || 30;
  const authReq = req as any;
  const userId = authReq.user?.userId || authReq.user?.id || "current_user";
  
  const trends = [];
  for (let i = daysNum - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    trends.push({
      date: date.toISOString().split('T')[0],
      interviews: Math.floor(Math.random() * 5) + 1,
      avgScore: Math.floor(Math.random() * 20) + 70,
      completionRate: Math.floor(Math.random() * 15) + 85,
    });
  }
  res.json({ success: true, trends });
});

router.get("/top-performers", requireAuth, (req, res) => {
  const { limit } = req.query as { limit: string };
  const limitNum = parseInt(limit) || 10;
  
  const performers = [
    { id: '1', name: 'Sarah Chen', score: 96, interviews: 12, improvement: '+15%' },
    { id: '2', name: 'Michael Rodriguez', score: 94, interviews: 8, improvement: '+12%' },
    { id: '3', name: 'Emily Watson', score: 92, interviews: 15, improvement: '+8%' },
    { id: '4', name: 'David Kim', score: 90, interviews: 6, improvement: '+20%' },
    { id: '5', name: 'Jessica Patel', score: 88, interviews: 10, improvement: '+5%' },
  ].slice(0, limitNum);
  
  res.json({ success: true, performers });
});

router.post("/report/export", requireAuth, (req, res) => {
  const { reportId, format } = req.body;
  const result = exportReport(reportId, format);
  res.json({ success: true, data: result });
});

router.post("/report/schedule", requireAuth, (req, res) => {
  const { config, frequency } = req.body;
  const result = scheduleReport(config, frequency);
  res.json({ success: true, data: result });
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

// Pipeline endpoints
router.get("/pipeline", requireAuth, (req, res) => {
  const { tenantId } = req.query;
  const candidates = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Frontend Dev', score: 85, stage: 'interview', tags: ['React', 'TypeScript'], lastActivity: new Date().toISOString() },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Backend Dev', score: 78, stage: 'screening', tags: ['Node', 'Python'], lastActivity: new Date(Date.now() - 86400000).toISOString() },
    { id: '3', name: 'Bob Wilson', email: 'bob@example.com', role: 'Full Stack', score: 92, stage: 'offer', tags: ['React', 'Node'], lastActivity: new Date(Date.now() - 10800000).toISOString() },
    { id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'Data Scientist', score: 65, stage: 'new', tags: ['Python', 'ML'], lastActivity: new Date().toISOString() },
    { id: '5', name: 'Charlie Davis', email: 'charlie@example.com', role: 'DevOps', score: 45, stage: 'rejected', tags: ['AWS', 'Docker'], lastActivity: new Date(Date.now() - 432000000).toISOString() },
  ];
  res.json({ candidates, count: candidates.length });
});

router.put("/pipeline/candidate/:id/stage", requireAuth, (req, res) => {
  const { id } = req.params;
  const { stage } = req.body;
  res.json({ success: true, candidateId: id, newStage: stage });
});

router.post("/pipeline/candidate", requireAuth, (req, res) => {
  const { name, email, role, tags } = req.body;
  const newCandidate = {
    id: `cand_${Date.now()}`,
    name,
    email,
    role,
    score: 0,
    stage: 'new',
    tags: tags || [],
    lastActivity: new Date().toISOString(),
  };
  res.json({ success: true, candidate: newCandidate });
});

router.delete("/pipeline/candidate/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  res.json({ success: true, candidateId: id, deleted: true });
});

export default router;