import mongoose, { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IInterviewSlot extends Document {
  id: string;
  interviewerId: string;
  startTime: Date;
  endTime: Date;
  status: 'available' | 'booked' | 'completed' | 'cancelled';
  candidateId?: string;
  interviewId?: string;
  timezone: string;
}

export interface IScheduledInterview extends Document {
  id: string;
  candidateId: string;
  interviewerId: string;
  slotId: string;
  scheduledTime: Date;
  endTime: Date;
  timezone: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  reminderSent: boolean;
  interviewType: 'live' | 'async' | 'take-home';
  role: string;
  meetingLink?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const interviewSlotSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  interviewerId: { type: String, required: true, index: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: {
    type: String,
    enum: ['available', 'booked', 'completed', 'cancelled'],
    default: 'available',
  },
  candidateId: { type: String, default: null },
  interviewId: { type: String, default: null },
  timezone: { type: String, required: true },
}, { timestamps: true });

interviewSlotSchema.index({ interviewerId: 1, status: 1 });
interviewSlotSchema.index({ interviewerId: 1, startTime: 1, endTime: 1 });

const scheduledInterviewSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  candidateId: { type: String, required: true, index: true },
  interviewerId: { type: String, required: true, index: true },
  slotId: { type: String, required: true },
  scheduledTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  timezone: { type: String, required: true },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled',
  },
  reminderSent: { type: Boolean, default: false },
  interviewType: {
    type: String,
    enum: ['live', 'async', 'take-home'],
    default: 'live',
  },
  role: { type: String, required: true },
  meetingLink: { type: String, default: null },
  notes: { type: String, default: null },
}, { timestamps: true });

scheduledInterviewSchema.index({ candidateId: 1, status: 1, scheduledTime: 1 });
scheduledInterviewSchema.index({ interviewerId: 1, status: 1 });

export const InterviewSlotModel = mongoose.model<IInterviewSlot>('InterviewSlot', interviewSlotSchema);
export const ScheduledInterviewModel = mongoose.model<IScheduledInterview>('ScheduledInterview', scheduledInterviewSchema);
