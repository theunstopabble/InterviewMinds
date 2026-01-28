import express from "express";
import multer from "multer";
import { ResumeModel } from "../models/Resume";
import PDFParser from "pdf2json";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { requireAuth } from "../middleware/auth";
import { pipeline } from "@xenova/transformers"; // ✅ Local AI Import
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ✅ Singleton Pattern for Model Loading (Taaki baar-baar load na ho)
class EmbeddingService {
  static pipeline: any = null;

  static async getPipeline() {
    if (!this.pipeline) {
      console.log("📥 Loading Local Embedding Model (First time only)...");
      // 'Xenova/all-MiniLM-L6-v2' ek super-lightweight model hai (sirf ~40MB)
      this.pipeline = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
      );
    }
    return this.pipeline;
  }
}

router.post(
  "/upload",
  requireAuth,
  upload.single("resume"),
  async (req: any, res: any) => {
    try {
      const userId = req.auth.userId;

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log(`📂 Processing Resume for User: ${userId}`);

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

      if (!cleanText || cleanText.length < 50) {
        throw new Error("Failed to extract sufficient text from PDF.");
      }

      // 2. CHUNKING
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 50,
      });

      const outputChunks = await splitter.createDocuments([cleanText]);
      console.log(`🧩 Split resume into ${outputChunks.length} chunks.`);

      // 3. EMBEDDINGS (Local Execution)
      console.log("⏳ Generating Embeddings locally (No API Key)...");

      const extractor = await EmbeddingService.getPipeline();
      const chunksWithEmbeddings = [];

      for (const chunk of outputChunks) {
        // Local Model Inference
        const output = await extractor(chunk.pageContent, {
          pooling: "mean",
          normalize: true,
        });
        // Output Tensor se Array convert karna
        const vector = Array.from(output.data);

        if (vector && vector.length > 0) {
          chunksWithEmbeddings.push({
            text: chunk.pageContent,
            embedding: vector,
          });
        }
      }

      console.log(
        `✅ Success! Generated ${chunksWithEmbeddings.length} vectors.`,
      );

      // 4. Save to MongoDB
      const newResume = await ResumeModel.create({
        userId: userId,
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
