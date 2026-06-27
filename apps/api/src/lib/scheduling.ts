import { v4 as uuidv4 } from 'uuid';
import { InterviewSlotModel, ScheduledInterviewModel } from '../models/Scheduling';
import { notificationService } from '../lib/notifications';
import { logger } from '../lib/logger';

export interface InterviewSlot {
  id: string;
  interviewerId: string;
  startTime: Date;
  endTime: Date;
  status: 'available' | 'booked' | 'completed' | 'cancelled';
  candidateId?: string;
  interviewId?: string;
  timezone: string;
}

export interface ScheduledInterview {
  id: string;
  candidateId: string;
  candidateName: string;
  interviewerId: string;
  slotId: string;
  scheduledTime: Date;
  endTime: Date;
  timezone: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'no-show' | 'rejected' | 'offered';
  reminderSent: boolean;
  interviewType: 'live' | 'async' | 'take-home';
  role: string;
  meetingLink?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
  id?: string;
}

class SchedulingService {
  getTimezones(): string[] {
    return [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Sao_Paulo',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Singapore',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Australia/Sydney',
      'Pacific/Auckland',
    ];
  }

  getUserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  convertToTimezone(date: Date, timezone: string): string {
    return date.toLocaleString('en-US', { timeZone: timezone });
  }

