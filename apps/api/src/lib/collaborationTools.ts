import { logger } from "./logger";
import { SharedNoteModel } from "../models/SharedNote";
import { VoteModel } from "../models/Vote";
import { InterviewerChatModel } from "../models/InterviewerChat";

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

export async function createNote(sessionId: string, userId: string, content: string): Promise<SharedNote> {
  const doc = await SharedNoteModel.create({
    sessionId,
    authorId: userId,
    content,
    type: "text",
    tags: [],
    isPinned: false,
  });

  const note: SharedNote = {
    id: doc.id,
    sessionId,
    content,
    createdBy: userId,
    updatedBy: userId,
    createdAt: doc.createdAt.getTime(),
    updatedAt: doc.updatedAt.getTime(),
  };

  logger.info({ noteId: note.id, sessionId }, "Note created");
  return note;
}

export async function updateNote(noteId: string, userId: string, content: string): Promise<boolean> {
  const doc = await SharedNoteModel.findOneAndUpdate(
    { id: noteId },
    { $set: { content, authorId: userId } },
    { new: true }
  );
  return doc !== null;
}

export async function deleteNote(noteId: string): Promise<boolean> {
  const result = await SharedNoteModel.deleteOne({ id: noteId });
  return result.deletedCount > 0;
}

export async function getNotes(sessionId: string): Promise<SharedNote[]> {
  const docs = await SharedNoteModel.find({ sessionId });
  return docs.map(d => ({
    id: d.id,
    sessionId: d.sessionId,
    content: d.content,
    createdBy: d.authorId,
    updatedBy: d.authorId,
    createdAt: d.createdAt.getTime(),
    updatedAt: d.updatedAt.getTime(),
  }));
}

export async function createVote(
  sessionId: string,
  userId: string,
  question: string,
  options: string[],
  expiresInMinutes: number = 30
): Promise<Vote> {
  const voteId = `vote_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const now = Date.now();
  const voteOptions = options.map((text, i) => ({ id: `opt_${i}`, text, votes: 0 }));

  const vote: Vote = {
    id: voteId,
    sessionId,
    question,
    options: voteOptions,
    votedBy: new Set(),
    createdBy: userId,
    createdAt: now,
    expiresAt: now + expiresInMinutes * 60000,
    status: "active",
  };

  await VoteModel.create({
    id: voteId,
    sessionId,
    userId: "__poll__",
    candidateId: question,
    rating: 0,
    comment: JSON.stringify({ options: voteOptions, createdBy: userId, expiresAt: vote.expiresAt, status: vote.status }),
    category: "poll",
  });

  logger.info({ voteId, sessionId, question }, "Vote created");
  return vote;
}

export async function castVote(voteId: string, userId: string, optionId: string): Promise<boolean> {
  const pollDoc = await VoteModel.findOne({ id: voteId, userId: "__poll__" });
  if (!pollDoc) return false;

  const poll = JSON.parse(pollDoc.comment || "{}");
  if (poll.status !== "active") return false;
  if (Date.now() > poll.expiresAt) return false;

  const existingVote = await VoteModel.findOne({ sessionId: pollDoc.sessionId, userId, category: "cast" });
  if (existingVote) return false;

  await VoteModel.create({
    sessionId: pollDoc.sessionId,
    userId,
    candidateId: optionId,
    rating: 1,
    comment: voteId,
    category: "cast",
  });

  return true;
}

export async function completeVote(voteId: string): Promise<Vote | null> {
  const pollDoc = await VoteModel.findOne({ id: voteId, userId: "__poll__" });
  if (!pollDoc) return null;

  const poll = JSON.parse(pollDoc.comment || "{}");
  poll.status = "completed";

  await VoteModel.findOneAndUpdate(
    { id: voteId, userId: "__poll__" },
    { $set: { comment: JSON.stringify(poll) } }
  );

  return {
    id: voteId,
    sessionId: pollDoc.sessionId,
    question: pollDoc.candidateId,
    options: poll.options,
    votedBy: new Set(),
    createdBy: poll.createdBy,
    createdAt: pollDoc.createdAt.getTime(),
    expiresAt: poll.expiresAt,
    status: "completed",
  };
}

export async function getVotes(sessionId: string): Promise<Vote[]> {
  const pollDocs = await VoteModel.find({ sessionId, userId: "__poll__" });

  const votes: Vote[] = [];
  for (const pollDoc of pollDocs) {
    const poll = JSON.parse(pollDoc.comment || "{}");
    const castVotes = await VoteModel.find({ sessionId, category: "cast", comment: pollDoc.id });
    const votedBy = new Set(castVotes.map(v => v.userId));

    const optionVotes: Record<string, number> = {};
    for (const cv of castVotes) {
      optionVotes[cv.candidateId] = (optionVotes[cv.candidateId] || 0) + 1;
    }

    const options = (poll.options || []).map((o: { id: string; text: string }) => ({
      ...o,
      votes: optionVotes[o.id] || 0,
    }));

    votes.push({
      id: pollDoc.id,
      sessionId,
      question: pollDoc.candidateId,
      options,
      votedBy,
      createdBy: poll.createdBy,
      createdAt: pollDoc.createdAt.getTime(),
      expiresAt: poll.expiresAt,
      status: poll.status,
    });
  }

  return votes;
}

export async function createChat(sessionId: string): Promise<InterviewerChat> {
  return {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    sessionId,
    messages: [],
    createdAt: Date.now(),
  };
}

export async function sendMessage(
  sessionId: string,
  userId: string,
  userName: string,
  message: string,
  isPrivate: boolean = false,
  toUserId?: string
): Promise<string> {
  const doc = await InterviewerChatModel.create({
    sessionId,
    senderId: userId,
    senderName: userName,
    content: message,
    messageType: "text",
    metadata: { isPrivate, toUserId },
  });

  return doc.id;
}

export async function getMessages(sessionId: string): Promise<InterviewerChat["messages"]> {
  const docs = await InterviewerChatModel.find({ sessionId }).sort({ createdAt: 1 });
  return docs.map(d => ({
    id: d.id,
    userId: d.senderId,
    userName: d.senderName,
    message: d.content,
    timestamp: d.createdAt.getTime(),
    isPrivate: d.metadata?.isPrivate || false,
    toUserId: d.metadata?.toUserId,
  }));
}

export async function clearChat(sessionId: string): Promise<boolean> {
  const result = await InterviewerChatModel.deleteMany({ sessionId });
  return result.deletedCount > 0;
}
