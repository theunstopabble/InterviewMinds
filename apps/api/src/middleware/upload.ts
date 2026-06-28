import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary";
import { logger } from "../lib/logger";

const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_RESUME_SIZE = 5 * 1024 * 1024;

const ALLOWED_VIDEO_FORMATS = ["webm", "mp4", "mkv", "mov"];
const ALLOWED_RESUME_FORMATS = ["pdf"];

const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary as never,
  params: async () => ({
    folder: "interview_minds_videos",
    resource_type: "video",
    allowed_formats: ALLOWED_VIDEO_FORMATS,
    public_id: `video_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    transformation: [{ quality: "auto", fetch_format: "mp4" }],
  }),
});

const resumeStorage = new CloudinaryStorage({
  cloudinary: cloudinary as never,
  params: async () => ({
    folder: "interview_minds_resumes",
    resource_type: "raw",
    allowed_formats: ALLOWED_RESUME_FORMATS,
    public_id: `resume_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  }),
});

const videoFileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = file.originalname.split(".").pop()?.toLowerCase();
  if (!ext || !ALLOWED_VIDEO_FORMATS.includes(ext)) {
    cb(new Error(`Invalid video format. Allowed: ${ALLOWED_VIDEO_FORMATS.join(", ")}`));
    return;
  }
  cb(null, true);
};

const resumeFileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = file.originalname.split(".").pop()?.toLowerCase();
  if (!ext || !ALLOWED_RESUME_FORMATS.includes(ext)) {
    cb(new Error(`Invalid resume format. Allowed: ${ALLOWED_RESUME_FORMATS.join(", ")}`));
    return;
  }
  cb(null, true);
};

export const uploadMiddleware = {
  video: multer({
    storage: videoStorage,
    limits: { fileSize: MAX_VIDEO_SIZE },
    fileFilter: videoFileFilter,
  }),

  resume: multer({
    storage: resumeStorage,
    limits: { fileSize: MAX_RESUME_SIZE },
    fileFilter: resumeFileFilter,
  }),
};

export const MAX_VIDEO_SIZE_MB = MAX_VIDEO_SIZE / (1024 * 1024);
export const MAX_RESUME_SIZE_MB = MAX_RESUME_SIZE / (1024 * 1024);