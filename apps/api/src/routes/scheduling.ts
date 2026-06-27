import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { logger } from '../lib/logger';
import {
  getTimezones,
  getUserTimezone,
  getUpcomingInterviews,
  getAvailableSlots,
  bookSlot,
  rescheduleInterview,
  cancelInterview
} from '../lib/scheduling';

const router = Router();

// GET /api/scheduling/timezones
router.get('/timezones', async (_req, res) => {
  try {
    const timezones = getTimezones();
    res.json({ timezones });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching timezones');
    res.status(500).json({ error: 'Failed to fetch timezones' });
  }
});

// GET /api/scheduling/upcoming
router.get('/upcoming', requireAuth, async (req, res) => {
  try {
    const { candidateId } = req.query;
    const interviews = await getUpcomingInterviews(candidateId as string || 'default');
    res.json({ interviews });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching upcoming interviews');
    res.status(500).json({ error: 'Failed to fetch upcoming interviews' });
  }
});

// GET /api/scheduling/user-timezone
router.get('/user-timezone', async (_req, res) => {
  try {
    const timezone = getUserTimezone();
    res.json({ timezone });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching user timezone');
    res.status(500).json({ error: 'Failed to fetch user timezone' });
  }
});

// GET /api/scheduling/slots/:tenantId
router.get('/slots/:tenantId', requireAuth, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { date, timezone } = req.query;
    const slots = await getAvailableSlots(tenantId, date as string, timezone as string);
    res.json({ slots });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching slots');
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
});

// POST /api/scheduling/book
router.post('/book', requireAuth, async (req, res) => {
  try {
    const { tenantId, slotId, type, candidateId, candidateName, role } = req.body;
    const interview = await bookSlot(tenantId, slotId, (type as "live" | "async" | "take-home") || "live", candidateId, candidateName, role);
    res.json({ success: true, interview });
  } catch (error) {
    logger.error({ err: error }, 'Error booking slot');
    res.status(500).json({ error: 'Failed to book slot' });
  }
});

// POST /api/scheduling/reschedule
router.post('/reschedule', requireAuth, async (req, res) => {
  try {
    const { interviewId, newSlotId } = req.body;
    const interview = await rescheduleInterview(interviewId, newSlotId);
    res.json({ success: true, interview });
  } catch (error) {
    logger.error({ err: error }, 'Error rescheduling');
    res.status(500).json({ error: 'Failed to reschedule' });
  }
});

// POST /api/scheduling/cancel
router.post('/cancel', requireAuth, async (req, res) => {
  try {
    const { interviewId } = req.body;
    await cancelInterview(interviewId);
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Error cancelling');
    res.status(500).json({ error: 'Failed to cancel' });
  }
});

export default router;
