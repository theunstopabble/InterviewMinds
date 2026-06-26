import mongoose from 'mongoose';
import crypto from 'crypto';

const EncryptionKeySchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  userId: { type: String, required: true, index: true },
  publicKey: { type: String, required: true },
  privateKey: { type: String, required: true },
  algorithm: { type: String, default: 'aes-256-gcm' },
  isActive: { type: Boolean, default: true },
  rotatedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true, _id: false });

export const EncryptionKeyModel = mongoose.model('EncryptionKey', EncryptionKeySchema);
