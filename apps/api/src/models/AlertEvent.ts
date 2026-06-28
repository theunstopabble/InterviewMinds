import mongoose from "mongoose";

export interface IAlertEvent {
  ruleId: string;
  ruleName: string;
  severity: "critical" | "warning" | "info";
  message: string;
  status: "firing" | "resolved";
  firedAt: Date;
  resolvedAt?: Date;
  createdAt: Date;
}

const alertEventSchema = new mongoose.Schema({
  ruleId: { type: String, required: true, index: true },
  ruleName: { type: String, required: true },
  severity: { type: String, enum: ["critical", "warning", "info"], required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ["firing", "resolved"], default: "firing", index: true },
  firedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

alertEventSchema.index({ status: 1, firedAt: -1 });

export const AlertEventModel = mongoose.model<IAlertEvent>("AlertEvent", alertEventSchema);
