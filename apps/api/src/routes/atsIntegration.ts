import { Router } from 'express';
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

const atsConfigs: Map<string, ReturnType<typeof configureATS>> = new Map();

interface ATSConfigRequest {
  provider: 'workday' | 'greenhouse' | 'lever' | 'bamboohr' | 'sap-successfactors';
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

    const result = configureATS(body);
    if (result.success) {
      atsConfigs.set(body.provider, result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error configuring ATS:', error);
    res.status(500).json({ error: 'Failed to configure ATS' });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    const provider = req.query.provider as string || 'workday';
    const jobs = fetchJobs({ provider } as any);

    res.json({ jobs, count: jobs.length });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.get('/jobs/:jobId/candidates', async (req, res) => {
  try {
    const { jobId } = req.params;
    const provider = req.query.provider as string || 'workday';
    const candidates = fetchCandidates({ provider } as any, jobId);

    res.json({ candidates, count: candidates.length });
  } catch (error) {
    console.error('Error fetching candidates:', error);
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

    const result = pushInterviewResults(
      { provider } as any,
      {
        ...body,
        conductedAt: new Date().toISOString()
      }
    );

    res.json(result);
  } catch (error) {
    console.error('Error pushing results:', error);
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

    const result = syncCandidate({ provider } as any, candidate);

    res.json(result);
  } catch (error) {
    console.error('Error syncing candidate:', error);
    res.status(500).json({ error: 'Failed to sync candidate' });
  }
});

router.get('/webhooks', async (req, res) => {
  try {
    const provider = req.query.provider as string || 'workday';
    const webhooks = getWebhooks({ provider } as any);

    res.json(webhooks);
  } catch (error) {
    console.error('Error fetching webhooks:', error);
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

    const result = createWebhook({ provider } as any, events);

    res.json(result);
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

export default router;