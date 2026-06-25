import { v4 as uuidv4 } from 'uuid';

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

export interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
}

class SchedulingService {
  private slots: Map<string, InterviewSlot[]> = new Map();
  private interviews: Map<string, ScheduledInterview[]> = new Map();

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

  generateAvailableSlots(
    interviewerId: string,
    startDate: Date,
    endDate: Date,
    duration: number = 60,
    workingHours: { start: number; end: number } = { start: 9, end: 18 }
  ): InterviewSlot[] {
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

    return slots;
  }

  getAvailableSlots(
    interviewerId: string,
    date: Date,
    timezone: string
  ): TimeSlot[] {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    let storedSlots = this.slots.get(interviewerId) || [];

    // Generate default slots if none exist
    if (storedSlots.length === 0) {
      const startDate = new Date(date);
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 14);
      storedSlots = this.generateAvailableSlots(
        interviewerId,
        startDate,
        endDate,
        60,
        { start: 9, end: 18 }
      );
      this.slots.set(interviewerId, storedSlots);
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

  bookSlot(
    interviewerId: string,
    slotId: string,
    candidateId: string,
    interviewType: 'live' | 'async' | 'take-home' = 'live',
    role: string = 'Technical Interview'
  ): ScheduledInterview | null {
    const storedSlots = this.slots.get(interviewerId);
    if (!storedSlots) return null;

    const slotIndex = storedSlots.findIndex((s) => s.id === slotId);
    if (slotIndex === -1 || storedSlots[slotIndex].status !== 'available') {
      return null;
    }

    const slot = storedSlots[slotIndex];
    slot.status = 'booked';
    slot.candidateId = candidateId;

    const interview: ScheduledInterview = {
      id: uuidv4(),
      candidateId,
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const interviews = this.interviews.get(candidateId) || [];
    interviews.push(interview);
    this.interviews.set(candidateId, interviews);

    this.slots.set(interviewerId, storedSlots);

    return interview;
  }

  rescheduleInterview(
    interviewId: string,
    newSlotId: string,
    newInterviewerId?: string
  ): ScheduledInterview | null {
    for (const [candidateId, interviews] of this.interviews.entries()) {
      const interview = interviews.find((i) => i.id === interviewId);
      if (interview) {
        if (newInterviewerId && newInterviewerId !== interview.interviewerId) {
          interview.interviewerId = newInterviewerId;
        }
        interview.slotId = newSlotId;
        interview.updatedAt = new Date();
        return interview;
      }
    }
    return null;
  }

  cancelInterview(interviewId: string, reason?: string): boolean {
    for (const [candidateId, interviews] of this.interviews.entries()) {
      const interviewIndex = interviews.findIndex((i) => i.id === interviewId);
      if (interviewIndex !== -1) {
        interviews[interviewIndex].status = 'cancelled';
        interviews[interviewIndex].notes = reason;
        interviews[interviewIndex].updatedAt = new Date();
        return true;
      }
    }
    return false;
  }

  getUpcomingInterviews(candidateId: string): ScheduledInterview[] {
    const interviews = this.interviews.get(candidateId) || [];
    const now = new Date();
    return interviews
      .filter((i) => new Date(i.scheduledTime) > now && i.status === 'scheduled')
      .sort(
        (a, b) =>
          new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
      );
  }

  getInterviewerSchedule(interviewerId: string): ScheduledInterview[] {
    const allInterviews: ScheduledInterview[] = [];
    for (const interviews of this.interviews.values()) {
      allInterviews.push(
        ...interviews.filter((i) => i.interviewerId === interviewerId)
      );
    }
    return allInterviews.sort(
      (a, b) =>
        new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );
  }

  markNoShow(interviewId: string): boolean {
    for (const interviews of this.interviews.values()) {
      const interview = interviews.find((i) => i.id === interviewId);
      if (interview) {
        interview.status = 'no-show';
        interview.updatedAt = new Date();
        return true;
      }
    }
    return false;
  }

  completeInterview(interviewId: string): boolean {
    for (const interviews of this.interviews.values()) {
      const interview = interviews.find((i) => i.id === interviewId);
      if (interview) {
        interview.status = 'completed';
        interview.updatedAt = new Date();
        return true;
      }
    }
    return false;
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

export function getUpcomingInterviews(candidateId: string = 'default'): any {
  return schedulingService.getUpcomingInterviews(candidateId);
}

export function getAvailableSlots(tenantId: string, date: string, timezone: string): any {
  // Parse date as local timezone, not UTC
  const [year, month, day] = date.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);
  return schedulingService.getAvailableSlots(tenantId, localDate, timezone);
}

export function bookSlot(tenantId: string, slotId: string, type: any, candidateId?: string, role?: string): any {
  const result = schedulingService.bookSlot(tenantId, slotId, candidateId || "default", type || "live", role || "Technical Interview");
  if (!result) {
    throw new Error('Slot not found or already booked');
  }
  return result;
}

export function rescheduleInterview(interviewId: string, newSlotId: string): any {
  return schedulingService.rescheduleInterview(interviewId, newSlotId);
}

export function cancelInterview(interviewId: string): any {
  return schedulingService.cancelInterview(interviewId, "Cancelled by user");
}