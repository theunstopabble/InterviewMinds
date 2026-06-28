import { Router } from 'express';
import { logger } from '../lib/logger';
import { evaluateCode, CodeEvaluationRequest } from '../lib/codeEvaluationAgent';
import { notificationService } from '../lib/notifications';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/evaluate', requireAuth, async (req, res) => {
  try {
    const body = req.body as CodeEvaluationRequest;

    if (!body.code || !body.problemStatement || !body.language) {
      res.status(400).json({ error: 'code, problemStatement, and language are required' });
      return;
    }

    const result = await evaluateCode(body);

      notificationService.sendTemplatedNotification(
        (req as any).auth?.userId || 'unknown',
      'code-assessment',
      {
        candidate_name: body.candidateName || 'Candidate',
        role: body.role || 'Software Engineer',
        challenge_name: body.challengeName || 'Coding Challenge',
        deadline: body.deadline || 'N/A',
        duration: body.duration || 'N/A',
        language: body.language,
        email: body.email || '',
      }
    ).catch((err: unknown) => logger.warn({ err }, 'Failed to send code-assessment notification'));

    res.json({ success: true, evaluation: result });
  } catch (error) {
    logger.error({ err: error }, 'Code evaluation route error');
    res.status(500).json({ error: 'Failed to evaluate code' });
  }
});

export default router;
