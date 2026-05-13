import { Router } from "express";
import {
  getRetentionPolicies,
  getRetentionPolicy,
  createRetentionPolicy,
  updateRetentionPolicy,
  deleteRetentionPolicy,
  runRetentionJob,
  getRetentionStats,
} from "../lib/dataRetention";
import {
  detectPII,
  maskValue,
  maskObject,
  maskLogData,
  anonymizeCandidate,
  sanitizeForExport,
} from "../lib/piiMasking";
import { checkSecurityControls, generateComplianceReport as genReport } from "../lib/compliance";
import {
  createAccessRequest,
  approveRequest,
  rejectRequest,
  getUserRequests,
  getPendingApprovals,
  getAllPermissionGroups,
  createPermissionGroup,
  addUserToGroup,
  removeUserFromGroup,
  getUserPermissions,
} from "../lib/accessRequest";
import {
  logAuditEntry,
  getAuditLogs,
  exportAuditTrail,
  generateAuditCSV,
  getAuditStats,
  searchAuditLogs,
} from "../lib/auditTrail";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/retention/policies", requireAuth, (req, res) => {
  const policies = getRetentionPolicies();
  res.json({ success: true, data: policies });
});

router.get("/retention/policies/:id", requireAuth, (req, res) => {
  const policy = getRetentionPolicy(req.params.id);
  if (!policy) return res.status(404).json({ success: false, error: "Policy not found" });
  res.json({ success: true, data: policy });
});

router.post("/retention/policies", requireAuth, (req, res) => {
  const policy = createRetentionPolicy(req.body);
  res.json({ success: true, data: policy });
});

router.put("/retention/policies/:id", requireAuth, (req, res) => {
  const policy = updateRetentionPolicy(req.params.id, req.body);
  if (!policy) return res.status(404).json({ success: false, error: "Policy not found" });
  res.json({ success: true, data: policy });
});

router.delete("/retention/policies/:id", requireAuth, (req, res) => {
  const deleted = deleteRetentionPolicy(req.params.id);
  res.json({ success: deleted });
});

router.post("/retention/run/:policyId", requireAuth, async (req, res) => {
  const job = await runRetentionJob(req.params.policyId);
  res.json({ success: true, data: job });
});

router.get("/retention/stats", requireAuth, (req, res) => {
  const stats = getRetentionStats();
  res.json({ success: true, data: stats });
});

router.post("/pii/detect", requireAuth, (req, res) => {
  const { text } = req.body;
  const detections = detectPII(text);
  res.json({ success: true, data: { detections, count: detections.length } });
});

router.post("/pii/mask", requireAuth, (req, res) => {
  const { value, mode, char } = req.body;
  const masked = maskValue(value, { mode, char, preserveLength: true });
  res.json({ success: true, data: { masked } });
});

router.post("/pii/mask-object", requireAuth, (req, res) => {
  const { object, fields, config } = req.body;
  const masked = maskObject(object, fields, config);
  res.json({ success: true, data: masked });
});

router.post("/pii/anonymize", requireAuth, (req, res) => {
  const { candidate } = req.body;
  const anonymized = anonymizeCandidate(candidate);
  res.json({ success: true, data: anonymized });
});

router.post("/pii/sanitize-export", requireAuth, (req, res) => {
  const { data } = req.body;
  const sanitized = sanitizeForExport(data);
  res.json({ success: true, data: sanitized });
});

router.post("/pii/mask-log", requireAuth, (req, res) => {
  const { data } = req.body;
  const masked = maskLogData(data);
  res.json({ success: true, data: masked });
});

router.post("/access/request", requireAuth, (req, res) => {
  const { requestedPermission, justification, duration, expiryDate } = req.body;
  const userId = (req as any).user?.id || "user_123";
  const userName = (req as any).user?.name || "User";
  const request = createAccessRequest({ userId, userName, requestedPermission, justification, duration, expiryDate });
  res.json({ success: true, data: request });
});

router.get("/access/my-requests", requireAuth, (req, res) => {
  const userId = (req as any).user?.id || "user_123";
  const requests = getUserRequests(userId);
  res.json({ success: true, data: requests });
});

router.get("/access/pending", requireAuth, (req, res) => {
  const approverId = (req as any).user?.id || "approver_123";
  const requests = getPendingApprovals(approverId);
  res.json({ success: true, data: requests });
});

