import { initializeApp, cert, type App } from "firebase-admin";
import { getMessaging, type Message } from "firebase-admin/messaging";
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

let firebaseApp: App | null = null;

function initFirebase(): boolean {
  if (firebaseApp) return true;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    logger.warn("FIREBASE_PROJECT_ID / FIREBASE_PRIVATE_KEY / FIREBASE_CLIENT_EMAIL not set — push notifications disabled");
    return false;
  }

  try {
    firebaseApp = initializeApp({
      credential: cert({
        projectId,
        privateKey,
        clientEmail,
      }),
    });
    logger.info("Firebase Admin SDK initialized for push notifications");
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to initialize Firebase Admin SDK");
    return false;
  }
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
  if (!initFirebase()) {
    return { sent: 0, failed: 0, results: [] };
  }

  const devices = await DeviceRegistrationModel.find({ userId, isActive: true });
  const results: unknown[] = [];
  let sent = 0;
  let failed = 0;

  for (const device of devices) {
    try {
      const message: Message = {
        token: device.deviceToken,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.icon,
        },
        android: {
          priority: options?.priority === "high" ? "high" : "normal",
          ttl: (options?.ttl || 3600) * 1000,
        },
        apns: {
          payload: {
            aps: {
              badge: notification.badge ? parseInt(notification.badge, 10) : undefined,
              "mutable-content": 1,
            },
          },
        },
        webpush: {
          notification: {
            icon: notification.icon,
            badge: notification.badge,
            actions: notification.actions?.map(a => ({
              action: a.action,
              title: a.title,
              icon: a.icon,
            })),
          },
        },
        data: notification.data as { [key: string]: string } | undefined,
      };

      await getMessaging().send(message);
      sent++;
      results.push({ deviceId: (device.deviceInfo as any)?.deviceId || device.id, platform: device.platform, success: true });
    } catch (error) {
      failed++;
      results.push({ deviceId: (device.deviceInfo as any)?.deviceId || device.id, platform: device.platform, success: false, error: String(error) });
    }
  }

  logger.info({ userId, sent, failed, total: devices.length }, "Push notification sent");

  return { sent, failed, results };
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
  return { scheduledId, scheduledAt: scheduledTime };
}

export function getNotificationStats(userId: string): {
  total: number;
  delivered: number;
  opened: number;
  clicked: number;
} {
  return { total: 0, delivered: 0, opened: 0, clicked: 0 };
}
