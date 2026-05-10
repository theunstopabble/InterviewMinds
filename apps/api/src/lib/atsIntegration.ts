interface ATSConfig {
  provider: 'workday' | 'greenhouse' | 'lever' | 'bamboohr' | 'sap-successfactors';
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  tenantUrl?: string;
  webhookUrl?: string;
}

interface ATSJob {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  location: string;
  department: string;
  status: 'open' | 'closed' | 'draft';
  createdAt: string;
  [key: string]: unknown;
}

interface ATSCandidate {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  resumeUrl?: string;
  status: 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
  source?: string;
}

interface ATSInterviewResult {
  candidateId: string;
  jobId: string;
  interviewId: string;
  score: number;
  assessment: string;
  recommendation: 'advance' | 'hold' | 'reject';
  conductedAt: string;
}

const atsJobs: Map<string, ATSJob[]> = new Map();
const atsCandidates: Map<string, ATSCandidate[]> = new Map();

function generateATSId(): string {
  return `ats_${crypto.randomUUID().slice(0, 10)}`;
}

function getMockJobs(provider: string): ATSJob[] {
  return [
    {
      id: generateATSId(),
      title: 'Senior Software Engineer',
      description: 'We are looking for an experienced software engineer to join our team.',
      requirements: ['5+ years experience', 'React', 'Node.js', 'TypeScript'],
      location: 'Remote',
      department: 'Engineering',
      status: 'open',
      createdAt: new Date().toISOString()
    },
    {
      id: generateATSId(),
      title: 'Product Manager',
      description: 'Lead product development for our core platform.',
      requirements: ['3+ years PM experience', 'Technical background', 'Agile'],
      location: 'New York, NY',
      department: 'Product',
      status: 'open',
      createdAt: new Date().toISOString()
    }
  ];
}

function getMockCandidates(jobId: string): ATSCandidate[] {
  return [
    {
      id: generateATSId(),
      email: 'candidate1@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      resumeUrl: 'https://example.com/resume/john.pdf',
      status: 'interview',
      source: 'LinkedIn'
    },
    {
      id: generateATSId(),
      email: 'candidate2@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+0987654321',
      resumeUrl: 'https://example.com/resume/jane.pdf',
      status: 'screening',
      source: 'Referral'
    }
  ];
}

export function configureATS(config: ATSConfig): { success: boolean; message: string } {
  if (!config.tenantUrl && !config.apiKey) {
    return { success: false, message: 'API key or tenant URL is required' };
  }
  
  return { success: true, message: `Connected to ${config.provider} ATS` };
}

export function fetchJobs(config: ATSConfig): ATSJob[] {
  const jobs = atsJobs.get(config.provider) || getMockJobs(config.provider);
  atsJobs.set(config.provider, jobs);
  return jobs;
}

export function fetchCandidates(config: ATSConfig, jobId: string): ATSCandidate[] {
  const candidates = atsCandidates.get(jobId) || getMockCandidates(jobId);
  atsCandidates.set(jobId, candidates);
  return candidates;
}

export function pushInterviewResults(config: ATSConfig, result: ATSInterviewResult): { success: boolean; externalId?: string } {
  const externalId = generateATSId();
  return { success: true, externalId };
}

export function syncCandidate(config: ATSConfig, candidate: ATSCandidate): { success: boolean; externalId?: string } {
  const existingCandidates = atsCandidates.get(candidate.id) || [];
  existingCandidates.push(candidate);
  atsCandidates.set(candidate.id, existingCandidates);
  
  return { success: true, externalId: generateATSId() };
}

export function getWebhooks(config: ATSConfig): { events: string[]; url: string } {
  return {
    events: ['candidate.created', 'candidate.status_changed', 'job.created'],
    url: config.webhookUrl || 'https://api.interviewminds.com/webhooks/ats'
  };
}

export function createWebhook(config: ATSConfig, events: string[]): { success: boolean; webhookId?: string } {
  if (!config.webhookUrl) {
    return { success: false };
  }
  
  return { success: true, webhookId: `wh_${crypto.randomUUID().slice(0, 8)}` };
}

export function parseJobFromATS(atsJob: unknown): { title: string; requirements: string[]; description: string } {
  const job = atsJob as Record<string, unknown>;
  return {
    title: String(job.title || ''),
    requirements: Array.isArray(job.requirements) ? job.requirements.map(String) : [],
    description: String(job.description || '')
  };
}

export function mapCandidateStatus(status: string): ATSCandidate['status'] {
  const statusMap: Record<string, ATSCandidate['status']> = {
    'new': 'new',
    'applied': 'new',
    'screening': 'screening',
    'in_progress': 'interview',
    'interview': 'interview',
    'offer': 'offer',
    'hired': 'hired',
    'rejected': 'rejected'
  };
  
  return statusMap[status.toLowerCase()] || 'new';
}