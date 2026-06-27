import { Router } from 'express';
import { logger } from '../lib/logger';
import { evaluateAnswer, batchEvaluateAnswers } from '../lib/answerValidation';
import { AnswerEvaluationModel } from '../models/AnswerEvaluation';

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

    await AnswerEvaluationModel.create({
      id: result.questionId,
      question: body.question,
      transcript: body.transcript,
      contentScore: result.evaluation.contentScore,
      technicalAccuracy: result.evaluation.technicalAccuracy,
      clarity: result.evaluation.clarity,
      depthScore: result.evaluation.depthScore,
      starMethod: result.evaluation.starMethod,
      redFlags: result.redFlags,
      suggestedFollowUp: result.suggestedFollowUp,
      overallScore: result.overallScore,
      feedback: result.feedback,
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

    const doc = await AnswerEvaluationModel.findOne({ id: evaluationId }).lean();
    if (!doc) {
      res.status(404).json({ error: 'Evaluation not found' });
      return;
    }

    res.json({
      questionId: doc.id,
      transcript: doc.transcript,
      evaluation: {
        contentScore: doc.contentScore,
        technicalAccuracy: doc.technicalAccuracy,
        clarity: doc.clarity,
        depthScore: doc.depthScore,
        starMethod: doc.starMethod,
      },
      redFlags: doc.redFlags || [],
      suggestedFollowUp: doc.suggestedFollowUp,
      overallScore: doc.overallScore,
      feedback: doc.feedback,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching evaluation:');
    res.status(500).json({ error: 'Failed to fetch evaluation' });
  }
});

export default router;