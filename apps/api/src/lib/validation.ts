import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { logger } from "./logger";

// ============================================================================
// ZOD SCHEMAS — Enterprise Input Validation
// ============================================================================

export const EndInterviewSchema = z.object({
  resumeId: z.string().min(1, "resumeId is required"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model", "ai", "system"]),
        text: z.string(),
      }),
    )
    .min(1, "At least one message is required"),
});

export const ChatMessageSchema = z.object({
  message: z.string().min(1, "Message is required").max(10000, "Message too long"),
  resumeId: z.string().min(1, "resumeId is required"),
  history: z
    .array(
      z.object({
        role: z.string(),
        text: z.string(),
      }),
    )
    .optional(),
  mode: z.enum(["strict", "friendly", "system"]).optional().default("strict"),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  language: z.enum(["english", "hinglish"]).optional().default("english"),
});

export const TTSRequestSchema = z.object({
  text: z.string().min(1, "Text is required").max(5000, "Text too long"),
  gender: z.enum(["male", "female"]),
  language: z.enum(["english", "hinglish"]).optional().default("english"),
});

export const CompilerRequestSchema = z.object({
  language: z.string().min(1, "Language is required"),
  code: z.string().min(1, "Code is required").max(100000, "Code too large"),
});

export const UploadVideoSchema = z.object({
  interviewId: z.string().min(1, "interviewId is required"),
});

// ============================================================================
// VALIDATION MIDDLEWARE FACTORY
// ============================================================================

export const validateBody =
  (schema: z.ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`,
      );
      logger.warn({ issues, path: req.path }, "validation failed");
      return res.status(400).json({
        error: "Validation failed",
        details: issues,
      });
    }
    // Attach validated data to request for downstream use
    (req as any).validatedBody = result.data;
    next();
  };

export const validateQuery =
  (schema: z.ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issues = result.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`,
      );
      logger.warn({ issues, path: req.path }, "query validation failed");
      return res.status(400).json({
        error: "Query validation failed",
        details: issues,
      });
    }
    (req as any).validatedQuery = result.data;
    next();
  };
