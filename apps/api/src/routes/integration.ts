import { Router } from "express";
import { logger } from "../lib/logger";
import {
  syncWorkdayEmployees,
  pushCandidateToWorkday,
  getWorkdayCandidateStatus,
  syncBambooEmployees,
  syncSAPEmployees,
  validateHRISConfig,
  performHRISSync,
} from "../lib/hrisIntegration";
import {
  sendSlackMessage,
  createSlackChannel,
  addUserToSlackChannel,
  formatSlackNotification,
  sendTeamsMessage,
  createTeamsChannel,
  formatTeamsNotification,
  sendDiscordMessage,
  createDiscordEmbed,
  createJitsiMeeting,
  getJitsiMeeting,
  createGoogleMeetEvent,
  formatCalendarInvite,
} from "../lib/communicationIntegration";
import {
  verifyIdentity,
  initiateBackgroundCheck,
  getBackgroundCheckStatus,
  verifyEmployment,
  verifyEducation,
  scheduleDrugTest,
  getDrugTestResult,
  generateComplianceReport,
} from "../lib/backgroundCheck";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/hris/validate", requireAuth, (req, res) => {
  const { config } = req.body;
  const result = validateHRISConfig(config);
  res.json({ success: true, data: result });
});

router.post("/hris/sync", requireAuth, async (req, res) => {
  try {
    const { config } = req.body;
    const result = await performHRISSync(config);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/hris/workday/employees", requireAuth, async (req, res) => {
  try {
    const { config } = req.body;
    const employees = await syncWorkdayEmployees(config);
    res.json({ success: true, data: { employees, count: employees.length } });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/hris/workday/candidate", requireAuth, async (req, res) => {
  try {
    const { candidate, config } = req.body;
    const result = await pushCandidateToWorkday(candidate, config);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/hris/workday/candidate/:id/status", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { config } = req.query;
    const result = await getWorkdayCandidateStatus(id, config as any);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/hris/bamboo/employees", requireAuth, async (req, res) => {
  try {
    const { config } = req.body;
    const employees = await syncBambooEmployees(config);
    res.json({ success: true, data: { employees, count: employees.length } });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/hris/sap/employees", requireAuth, async (req, res) => {
  try {
    const { config } = req.body;
    const employees = await syncSAPEmployees(config);
    res.json({ success: true, data: { employees, count: employees.length } });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/slack/send", requireAuth, async (req, res) => {
  try {
    const { webhookUrl, message } = req.body;
    const result = await sendSlackMessage(webhookUrl, message);
    res.json({ success: result });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/slack/channel", requireAuth, async (req, res) => {
  try {
    const { name, topic } = req.body;
    const channel = await createSlackChannel(name, topic);
    res.json({ success: true, data: channel });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/slack/channel/add-user", requireAuth, async (req, res) => {
  try {
    const { channelId, userId } = req.body;
    const result = await addUserToSlackChannel(channelId, userId);
    res.json({ success: result });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/slack/notification", requireAuth, async (req, res) => {
  try {
    const { webhookUrl, notification } = req.body;
    const message = formatSlackNotification(notification);
    const result = await sendSlackMessage(webhookUrl, message);
    res.json({ success: result });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/teams/send", requireAuth, async (req, res) => {
  try {
    const { webhookUrl, message } = req.body;
    const result = await sendTeamsMessage(webhookUrl, message);
    res.json({ success: result });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/teams/channel", requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    const channel = await createTeamsChannel(name);
    res.json({ success: true, data: channel });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/teams/notification", requireAuth, async (req, res) => {
  try {
    const { webhookUrl, notification } = req.body;
    const message = formatTeamsNotification(notification);
    const result = await sendTeamsMessage(webhookUrl, message);
    res.json({ success: result });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/discord/send", requireAuth, async (req, res) => {
  try {
    const { webhookUrl, message } = req.body;
    const result = await sendDiscordMessage(webhookUrl, message);
    res.json({ success: result });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/discord/notification", requireAuth, async (req, res) => {
  try {
    const { webhookUrl, notification } = req.body;
    const { embed } = createDiscordEmbed(notification);
    const result = await sendDiscordMessage(webhookUrl, { channelId: "default", content: "", embeds: [embed] });
    res.json({ success: result });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/video/jitsi/create", requireAuth, async (req, res) => {
  try {
    const { topic, startTime, duration } = req.body;
    const meeting = await createJitsiMeeting({ topic, startTime: new Date(startTime), duration });
    res.json({ success: true, data: meeting });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/video/jitsi/:roomName", requireAuth, async (req, res) => {
  try {
    const { roomName } = req.params;
    const meeting = await getJitsiMeeting(roomName);
    if (!meeting) return res.status(404).json({ success: false, error: "Meeting not found" });
    res.json({ success: true, data: meeting });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/video/google-meet/create", requireAuth, async (req, res) => {
  try {
    const { config, event } = req.body;
    const result = await createGoogleMeetEvent(config, {
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
    });
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/calendar/invite", requireAuth, (req, res) => {
  const { candidateEmail, interviewerEmail, interviewTime, duration, meetingLink } = req.body;
  const result = formatCalendarInvite(candidateEmail, interviewerEmail, new Date(interviewTime), duration, meetingLink);
  res.json({ success: true, data: result });
});

router.post("/background/verify-identity", requireAuth, async (req, res) => {
  try {
    const { data } = req.body;
    const result = await verifyIdentity(data);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/background/check", requireAuth, async (req, res) => {
  try {
    const { request } = req.body;
    const result = await initiateBackgroundCheck(request);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/background/check/:checkId", requireAuth, async (req, res) => {
  try {
    const { checkId } = req.params;
    const result = await getBackgroundCheckStatus(checkId);
    if (!result) return res.status(404).json({ success: false, error: "Check not found" });
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/background/verify-employment", requireAuth, async (req, res) => {
  try {
    const { company, position, startDate, managerEmail } = req.body;
    const result = await verifyEmployment(company, position, new Date(startDate), managerEmail);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/background/verify-education", requireAuth, async (req, res) => {
  try {
    const { institution, degree, graduationYear } = req.body;
    const result = await verifyEducation(institution, degree, graduationYear);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/background/drug-test/schedule", requireAuth, async (req, res) => {
  try {
    const { candidateId, panel } = req.body;
    const result = await scheduleDrugTest(candidateId, panel);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/background/drug-test/:testId", requireAuth, async (req, res) => {
  try {
    const { testId } = req.params;
    const result = await getDrugTestResult(testId);
    if (!result) return res.status(404).json({ success: false, error: "Test not found" });
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/compliance/report", requireAuth, async (req, res) => {
  try {
    const { candidateId, verifications, backgroundCheck, employment, education } = req.body;
    const result = generateComplianceReport(candidateId, verifications, backgroundCheck, employment, education);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err, path: req.path }, "Integration route error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;