  async generateAvailableSlots(
    interviewerId: string,
    startDate: Date,
    endDate: Date,
    duration: number = 60,
    workingHours: { start: number; end: number } = { start: 9, end: 18 }
  ): Promise<InterviewSlot[]> {
    const slots: InterviewSlot[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        for (let hour = workingHours.start; hour < workingHours.end; hour++) {
          const slotStart = new Date(current);
          slotStart.setHours(hour, 0, 0, 0);

          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + duration);

          slots.push({
            id: uuidv4(),
            interviewerId,
            startTime: slotStart,
            endTime: slotEnd,
            status: 'available',
            timezone: this.getUserTimezone(),
          });
        }
      }
      current.setDate(current.getDate() + 1);
    }

    await InterviewSlotModel.insertMany(slots.map(s => ({
      id: s.id,
      interviewerId: s.interviewerId,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      timezone: s.timezone,
    })));

    return slots;
  }

  async getAvailableSlots(
    interviewerId: string,
    date: Date,
    _timezone: string
  ): Promise<TimeSlot[]> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    let storedSlots = await InterviewSlotModel.find({ interviewerId }).lean();

    if (storedSlots.length === 0) {
      const startDate = new Date(date);
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 14);
      await this.generateAvailableSlots(
        interviewerId,
        startDate,
        endDate,
        60,
        { start: 9, end: 18 }
      );
      storedSlots = await InterviewSlotModel.find({ interviewerId }).lean();
    }

    const availableSlots = storedSlots.filter(
      (s) =>
        s.status === 'available' &&
        s.startTime >= dayStart &&
        s.startTime <= dayEnd
    );

    return availableSlots.map((slot) => ({
      id: slot.id,
      date: slot.startTime.toISOString().split('T')[0],
      time: slot.startTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
      available: true,
    }));
  }

  async bookSlot(
    interviewerId: string,
    slotId: string,
    candidateId: string,
    candidateName: string = 'Candidate',
    interviewType: 'live' | 'async' | 'take-home' = 'live',
    role: string = 'Technical Interview'
  ): Promise<ScheduledInterview | null> {
    try {
      const slot = await InterviewSlotModel.findOne({ id: slotId, interviewerId });
      if (!slot || slot.status !== 'available') return null;

      slot.status = 'booked';
      slot.candidateId = candidateId;
      await slot.save();

      const interviewDoc = await ScheduledInterviewModel.create({
        candidateId,
        candidateName,
        interviewerId,
        slotId,
        scheduledTime: slot.startTime,
        endTime: slot.endTime,
        timezone: slot.timezone,
        status: 'scheduled',
        reminderSent: false,
        interviewType,
        role,
        meetingLink: `https://interviewminds.com/interview/${uuidv4()}`,
      });

      notificationService.sendTemplatedNotification(
        candidateId,
        'interview-scheduled',
        {
          candidate_name: candidateName,
          role,
          interview_date: slot.startTime.toLocaleDateString('en-US'),
          interview_time: slot.startTime.toLocaleTimeString('en-US'),
        }
      ).catch((err) => {
        logger.error({ err, candidateId }, 'Failed to send interview-scheduled notification');
      });

      return {
        id: interviewDoc.id,
        candidateId: interviewDoc.candidateId,
        candidateName: interviewDoc.candidateName,
        interviewerId: interviewDoc.interviewerId,
        slotId: interviewDoc.slotId,
        scheduledTime: interviewDoc.scheduledTime,
        endTime: interviewDoc.endTime,
        timezone: interviewDoc.timezone,
        status: interviewDoc.status,
        reminderSent: interviewDoc.reminderSent,
        interviewType: interviewDoc.interviewType,
        role: interviewDoc.role,
        meetingLink: interviewDoc.meetingLink,
        notes: interviewDoc.notes,
        createdAt: interviewDoc.createdAt,
        updatedAt: interviewDoc.updatedAt,
      };
    } catch (error) {
      logger.error({ err: error, slotId, interviewerId }, 'Error booking slot');
      return null;
    }
  }

  async rescheduleInterview(
    interviewId: string,
    newSlotId: string,
    newInterviewerId?: string
  ): Promise<ScheduledInterview | null> {
    try {
      const interview = await ScheduledInterviewModel.findOne({ id: interviewId });
      if (!interview) return null;

      if (newInterviewerId && newInterviewerId !== interview.interviewerId) {
        interview.interviewerId = newInterviewerId;
      }
      interview.slotId = newSlotId;
      await interview.save();

      notificationService.sendTemplatedNotification(
        interview.candidateId,
        'interview-rescheduled',
        {
          candidate_name: interview.candidateName || 'Candidate',
          role: interview.role,
          interview_date: interview.scheduledTime.toLocaleDateString('en-US'),
          interview_time: interview.scheduledTime.toLocaleTimeString('en-US'),
        }
      ).catch((err) => {
        logger.error({ err, interviewId }, 'Failed to send interview-rescheduled notification');
      });

      return {
        id: interview.id,
        candidateId: interview.candidateId,
        candidateName: interview.candidateName,
        interviewerId: interview.interviewerId,
        slotId: interview.slotId,
        scheduledTime: interview.scheduledTime,
        endTime: interview.endTime,
        timezone: interview.timezone,
        status: interview.status,
        reminderSent: interview.reminderSent,
        interviewType: interview.interviewType,
        role: interview.role,
        meetingLink: interview.meetingLink,
        notes: interview.notes,
        createdAt: interview.createdAt,
        updatedAt: interview.updatedAt,
      };
    } catch (error) {
      logger.error({ err: error, interviewId }, 'Error rescheduling interview');
      return null;
    }
  }

  async cancelInterview(interviewId: string, reason?: string): Promise<boolean> {
    try {
      const interview = await ScheduledInterviewModel.findOne({ id: interviewId });
      if (!interview) return false;

      interview.status = 'cancelled';
      if (reason) interview.notes = reason;
      await interview.save();

      notificationService.sendTemplatedNotification(
        interview.candidateId,
        'interview-cancelled',
        {
          candidate_name: interview.candidateName || 'Candidate',
          role: interview.role,
          interview_date: interview.scheduledTime.toLocaleDateString('en-US'),
          reason: reason || 'No specific reason provided.',
        }
      ).catch((err) => {
        logger.error({ err, interviewId }, 'Failed to send interview-cancelled notification');
      });

      return true;
    } catch (error) {
      logger.error({ err: error, interviewId }, 'Error cancelling interview');
      return false;
    }
  }

  async getUpcomingInterviews(candidateId: string): Promise<ScheduledInterview[]> {
    try {
      const now = new Date();
      const interviews = await ScheduledInterviewModel.find({
        candidateId,
        scheduledTime: { $gt: now },
        status: 'scheduled',
      }).sort({ scheduledTime: 1 }).lean();

      return interviews.map((i) => ({
        id: i.id,
        candidateId: i.candidateId,
        candidateName: i.candidateName,
        interviewerId: i.interviewerId,
        slotId: i.slotId,
        scheduledTime: i.scheduledTime,
        endTime: i.endTime,
        timezone: i.timezone,
        status: i.status,
        reminderSent: i.reminderSent,
        interviewType: i.interviewType,
        role: i.role,
        meetingLink: i.meetingLink,
        notes: i.notes,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      }));
    } catch (error) {
      logger.error({ err: error, candidateId }, 'Error fetching upcoming interviews');
      return [];
    }
  }

  async getInterviewerSchedule(interviewerId: string): Promise<ScheduledInterview[]> {
    try {
      const interviews = await ScheduledInterviewModel.find({
        interviewerId,
      }).sort({ scheduledTime: 1 }).lean();

      return interviews.map((i) => ({
        id: i.id,
        candidateId: i.candidateId,
        candidateName: i.candidateName,
        interviewerId: i.interviewerId,
        slotId: i.slotId,
        scheduledTime: i.scheduledTime,
        endTime: i.endTime,
        timezone: i.timezone,
        status: i.status,
        reminderSent: i.reminderSent,
        interviewType: i.interviewType,
        role: i.role,
        meetingLink: i.meetingLink,
        notes: i.notes,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      }));
    } catch (error) {
      logger.error({ err: error, interviewerId }, 'Error fetching interviewer schedule');
      return [];
    }
  }

  async markNoShow(interviewId: string): Promise<boolean> {
    try {
      const interview = await ScheduledInterviewModel.findOne({ id: interviewId });
      if (!interview) return false;

      interview.status = 'no-show';
      await interview.save();
      return true;
    } catch (error) {
      logger.error({ err: error, interviewId }, 'Error marking no-show');
      return false;
    }
  }

  async completeInterview(interviewId: string): Promise<boolean> {
    try {
      const interview = await ScheduledInterviewModel.findOne({ id: interviewId });
      if (!interview) return false;

      interview.status = 'completed';
      await interview.save();

      notificationService.sendTemplatedNotification(
        interview.candidateId,
        'interview-completed',
        {
          candidate_name: interview.candidateName || 'Candidate',
          role: interview.role,
          response_time: '48 hours',
        }
      ).catch((err) => {
        logger.error({ err, interviewId }, 'Failed to send interview-completed notification');
      });

      return true;
    } catch (error) {
      logger.error({ err: error, interviewId }, 'Error completing interview');
      return false;
    }
  }

  async rejectInterview(
    interviewId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const interview = await ScheduledInterviewModel.findOne({ id: interviewId });
      if (!interview) return { success: false, error: 'Interview not found' };

      interview.status = 'rejected';
      if (reason) interview.notes = reason;
      await interview.save();

      notificationService.sendTemplatedNotification(
        interview.candidateId,
        'rejection-notification',
        {
          candidate_name: interview.candidateName || 'Candidate',
          role: interview.role,
          email: interview.candidateId,
        }
      ).catch((err) => {
        logger.error({ err, interviewId }, 'Failed to send rejection notification');
      });

      logger.info({ interviewId, candidateId: interview.candidateId }, 'Candidate rejected');
      return { success: true };
    } catch (error) {
      logger.error({ err: error, interviewId }, 'Error rejecting candidate');
      return { success: false, error: 'Failed to reject candidate' };
    }
  }

  async sendOffer(
    interviewId: string,
    offerDetails: {
      companyName: string;
      responseDeadline: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const interview = await ScheduledInterviewModel.findOne({ id: interviewId });
      if (!interview) return { success: false, error: 'Interview not found' };

      interview.status = 'offered';
      await interview.save();

      notificationService.sendTemplatedNotification(
        interview.candidateId,
        'offer-letter',
        {
          candidate_name: interview.candidateName || 'Candidate',
          role: interview.role,
          company_name: offerDetails.companyName,
          response_deadline: offerDetails.responseDeadline,
          email: interview.candidateId,
        }
      ).catch((err) => {
        logger.error({ err, interviewId }, 'Failed to send offer letter');
      });

      logger.info({ interviewId, candidateId: interview.candidateId }, 'Offer sent to candidate');
      return { success: true };
    } catch (error) {
      logger.error({ err: error, interviewId }, 'Error sending offer');
      return { success: false, error: 'Failed to send offer' };
    }
  }
}

