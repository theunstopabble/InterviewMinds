import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary";

// Storage Configuration for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "interview_minds_videos", // Cloudinary folder name
      resource_type: "video", // Important for video uploads
      allowed_formats: ["webm", "mp4", "mkv"], // Allowed formats
      public_id: `interview_${Date.now()}`, // Unique filename
    };
  },
});

// Multer Instance
export const uploadMiddleware = multer({ storage: storage });
