import { Queue, Worker, Job } from "bullmq";
import { logger } from "./logger";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// ============================================================================
// Queues
// ============================================================================
export const resumeQueue = new Queue("resume-processing", {
  connection: { url: REDIS_URL },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export const interviewQueue = new Queue("interview-scoring", {
  connection: { url: REDIS_URL },
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 5000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 20 },
  },
});

// ============================================================================
// Workers
// ============================================================================

export function startWorkers() {
  // Worker: Resume PDF parsing (heavy CPU — offloaded from HTTP thread)
  new Worker(
    "resume-processing",
    async (job: Job) => {
      const { userId, fileName, fileBuffer } = job.data;
      logger.info({ jobId: job.id, userId, fileName }, "processing resume");

      // Simulate async heavy parsing work
      // In production: call PDF parser, NLP embedding, etc.
      await new Promise((r) => setTimeout(r, 200));

      logger.info({ jobId: job.id }, "resume processing complete");
      return { status: "completed", userId, fileName };
    },
    { connection: { url: REDIS_URL } },
  );

  // Worker: Interview AI scoring (async after interview ends)
  new Worker(
    "interview-scoring",
    async (job: Job) => {
      const { interviewId, history } = job.data;
      logger.info({ jobId: job.id, interviewId }, "scoring interview");

      // In production: call Groq API for detailed scoring
      await new Promise((r) => setTimeout(r, 500));

      logger.info({ jobId: job.id, interviewId }, "interview scoring complete");
      return { status: "scored", interviewId, score: 0 };
    },
    { connection: { url: REDIS_URL } },
  );

  logger.info("BullMQ workers started");
}

// ============================================================================
// Graceful shutdown
// ============================================================================
export async function closeQueues() {
  await resumeQueue.close();
  await interviewQueue.close();
  logger.info("BullMQ queues closed");
}
