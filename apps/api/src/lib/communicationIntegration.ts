import { logger } from "./logger";

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: unknown[];
  attachments?: unknown[];
}

export interface SlackNotification {
  type: "interview_scheduled" | "interview_reminder" | "candidate_update" | "feedback_request";
  candidateName: string;
  interviewerName: string;
  interviewTime: Date;
  meetingLink?: string;
}

export async function sendSlackMessage(webhookUrl: string, message: SlackMessage): Promise<boolean> {
  logger.info(`Sending Slack message to channel: ${message.channel}`);
  return true;
}

export async function createSlackChannel(name: string, topic?: string): Promise<{ channelId: string; name: string }> {
  logger.info(`Creating Slack channel: ${name}`);
  return { channelId: `C${Date.now()}`, name };
}

export async function addUserToSlackChannel(channelId: string, userId: string): Promise<boolean> {
  logger.info(`Adding user ${userId} to Slack channel ${channelId}`);
  return true;
}

export function formatSlackNotification(notification: SlackNotification): SlackMessage {
  const timeStr = new Date(notification.interviewTime).toLocaleString();
  
  let emoji = "";
  switch (notification.type) {
    case "interview_scheduled": emoji = "📅"; break;
    case "interview_reminder": emoji = "⏰"; break;
    case "candidate_update": emoji = "👤"; break;
    case "feedback_request": emoji = "📝"; break;
  }
  
  return {
    channel: "#interviews",
    text: `${emoji} ${notification.type.replace(/_/g, " ")}: ${notification.candidateName}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${notification.type.replace(/_/g, " ").toUpperCase()}*\n\n*Candidate:* ${notification.candidateName}\n*Interviewer:* ${notification.interviewerName}\n*Time:* ${timeStr}`,
        },
      },
    ],
  };
}

export interface TeamsMessage {
  channelId: string;
  content: string;
  attachments?: unknown[];
}

export interface TeamsNotification {
  type: "interview_scheduled" | "interview_reminder" | "candidate_update" | "feedback_request";
  candidateName: string;
  interviewerName: string;
  interviewTime: Date;
}

export async function sendTeamsMessage(webhookUrl: string, message: TeamsMessage): Promise<boolean> {
  logger.info(`Sending Teams message to channel: ${message.channelId}`);
  return true;
}

export async function createTeamsChannel(name: string): Promise<{ channelId: string; name: string }> {
  logger.info(`Creating Teams channel: ${name}`);
  return { channelId: `teams_${Date.now()}`, name };
}

export function formatTeamsNotification(notification: TeamsNotification): TeamsMessage {
  const timeStr = new Date(notification.interviewTime).toLocaleString();
  
  return {
    channelId: "interviews",
    content: `**${notification.type.replace(/_/g, " ")}**\n\nCandidate: ${notification.candidateName}\nInterviewer: ${notification.interviewerName}\nTime: ${timeStr}`,
  };
}

export interface DiscordMessage {
  channelId: string;
  content: string;
  embeds?: unknown[];
}

export interface DiscordNotification {
  eventType: string;
  title: string;
  description: string;
  timestamp?: Date;
}

export async function sendDiscordMessage(webhookUrl: string, message: DiscordMessage): Promise<boolean> {
  logger.info(`Sending Discord message to channel: ${message.channelId}`);
  return true;
}

export function createDiscordEmbed(notification: DiscordNotification): { embed: { title: string; description: string; color: number; timestamp?: string } } {
  return {
    embed: {
      title: notification.title,
      description: notification.description,
      color: notification.eventType === "interview_scheduled" ? 3066993 : 0,
      timestamp: notification.timestamp?.toISOString(),
    },
  };
}

export interface ZoomMeeting {
  id: string;
  topic: string;
  startTime: Date;
  duration: number;
  joinUrl: string;
  hostEmail: string;
}

export interface ZoomCreateOptions {
  topic: string;
  startTime: Date;
  duration: number;
  hostEmail: string;
  agenda?: string;
}

export async function createZoomMeeting(options: ZoomCreateOptions): Promise<ZoomMeeting> {
  logger.info(`Creating Zoom meeting: ${options.topic}`);
  
  return {
    id: `zoom_${Date.now()}`,
    topic: options.topic,
    startTime: options.startTime,
    duration: options.duration,
    joinUrl: `https://zoom.us/j/${Date.now()}`,
    hostEmail: options.hostEmail,
  };
}

export async function getZoomMeeting(meetingId: string): Promise<ZoomMeeting | null> {
  logger.info(`Fetching Zoom meeting: ${meetingId}`);
  return null;
}

export async function deleteZoomMeeting(meetingId: string): Promise<boolean> {
  logger.info(`Deleting Zoom meeting: ${meetingId}`);
  return true;
}

export interface GoogleMeetConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface GoogleMeetEvent {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendees: string[];
}

export async function createGoogleMeetEvent(config: GoogleMeetConfig, event: GoogleMeetEvent): Promise<{ meetLink: string; eventId: string }> {
  logger.info(`Creating Google Meet event: ${event.summary}`);
  
  return {
    meetLink: `https://meet.google.com/abc-${Date.now()}`,
    eventId: `gcal_${Date.now()}`,
  };
}

export function formatCalendarInvite(
  candidateEmail: string,
  interviewerEmail: string,
  interviewTime: Date,
  duration: number,
  meetingLink: string
): { ics: string; html: string } {
  const endTime = new Date(interviewTime.getTime() + duration * 60000);
  
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${interviewTime.toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTEND:${endTime.toISOString().replace(/[-:]/g, "").split(".")[0]}Z
SUMMARY:InterviewMinds Interview
DESCRIPTION:Join at ${meetingLink}
ATTENDEE;ROLE=REQ-PARTICIPANT:mailto:${candidateEmail}
ATTENDEE;ROLE=REQ-PARTICIPANT:mailto:${interviewerEmail}
END:VEVENT
END:VCALENDAR`;

  const html = `<html><body>
<h2>Interview Scheduled</h2>
<p><strong>Time:</strong> ${interviewTime.toLocaleString()}</p>
<p><strong>Duration:</strong> ${duration} minutes</p>
<p><a href="${meetingLink}">Join Interview</a></p>
</body></html>`;

  return { ics, html };
}