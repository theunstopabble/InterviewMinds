import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IOfflineAction {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  payload?: any;
  status: 'pending' | 'synced' | 'failed';
  syncAttempts: number;
  lastSyncAttempt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const offlineActionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  userId: { type: String, required: true, index: true },
  action: { type: String, required: true },
  resource: { type: String, required: true },
  resourceId: { type: String, default: null },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: {
    type: String,
    enum: ['pending', 'synced', 'failed'],
    required: true,
  },
  syncAttempts: { type: Number, default: 0 },
  lastSyncAttempt: { type: Date, default: null },
  errorMessage: { type: String, default: null },
}, { timestamps: true });

offlineActionSchema.index({ userId: 1, status: 1 });

export const OfflineActionModel = mongoose.model<IOfflineAction>('OfflineAction', offlineActionSchema);
