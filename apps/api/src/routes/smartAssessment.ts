import { Router } from 'express';
import { 
  generateQuestionsFromJobDescription,
  calculateCompetencyGap,
  calculateResumeJobMatch,
  adjustDifficulty,
  predictCandidateSuccess,
  analyzeTechnicalDepth
} from '../lib/smartAssessment';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/generate-questions', requireAuth, async (req, res) => {
  try {
    const { jobDescription, count } = req.body;

    if (!jobDescription) {
      res.status(400).json({ error: 'Job description is required' });
      return;
    }

    const result = await generateQuestionsFromJobDescription(jobDescription, count || 10);

    res.json(result);
  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

router.post('/competency-gap', requireAuth, async (req, res) => {
  try {
    const { requiredCompetencies, demonstratedCompetencies } = req.body;

    const gaps = calculateCompetencyGap(requiredCompetencies, demonstratedCompetencies);

    res.json({ gaps });
  } catch (error) {
    console.error('Error calculating gap:', error);
    res.status(500).json({ error: 'Failed to calculate competency gap' });
  }
});

router.post('/resume-match', requireAuth, async (req, res) => {
  try {
    const { resume, jobRequirements } = req.body;

    const matchResult = await calculateResumeJobMatch(resume, jobRequirements);

    res.json(matchResult);
  } catch (error) {
    console.error('Error calculating match:', error);
    res.status(500).json({ error: 'Failed to calculate resume-job match' });
  }
});

router.post('/difficulty-adjust', requireAuth, async (req, res) => {
  try {
    const { currentDifficulty, performanceMetrics } = req.body;

    const result = adjustDifficulty(currentDifficulty, performanceMetrics);

    res.json(result);
  } catch (error) {
    console.error('Error adjusting difficulty:', error);
    res.status(500).json({ error: 'Failed to adjust difficulty' });
  }
});

router.post('/predict-success', requireAuth, async (req, res) => {
  try {
    const { interviewData, candidateProfile } = req.body;

    const prediction = await predictCandidateSuccess(interviewData, candidateProfile);

    res.json(prediction);
  } catch (error) {
    console.error('Error predicting success:', error);
    res.status(500).json({ error: 'Failed to predict success' });
  }
});

router.post('/technical-depth', requireAuth, async (req, res) => {
  try {
    const { question, answer, expectedKeywords } = req.body;

    const analysis = await analyzeTechnicalDepth(question, answer, expectedKeywords);

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing depth:', error);
    res.status(500).json({ error: 'Failed to analyze technical depth' });
  }
});

router.get('/job-requirements/templates', requireAuth, async (req, res) => {
  try {
    const templates = [
      {
        title: "Frontend Developer",
        requiredSkills: ["JavaScript", "React", "TypeScript", "HTML", "CSS"],
        preferredSkills: ["Next.js", "GraphQL", "Tailwind"],
        experienceYears: 3,
        competencies: ["Problem Solving", "Communication", "System Design"],
      },
      {
        title: "Backend Developer",
        requiredSkills: ["Node.js", "Python", "SQL", "REST APIs"],
        preferredSkills: ["GraphQL", "Kubernetes", "AWS"],
        experienceYears: 4,
        competencies: ["System Design", "Performance", "Security"],
      },
      {
        title: "Full Stack Developer",
        requiredSkills: ["React", "Node.js", "MongoDB", "JavaScript"],
        preferredSkills: ["TypeScript", "Docker", "Redis"],
        experienceYears: 3,
        competencies: ["Full Stack", "Problem Solving", "Teamwork"],
      },
      {
        title: "DevOps Engineer",
        requiredSkills: ["Docker", "Kubernetes", "CI/CD", "AWS"],
        preferredSkills: ["Terraform", "Ansible", "Prometheus"],
        experienceYears: 4,
        competencies: ["Automation", "Infrastructure", "Monitoring"],
      },
    ];

    res.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

export default router;