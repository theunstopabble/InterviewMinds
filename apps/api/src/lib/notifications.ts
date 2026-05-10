import { v4 as uuidv4 } from 'uuid';

export type NotificationChannel = 'email' | 'sms' | 'in-app' | 'slack' | 'webhook';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  variables: string[];
  isActive: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  channel: NotificationChannel;
  title: string;
  message: string;
  data?: Record<string, any>;
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  from?: string;
  attachments?: { filename: string; content: string }[];
}

export interface SlackNotification {
  channel: string;
  text: string;
  blocks?: any[];
  attachments?: any[];
}

class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private userNotifications: Map<string, Notification[]> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates() {
    const defaultTemplates: NotificationTemplate[] = [
      {
        id: 'interview-reminder',
        name: 'Interview Reminder',
        type: 'interview',
        channel: 'email',
        subject: 'Interview Reminder - {{interview_time}}',
        body: 'Hi {{candidate_name}}, This is a reminder about your upcoming interview for the {{role}} position scheduled at {{interview_time}}. Please ensure you have a stable internet connection and your camera/microphone are working. Click here to join: {{interview_link}}',
        variables: ['candidate_name', 'interview_time', 'role', 'interview_link'],
        isActive: true,
      },
      {
        id: 'interview-scheduled',
        name: 'Interview Scheduled',
        type: 'interview',
        channel: 'email',
        subject: 'Interview Scheduled - {{role}}',
        body: 'Congratulations {{candidate_name}}! Your interview for the {{role}} position has been scheduled. Date: {{interview_date}}, Time: {{interview_time}}. We look forward to seeing you!',
        variables: ['candidate_name', 'role', 'interview_date', 'interview_time'],
        isActive: true,
      },
      {
        id: 'interview-completed',
        name: 'Interview Completed',
        type: 'interview',
        channel: 'email',
        subject: 'Interview Completed - Thank You!',
        body: 'Thank you for completing your interview, {{candidate_name}}! Your responses have been recorded and our team will review them. We will get back to you within {{response_time}}.',
        variables: ['candidate_name', 'response_time'],
        isActive: true,
      },
      {
        id: 'result-available',
        name: 'Results Available',
        type: 'results',
        channel: 'email',
        subject: 'Your Interview Results are Ready',
        body: 'Hi {{candidate_name}}, Your interview results for the {{role}} position are now available. Log in to your dashboard to view your detailed feedback and scores.',
        variables: ['candidate_name', 'role'],
        isActive: true,
      },
      {
        id: 'rejection-notification',
        name: 'Rejection Notification',
        type: 'results',
        channel: 'email',
        subject: 'Update on Your Application',
        body: 'Dear {{candidate_name}}, Thank you for taking the time to interview with us for the {{role}} position. After careful consideration, we have decided to move forward with other candidates. We appreciate your interest and wish you the best in your career.',
        variables: ['candidate_name', 'role'],
        isActive: true,
      },
      {
        id: 'offer-letter',
        name: 'Offer Letter',
        type: 'offer',
        channel: 'email',
        subject: 'Job Offer - {{role}}',
        body: 'Dear {{candidate_name}}, We are pleased to extend you an offer for the {{role}} position at {{company_name}}. Please find the details attached. Kindly respond within {{response_deadline}} to confirm your acceptance.',
        variables: ['candidate_name', 'role', 'company_name', 'response_deadline'],
        isActive: true,
      },
      {
        id: 'slack-interview-reminder',
        name: 'Slack Interview Reminder',
        type: 'interview',
        channel: 'slack',
        body: '🎯 *Interview Reminder*\n\nCandidate: {{candidate_name}}\nRole: {{role}}\nTime: {{interview_time}}\nJoin: {{interview_link}}',
        variables: ['candidate_name', 'role', 'interview_time', 'interview_link'],
        isActive: true,
      },
      {
        id: 'sms-interview-reminder',
        name: 'SMS Interview Reminder',
        type: 'interview',
        channel: 'sms',
        body: 'InterviewMinds: Reminder - Your {{role}} interview is at {{interview_time}}. Ensure camera/mic work. Join: {{interview_link}}',
        variables: ['role', 'interview_time', 'interview_link'],
        isActive: true,
      },
    ];

