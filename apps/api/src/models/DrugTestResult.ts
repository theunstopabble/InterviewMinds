import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IDrugTestResult {
  id: string;
  backgroundCheckId: string;
  candidateId: string;
  testType: string;
  result: 'negative' | 'positive' | 'inconclusive';
  substances: string[];
  collectionDate?: Date;
  resultDate?: Date;
  labName?: string;
  technician?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const drugTestResultSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  backgroundCheckId: { type: String, required: true, index: true },
  candidateId: { type: String, required: true, index: true },
  testType: { type: String, required: true },
  result: {
    type: String,
    enum: ['negative', 'positive', 'inconclusive'],
    required: true,
  },
  substances: [{ type: String }],
  collectionDate: { type: Date, default: null },
  resultDate: { type: Date, default: null },
  labName: { type: String, default: null },
  technician: { type: String, default: null },
  notes: { type: String, default: null },
}, { timestamps: true });

export const DrugTestResultModel = mongoose.model<IDrugTestResult>('DrugTestResult', drugTestResultSchema);
