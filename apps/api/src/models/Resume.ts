import mongoose from "mongoose";
import { IResume } from "@interview-minds/shared"; // ✅ Using Shared Types

const ResumeSchema = new mongoose.Schema<IResume>({
  // ✅ New Field: UserId (Required for Multi-user SaaS)
  userId: { type: String, required: true, index: true },

  fileName: { type: String, required: true },
  content: { type: String, required: true }, // Full text backup

  // RAG Chunks
  chunks: [
    {
      text: { type: String, required: true },
      embedding: { type: [Number], required: true }, // Vectors
    },
  ],

  createdAt: { type: Date, default: Date.now },
});

export const ResumeModel = mongoose.model<IResume>("Resume", ResumeSchema);
