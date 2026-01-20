import express from "express";
import multer from "multer";
import { ResumeModel } from "../models/Resume";
import PDFParser from "pdf2json";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { requireAuth } from "../middleware/auth"; // ✅ Import Auth Middleware
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Embeddings Model
const embeddings = new GoogleGenerativeAIEmbeddings({
  modelName: "text-embedding-004",
  apiKey: process.env.GEMINI_API_KEY,
});

// ✅ FIX 1: Add 'requireAuth' to protect this route
router.post(
  "/upload",
  requireAuth,
  upload.single("resume"),
  async (req: any, res: any) => {
    try {
      // ✅ FIX 2: Get User ID from Auth Middleware
      const userId = req.auth.userId;

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log(`📂 Processing Resume for User: ${userId}`);
      console.log("📄 File:", req.file.originalname);

      // 1. PDF Parse
      // @ts-ignore
      const pdfParser = new PDFParser(null, 1);
      const rawText: string = await new Promise((resolve, reject) => {
        pdfParser.on("pdfParser_dataError", (errData: any) =>
          reject(errData.parserError),
        );
        pdfParser.on("pdfParser_dataReady", () =>
          resolve(pdfParser.getRawTextContent()),
        );
        pdfParser.parseBuffer(req.file.buffer);
      });

      const cleanText = rawText.replace(/----------------/g, " ").trim();

      // 2. CHUNKING
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 50,
      });

      const outputChunks = await splitter.createDocuments([cleanText]);
      console.log(`🧩 Split resume into ${outputChunks.length} chunks.`);

      // 3. EMBEDDINGS
      const chunkTexts = outputChunks.map((chunk) => chunk.pageContent);

      console.log("⏳ Generating Embeddings...");
      const vectors = await embeddings.embedDocuments(chunkTexts);

      if (vectors.length > 0 && vectors[0].length > 0) {
        console.log(`✅ Success! Generated ${vectors.length} vectors.`);
      } else {
        throw new Error("Vector generation failed (Empty vectors)");
      }

      // Combine Text + Vectors
      const chunksWithEmbeddings = outputChunks.map((chunk, index) => ({
        text: chunk.pageContent,
        embedding: vectors[index],
      }));

      // 4. Save to MongoDB (with User ID)
      // ✅ FIX 3: Pass 'userId' to create method
      const newResume = await ResumeModel.create({
        userId: userId, // <--- CRITICAL UPDATE
        fileName: req.file.originalname,
        content: cleanText,
        chunks: chunksWithEmbeddings,
      });

      console.log("✅ Resume Vectorized & Saved ID:", newResume._id);

      res.json({
        message: "Resume processed successfully!",
        id: newResume._id,
        previewText: cleanText.substring(0, 100) + "...",
      });
    } catch (error: any) {
      console.error("❌ Critical Error:", error);
      res
        .status(500)
        .json({ error: "Failed to process resume", details: error.message });
    }
  },
);

export default router;
