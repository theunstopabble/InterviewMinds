import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IAccessRequest {
  id: string;
  userId: string;
  userName?: string;
  requestedPermission: string;
  justification?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approverId?: string;
  approverComment?: string;
  duration?: number;
  expiryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const accessRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  userId: { type: String, required: true, index: true },
  userName: { type: String, default: null },
  requestedPermission: { type: String, required: true },
  justification: { type: String, default: null },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    required: true,
  },
  approverId: { type: String, default: null },
  approverComment: { type: String, default: null },
  duration: { type: Number, default: null },
  expiryDate: { type: Date, default: null },
}, { timestamps: true });

accessRequestSchema.index({ userId: 1, status: 1 });

export const AccessRequestModel = mongoose.model<IAccessRequest>('AccessRequest', accessRequestSchema);
