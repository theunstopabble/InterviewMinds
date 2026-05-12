import { logger } from "./logger";

export interface CDNConfig {
  provider: "cloudinary" | "aws-cloudfront" | "vercel" | "none";
  baseUrl?: string;
  apiKey?: string;
  apiSecret?: string;
}

export interface CDNAsset {
  url: string;
  publicId: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
}

let cdnConfig: CDNConfig = { provider: "none" };

export function initCDN(config: CDNConfig): void {
  cdnConfig = config;
  logger.info({ provider: config.provider }, "CDN initialized");
}

export async function uploadAsset(
  file: Buffer,
  filename: string,
  folder: string = "interviewminds"
): Promise<CDNAsset> {
  if (cdnConfig.provider === "none") {
    return {
      url: `data:application/octet-stream;base64,${file.toString("base64")}`,
      publicId: filename,
      format: filename.split(".").pop() || "bin",
      bytes: file.length,
    };
  }

  if (cdnConfig.provider === "cloudinary") {
    return uploadToCloudinary(file, filename, folder);
  }

  if (cdnConfig.provider === "aws-cloudfront") {
    return uploadToAWS(file, filename, folder);
  }

  throw new Error(`CDN provider ${cdnConfig.provider} not supported`);
}

async function uploadToCloudinary(
  file: Buffer,
  filename: string,
  folder: string
): Promise<CDNAsset> {
  const cloudinary = require("cloudinary").v2;
  
  cloudinary.config({
    cloud_name: cdnConfig.baseUrl,
    api_key: cdnConfig.apiKey,
    api_secret: cdnConfig.apiSecret,
  });

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error: any, result: any) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
          });
        }
      }
    );
    uploadStream.end(file);
  });
}

async function uploadToAWS(
  file: Buffer,
  filename: string,
  folder: string
): Promise<CDNAsset> {
  const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
  
  const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
  const key = `${folder}/${Date.now()}-${filename}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: file,
      ContentType: getMimeType(filename),
    })
  );

  return {
    url: `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${key}`,
    publicId: key,
    format: filename.split(".").pop() || "bin",
    bytes: file.length,
  };
}

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    pdf: "application/pdf",
    mp4: "video/mp4",
    webm: "video/webm",
    wav: "audio/wav",
    mp3: "audio/mpeg",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}

export async function deleteAsset(publicId: string): Promise<void> {
  if (cdnConfig.provider === "cloudinary") {
    const cloudinary = require("cloudinary").v2;
    cloudinary.config({
      cloud_name: cdnConfig.baseUrl,
      api_key: cdnConfig.apiKey,
      api_secret: cdnConfig.apiSecret,
    });
    await cloudinary.uploader.destroy(publicId);
  }
  logger.info({ publicId }, "Asset deleted from CDN");
}

export function getCDNUrl(path: string): string {
  if (cdnConfig.provider === "none") {
    return path;
  }
  
  if (cdnConfig.provider === "vercel") {
    return `https://${process.env.VERCEL_DEPLOY_URL}${path}`;
  }

  return `${cdnConfig.baseUrl}${path}`;
}

export function isCDNEnabled(): boolean {
  return cdnConfig.provider !== "none";
}