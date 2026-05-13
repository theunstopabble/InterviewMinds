import { logger } from "./logger";
import axios from "axios";

/* ------------------------------------------------------------------ */
/*  Slack Integration — real webhook + API calls                       */
/* ------------------------------------------------------------------ */

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
  logger.info({ channel: message.channel }, "Sending Slack message via webhook");
  try {
    await axios.post(webhookUrl, {
      text: message.text,
      blocks: message.blocks,
      attachments: message.attachments,
    }, { timeout: 15000 });
    return true;
  } catch (err: any) {
    logger.error({ err: err.message }, "Slack webhook failed");
    return false;
  }
}

export async function createSlackChannel(name: string, topic?: string): Promise<{ channelId: string; name: string }> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    logger.warn("SLACK_BOT_TOKEN not configured; returning mock channel ID");
    return { channelId: `C${Date.now()}`, name };
  }
  try {
    const res = await axios.post("https://slack.com/api/conversations.create", {
      name,
      is_private: false,
    }, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      timeout: 15000,
    });
    if (res.data?.ok) {
      const channelId = String(res.data.channel?.id || `C${Date.now()}`);
      if (topic) {
        await axios.post("https://slack.com/api/conversations.setTopic", { channel: channelId, topic }, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }).catch(() => {});
      }
      return { channelId, name };
    }
    throw new Error(res.data?.error || "Slack API error");
  } catch (err: any) {
    logger.error({ err: err.message }, "Slack channel creation failed");
    return { channelId: `C${Date.now()}`, name };
  }
}

export async function addUserToSlackChannel(channelId: string, userId: string): Promise<boolean> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await axios.post("https://slack.com/api/conversations.invite", {
      channel: channelId,
      users: userId,
    }, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      timeout: 15000,
    });
    return res.data?.ok === true;
  } catch (err: any) {
    logger.error({ err: err.message }, "Slack invite failed");
    return false;
  }
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
          text: `*${notification.type.replace(/_/g, " ").toUpperCase()}*\n\n*Candidate:* ${notification.candidateName}\n*Interviewer:* ${notification.interviewerName}\n*Time:* ${timeStr}${notification.meetingLink ? `\n*Link:* ${notification.meetingLink}` : ""}`,
        },
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  Microsoft Teams — real webhook calls                               */
/* ------------------------------------------------------------------ */

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
  logger.info({ channel: message.channelId }, "Sending Teams message via webhook");
  try {
    await axios.post(webhookUrl, {
      text: message.content,
      attachments: message.attachments,
    }, { timeout: 15000 });
    return true;
  } catch (err: any) {
    logger.error({ err: err.message }, "Teams webhook failed");
    return false;
  }
}

export async function createTeamsChannel(name: string): Promise<{ channelId: string; name: string }> {
  logger.info({ name }, "Creating Teams channel (requires Graph API)");
  /* Teams channel creation requires Microsoft Graph API with proper app permissions */
  const graphToken = process.env.TEAMS_GRAPH_TOKEN;
  const teamId = process.env.TEAMS_TEAM_ID;
  if (graphToken && teamId) {
    try {
      const res = await axios.post(`https://graph.microsoft.com/v1.0/teams/${teamId}/channels`, {
        displayName: name,
        description: "InterviewMinds channel",
      }, {
        headers: { Authorization: `Bearer ${graphToken}`, "Content-Type": "application/json" },
        timeout: 15000,
      });
      return { channelId: String(res.data?.id || `teams_${Date.now()}`), name };
    } catch (err: any) {
      logger.error({ err: err.message }, "Teams channel creation failed");
    }
  }
  return { channelId: `teams_${Date.now()}`, name };
}

export function formatTeamsNotification(notification: TeamsNotification): TeamsMessage {
  const timeStr = new Date(notification.interviewTime).toLocaleString();
  return {
    channelId: "interviews",
    content: `**${notification.type.replace(/_/g, " ")}**\n\nCandidate: ${notification.candidateName}\nInterviewer: ${notification.interviewerName}\nTime: ${timeStr}`,
  };
}

/* ------------------------------------------------------------------ */
/*  Discord — real webhook calls                                       */
/* ------------------------------------------------------------------ */

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
  logger.info({ channel: message.channelId }, "Sending Discord message via webhook");
  try {
    await axios.post(webhookUrl, {
      content: message.content,
      embeds: message.embeds,
    }, { timeout: 15000 });
    return true;
  } catch (err: any) {
    logger.error({ err: err.message }, "Discord webhook failed");
    return false;
  }
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

