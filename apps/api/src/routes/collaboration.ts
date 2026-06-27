import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as collabEditor from '../lib/collaborativeEditor';
import * as whiteboard from '../lib/whiteboard';
import * as videoCall from '../lib/videoCall';
import * as collabTools from '../lib/collaborationTools';

const router = Router();

router.post('/editor/create', requireAuth, async (req, res) => {
  try {
    const { roomId } = req.body;
    const userId = (req as any).auth?.userId;
    const sessionId = collabEditor.createCollabSession(roomId, userId, "User");
    res.json({ sessionId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create editor session' });
  }
});

router.post('/editor/join', requireAuth, async (req, res) => {
  try {
    const { sessionId, userName } = req.body;
    const userId = (req as any).auth?.userId;
    const success = collabEditor.joinCollabSession(sessionId, userId, userName);
    res.json({ success, users: collabEditor.getSessionUsers(sessionId) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join editor session' });
  }
});

router.post('/editor/leave', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = (req as any).auth?.userId;
    collabEditor.leaveCollabSession(sessionId, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to leave editor session' });
  }
});

router.post('/editor/update', requireAuth, async (req, res) => {
  try {
    const { sessionId, code } = req.body;
    const userId = (req as any).auth?.userId;
    const updatedCode = collabEditor.updateDocument(sessionId, code, userId);
    res.json({ code: updatedCode });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update code' });
  }
});

router.get('/editor/users/:sessionId', requireAuth, async (req, res) => {
  const users = collabEditor.getSessionUsers(req.params.sessionId);
  res.json({ users });
});

router.post('/whiteboard/create', requireAuth, async (req, res) => {
  try {
    const { roomId } = req.body;
    const sessionId = await whiteboard.createWhiteboardSession(roomId);
    res.json({ sessionId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create whiteboard' });
  }
});

router.post('/whiteboard/join', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = (req as any).auth?.userId;
    await whiteboard.joinWhiteboard(sessionId, userId);
    const elements = await whiteboard.getWhiteboardElements(sessionId);
    res.json({ success: true, elements });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join whiteboard' });
  }
});

router.post('/whiteboard/element', requireAuth, async (req, res) => {
  try {
    const { sessionId, element } = req.body;
    const newElement = await whiteboard.addElement(sessionId, element);
    res.json({ element: newElement });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add element' });
  }
});

router.delete('/whiteboard/element/:sessionId/:elementId', requireAuth, async (req, res) => {
  try {
    const { sessionId, elementId } = req.params;
    const success = await whiteboard.deleteElement(sessionId, elementId);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete element' });
  }
});

router.get('/whiteboard/:sessionId', requireAuth, async (req, res) => {
  try {
    const elements = await whiteboard.getWhiteboardElements(req.params.sessionId);
    res.json({ elements });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch whiteboard elements' });
  }
});

router.post('/video/create', requireAuth, async (req, res) => {
  try {
    const { roomId, maxParticipants } = req.body;
    const userId = (req as any).auth?.userId;
    const sessionId = await videoCall.createVideoSession(roomId, userId, "Host", maxParticipants || 4);
    res.json({ sessionId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create video session' });
  }
});

router.post('/video/join', requireAuth, async (req, res) => {
  try {
    const { sessionId, userName } = req.body;
    const userId = (req as any).auth?.userId;
    const participants = await videoCall.joinVideoSession(sessionId, userId, userName);
    if (!participants) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ participants: Object.fromEntries(participants) });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/video/leave', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = (req as any).auth?.userId;
    await videoCall.leaveVideoSession(sessionId, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to leave video session' });
  }
});

router.post('/video/toggle-audio', requireAuth, async (req, res) => {
  try {
    const { sessionId, enabled } = req.body;
    const userId = (req as any).auth?.userId;
    const success = videoCall.toggleAudio(sessionId, userId, enabled);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle audio' });
  }
});

router.post('/video/toggle-video', requireAuth, async (req, res) => {
  try {
    const { sessionId, enabled } = req.body;
    const userId = (req as any).auth?.userId;
    const success = videoCall.toggleVideo(sessionId, userId, enabled);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle video' });
  }
});

router.get('/video/:sessionId', requireAuth, async (req, res) => {
  const info = videoCall.getSessionInfo(req.params.sessionId);
  if (!info) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(info);
});

router.post('/note/create', requireAuth, async (req, res) => {
  try {
    const { sessionId, content } = req.body;
    const userId = (req as any).auth?.userId;
    const note = await collabTools.createNote(sessionId, userId, content);
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.get('/notes/:sessionId', requireAuth, async (req, res) => {
  try {
    const notes = await collabTools.getNotes(req.params.sessionId);
    res.json({ notes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.post('/vote/create', requireAuth, async (req, res) => {
  try {
    const { sessionId, question, options, expiresIn } = req.body;
    const userId = (req as any).auth?.userId;
    const vote = await collabTools.createVote(sessionId, userId, question, options, expiresIn);
    res.json(vote);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create vote' });
  }
});

router.post('/vote/cast', requireAuth, async (req, res) => {
  try {
    const { voteId, optionId } = req.body;
    const userId = (req as any).auth?.userId;
    const success = await collabTools.castVote(voteId, userId, optionId);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cast vote' });
  }
});

router.get('/votes/:sessionId', requireAuth, async (req, res) => {
  try {
    const votes = await collabTools.getVotes(req.params.sessionId);
    res.json({ votes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch votes' });
  }
});

router.post('/chat/send', requireAuth, async (req, res) => {
  try {
    const { sessionId, message, isPrivate, toUserId } = req.body;
    const userId = (req as any).auth?.userId;
    const userName = "Interviewer";
    const messageId = await collabTools.sendMessage(sessionId, userId, userName, message, isPrivate, toUserId);
    res.json({ messageId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.get('/chat/:sessionId', requireAuth, async (req, res) => {
  try {
    const messages = await collabTools.getMessages(req.params.sessionId);
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