router.post("/access/approve/:requestId", requireAuth, (req, res) => {
  const { requestId } = req.params;
  const approverId = (req as any).user?.id || "approver_123";
  const { comment } = req.body;
  const request = approveRequest(requestId, approverId, comment);
  if (!request) return res.status(404).json({ success: false, error: "Request not found" });
  res.json({ success: true, data: request });
});

router.post("/access/reject/:requestId", requireAuth, (req, res) => {
  const { requestId } = req.params;
  const approverId = (req as any).user?.id || "approver_123";
  const { comment } = req.body;
  const request = rejectRequest(requestId, approverId, comment);
  if (!request) return res.status(404).json({ success: false, error: "Request not found" });
  res.json({ success: true, data: request });
});

router.get("/access/groups", requireAuth, (req, res) => {
  const groups = getAllPermissionGroups();
  res.json({ success: true, data: groups });
});

router.post("/access/groups", requireAuth, (req, res) => {
  const group = createPermissionGroup(req.body);
  res.json({ success: true, data: group });
});

router.post("/access/groups/:groupId/user", requireAuth, (req, res) => {
  const { userId } = req.body;
  const group = addUserToGroup(req.params.groupId, userId);
  if (!group) return res.status(404).json({ success: false, error: "Group not found" });
  res.json({ success: true, data: group });
});

router.delete("/access/groups/:groupId/user", requireAuth, (req, res) => {
  const { userId } = req.body;
  const group = removeUserFromGroup(req.params.groupId, userId);
  if (!group) return res.status(404).json({ success: false, error: "Group not found" });
  res.json({ success: true, data: group });
});

router.get("/access/permissions", requireAuth, (req, res) => {
  const userId = (req as any).user?.id || "user_123";
  const permissions = getUserPermissions(userId);
  res.json({ success: true, data: { permissions } });
});

router.get("/audit/logs", requireAuth, (req, res) => {
  const { userId, action, resource, startDate, endDate } = req.query;
  const logs = getAuditLogs({
    userId: userId as string,
    action: action as string,
    resource: resource as string,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
  });
  res.json({ success: true, data: logs });
});

router.post("/audit/export", requireAuth, (req, res) => {
  const { startDate, endDate, userId, action, resource, status, format } = req.body;
  const result = exportAuditTrail({
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    userId,
    action,
    resource,
    status,
    format: format || "json",
  });
  res.json({ success: true, data: result });
});

router.get("/audit/stats", requireAuth, (req, res) => {
  const { startDate, endDate } = req.query;
  const stats = getAuditStats({
    start: new Date(startDate as string || Date.now() - 30 * 86400000),
    end: new Date(endDate as string || Date.now()),
  });
  res.json({ success: true, data: stats });
});

router.get("/audit/search", requireAuth, (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ success: false, error: "Query required" });
  const results = searchAuditLogs(q as string);
  res.json({ success: true, data: { results, count: results.length } });
});

router.post("/audit/log", requireAuth, (req, res) => {
  const { action, resource, resourceId, details, status } = req.body;
  const userId = (req as any).user?.id || "system";
  const userRole = (req as any).user?.role || "system";
  const entry = logAuditEntry({
    userId,
    userRole,
    action,
    resource,
    resourceId,
    details,
    ipAddress: req.ip || "127.0.0.1",
    userAgent: req.get("User-Agent") || "Unknown",
    status,
  });
  res.json({ success: true, data: entry });
});

// GET /api/compliance/security-controls
router.get("/security-controls", requireAuth, (_req, res) => {
  try {
    const controls = checkSecurityControls();
    res.json({ controls, count: controls.length });
  } catch (error) {
    console.error('Error fetching security controls:', error);
    res.status(500).json({ error: 'Failed to fetch security controls' });
  }
});

// GET /api/compliance/report/:framework
router.get("/report/:framework", requireAuth, (req, res) => {
  try {
    const { framework } = req.params;
    if (!['SOC2', 'GDPR', 'HIPAA', 'ISO27001'].includes(framework)) {
      res.status(400).json({ error: 'Invalid framework' });
      return;
    }
    const report = genReport(framework as 'SOC2' | 'GDPR' | 'HIPAA' | 'ISO27001');
    const controls = checkSecurityControls();
    const activeControls = controls.filter((c: any) => c.status === 'active').length;
    
    res.json({
      framework,
      status: activeControls >= controls.length * 0.8 ? 'compliant' : 'pending',
      lastGenerated: (report as any).generatedAt,
      controlsPassing: activeControls,
      controlsTotal: controls.length,
      nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ error: 'Failed to generate compliance report' });
  }
});

export default router;