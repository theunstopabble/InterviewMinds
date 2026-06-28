import mongoose from "mongoose";

export interface IUptimeCheck {
  name: string;
  url: string;
  interval: number;
  timeout: number;
  status: "up" | "down" | "degraded";
  lastCheck: Date;
  uptimePercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

const uptimeCheckSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  interval: { type: Number, default: 300 },
  timeout: { type: Number, default: 10000 },
  status: { type: String, enum: ["up", "down", "degraded"], default: "up" },
  lastCheck: { type: Date, default: Date.now },
  uptimePercentage: { type: Number, default: 100 },
}, { timestamps: true });

export const UptimeCheckModel = mongoose.model<IUptimeCheck>("UptimeCheck", uptimeCheckSchema);
