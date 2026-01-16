import mongoose from "mongoose";

const ResumeSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  content: { type: String, required: true }, // Full text backup ke liye
  // RAG ke liye hum text ko chunks mein todenge
  chunks: [
    {
      text: { type: String },
      // Vectors store karne ke liye (Numbers ka array)
      embedding: { type: [Number], index: "vector" },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

export const ResumeModel = mongoose.model("Resume", ResumeSchema);
