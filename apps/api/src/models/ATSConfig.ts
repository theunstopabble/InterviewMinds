import mongoose from "mongoose";

const atsConfigSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["greenhouse", "lever", "workday", "bamboohr", "ashby"],
      required: true,
      unique: true,
    },
    apiKey: { type: String, default: null },
    clientId: { type: String, default: null },
    clientSecret: { type: String, default: null },
    tenantUrl: { type: String, default: null },
    webhookUrl: { type: String, default: null },
    connected: { type: Boolean, default: false },
    lastSyncAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const ATSConfigModel = mongoose.model("ATSConfig", atsConfigSchema);
