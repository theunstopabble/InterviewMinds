import { Router } from 'express';
import { logger } from '../lib/logger';
import { 
  configureATS, 
  fetchJobs, 
  fetchCandidates, 
  pushInterviewResults,
  syncCandidate,
  getWebhooks,
  createWebhook
} from '../lib/atsIntegration';

const router = Router();

interface ATSConfigRequest {
  provider: 'workday' | 'greenhouse' | 'lever' | 'bamboohr' | 'ashby';
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  tenantUrl?: string;
  webhookUrl?: string;
}

interface PushResultRequest {
  candidateId: string;
  jobId: string;
  interviewId: string;
  score: number;
  assessment: string;
  recommendation: 'advance' | 'hold' | 'reject';
}

router.post('/configure', async (req, res) => {
  try {
    const body = req.body as ATSConfigRequest;

    if (!body.provider) {
      res.status(400).json({ error: 'Provider is required' });
      return;
    }

    const result = await configureATS(body);

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error configuring ATS');
    res.status(500).json({ error: 'Failed to configure ATS' });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    const provider = req.query.provider as string || 'workday';
    const jobs = await fetchJobs(undefined, provider);

    res.json({ jobs, count: jobs.length });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching jobs');
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.get('/jobs/:jobId/candidates', async (req, res) => {
  try {
    const { jobId } = req.params;
    const provider = req.query.provider as string || 'workday';
    const candidates = await fetchCandidates(undefined, jobId, provider);

    res.json({ candidates, count: candidates.length });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching candidates');
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

router.post('/results', async (req, res) => {
  try {
    const body = req.body as PushResultRequest;
    const provider = req.query.provider as string || 'workday';

    if (!body.candidateId || !body.jobId || !body.interviewId) {
      res.status(400).json({ error: 'candidateId, jobId, and interviewId are required' });
      return;
    }

    const result = await pushInterviewResults(
      undefined,
      {
        ...body,
        conductedAt: new Date().toISOString()
      },
      provider
    );

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error pushing results');
    res.status(500).json({ error: 'Failed to push results' });
  }
});

router.post('/sync', async (req, res) => {
  try {
    const { candidate } = req.body;
    const provider = req.query.provider as string || 'workday';

    if (!candidate?.email || !candidate?.firstName || !candidate?.lastName) {
      res.status(400).json({ error: 'Candidate email, firstName, and lastName are required' });
      return;
    }

    const result = await syncCandidate(undefined, candidate, provider);

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error syncing candidate');
    res.status(500).json({ error: 'Failed to sync candidate' });
  }
});

router.get('/webhooks', async (req, res) => {
  try {
    const provider = req.query.provider as string || 'workday';
    const webhooks = getWebhooks(undefined, provider);

    res.json(webhooks);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching webhooks');
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

router.post('/webhooks', async (req, res) => {
  try {
    const { events } = req.body;
    const provider = req.query.provider as string || 'workday';

    if (!events || !Array.isArray(events)) {
      res.status(400).json({ error: 'Events array is required' });
      return;
    }

    const result = await createWebhook(undefined, events, provider);

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error creating webhook');
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

export default router;
