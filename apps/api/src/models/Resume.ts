import mongoose from "mongoose";
import { IResume } from "@interview-minds/shared";

const ResumeSchema = new mongoose.Schema<IResume>({
  userId: { type: String, required: true, index: true },
  fileName: { type: String, required: true },
  content: { type: String, required: true },

  chunks: [
    {
      text: { type: String, required: true },
      embedding: { type: [Number], required: true },
    },
  ],

  createdAt: { type: Date, default: Date.now },
});

ResumeSchema.index({ userId: 1, createdAt: -1 });
ResumeSchema.index({ "chunks.text": "text" });

export const ResumeModel = mongoose.model<IResume>("Resume", ResumeSchema);