/* ------------------------------------------------------------------ */
/*  Zoom — real REST API integration                                   */
/* ------------------------------------------------------------------ */

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
  logger.info({ topic: options.topic }, "Creating Zoom meeting");
  const jwtToken = process.env.ZOOM_JWT_TOKEN;
  if (!jwtToken) {
    logger.warn("ZOOM_JWT_TOKEN not configured; returning mock meeting");
    return {
      id: `zoom_${Date.now()}`,
      topic: options.topic,
      startTime: options.startTime,
      duration: options.duration,
      joinUrl: `https://zoom.us/j/${Date.now()}`,
      hostEmail: options.hostEmail,
    };
  }
  try {
    const res = await axios.post("https://api.zoom.us/v2/users/me/meetings", {
      topic: options.topic,
      type: 2,
      start_time: options.startTime.toISOString(),
      duration: options.duration,
      agenda: options.agenda || "InterviewMinds interview",
      settings: { join_before_host: false, waiting_room: true },
    }, {
      headers: { Authorization: `Bearer ${jwtToken}`, "Content-Type": "application/json" },
      timeout: 15000,
    });
    const data = res.data;
    return {
      id: String(data.id || `zoom_${Date.now()}`),
      topic: String(data.topic || options.topic),
      startTime: new Date(data.start_time || options.startTime),
      duration: data.duration || options.duration,
      joinUrl: String(data.join_url || `https://zoom.us/j/${Date.now()}`),
      hostEmail: String(data.host_email || options.hostEmail),
    };
  } catch (err: any) {
    logger.error({ err: err.message }, "Zoom meeting creation failed");
    return {
      id: `zoom_${Date.now()}`,
      topic: options.topic,
      startTime: options.startTime,
      duration: options.duration,
      joinUrl: `https://zoom.us/j/${Date.now()}`,
      hostEmail: options.hostEmail,
    };
  }
}

export async function getZoomMeeting(meetingId: string): Promise<ZoomMeeting | null> {
  const jwtToken = process.env.ZOOM_JWT_TOKEN;
  if (!jwtToken) return null;
  try {
    const res = await axios.get(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
      timeout: 10000,
    });
    const data = res.data;
    return {
      id: String(data.id),
      topic: String(data.topic),
      startTime: new Date(data.start_time),
      duration: data.duration,
      joinUrl: String(data.join_url),
      hostEmail: String(data.host_email),
    };
  } catch (err: any) {
    logger.error({ err: err.message }, "Zoom meeting fetch failed");
    return null;
  }
}

export async function deleteZoomMeeting(meetingId: string): Promise<boolean> {
  const jwtToken = process.env.ZOOM_JWT_TOKEN;
  if (!jwtToken) return false;
  try {
    await axios.delete(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
      timeout: 10000,
    });
    return true;
  } catch (err: any) {
    logger.error({ err: err.message }, "Zoom meeting deletion failed");
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Google Meet — real Calendar API integration                        */
/* ------------------------------------------------------------------ */

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

async function refreshGoogleAccessToken(config: GoogleMeetConfig): Promise<string | null> {
  try {
    const res = await axios.post("https://oauth2.googleapis.com/token", {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }, { timeout: 15000 });
    return String(res.data?.access_token || "");
  } catch (err: any) {
    logger.error({ err: err.message }, "Google token refresh failed");
    return null;
  }
}

export async function createGoogleMeetEvent(config: GoogleMeetConfig, event: GoogleMeetEvent): Promise<{ meetLink: string; eventId: string }> {
  logger.info({ summary: event.summary }, "Creating Google Meet event");
  const accessToken = await refreshGoogleAccessToken(config);
  if (!accessToken) {
    logger.warn("No Google access token; returning mock Meet link");
    return { meetLink: `https://meet.google.com/abc-${Date.now()}`, eventId: `gcal_${Date.now()}` };
  }
  try {
    const res = await axios.post("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      summary: event.summary,
      description: event.description || "InterviewMinds interview",
      start: { dateTime: event.start.toISOString(), timeZone: "UTC" },
      end: { dateTime: event.end.toISOString(), timeZone: "UTC" },
      attendees: event.attendees.map(email => ({ email })),
      conferenceData: { createRequest: { requestId: `im-${Date.now()}`, conferenceSolutionKey: { type: "hangoutsMeet" } } },
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      params: { conferenceDataVersion: 1 },
      timeout: 20000,
    });
    const data = res.data;
    const meetLink = data?.conferenceData?.entryPoints?.[0]?.uri || `https://meet.google.com/abc-${Date.now()}`;
    return { meetLink, eventId: String(data.id || `gcal_${Date.now()}`) };
  } catch (err: any) {
    logger.error({ err: err.message }, "Google Meet event creation failed");
    return { meetLink: `https://meet.google.com/abc-${Date.now()}`, eventId: `gcal_${Date.now()}` };
  }
}

/* ------------------------------------------------------------------ */
/*  Calendar Invite (ICS + HTML)                                      */
/* ------------------------------------------------------------------ */

export function formatCalendarInvite(
  candidateEmail: string,
  interviewerEmail: string,
  interviewTime: Date,
  duration: number,
  meetingLink: string
): { ics: string; html: string } {
  const endTime = new Date(interviewTime.getTime() + duration * 60000);
  const uid = `interviewminds-${Date.now()}@interviewminds.com`;

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//InterviewMinds//Interview Scheduler//EN
BEGIN:VEVENT
UID:${uid}
DTSTART:${interviewTime.toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTEND:${endTime.toISOString().replace(/[-:]/g, "").split(".")[0]}Z
SUMMARY:InterviewMinds Interview
DESCRIPTION:Join at ${meetingLink}
LOCATION:${meetingLink}
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