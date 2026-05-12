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

export default router;