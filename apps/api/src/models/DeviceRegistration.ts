import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IDeviceRegistration {
  id: string;
  userId: string;
  deviceToken: string;
  platform: 'web' | 'ios' | 'android';
  deviceInfo?: any;
  isActive: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const deviceRegistrationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  userId: { type: String, required: true, index: true },
  deviceToken: { type: String, required: true },
  platform: {
    type: String,
    enum: ['web', 'ios', 'android'],
    required: true,
  },
  deviceInfo: { type: mongoose.Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: true },
  lastUsedAt: { type: Date, default: null },
}, { timestamps: true });

deviceRegistrationSchema.index({ deviceToken: 1 });

export const DeviceRegistrationModel = mongoose.model<IDeviceRegistration>('DeviceRegistration', deviceRegistrationSchema);
