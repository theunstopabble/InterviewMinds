import mongoose from "mongoose";
import { createHmac } from "crypto";

const webhookSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    events: {
      type: [String],
      required: true,
    },
    secret: {
      type: String,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
    // Delivery tracking
    lastDeliveredAt: {
      type: Date,
      default: null,
    },
    lastStatusCode: {
      type: Number,
      default: null,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

webhookSchema.index({ userId: 1, active: 1 });
webhookSchema.index({ events: 1 });

// Generate HMAC-SHA256 signature for webhook payload
webhookSchema.methods.generateSignature = function (payload: string): string {
  if (!this.secret) return "";
  return createHmac("sha256", this.secret).update(payload).digest("hex");
};

export const WebhookModel = mongoose.model("Webhook", webhookSchema);