export const schedulingService = new SchedulingService();
export default schedulingService;

// Wrapper functions for routes
export function getTimezones(): string[] {
  return schedulingService.getTimezones();
}

export function getUserTimezone(): string {
  return schedulingService.getUserTimezone();
}

export async function getUpcomingInterviews(candidateId: string = 'default'): Promise<any> {
  return schedulingService.getUpcomingInterviews(candidateId);
}

export async function getAvailableSlots(tenantId: string, date: string, timezone: string): Promise<any> {
  const [year, month, day] = date.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);
  return schedulingService.getAvailableSlots(tenantId, localDate, timezone);
}

export async function bookSlot(tenantId: string, slotId: string, type: any, candidateId?: string, candidateName?: string, role?: string): Promise<any> {
  const result = await schedulingService.bookSlot(tenantId, slotId, candidateId || "default", candidateName || "Candidate", type || "live", role || "Technical Interview");
  if (!result) {
    throw new Error('Slot not found or already booked');
  }
  return result;
}

export async function rescheduleInterview(interviewId: string, newSlotId: string): Promise<any> {
  return schedulingService.rescheduleInterview(interviewId, newSlotId);
}

export async function cancelInterview(interviewId: string): Promise<any> {
  return schedulingService.cancelInterview(interviewId, "Cancelled by user");
}

export async function rejectInterview(interviewId: string, reason?: string): Promise<any> {
  return schedulingService.rejectInterview(interviewId, reason);
}

export async function sendOffer(interviewId: string, offerDetails: { companyName: string; responseDeadline: string }): Promise<any> {
  return schedulingService.sendOffer(interviewId, offerDetails);
}
