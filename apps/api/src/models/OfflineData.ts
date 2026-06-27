import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IOfflineData {
  id: string;
  userId: string;
  dataType: string;
  dataId: string;
  data: unknown;
  lastModified: Date;
  createdAt: Date;
  updatedAt: Date;
}

const offlineDataSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  userId: { type: String, required: true, index: true },
  dataType: { type: String, required: true },
  dataId: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  lastModified: { type: Date, default: Date.now },
}, { timestamps: true });

offlineDataSchema.index({ userId: 1, dataType: 1 });

export const OfflineDataModel = mongoose.model<IOfflineData>('OfflineData', offlineDataSchema);
