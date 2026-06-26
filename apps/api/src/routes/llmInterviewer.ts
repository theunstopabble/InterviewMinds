import { Router } from 'express';
import { logger } from '../lib/logger';
import { createLLMInterviewer, generateInterviewSummary, generateCandidateFeedback, explainCodeInPlainEnglish } from '../lib/llmInterviewer';
import { requireAuth } from '../middleware/auth';

const router = Router();

import { LLMInterviewer } from '../lib/llmInterviewer';

const interviewers = new Map<string, LLMInterviewer>();

interface InterviewConfig {
  jobRole: string;
  experienceLevel: string;
  requiredSkills: string[];
  competencies: string[];
  difficulty: 'entry' | 'mid' | 'senior' | 'lead';
  persona: 'strict' | 'friendly' | 'balanced';
}

interface ChatMessage {
  sessionId: string;
  message: string;
}

router.post('/create', requireAuth, async (req, res) => {
  try {
    const config = req.body as InterviewConfig;
    const sessionId = `interview_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const interviewer = await createLLMInterviewer(config);
    interviewers.set(sessionId, interviewer);

    res.json({
      sessionId,
      message: "Interview session started",
      config: config,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error creating interview:');
    res.status(500).json({ error: 'Failed to create interview session' });
  }
});

router.post('/chat', requireAuth, async (req, res) => {
  try {
    const { sessionId, message } = req.body as ChatMessage;
    const interviewer = interviewers.get(sessionId);

    if (!interviewer) {
      res.status(404).json({ error: 'Interview session not found' });
      return;
    }

    const response = await interviewer.generateResponse(message);
    const metrics = interviewer.getMetrics();

    res.json({
      response,
      metrics,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error in chat:');
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

router.post('/followup', requireAuth, async (req, res) => {
  try {
    const { sessionId, lastAnswer, topic } = req.body;
    const interviewer = interviewers.get(sessionId);

    if (!interviewer) {
      res.status(404).json({ error: 'Interview session not found' });
      return;
    }

    const followUp = await interviewer.generateFollowUp(lastAnswer, topic);
    res.json({ followUp });
  } catch (error) {
    logger.error({ err: error }, 'Error generating follow-up:');
    res.status(500).json({ error: 'Failed to generate follow-up' });
  }
});

router.post('/summary', requireAuth, async (req, res) => {
  try {
    const { sessionId, finalScore } = req.body;
    const interviewer = interviewers.get(sessionId);

    if (!interviewer) {
      res.status(404).json({ error: 'Interview session not found' });
      return;
    }

    const memory = interviewer.getMemory();
    const summary = await generateInterviewSummary(memory, finalScore);

    res.json({ summary });
  } catch (error) {
    logger.error({ err: error }, 'Error generating summary:');
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

router.post('/feedback', requireAuth, async (req, res) => {
  try {
    const { sessionId, score } = req.body;
    const interviewer = interviewers.get(sessionId);

    if (!interviewer) {
      res.status(404).json({ error: 'Interview session not found' });
      return;
    }

    const memory = interviewer.getMemory();
    const feedback = await generateCandidateFeedback(memory, score);

    res.json(feedback);
  } catch (error) {
    logger.error({ err: error }, 'Error generating feedback:');
    res.status(500).json({ error: 'Failed to generate feedback' });
  }
});

router.post('/explain-code', requireAuth, async (req, res) => {
  try {
    const { code, language } = req.body;

    const explanation = await explainCodeInPlainEnglish(code, language || 'javascript');
    res.json({ explanation });
  } catch (error) {
    logger.error({ err: error }, 'Error explaining code:');
    res.status(500).json({ error: 'Failed to explain code' });
  }
});

router.get('/metrics/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const interviewer = interviewers.get(sessionId);

    if (!interviewer) {
      res.status(404).json({ error: 'Interview session not found' });
      return;
    }

    res.json(interviewer.getMetrics());
  } catch (error) {
    logger.error({ err: error }, 'Error getting metrics:');
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

router.delete('/end/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const deleted = interviewers.delete(sessionId);

    res.json({ success: deleted, message: deleted ? 'Interview ended' : 'Session not found' });
  } catch (error) {
    logger.error({ err: error }, 'Error ending interview:');
    res.status(500).json({ error: 'Failed to end interview' });
  }
});

export default router;