    defaultTemplates.forEach(t => this.templates.set(t.id, t));
  }

  async sendNotification(
    userId: string,
    type: string,
    channel: NotificationChannel,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<Notification> {
    const notification: Notification = {
      id: uuidv4(),
      userId,
      type,
      channel,
      title,
      message,
      data,
      status: 'pending',
      createdAt: new Date(),
    };

    try {
      switch (channel) {
        case 'email':
          await this.sendEmail(data?.to || '', title, message);
          break;
        case 'sms':
          await this.sendSMS(data?.phone || '', message);
          break;
        case 'slack':
          await this.sendSlackNotification(data?.channel || '', message);
          break;
        case 'webhook':
          await this.sendWebhook(data?.url || '', notification);
          break;
        case 'in-app':
          break;
      }

      notification.status = 'sent';
      notification.sentAt = new Date();
      notification.deliveredAt = new Date();
    } catch (error) {
      notification.status = 'failed';
    }

    this.notifications.set(notification.id, notification);

    const userNotifs = this.userNotifications.get(userId) || [];
    userNotifs.push(notification);
    this.userNotifications.set(userId, userNotifs);

    return notification;
  }

  private async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    console.log(`[EMAIL] Sending to ${to}: ${subject}`);
    return true;
  }

  private async sendSMS(phone: string, message: string): Promise<boolean> {
    console.log(`[SMS] Sending to ${phone}: ${message.substring(0, 50)}...`);
    return true;
  }

  private async sendSlackNotification(channel: string, message: string): Promise<boolean> {
    console.log(`[SLACK] Sending to ${channel}: ${message.substring(0, 50)}...`);
    return true;
  }

  private async sendWebhook(url: string, notification: Notification): Promise<boolean> {
    console.log(`[WEBHOOK] Sending to ${url}`);
    return true;
  }

  sendTemplatedNotification(
    userId: string,
    templateId: string,
    variables: Record<string, string>
  ): Promise<Notification | null> {
    const template = this.templates.get(templateId);
    if (!template || !template.isActive) return Promise.resolve(null);

    let message = template.body;
    let title = template.subject || template.name;

    template.variables.forEach(v => {
      const value = variables[v] || `[${v}]`;
      message = message.replace(new RegExp(`{{${v}}}`, 'g'), value);
      title = title.replace(new RegExp(`{{${v}}}`, 'g'), value);
    });

    return this.sendNotification(
      userId,
      template.type,
      template.channel,
      title,
      message,
      { to: variables.email, phone: variables.phone, channel: variables.channel }
    );
  }

  getTemplate(templateId: string): NotificationTemplate | null {
    return this.templates.get(templateId) || null;
  }

  getTemplates(type?: string, channel?: NotificationChannel): NotificationTemplate[] {
    let templates = Array.from(this.templates.values());
    
    if (type) {
      templates = templates.filter(t => t.type === type);
    }
    if (channel) {
      templates = templates.filter(t => t.channel === channel);
    }

    return templates;
  }

  createTemplate(template: Omit<NotificationTemplate, 'id'>): NotificationTemplate {
    const newTemplate: NotificationTemplate = {
      ...template,
      id: uuidv4(),
    };
    this.templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  updateTemplate(templateId: string, updates: Partial<NotificationTemplate>): NotificationTemplate | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const updated = { ...template, ...updates };
    this.templates.set(templateId, updated);
    return updated;
  }

  getUserNotifications(userId: string, unreadOnly: boolean = false): Notification[] {
    const notifs = this.userNotifications.get(userId) || [];
    if (unreadOnly) {
      return notifs.filter(n => !n.readAt);
    }
    return notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  markAsRead(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;

    notification.readAt = new Date();
    this.notifications.set(notificationId, notification);
    return true;
  }

  getUnreadCount(userId: string): number {
    const notifs = this.userNotifications.get(userId) || [];
    return notifs.filter(n => !n.readAt).length;
  }

  deleteNotification(notificationId: string): boolean {
    return this.notifications.delete(notificationId);
  }

  sendBulkNotifications(
    userIds: string[],
    type: string,
    channel: NotificationChannel,
    title: string,
    message: string
  ): Promise<Notification[]> {
    return Promise.all(
      userIds.map(userId => 
        this.sendNotification(userId, type, channel, title, message)
      )
    );
  }
}

export const notificationService = new NotificationService();
export default notificationService;