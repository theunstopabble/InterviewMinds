import { Router } from 'express';
import { logger } from '../lib/logger';
import { matchResumeToJob, extractResumeEntities } from '../lib/jobMatching';

const router = Router();

interface JobRequirement {
  skills: string[];
  experience: number;
  education: string;
  certifications?: string[];
  domain?: string;
}

interface ResumeEntity {
  skills: string[];
  experience: { title: string; company: string; duration: number }[];
  education: { degree: string; school: string; year: number }[];
  certifications: string[];
  jobTitles: string[];
}

interface MatchRequest {
  resume: ResumeEntity;
  requirement: JobRequirement;
}

router.post('/extract', async (req, res) => {
  try {
    const { resumeText } = req.body;

    if (!resumeText) {
      res.status(400).json({ error: 'resumeText is required' });
      return;
    }

    const entities = extractResumeEntities(resumeText);

    res.json({ entities });
  } catch (error) {
    logger.error({ err: error }, 'Error extracting resume entities:');
    res.status(500).json({ error: 'Failed to extract entities' });
  }
});

router.post('/match', async (req, res) => {
  try {
    const body = req.body as MatchRequest;

    if (!body.resume || !body.requirement) {
      res.status(400).json({ error: 'resume and requirement are required' });
      return;
    }

    const { resume, requirement } = body;
    const result = matchResumeToJob(resume, requirement);

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error matching resume to job:');
    res.status(500).json({ error: 'Failed to match resume' });
  }
});

router.post('/extract-and-match', async (req, res) => {
  try {
    const { resumeText, requirement } = req.body;

    if (!resumeText || !requirement) {
      res.status(400).json({ error: 'resumeText and requirement are required' });
      return;
    }

    const entities = extractResumeEntities(resumeText);
    const result = matchResumeToJob(entities, requirement);

    res.json({
      extractedEntities: entities,
      matchResult: result
    });
  } catch (error) {
    logger.error({ err: error }, 'Error in extract and match:');
    res.status(500).json({ error: 'Failed to process request' });
  }
});

export default router;