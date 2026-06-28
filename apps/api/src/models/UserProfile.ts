import mongoose from "mongoose";

export interface IUserProfile {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: "candidate" | "interviewer" | "admin";
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  name: { type: String, default: "" },
  email: { type: String, default: "" },
  avatarUrl: { type: String, default: "" },
  role: { type: String, enum: ["candidate", "interviewer", "admin"], default: "candidate" },
  lastSyncedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const UserProfileModel = mongoose.model<IUserProfile>("UserProfile", userProfileSchema);
