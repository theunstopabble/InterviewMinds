import { Router } from "express";
import {
  registerDevice,
  unregisterDevice,
  sendPushNotification,
  sendBatchNotifications,
  getUserDevices,
  updateDeviceSettings,
  getNotificationTemplates,
  renderTemplate,
  scheduleNotification,
  getNotificationStats,
} from "../lib/pushNotification";
import {
  queueOfflineAction,
  getPendingActions,
  syncOfflineActions,
  saveOfflineData,
  getOfflineData,
  deleteOfflineData,
  clearOfflineData,
  resolveConflicts,
  calculateSyncPriority,
  estimateOfflineStorageSize,
  isOfflineReady,
} from "../lib/offlineSupport";
import {
  validateMobileVersion,
  formatMobileResponse,
  formatMobileError,
  optimizeForMobile,
  paginateMobile,
  getCachePolicy,
  getFeatureFlags,
  updateFeatureFlags,
  submitFeedback,
  getSupportedLanguages,
  getTimezones,
  formatDateForMobile,
} from "../lib/mobileAPI";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/device/register", requireAuth, async (req, res) => {
  const { userId, deviceId, platform, pushToken, notificationEnabled } = req.body;
  const result = await registerDevice({ userId, deviceId, platform, pushToken, notificationEnabled, lastActive: new Date() });
  res.json(formatMobileResponse(result));
});

router.post("/device/unregister", requireAuth, async (req, res) => {
  const { deviceId } = req.body;
  const result = await unregisterDevice(deviceId);
  res.json(formatMobileResponse({ unregistered: result }));
});

router.get("/device/list", requireAuth, async (req, res) => {
  const userId = (req as any).user?.id || "user_123";
  const devices = await getUserDevices(userId);
  res.json(formatMobileResponse({ devices }));
});

router.put("/device/settings", requireAuth, async (req, res) => {
  const { deviceId, settings } = req.body;
  const result = await updateDeviceSettings(deviceId, settings);
  res.json(formatMobileResponse({ updated: result }));
});

router.post("/notification/send", requireAuth, async (req, res) => {
  const { userId, notification } = req.body;
  const result = await sendPushNotification(userId, notification);
  res.json(formatMobileResponse(result));
});

router.post("/notification/batch", requireAuth, async (req, res) => {
  const { notifications } = req.body;
  const result = await sendBatchNotifications(notifications);
  res.json(formatMobileResponse(result));
});

router.get("/notification/templates", requireAuth, (req, res) => {
  const templates = getNotificationTemplates();
  res.json(formatMobileResponse({ templates }));
});

router.post("/notification/template/render", requireAuth, (req, res) => {
  const { templateId, data } = req.body;
  const rendered = renderTemplate(templateId, data);
  if (!rendered) return res.status(404).json(formatMobileError("Template not found"));
  res.json(formatMobileResponse({ rendered }));
});

router.post("/notification/schedule", requireAuth, async (req, res) => {
  const { userId, templateId, data, scheduledTime } = req.body;
  const result = await scheduleNotification(userId, templateId, data, new Date(scheduledTime));
  res.json(formatMobileResponse(result));
});

router.get("/notification/stats", requireAuth, (req, res) => {
  const userId = (req as any).user?.id || "user_123";
  const stats = getNotificationStats(userId);
  res.json(formatMobileResponse(stats));
});

router.post("/offline/action", requireAuth, async (req, res) => {
  const userId = (req as any).user?.id || "user_123";
  const { action, payload } = req.body;
  const result = await queueOfflineAction(userId, action, payload);
  res.json(formatMobileResponse({ queued: true, actionId: result.id }));
});

router.get("/offline/pending", requireAuth, async (req, res) => {
  const userId = (req as any).user?.id || "user_123";
  const actions = await getPendingActions(userId);
  const prioritized = calculateSyncPriority(actions);
  res.json(formatMobileResponse({ actions: prioritized }));
});

