import * as crypto from 'crypto';
import { logger } from './logger';
import { BiometricEnrollmentModel } from '../models/BiometricEnrollment';

interface BiometricTemplate {
  userId: string;
  type: 'face' | 'voice' | 'fingerprint';
  templateData: string;
  createdAt: string;
  lastVerified: string;
  isActive: boolean;
}

interface BiometricEnrollment {
  userId: string;
  faceTemplate?: string;
  voiceTemplate?: string;
  fingerprintTemplate?: string;
  status: 'pending' | 'enrolled' | 'failed';
}

interface BiometricVerificationResult {
  success: boolean;
  confidence: number;
  livenessVerified: boolean;
  details: string;
}

interface BiometricSettings {
  enabled: boolean;
  requiredForAccess: boolean;
  allowMultipleTypes: boolean;
  enrolledTypes: ('face' | 'voice' | 'fingerprint')[];
  livenessDetection: boolean;
}

const verificationAttempts: Map<string, { attempts: number; lastAttempt: string }> = new Map();

function encodeFaceTemplate(faceData: number[]): string {
  return Buffer.from(faceData.slice(0, 128)).toString('base64');
}

function encodeVoiceTemplate(audioFeatures: number[]): string {
  return Buffer.from(audioFeatures.slice(0, 256)).toString('base64');
}

function encodeFingerprintTemplate(fingerprintData: number[]): string {
  return Buffer.from(fingerprintData.slice(0, 64)).toString('base64');
}

function compareFaceTemplates(template1: string, template2: string): number {
  try {
    const data1 = Buffer.from(template1, 'base64');
    const data2 = Buffer.from(template2, 'base64');

    let matchingBits = 0;
    const compareLength = Math.min(data1.length, data2.length);

    for (let i = 0; i < compareLength; i++) {
      const xor = data1[i] ^ data2[i];
      for (let j = 0; j < 8; j++) {
        if ((xor & (1 << j)) === 0) matchingBits++;
      }
    }

    return (matchingBits / (compareLength * 8)) * 100;
  } catch {
    return 0;
  }
}

function compareVoiceTemplates(template1: string, template2: string): number {
  try {
    const data1 = Buffer.from(template1, 'base64');
    const data2 = Buffer.from(template2, 'base64');

    let similarity = 0;
    const samples = Math.min(data1.length, data2.length);

    for (let i = 0; i < samples; i++) {
      const diff = Math.abs(data1[i] - data2[i]);
      if (diff < 10) similarity++;
    }

    return (similarity / samples) * 100;
  } catch {
    return 0;
  }
}

function compareFingerprintTemplates(template1: string, template2: string): number {
  try {
    const data1 = Buffer.from(template1, 'base64');
    const data2 = Buffer.from(template2, 'base64');

    let matchingPoints = 0;
    const totalPoints = Math.min(data1.length, data2.length);

    for (let i = 0; i < totalPoints; i++) {
      const diff = Math.abs(data1[i] - data2[i]);
      if (diff < 5) matchingPoints++;
    }

    return (matchingPoints / totalPoints) * 100;
  } catch {
    return 0;
  }
}

function checkLiveness(sessionData: Record<string, unknown>): boolean {
  const requiredChecks = ['face_movement', 'blink_detected', 'light_consistency'];
  const passedChecks = requiredChecks.filter(check => sessionData[check] === true);

  return passedChecks.length >= 2;
}

