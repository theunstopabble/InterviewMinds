import express from "express";
import multer from "multer";
import { ResumeModel } from "../models/Resume";
import PDFParser from "pdf2json";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { requireAuth } from "../middleware/auth";
import dotenv from "dotenv";
import { logger } from "../lib/logger";

dotenv.config();

interface AuthenticatedRequest extends express.Request {
  auth?: { userId: string };
  file?: Express.Multer.File;
}

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ✅ Singleton Pattern for Model Loading
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedPipeline: any = null;

async function getPipeline() {
  if (!cachedPipeline) {
    const { pipeline } = await import("@xenova/transformers");
    cachedPipeline = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return cachedPipeline;
}

router.post(
  "/upload",
  requireAuth,
  upload.single("resume"),
  async (req: express.Request, res: express.Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.auth?.userId;

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // 1. PDF Parse
      // 1. PDF Parse
      const pdfParser = new PDFParser(null, 1);
      const rawText: string = await new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pdfParser.on("pdfParser_dataError", (errData: any) =>
          reject(errData.parserError || new Error("PDF parsing failed")),
        );
        pdfParser.on("pdfParser_dataReady", () =>
          resolve(pdfParser.getRawTextContent()),
        );
        try {
          pdfParser.parseBuffer(req.file!.buffer);
        } catch (syncErr) {
          reject(syncErr instanceof Error ? syncErr : new Error("PDF parse failed"));
        }
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

      // 3. EMBEDDINGS (Local Execution)

      const extractor = await getPipeline();
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

      // console.log(
      //   `✅ Success! Generated ${chunksWithEmbeddings.length} vectors.`,
      // );

      // 4. Save to MongoDB
      const newResume = await ResumeModel.create({
        userId: userId,
        fileName: req.file.originalname,
        content: cleanText,
        chunks: chunksWithEmbeddings,
      });

      res.json({
        message: "Resume processed successfully!",
        id: newResume._id,
        previewText: cleanText.substring(0, 100) + "...",
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Critical Error:", msg);
      res.status(500).json({
        error: "Failed to process resume",
        details: msg,
      });
    }
  },
);

export default router;
