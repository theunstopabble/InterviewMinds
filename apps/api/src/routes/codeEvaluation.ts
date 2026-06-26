import { Router } from 'express';
import { logger } from '../lib/logger';
import { evaluateCode, CodeEvaluationRequest } from '../lib/codeEvaluationAgent';
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
    res.json({ success: true, evaluation: result });
  } catch (error) {
    logger.error({ err: error }, 'Code evaluation route error');
    res.status(500).json({ error: 'Failed to evaluate code' });
  }
});

export default router;
