import mongoose, { Document } from 'mongoose';

export interface ITenant extends Document {
  tenantId: string;
  name: string;
  domain: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  createdAt: Date;
  settings: {
    isolationLevel: 'database' | 'schema' | 'row' | 'application';
    storageLimit: number;
    apiRateLimit: number;
    features: string[];
    customBranding?: {
      primaryColor: string;
      secondaryColor: string;
      logoUrl: string;
      companyName: string;
    };
  };
}

const tenantSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  domain: { type: String, required: true },
  plan: {
    type: String,
    enum: ['free', 'starter', 'professional', 'enterprise'],
    default: 'free',
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'trial'],
    default: 'trial',
  },
  createdAt: { type: Date, default: Date.now },
  settings: {
    isolationLevel: {
      type: String,
      enum: ['database', 'schema', 'row', 'application'],
      default: 'row',
    },
    storageLimit: { type: Number, default: 1073741824 },
    apiRateLimit: { type: Number, default: 1000 },
    features: { type: [String], default: [] },
    customBranding: {
      type: {
        primaryColor: { type: String },
        secondaryColor: { type: String },
        logoUrl: { type: String },
        companyName: { type: String },
      },
      default: null,
    },
  },
}, { timestamps: true });

export const TenantModel = mongoose.model<ITenant>('Tenant', tenantSchema);