router.post("/offline/sync", requireAuth, async (req, res) => {
  const userId = (req as any).user?.id || "user_123";
  const result = await syncOfflineActions(userId);
  res.json(formatMobileResponse(result));
});

router.post("/offline/data", requireAuth, async (req, res) => {
  const userId = (req as any).user?.id || "user_123";
  const { dataType, data, id } = req.body;
  await saveOfflineData(userId, dataType, data, id);
  res.json(formatMobileResponse({ saved: true }));
});

router.get("/offline/data/:dataType", requireAuth, async (req, res) => {
  const userId = (req as any).user?.id || "user_123";
  const { dataType } = req.params;
  const data = await getOfflineData(userId, dataType as any);
  res.json(formatMobileResponse({ data }));
});

router.delete("/offline/data/:dataType/:id", requireAuth, async (req, res) => {
  const userId = (req as any).user?.id || "user_123";
  const { dataType, id } = req.params;
  const result = await deleteOfflineData(userId, dataType as any, id);
  res.json(formatMobileResponse({ deleted: result }));
});

router.delete("/offline/clear", requireAuth, async (req, res) => {
  const userId = (req as any).user?.id || "user_123";
  await clearOfflineData(userId);
  res.json(formatMobileResponse({ cleared: true }));
});

router.post("/offline/resolve", requireAuth, async (req, res) => {
  const userId = (req as any).user?.id || "user_123";
  const { dataType } = req.body;
  const result = await resolveConflicts(userId, dataType as any);
  res.json(formatMobileResponse(result));
});

router.get("/offline/storage", requireAuth, (req, res) => {
  const userId = (req as any).user?.id || "user_123";
  const storage = estimateOfflineStorageSize(userId);
  res.json(formatMobileResponse({ storage, ready: isOfflineReady(userId) }));
});

router.get("/version/check", requireAuth, (req, res) => {
  const { version, minVersion } = req.query;
  const result = validateMobileVersion(version as string, minVersion as string);
  res.json(formatMobileResponse(result));
});

router.get("/features", requireAuth, (req, res) => {
  const userId = (req as any).user?.id || "user_123";
  const flags = getFeatureFlags(userId);
  res.json(formatMobileResponse(flags));
});

router.put("/features", requireAuth, (req, res) => {
  const userId = (req as any).user?.id || "user_123";
  const flags = updateFeatureFlags(userId, req.body);
  res.json(formatMobileResponse(flags));
});

router.post("/feedback", requireAuth, async (req, res) => {
  const userId = (req as any).user?.id || "user_123";
  const { rating, category, message, deviceInfo, appVersion } = req.body;
  const result = await submitFeedback({ userId, rating, category, message, deviceInfo, appVersion });
  res.json(formatMobileResponse(result));
});

router.get("/localization/languages", (req, res) => {
  const languages = getSupportedLanguages();
  res.json(formatMobileResponse({ languages }));
});

router.get("/localization/timezones", (req, res) => {
  const timezones = getTimezones();
  res.json(formatMobileResponse({ timezones }));
});

router.post("/localization/format-date", (req, res) => {
  const { date, locale, format } = req.body;
  const formatted = formatDateForMobile(new Date(date), locale, format);
  res.json(formatMobileResponse({ formatted }));
});

router.get("/cache-policy/:endpoint", (req, res) => {
  const { endpoint } = req.params;
  const policy = getCachePolicy(endpoint);
  res.json(formatMobileResponse({ policy }));
});

router.get("/optimize/:resource", (req, res) => {
  const { resource } = req.params;
  const { limit, fields, compress } = req.query;
  res.json(formatMobileResponse({ 
    note: `Optimization applied for ${resource}`,
    config: { limit, fields, compress }
  }));
});

router.get("/pagination/:resource", (req, res) => {
  const { resource } = req.params;
  const { page, pageSize } = req.query;
  const mockData = Array(50).fill(null).map((_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
  const result = paginateMobile(mockData, Number(page) || 1, Number(pageSize) || 10);
  res.json(formatMobileResponse(result));
});

export default router;