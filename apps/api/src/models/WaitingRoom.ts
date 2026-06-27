import mongoose, { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ITechCheckDetails {
  cameraWorking: boolean;
  microphoneWorking: boolean;
  speakerWorking: boolean;
  internetSpeed: number;
  browserSupported: boolean;
  screenShareSupported: boolean;
  checkedAt: Date;
}

export interface IWaitingRoomEntry {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  interviewId: string;
  role: string;
  scheduledTime: Date;
  status: 'queued' | 'in_waiting' | 'tech_check' | 'ready' | 'interview_started' | 'no_show' | 'cancelled';
  position: number;
  estimatedWaitTime: number;
  techCheckPassed: boolean;
  techCheckDetails: ITechCheckDetails;
  joinedAt: Date;
  readyAt?: Date;
  interviewStartedAt?: Date;
}

export interface IWaitingRoomSession extends Document {
  id: string;
  interviewId: string;
  entries: IWaitingRoomEntry[];
  maxCapacity: number;
  createdAt: Date;
  updatedAt: Date;
}

const techCheckDetailsSchema = new mongoose.Schema({
  cameraWorking: { type: Boolean, required: true },
  microphoneWorking: { type: Boolean, required: true },
  speakerWorking: { type: Boolean, required: true },
  internetSpeed: { type: Number, required: true },
  browserSupported: { type: Boolean, required: true },
  screenShareSupported: { type: Boolean, required: true },
  checkedAt: { type: Date, required: true },
}, { _id: false });

const waitingRoomEntrySchema = new mongoose.Schema({
  id: { type: String, required: true, default: () => uuidv4() },
  candidateId: { type: String, required: true },
  candidateName: { type: String, required: true },
  candidateEmail: { type: String, required: true },
  interviewId: { type: String, required: true },
  role: { type: String, required: true },
  scheduledTime: { type: Date, required: true },
  status: {
    type: String,
    enum: ['queued', 'in_waiting', 'tech_check', 'ready', 'interview_started', 'no_show', 'cancelled'],
    default: 'queued',
  },
  position: { type: Number, required: true },
  estimatedWaitTime: { type: Number, required: true },
  techCheckPassed: { type: Boolean, default: false },
  techCheckDetails: { type: techCheckDetailsSchema, default: null },
  joinedAt: { type: Date, required: true },
  readyAt: { type: Date, default: null },
  interviewStartedAt: { type: Date, default: null },
}, { _id: false });

const waitingRoomSessionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  interviewId: { type: String, required: true, index: true },
  entries: [waitingRoomEntrySchema],
  maxCapacity: { type: Number, required: true },
}, { timestamps: true });

waitingRoomSessionSchema.index({ interviewId: 1, status: 1 });

export const WaitingRoomEntryModel = mongoose.model<IWaitingRoomEntry>('WaitingRoomEntry', waitingRoomEntrySchema);
export const WaitingRoomSessionModel = mongoose.model<IWaitingRoomSession>('WaitingRoomSession', waitingRoomSessionSchema);
