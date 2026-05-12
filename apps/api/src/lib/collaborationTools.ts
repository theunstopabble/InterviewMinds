import { logger } from "./logger";

export interface SharedNote {
  id: string;
  sessionId: string;
  content: string;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface Vote {
  id: string;
  sessionId: string;
  question: string;
  options: Array<{ id: string; text: string; votes: number }>;
  votedBy: Set<string>;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  status: "active" | "completed";
}

export interface InterviewerChat {
  id: string;
  sessionId: string;
  messages: Array<{
    id: string;
    userId: string;
    userName: string;
    message: string;
    timestamp: number;
    isPrivate: boolean;
    toUserId?: string;
  }>;
  createdAt: number;
}

const notesStorage = new Map<string, SharedNote>();
const votesStorage = new Map<string, Vote>();
const chatStorage = new Map<string, InterviewerChat>();

export function createNote(sessionId: string, userId: string, content: string): SharedNote {
  const note: SharedNote = {
    id: `note_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    sessionId,
    content,
    createdBy: userId,
    updatedBy: userId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  notesStorage.set(note.id, note);
  logger.info({ noteId: note.id, sessionId }, "Note created");
  
  return note;
}

export function updateNote(noteId: string, userId: string, content: string): boolean {
  const note = notesStorage.get(noteId);
  if (!note) return false;
  
  note.content = content;
  note.updatedBy = userId;
  note.updatedAt = Date.now();
  
  return true;
}

export function deleteNote(noteId: string): boolean {
  return notesStorage.delete(noteId);
}

export function getNotes(sessionId: string): SharedNote[] {
  return Array.from(notesStorage.values()).filter(n => n.sessionId === sessionId);
}

export function createVote(
  sessionId: string,
  userId: string,
  question: string,
  options: string[],
  expiresInMinutes: number = 30
): Vote {
  const vote: Vote = {
    id: `vote_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    sessionId,
    question,
    options: options.map((text, i) => ({ id: `opt_${i}`, text, votes: 0 })),
    votedBy: new Set(),
    createdBy: userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + expiresInMinutes * 60000,
    status: "active",
  };
  
  votesStorage.set(vote.id, vote);
  logger.info({ voteId: vote.id, sessionId, question }, "Vote created");
  
  return vote;
}

export function castVote(voteId: string, userId: string, optionId: string): boolean {
  const vote = votesStorage.get(voteId);
  if (!vote || vote.status !== "active") return false;
  if (vote.votedBy.has(userId)) return false;
  if (Date.now() > vote.expiresAt) return false;
  
  const option = vote.options.find(o => o.id === optionId);
  if (!option) return false;
  
  option.votes++;
  vote.votedBy.add(userId);
  
  return true;
}

export function completeVote(voteId: string): Vote | null {
  const vote = votesStorage.get(voteId);
  if (!vote) return null;
  
  vote.status = "completed";
  return vote;
}

export function getVotes(sessionId: string): Vote[] {
  return Array.from(votesStorage.values())
    .filter(v => v.sessionId === sessionId)
    .map(v => ({ ...v, votedBy: new Set(v.votedBy) }));
}

export function createChat(sessionId: string): InterviewerChat {
  const chat: InterviewerChat = {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    sessionId,
    messages: [],
    createdAt: Date.now(),
  };
  
  chatStorage.set(sessionId, chat);
  return chat;
}

export function sendMessage(
  sessionId: string,
  userId: string,
  userName: string,
  message: string,
  isPrivate: boolean = false,
  toUserId?: string
): string {
  let chat = chatStorage.get(sessionId);
  if (!chat) {
    chat = createChat(sessionId);
  }
  
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  
  chat.messages.push({
    id: messageId,
    userId,
    userName,
    message,
    timestamp: Date.now(),
    isPrivate,
    toUserId,
  });
  
  return messageId;
}

export function getMessages(sessionId: string): InterviewerChat["messages"] {
  const chat = chatStorage.get(sessionId);
  return chat?.messages || [];
}

export function clearChat(sessionId: string): boolean {
  return chatStorage.delete(sessionId);
}