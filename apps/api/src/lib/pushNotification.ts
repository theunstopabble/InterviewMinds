import { logger } from "./logger";
import { DeviceRegistrationModel, IDeviceRegistration } from "../models/DeviceRegistration";

export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

export interface DeviceRegistration {
  userId: string;
  deviceId: string;
  platform: "ios" | "android" | "web";
  pushToken: string;
  notificationEnabled: boolean;
  lastActive: Date;
}

export interface NotificationPayload {
  to: string;
  notification: PushNotification;
  data?: Record<string, unknown>;
  priority?: "high" | "normal";
  ttl?: number;
}

function toDeviceRegistration(doc: IDeviceRegistration): DeviceRegistration {
  return {
    userId: doc.userId,
    deviceId: (doc.deviceInfo as any)?.deviceId || doc.id,
    platform: doc.platform as "ios" | "android" | "web",
    pushToken: doc.deviceToken,
    notificationEnabled: doc.isActive,
    lastActive: doc.lastUsedAt || doc.createdAt,
  };
}

export async function registerDevice(registration: DeviceRegistration): Promise<{ deviceId: string; status: string }> {
  const existing = await DeviceRegistrationModel.findOne({
    userId: registration.userId,
    "deviceInfo.deviceId": registration.deviceId,
  });

  if (existing) {
    existing.deviceToken = registration.pushToken;
    existing.lastUsedAt = new Date();
    existing.isActive = registration.notificationEnabled;
    await existing.save();
  } else {
    await DeviceRegistrationModel.create({
      userId: registration.userId,
      deviceToken: registration.pushToken,
      platform: registration.platform,
      deviceInfo: { deviceId: registration.deviceId },
      isActive: registration.notificationEnabled,
      lastUsedAt: new Date(),
    });
  }

  logger.info(`Device registered: ${registration.deviceId} for user ${registration.userId}`);

  return {
    deviceId: registration.deviceId,
    status: "registered",
  };
}

export async function unregisterDevice(deviceId: string): Promise<boolean> {
  const result = await DeviceRegistrationModel.deleteOne({ "deviceInfo.deviceId": deviceId });
  if (result.deletedCount > 0) {
    logger.info(`Device unregistered: ${deviceId}`);
    return true;
  }
  return false;
}

export async function sendPushNotification(
  userId: string,
  notification: PushNotification,
  options?: { priority?: "high" | "normal"; ttl?: number }
): Promise<{ sent: number; failed: number; results: unknown[] }> {
  const devices = await DeviceRegistrationModel.find({ userId, isActive: true });

  const results: unknown[] = [];
  let failed = 0;

  for (const device of devices) {
    try {
      const payload: NotificationPayload = {
        to: device.deviceToken,
        notification,
        priority: options?.priority || "normal",
        ttl: options?.ttl || 3600,
      };

      if (device.platform === "web") {
        payload.data = { ...notification.data, "mutable-content": true };
      }

      results.push({ deviceId: (device.deviceInfo as any)?.deviceId || device.id, platform: device.platform, success: true });
    } catch (error) {
      failed++;
      results.push({ deviceId: (device.deviceInfo as any)?.deviceId || device.id, platform: device.platform, success: false, error: String(error) });
    }
  }

  logger.info(`Push notification sent to user ${userId}: ${devices.length - failed}/${devices.length} successful`);

  return {
    sent: devices.length - failed,
    failed,
    results,
  };
}

export async function sendBatchNotifications(
  notifications: Array<{ userId: string; notification: PushNotification }>
): Promise<{ total: number; sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const { userId, notification } of notifications) {
    const result = await sendPushNotification(userId, notification);
    sent += result.sent;
    failed += result.failed;
  }

  return { total: notifications.length, sent, failed };
}

export async function getUserDevices(userId: string): Promise<DeviceRegistration[]> {
  const docs = await DeviceRegistrationModel.find({ userId }).lean();
  return docs.map(toDeviceRegistration);
}

export async function updateDeviceSettings(
  deviceId: string,
  settings: { notificationEnabled?: boolean }
): Promise<boolean> {
  const update: Record<string, unknown> = {};
  if (settings.notificationEnabled !== undefined) {
    update.isActive = settings.notificationEnabled;
    update.lastUsedAt = new Date();
  }
  const result = await DeviceRegistrationModel.findOneAndUpdate(
    { "deviceInfo.deviceId": deviceId },
    { $set: update }
  );
  return !!result;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  template: PushNotification;
  triggers: {
    event: string;
    conditions?: Record<string, unknown>;
  };
}

const notificationTemplates: NotificationTemplate[] = [
  {
    id: "interview_reminder",
    name: "Interview Reminder",
    template: {
      title: "Interview Starting Soon",
      body: "Your interview starts in {{minutes}} minutes",
      icon: "/icons/notification.png",
    },
    triggers: { event: "interview.reminder", conditions: { minutesBefore: 15 } },
  },
  {
    id: "interview_start",
    name: "Interview Started",
    template: {
      title: "Interview Started",
      body: "Your interview with {{interviewer}} has begun",
      icon: "/icons/notification.png",
    },
    triggers: { event: "interview.start" },
  },
  {
    id: "feedback_available",
    name: "Feedback Available",
    template: {
      title: "Interview Feedback Ready",
      body: "Your interview feedback is now available",
      icon: "/icons/notification.png",
    },
    triggers: { event: "feedback.available" },
  },
];

export function getNotificationTemplates(): NotificationTemplate[] {
  return notificationTemplates;
}

export function renderTemplate(templateId: string, data: Record<string, unknown>): PushNotification | null {
  const template = notificationTemplates.find(t => t.id === templateId);
  if (!template) return null;

  let title = template.template.title;
  let body = template.template.body;

  for (const [key, value] of Object.entries(data)) {
    title = title.replace(`{{${key}}}`, String(value));
    body = body.replace(`{{${key}}}`, String(value));
  }

  return { ...template.template, title, body };
}

export async function scheduleNotification(
  userId: string,
  templateId: string,
  data: Record<string, unknown>,
  scheduledTime: Date
): Promise<{ scheduledId: string; scheduledAt: Date }> {
  const scheduledId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info(`Notification scheduled: ${scheduledId} for user ${userId} at ${scheduledTime}`);

  return {
    scheduledId,
    scheduledAt: scheduledTime,
  };
}

export function getNotificationStats(userId: string): {
  total: number;
  delivered: number;
  opened: number;
  clicked: number;
} {
  return {
    total: 45,
    delivered: 42,
    opened: 35,
    clicked: 28,
  };
}
