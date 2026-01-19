import express from "express";
import multer from "multer";
import { ResumeModel } from "../models/Resume";
import PDFParser from "pdf2json";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Embeddings Model (Ye text ko numbers mein badalta hai)
const embeddings = new GoogleGenerativeAIEmbeddings({
  modelName: "text-embedding-004", // Pehle 'embedding-001' tha
  apiKey: process.env.GEMINI_API_KEY,
});

router.post("/upload", upload.single("resume"), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("📂 Processing & Vectorizing:", req.file.originalname);

    // 1. PDF Parse (Text nikalna)
    // @ts-ignore
    const pdfParser = new PDFParser(null, 1);
    const rawText: string = await new Promise((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (errData: any) =>
        reject(errData.parserError)
      );
      pdfParser.on("pdfParser_dataReady", () =>
        resolve(pdfParser.getRawTextContent())
      );
      pdfParser.parseBuffer(req.file.buffer);
    });

    const cleanText = rawText.replace(/----------------/g, " ").trim();

    // 2. CHUNKING (Smart tukde karna) 🔪
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500, // Har chunk mein 500 characters
      chunkOverlap: 50, // Context na tute isliye thoda overlap
    });

    const outputChunks = await splitter.createDocuments([cleanText]);
    console.log(`🧩 Split resume into ${outputChunks.length} chunks.`);

    // 3. EMBEDDINGS (Vectors banana) 🔢
    const chunkTexts = outputChunks.map((chunk) => chunk.pageContent);

    // Ek baar mein sabka vector mangwao (Batch Call)
    console.log("⏳ Generating Embeddings... (This might take a moment)");
    const vectors = await embeddings.embedDocuments(chunkTexts);

    if (vectors.length > 0 && vectors[0].length > 0) {
      console.log(`✅ Success! Generated ${vectors.length} vectors.`);
      console.log(`📏 Dimension Check: ${vectors[0].length} (Should be 768)`);
    } else {
      console.error("❌ ERROR: Generated vectors are EMPTY!");
      throw new Error("Vector generation failed");
    }

    // Wapas combine karo
    const chunksWithEmbeddings = outputChunks.map((chunk, index) => ({
      text: chunk.pageContent,
      embedding: vectors[index], // Match text with its vector
    }));

    // 4. Save to MongoDB (Vector Store)
    const newResume = await ResumeModel.create({
      fileName: req.file.originalname,
      content: cleanText,
      chunks: chunksWithEmbeddings,
    });

    console.log("✅ Resume Vectorized & Saved ID:", newResume._id);

    res.json({
      message: "Resume processed with AI Embeddings!",
      id: newResume._id,
      previewText: cleanText.substring(0, 100) + "...",
    });
  } catch (error: any) {
    console.error("❌ Critical Error:", error);
    res
      .status(500)
      .json({ error: "Failed to process resume", details: error.message });
  }
});

export default router;
