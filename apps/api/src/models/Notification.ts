import mongoose from "mongoose";
import crypto from "crypto";

export interface INotification {
  _id: string;
  userId: string;
  type: string;
  channel: "email" | "sms" | "slack" | "in-app" | "webhook";
  title: string;
  message: string;
  templateId: string;
  variables: Map<string, string>;
  recipientAddress: string;
  status: "pending" | "sent" | "delivered" | "failed";
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  errorMessage: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    channel: {
      type: String,
      enum: ["email", "sms", "slack", "in-app", "webhook"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    templateId: { type: String, default: "" },
    variables: { type: Map, of: String, default: {} },
    recipientAddress: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "failed"],
      default: "pending",
      index: true,
    },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    errorMessage: { type: String, default: "" },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ status: 1, createdAt: -1 });

export const NotificationModel = mongoose.model<INotification>("Notification", notificationSchema);
