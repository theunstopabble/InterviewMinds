import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

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

export const BiometricEnrollmentModel = mongoose.model<IBiometricEnrollment>('BiometricEnrollment', biometricEnrollmentSchema);
