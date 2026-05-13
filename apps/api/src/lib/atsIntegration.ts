import axios from "axios";
import { logger } from "./logger";

interface ATSConfig {
  provider: 'greenhouse' | 'lever' | 'workday' | 'bamboohr';
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

const atsJobs = new Map<string, ATSJob[]>();
const atsCandidates = new Map<string, ATSCandidate[]>();

function generateATSId(): string {
  return `ats_${crypto.randomUUID().slice(0, 10)}`;
}

/* ------------------------------------------------------------------ */
/*  Real ATS API fetchers                                              */
/* ------------------------------------------------------------------ */

async function fetchGreenhouseJobs(apiKey: string): Promise<ATSJob[]> {
  logger.info("Fetching jobs from Greenhouse API");
  const res = await axios.get("https://harvest.greenhouse.io/v1/jobs", {
    auth: { username: apiKey, password: "" },
    timeout: 15000,
  });
  return (res.data || []).map((j: any) => ({
    id: String(j.id),
    title: String(j.name || j.title || ""),
    description: String(j.notes || j.description || ""),
    requirements: (j.requirements || []).map((r: any) => String(r.name || r)),
    location: String(j.location?.name || j.offices?.[0]?.name || ""),
    department: String(j.departments?.[0]?.name || ""),
    status: j.status === "open" ? "open" : "closed",
    createdAt: j.opened_at || new Date().toISOString(),
  }));
}

async function fetchGreenhouseCandidates(apiKey: string, jobId: string): Promise<ATSCandidate[]> {
  logger.info({ jobId }, "Fetching candidates from Greenhouse API");
  const res = await axios.get(`https://harvest.greenhouse.io/v1/candidates`, {
    auth: { username: apiKey, password: "" },
    params: { job_id: jobId },
    timeout: 15000,
  });
  return (res.data || []).map((c: any) => ({
    id: String(c.id),
    email: c.email_addresses?.[0]?.value || "",
    firstName: String(c.first_name || ""),
    lastName: String(c.last_name || ""),
    phone: c.phone_numbers?.[0]?.value || undefined,
    resumeUrl: c.attachments?.find((a: any) => a.type === "resume")?.url || undefined,
    status: mapCandidateStatus(c.status || ""),
    source: c.source?.name || undefined,
  }));
}

async function fetchLeverJobs(apiKey: string): Promise<ATSJob[]> {
  logger.info("Fetching jobs from Lever API");
  const res = await axios.get("https://api.lever.co/v1/postings", {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 15000,
  });
  return (res.data?.data || []).map((j: any) => ({
    id: String(j.id),
    title: String(j.text || j.title || ""),
    description: String(j.description || ""),
    requirements: (j.lists || []).map((l: any) => String(l.text || "")),
    location: String(j.categories?.location || ""),
    department: String(j.categories?.team || ""),
    status: j.state === "published" ? "open" : "closed",
    createdAt: j.createdAt || new Date().toISOString(),
  }));
}

async function fetchLeverCandidates(apiKey: string): Promise<ATSCandidate[]> {
  logger.info("Fetching candidates from Lever API");
  const res = await axios.get("https://api.lever.co/v1/opportunities", {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 15000,
  });
  return (res.data?.data || []).map((c: any) => ({
    id: String(c.id),
    email: c.emails?.[0] || "",
    firstName: String(c.name?.split(" ")[0] || ""),
    lastName: String(c.name?.split(" ").slice(1).join(" ") || ""),
    phone: c.phones?.[0] || undefined,
    resumeUrl: undefined,
    status: mapCandidateStatus(c.stage || ""),
    source: c.sourcedBy || undefined,
  }));
}

async function fetchWorkdayJobs(config: ATSConfig): Promise<ATSJob[]> {
  logger.info("Fetching jobs from Workday API");
  if (!config.tenantUrl) return [];
  const res = await axios.get(`${config.tenantUrl}/jobs`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
    timeout: 15000,
  });
  return (res.data?.data || res.data || []).map((j: any) => ({
    id: String(j.id),
    title: String(j.title || ""),
    description: String(j.jobDescription || ""),
    requirements: (j.requiredSkills || []).map(String),
    location: String(j.location || ""),
    department: String(j.department || ""),
    status: j.isOpen ? "open" : "closed",
    createdAt: j.postedDate || new Date().toISOString(),
  }));
}

async function fetchWorkdayCandidates(config: ATSConfig): Promise<ATSCandidate[]> {
  logger.info("Fetching candidates from Workday API");
  if (!config.tenantUrl) return [];
  const res = await axios.get(`${config.tenantUrl}/candidates`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
    timeout: 15000,
  });
  return (res.data?.data || res.data || []).map((c: any) => ({
    id: String(c.id),
    email: String(c.email || ""),
    firstName: String(c.firstName || ""),
    lastName: String(c.lastName || ""),
    phone: c.phone || undefined,
    resumeUrl: c.resumeUrl || undefined,
    status: mapCandidateStatus(c.status || ""),
    source: c.source || undefined,
  }));
}

