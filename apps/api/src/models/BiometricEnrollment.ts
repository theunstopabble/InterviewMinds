import mongoose from 'mongoose';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const ALGORITHM = 'aes-256-gcm';
const KEY = (() => {
  const raw = process.env.BIOMETRIC_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (raw) return crypto.scryptSync(raw, 'biometric-salt', 32);
  return crypto.randomBytes(32);
})();

function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export interface IBiometricEnrollment {
  id: string;
  userId: string;
  templateHash: string;
  templateData: string;
  deviceId: string;
  modality: 'fingerprint' | 'face' | 'voice' | 'iris';
  isActive: boolean;
  enrolledAt: Date;
  lastUsedAt?: Date;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const biometricEnrollmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  userId: { type: String, required: true, index: true },
  templateHash: { type: String, required: true },
  templateData: { type: String, required: true },
  deviceId: { type: String, required: true },
  modality: {
    type: String,
    enum: ['fingerprint', 'face', 'voice', 'iris'],
    required: true,
  },
  isActive: { type: Boolean, default: true },
  enrolledAt: { type: Date, required: true },
  lastUsedAt: { type: Date, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

biometricEnrollmentSchema.pre('save', function (next) {
  if (this.isModified('templateData')) {
    this.templateData = encrypt(this.templateData);
  }
  next();
});

biometricEnrollmentSchema.post('find', function (docs) {
  if (!docs) return;
  const arr = Array.isArray(docs) ? docs : [docs];
  for (const doc of arr) {
    if (doc.templateData && !doc.templateData.includes(':')) continue;
    doc.templateData = decrypt(doc.templateData);
  }
});

biometricEnrollmentSchema.post('findOne', function (doc) {
  if (!doc || !doc.templateData) return;
  if (!doc.templateData.includes(':')) return;
  doc.templateData = decrypt(doc.templateData);
});

export const BiometricEnrollmentModel = mongoose.model<IBiometricEnrollment>('BiometricEnrollment', biometricEnrollmentSchema);
