import { Router } from 'express';
import { logger } from '../lib/logger';
import { generateFeedback } from '../lib/feedbackAgent';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/generate', requireAuth, async (req, res) => {
  try {
    const body = req.body;
    if (!body.messages || !body.questions) {
      res.status(400).json({ error: 'messages and questions are required' });
      return;
    }
    const result = await generateFeedback(body);
    res.json({ success: true, feedback: result });
  } catch (error) {
    logger.error({ err: error }, 'Feedback generation route error');
    res.status(500).json({ error: 'Failed to generate feedback' });
  }
});

export default router;
