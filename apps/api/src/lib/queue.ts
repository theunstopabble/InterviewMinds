import { Queue, Worker, Job } from "bullmq";
import { logger } from "./logger";
import { ResumeModel } from "../models/Resume";
import PDFParser from "pdf2json";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const isRedisAvailable = REDIS_URL && REDIS_URL !== "redis://localhost:6379";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embeddingPipeline: any = null;

async function getPipeline() {
  if (!embeddingPipeline) {
    const { pipeline } = await import("@xenova/transformers");
    embeddingPipeline = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embeddingPipeline;
}

export const resumeQueue = isRedisAvailable ? new Queue("resume-processing", {
  connection: { url: REDIS_URL },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
}) : null;

export const interviewQueue = isRedisAvailable ? new Queue("interview-scoring", {
  connection: { url: REDIS_URL },
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 5000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 20 },
  },
}) : null;

const workers: Worker[] = [];

export function startWorkers() {
  if (!isRedisAvailable) {
    logger.warn("Redis not available - skipping BullMQ workers");
    return;
  }

  const resumeWorker = new Worker(
    "resume-processing",
    async (job: Job) => {
      const { resumeId, fileName, fileBuffer } = job.data;
      logger.info({ jobId: job.id, resumeId }, "processing resume");

      try {
        // Parse PDF
        const pdfParser = new PDFParser(null, 1);
        const rawText: string = await new Promise((resolve, reject) => {
          pdfParser.on("pdfParser_dataError", (errData: unknown) =>
            reject(new Error("PDF parsing failed"))
          );
          pdfParser.on("pdfParser_dataReady", () =>
            resolve(pdfParser.getRawTextContent())
          );
          const buffer = Buffer.from(fileBuffer, "base64");
          pdfParser.parseBuffer(buffer);
        });

        const cleanText = rawText.replace(/----------------/g, " ").trim();

        if (!cleanText || cleanText.length < 50) {
          throw new Error("Failed to extract sufficient text from PDF");
        }

        // Chunk text
        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 500,
          chunkOverlap: 50,
        });
        const chunks = await splitter.createDocuments([cleanText]);

        // Generate embeddings
        const extractor = await getPipeline();
        const chunksWithEmbeddings = [];

        for (const chunk of chunks) {
          const output = await extractor(chunk.pageContent, {
            pooling: "mean",
            normalize: true,
          });
          const vector = Array.from(output.data);
          
          if (vector && vector.length > 0) {
            chunksWithEmbeddings.push({
              text: chunk.pageContent,
              embedding: vector,
            });
          }
        }

        // Update resume in database
        await ResumeModel.findByIdAndUpdate(resumeId, {
          content: cleanText,
          chunks: chunksWithEmbeddings,
        });

        logger.info({ jobId: job.id, chunksCount: chunksWithEmbeddings.length }, "resume processing complete");
        return { status: "completed", resumeId, chunksCount: chunksWithEmbeddings.length };
      } catch (error) {
        logger.error({ jobId: job.id, err: (error as Error).message }, "resume processing failed");
        throw error;
      }
    },
    { 
      connection: { url: REDIS_URL },
      concurrency: 2,
      limiter: { max: 5, duration: 10000 },
    },
  );

  resumeWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "resume job completed");
  });

  resumeWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "resume job failed");
  });

  resumeWorker.on("error", (err) => {
    logger.error({ err: err.message }, "resume worker error");
    // If Redis limit exceeded, pause worker to stop hammering
    if (err.message.includes("max requests limit exceeded")) {
      logger.warn("Redis limit exceeded — pausing resume worker for 60 seconds");
      resumeWorker.pause();
      setTimeout(() => resumeWorker.resume(), 60000);
    }
  });

  const interviewWorker = new Worker(
    "interview-scoring",
    async (job: Job) => {
      const { interviewId, history } = job.data;
      logger.info({ jobId: job.id, interviewId }, "scoring interview");

      await new Promise((r) => setTimeout(r, 500));

      logger.info({ jobId: job.id, interviewId }, "interview scoring complete");
      return { status: "scored", interviewId, score: 0 };
    },
    { 
      connection: { url: REDIS_URL },
      concurrency: 1,
      limiter: { max: 3, duration: 10000 },
    },
  );

  interviewWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "interview job completed");
  });

  interviewWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "interview job failed");
  });

  interviewWorker.on("error", (err) => {
    logger.error({ err: err.message }, "interview worker error");
    // If Redis limit exceeded, pause worker to stop hammering
    if (err.message.includes("max requests limit exceeded")) {
      logger.warn("Redis limit exceeded — pausing interview worker for 60 seconds");
      interviewWorker.pause();
      setTimeout(() => interviewWorker.resume(), 60000);
    }
  });

  workers.push(resumeWorker, interviewWorker);
  logger.info({ workerCount: workers.length }, "BullMQ workers started");
}

export async function closeWorkers(): Promise<void> {
  logger.info({ workerCount: workers.length }, "Closing BullMQ workers");
  
  const closePromises = workers.map(async (worker, index) => {
    try {
      await worker.close();
      logger.info(`Worker ${index} closed`);
    } catch (err) {
      logger.error({ err: (err as Error).message, workerIndex: index }, "Error closing worker");
    }
  });
  
  await Promise.all(closePromises);
  workers.length = 0;
  logger.info("All BullMQ workers closed");
}

export async function closeQueues(): Promise<void> {
  await closeWorkers();
  if (resumeQueue) await resumeQueue.close();
  if (interviewQueue) await interviewQueue.close();
  logger.info("BullMQ queues closed");
}