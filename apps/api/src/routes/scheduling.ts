import { Router } from 'express';
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
    console.error('Error fetching timezones:', error);
    res.status(500).json({ error: 'Failed to fetch timezones' });
  }
});

// GET /api/scheduling/upcoming
router.get('/upcoming', async (req, res) => {
  try {
    const { candidateId } = req.query;
    const interviews = getUpcomingInterviews(candidateId as string || 'default');
    res.json({ interviews });
  } catch (error) {
    console.error('Error fetching upcoming interviews:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming interviews' });
  }
});

// GET /api/scheduling/user-timezone
router.get('/user-timezone', async (_req, res) => {
  try {
    const timezone = getUserTimezone();
    res.json({ timezone });
  } catch (error) {
    console.error('Error fetching user timezone:', error);
    res.status(500).json({ error: 'Failed to fetch user timezone' });
  }
});

// GET /api/scheduling/slots/:tenantId
router.get('/slots/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { date, timezone } = req.query;
    const slots = getAvailableSlots(tenantId, date as string, timezone as string);
    res.json({ slots });
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
});

// POST /api/scheduling/book
router.post('/book', async (req, res) => {
  try {
    const { tenantId, slotId, type, candidateId, role } = req.body;
    const interview = bookSlot(tenantId, slotId, (type as "live" | "async" | "take-home") || "live", candidateId, role);
    res.json({ success: true, interview });
  } catch (error) {
    console.error('Error booking slot:', error);
    res.status(500).json({ error: 'Failed to book slot' });
  }
});

// POST /api/scheduling/reschedule
router.post('/reschedule', async (req, res) => {
  try {
    const { interviewId, newSlotId } = req.body;
    const interview = rescheduleInterview(interviewId, newSlotId);
    res.json({ success: true, interview });
  } catch (error) {
    console.error('Error rescheduling:', error);
    res.status(500).json({ error: 'Failed to reschedule' });
  }
});

// POST /api/scheduling/cancel
router.post('/cancel', async (req, res) => {
  try {
    const { interviewId } = req.body;
    cancelInterview(interviewId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling:', error);
    res.status(500).json({ error: 'Failed to cancel' });
  }
});

export default router;