import { Router } from 'express';
import { logger } from '../lib/logger';
import { generateFollowUp, generateSequenceFollowUps } from '../lib/dynamicQuestions';

const router = Router();

interface FollowUpRequest {
  questionId: string;
  originalQuestion: string;
  previousAnswer: string;
  evaluation?: {
    contentScore: number;
    technicalAccuracy: number;
    depthScore: number;
    redFlags: string[];
  };
  resumeEntities?: {
    companies: string[];
    skills: string[];
    jobTitles: string[];
  };
  questionType: 'behavioral' | 'technical' | 'situational';
  competency?: string;
}

interface SequenceRequest {
  context: FollowUpRequest;
  count?: number;
}

router.post('/generate', async (req, res) => {
  try {
    const body = req.body as FollowUpRequest;

    if (!body.originalQuestion || !body.previousAnswer || !body.questionType) {
      res.status(400).json({ 
        error: 'Missing required fields: originalQuestion, previousAnswer, questionType' 
      });
      return;
    }

    const followUp = generateFollowUp(body);

    res.json(followUp);
  } catch (error) {
    logger.error({ err: error }, 'Error generating follow-up:');
    res.status(500).json({ error: 'Failed to generate follow-up question' });
  }
});

router.post('/generate-sequence', async (req, res) => {
  try {
    const body = req.body as SequenceRequest;

    if (!body.context?.originalQuestion || !body.context?.previousAnswer || !body.context?.questionType) {
      res.status(400).json({ 
        error: 'Missing required context fields' 
      });
      return;
    }

    const count = Math.min(Math.max(body.count || 3, 1), 5);
    const followUps = generateSequenceFollowUps(body.context, count);

    res.json({ followUps });
  } catch (error) {
    logger.error({ err: error }, 'Error generating follow-up sequence:');
    res.status(500).json({ error: 'Failed to generate follow-up sequence' });
  }
});

export default router;