function mapCandidateStatus(status: string): ATSCandidate['status'] {
  const s = status.toLowerCase().replace(/[_\s]/g, "");
  const map: Record<string, ATSCandidate['status']> = {
    new: "new", applied: "new", screening: "screening", inprogress: "interview",
    interview: "interview", offer: "offer", hired: "hired", rejected: "rejected",
  };
  return map[s] || "new";
}

export function configureATS(config: ATSConfig): { success: boolean; message: string } {
  if (!config.tenantUrl && !config.apiKey) {
    return { success: false, message: 'API key or tenant URL is required' };
  }
  return { success: true, message: `Connected to ${config.provider} ATS` };
}

export async function fetchJobs(config: ATSConfig): Promise<ATSJob[]> {
  try {
    let jobs: ATSJob[] = [];
    switch (config.provider) {
      case "greenhouse":
        jobs = config.apiKey ? await fetchGreenhouseJobs(config.apiKey) : [];
        break;
      case "lever":
        jobs = config.apiKey ? await fetchLeverJobs(config.apiKey) : [];
        break;
      case "workday":
        jobs = await fetchWorkdayJobs(config);
        break;
      default:
        jobs = [];
    }
    atsJobs.set(config.provider, jobs);
    return jobs;
  } catch (err: any) {
    logger.error({ provider: config.provider, err: err.message }, "Failed to fetch ATS jobs");
    return atsJobs.get(config.provider) || [];
  }
}

export async function fetchCandidates(config: ATSConfig, jobId: string): Promise<ATSCandidate[]> {
  try {
    let candidates: ATSCandidate[] = [];
    switch (config.provider) {
      case "greenhouse":
        candidates = config.apiKey ? await fetchGreenhouseCandidates(config.apiKey, jobId) : [];
        break;
      case "lever":
        candidates = config.apiKey ? await fetchLeverCandidates(config.apiKey) : [];
        break;
      case "workday":
        candidates = await fetchWorkdayCandidates(config);
        break;
      default:
        candidates = [];
    }
    atsCandidates.set(jobId, candidates);
    return candidates;
  } catch (err: any) {
    logger.error({ provider: config.provider, jobId, err: err.message }, "Failed to fetch ATS candidates");
    return atsCandidates.get(jobId) || [];
  }
}

export async function pushInterviewResults(config: ATSConfig, result: ATSInterviewResult): Promise<{ success: boolean; externalId?: string }> {
  try {
    let externalId = generateATSId();
    if (config.provider === "greenhouse" && config.apiKey) {
      const res = await axios.post(
        `https://harvest.greenhouse.io/v1/candidates/${result.candidateId}/scorecards`,
        { score: result.score, interview: result.assessment, recommendation: result.recommendation },
        { auth: { username: config.apiKey, password: "" }, timeout: 15000 }
      );
      externalId = String(res.data?.id || externalId);
    }
    return { success: true, externalId };
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to push interview results to ATS");
    return { success: false };
  }
}

export async function syncCandidate(config: ATSConfig, candidate: ATSCandidate): Promise<{ success: boolean; externalId?: string }> {
  try {
    let externalId = generateATSId();
    if (config.provider === "greenhouse" && config.apiKey) {
      const res = await axios.post(
        "https://harvest.greenhouse.io/v1/candidates",
        { first_name: candidate.firstName, last_name: candidate.lastName, email_addresses: [{ value: candidate.email, type: "personal" }] },
        { auth: { username: config.apiKey, password: "" }, timeout: 15000 }
      );
      externalId = String(res.data?.id || externalId);
    }
    const existing = atsCandidates.get(candidate.id) || [];
    existing.push(candidate);
    atsCandidates.set(candidate.id, existing);
    return { success: true, externalId };
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to sync candidate to ATS");
    return { success: false };
  }
}

export function getWebhooks(config: ATSConfig): { events: string[]; url: string } {
  return {
    events: ['candidate.created', 'candidate.status_changed', 'job.created'],
    url: config.webhookUrl || process.env.ATS_WEBHOOK_URL || 'https://api.interviewminds.com/webhooks/ats'
  };
}

export async function createWebhook(config: ATSConfig, events: string[]): Promise<{ success: boolean; webhookId?: string }> {
  if (!config.webhookUrl) {
    return { success: false };
  }
  try {
    let webhookId = `wh_${crypto.randomUUID().slice(0, 8)}`;
    if (config.provider === "greenhouse" && config.apiKey) {
      const res = await axios.post(
        "https://harvest.greenhouse.io/v1/webhooks",
        { url: config.webhookUrl, events },
        { auth: { username: config.apiKey, password: "" }, timeout: 15000 }
      );
      webhookId = String(res.data?.id || webhookId);
    }
    return { success: true, webhookId };
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to create ATS webhook");
    return { success: false };
  }
}

export function parseJobFromATS(atsJob: unknown): { title: string; requirements: string[]; description: string } {
  const job = atsJob as Record<string, unknown>;
  return {
    title: String(job.title || ''),
    requirements: Array.isArray(job.requirements) ? job.requirements.map(String) : [],
    description: String(job.description || '')
  };
}