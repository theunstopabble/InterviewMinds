import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IPermissionGroup {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  members: string[];
  createdAt: Date;
  updatedAt: Date;
}

const permissionGroupSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  name: { type: String, required: true, unique: true },
  description: { type: String, default: null },
  permissions: [{ type: String }],
  members: [{ type: String }],
}, { timestamps: true });

export const PermissionGroupModel = mongoose.model<IPermissionGroup>('PermissionGroup', permissionGroupSchema);
