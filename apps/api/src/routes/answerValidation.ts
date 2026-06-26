import { Router } from 'express';
import { logger } from '../lib/logger';
import { evaluateAnswer, batchEvaluateAnswers } from '../lib/answerValidation';

interface AnswerEvaluation {
  questionId: string;
  transcript: string;
  evaluation: {
    contentScore: number;
    technicalAccuracy: number;
    clarity: number;
    depthScore: number;
    starMethod: { situation: number; task: number; action: number; result: number };
  };
  redFlags: {
    type: 'vague' | 'inconsistent' | 'memorized' | 'copied' | 'over_confident' | 'under_confident';
    description: string;
    timestamp: string;
  }[];
  suggestedFollowUp?: string;
  overallScore: number;
  feedback: string;
}

const router = Router();

interface EvaluateAnswerRequest {
  question: string;
  transcript: string;
  resumeEntities?: {
    companies: string[];
    schools: string[];
    skills: string[];
    jobTitles: string[];
  };
  questionType?: 'behavioral' | 'technical' | 'situational';
  expectedCompetencies?: string[];
}

interface BatchEvaluateRequest {
  answers: EvaluateAnswerRequest[];
}

router.post('/evaluate', async (req, res) => {
  try {
    const body = req.body as EvaluateAnswerRequest;

    if (!body.question || !body.transcript) {
      res.status(400).json({ error: 'Missing required fields: question and transcript' });
      return;
    }

    const result = await evaluateAnswer({
      question: body.question,
      transcript: body.transcript,
      resumeEntities: body.resumeEntities,
      questionType: body.questionType,
      expectedCompetencies: body.expectedCompetencies
    });

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error evaluating answer:');
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

router.post('/batch-evaluate', async (req, res) => {
  try {
    const body = req.body as BatchEvaluateRequest;

    if (!body.answers || !Array.isArray(body.answers) || body.answers.length === 0) {
      res.status(400).json({ error: 'Missing or invalid answers array' });
      return;
    }

    const results = await batchEvaluateAnswers(
      body.answers.map(a => ({
        question: a.question,
        transcript: a.transcript,
        resumeEntities: a.resumeEntities,
        questionType: a.questionType,
        expectedCompetencies: a.expectedCompetencies
      }))
    );

    res.json({ results });
  } catch (error) {
    logger.error({ err: error }, 'Error in batch evaluation:');
    res.status(500).json({ error: 'Failed to evaluate answers' });
  }
});

router.get('/:evaluationId', async (req, res) => {
  try {
    const { evaluationId } = req.params;
    
    if (!evaluationId) {
      res.status(400).json({ error: 'Missing evaluation ID' });
      return;
    }

    const mockEvaluation: AnswerEvaluation = {
      questionId: evaluationId,
      transcript: 'Mock transcript for demonstration',
      evaluation: {
        contentScore: 75,
        technicalAccuracy: 80,
        clarity: 70,
        depthScore: 65,
        starMethod: { situation: 70, task: 75, action: 80, result: 60 }
      },
      redFlags: [],
      overallScore: 72,
      feedback: 'Good response with room for more detail.'
    };

    res.json(mockEvaluation);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching evaluation:');
    res.status(500).json({ error: 'Failed to fetch evaluation' });
  }
});

export default router;