export async function enrollFace(userId: string, faceData: number[]): Promise<BiometricTemplate> {
  const templateData = encodeFaceTemplate(faceData);
  const templateHash = crypto.createHash('sha256').update(templateData).digest('hex');

  await BiometricEnrollmentModel.findOneAndUpdate(
    { userId, modality: 'face' },
    {
      $set: {
        userId,
        templateHash,
        templateData,
        deviceId: 'default',
        modality: 'face',
        isActive: true,
        enrolledAt: new Date(),
        lastUsedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  logger.info({ userId, modality: 'face' }, 'Face enrolled');

  return {
    userId,
    type: 'face',
    templateData,
    createdAt: new Date().toISOString(),
    lastVerified: new Date().toISOString(),
    isActive: true,
  };
}

export async function enrollVoice(userId: string, audioFeatures: number[]): Promise<BiometricTemplate> {
  const templateData = encodeVoiceTemplate(audioFeatures);
  const templateHash = crypto.createHash('sha256').update(templateData).digest('hex');

  await BiometricEnrollmentModel.findOneAndUpdate(
    { userId, modality: 'voice' },
    {
      $set: {
        userId,
        templateHash,
        templateData,
        deviceId: 'default',
        modality: 'voice',
        isActive: true,
        enrolledAt: new Date(),
        lastUsedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  logger.info({ userId, modality: 'voice' }, 'Voice enrolled');

  return {
    userId,
    type: 'voice',
    templateData,
    createdAt: new Date().toISOString(),
    lastVerified: new Date().toISOString(),
    isActive: true,
  };
}

export async function enrollFingerprint(userId: string, fingerprintData: number[]): Promise<BiometricTemplate> {
  const templateData = encodeFingerprintTemplate(fingerprintData);
  const templateHash = crypto.createHash('sha256').update(templateData).digest('hex');

  await BiometricEnrollmentModel.findOneAndUpdate(
    { userId, modality: 'fingerprint' },
    {
      $set: {
        userId,
        templateHash,
        templateData,
        deviceId: 'default',
        modality: 'fingerprint',
        isActive: true,
        enrolledAt: new Date(),
        lastUsedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  logger.info({ userId, modality: 'fingerprint' }, 'Fingerprint enrolled');

  return {
    userId,
    type: 'fingerprint',
    templateData,
    createdAt: new Date().toISOString(),
    lastVerified: new Date().toISOString(),
    isActive: true,
  };
}

export async function verifyFace(userId: string, faceData: number[], sessionData?: Record<string, unknown>): Promise<BiometricVerificationResult> {
  const enrollment = await BiometricEnrollmentModel.findOne({ userId, modality: 'face', isActive: true });

  if (!enrollment) {
    return { success: false, confidence: 0, livenessVerified: false, details: 'Face not enrolled' };
  }

  const capturedTemplate = encodeFaceTemplate(faceData);
  const confidence = compareFaceTemplates(enrollment.templateData, capturedTemplate);

  let livenessVerified = true;
  if (sessionData) {
    livenessVerified = checkLiveness(sessionData);
  }

  const success = confidence >= 75 && livenessVerified;

  if (success) {
    await BiometricEnrollmentModel.findOneAndUpdate(
      { userId, modality: 'face' },
      { $set: { lastUsedAt: new Date() } }
    );
  }

  return {
    success,
    confidence: Math.round(confidence),
    livenessVerified,
    details: success ? 'Face verified successfully' : `Confidence too low (${Math.round(confidence)}%) or liveness failed`,
  };
}

export async function verifyVoice(userId: string, audioFeatures: number[]): Promise<BiometricVerificationResult> {
  const enrollment = await BiometricEnrollmentModel.findOne({ userId, modality: 'voice', isActive: true });

  if (!enrollment) {
    return { success: false, confidence: 0, livenessVerified: false, details: 'Voice not enrolled' };
  }

  const capturedTemplate = encodeVoiceTemplate(audioFeatures);
  const confidence = compareVoiceTemplates(enrollment.templateData, capturedTemplate);

  const success = confidence >= 70;

  if (success) {
    await BiometricEnrollmentModel.findOneAndUpdate(
      { userId, modality: 'voice' },
      { $set: { lastUsedAt: new Date() } }
    );
  }

  return {
    success,
    confidence: Math.round(confidence),
    livenessVerified: true,
    details: success ? 'Voice verified successfully' : `Confidence too low (${Math.round(confidence)}%)`,
  };
}

export async function verifyFingerprint(userId: string, fingerprintData: number[]): Promise<BiometricVerificationResult> {
  const enrollment = await BiometricEnrollmentModel.findOne({ userId, modality: 'fingerprint', isActive: true });

  if (!enrollment) {
    return { success: false, confidence: 0, livenessVerified: false, details: 'Fingerprint not enrolled' };
  }

  const capturedTemplate = encodeFingerprintTemplate(fingerprintData);
  const confidence = compareFingerprintTemplates(enrollment.templateData, capturedTemplate);

  const success = confidence >= 80;

  if (success) {
    await BiometricEnrollmentModel.findOneAndUpdate(
      { userId, modality: 'fingerprint' },
      { $set: { lastUsedAt: new Date() } }
    );
  }

  return {
    success,
    confidence: Math.round(confidence),
    livenessVerified: true,
    details: success ? 'Fingerprint verified successfully' : `Confidence too low (${Math.round(confidence)}%)`,
  };
}

export async function getEnrollmentStatus(userId: string): Promise<BiometricEnrollment | null> {
  const enrollments = await BiometricEnrollmentModel.find({ userId, isActive: true });
  if (enrollments.length === 0) return null;

  const result: BiometricEnrollment = { userId, status: 'enrolled' };
  for (const e of enrollments) {
    if (e.modality === 'face') result.faceTemplate = e.templateData;
    if (e.modality === 'voice') result.voiceTemplate = e.templateData;
    if (e.modality === 'fingerprint') result.fingerprintTemplate = e.templateData;
  }

  return result;
}

export async function removeBiometricEnrollment(userId: string, type: 'face' | 'voice' | 'fingerprint'): Promise<boolean> {
  const result = await BiometricEnrollmentModel.deleteOne({ userId, modality: type });
  return result.deletedCount > 0;
}

export function checkRateLimit(userId: string): boolean {
  const attempts = verificationAttempts.get(userId) || { attempts: 0, lastAttempt: '' };
  const now = new Date().getTime();
  const lastAttempt = new Date(attempts.lastAttempt).getTime();

  if (now - lastAttempt < 60000) {
    if (attempts.attempts >= 5) return false;
    attempts.attempts++;
  } else {
    attempts.attempts = 1;
  }

  attempts.lastAttempt = new Date().toISOString();
  verificationAttempts.set(userId, attempts);

  return true;
}

export function getDefaultSettings(): BiometricSettings {
  return {
    enabled: false,
    requiredForAccess: false,
    allowMultipleTypes: true,
    enrolledTypes: [],
    livenessDetection: true,
  };
}
