import axios from "axios";
import { logger } from "./logger";
import { ATSConfigModel } from "../models/ATSConfig";

interface ATSConfig {
  provider: 'greenhouse' | 'lever' | 'workday' | 'bamboohr' | 'ashby';
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  tenantUrl?: string;
  webhookUrl?: string;
  _id?: string;
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

/* ------------------------------------------------------------------ */
/*  Local MongoDB storage collections (for local ATS mode)             */
/* ------------------------------------------------------------------ */

import mongoose from "mongoose";

const localJobSchema = new mongoose.Schema({
  provider: { type: String, required: true, index: true },
  job: {
    id: String,
    title: String,
    description: String,
    requirements: [String],
    location: String,
    department: String,
    status: { type: String, enum: ["open", "closed", "draft"] },
    createdAt: String,
  },
}, { timestamps: true });

const localCandidateSchema = new mongoose.Schema({
  provider: { type: String, required: true, index: true },
  jobId: { type: String, index: true },
  candidate: {
    id: String,
    email: String,
    firstName: String,
    lastName: String,
    phone: String,
    resumeUrl: String,
    status: { type: String, enum: ["new", "screening", "interview", "offer", "hired", "rejected"] },
    source: String,
  },
}, { timestamps: true });

const localResultSchema = new mongoose.Schema({
  provider: { type: String, required: true, index: true },
  result: {
    candidateId: String,
    jobId: String,
    interviewId: String,
    score: Number,
    assessment: String,
    recommendation: { type: String, enum: ["advance", "hold", "reject"] },
    conductedAt: String,
  },
  externalId: String,
}, { timestamps: true });

const LocalJobModel = mongoose.models.LocalATSSJob || mongoose.model("LocalATSSJob", localJobSchema);
const LocalCandidateModel = mongoose.models.LocalATSCandidate || mongoose.model("LocalATSCandidate", localCandidateSchema);
const LocalResultModel = mongoose.models.LocalATSResult || mongoose.model("LocalATSResult", localResultSchema);

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateATSId(): string {
  return `ats_${crypto.randomUUID().slice(0, 10)}`;
}

function mapCandidateStatus(status: string): ATSCandidate['status'] {
  const s = status.toLowerCase().replace(/[_\s]/g, "");
  const map: Record<string, ATSCandidate['status']> = {
    new: "new", applied: "new", screening: "screening", inprogress: "interview",
    interview: "interview", offer: "offer", hired: "hired", rejected: "rejected",
  };
  return map[s] || "new";
}

/* ------------------------------------------------------------------ */
/*  Provider config helpers                                           */
/* ------------------------------------------------------------------ */

async function getProviderConfig(provider: string): Promise<ATSConfig | null> {
  try {
    const doc = await ATSConfigModel.findOne({ provider }).lean();
    if (!doc) return null;
    return {
      provider: doc.provider as ATSConfig['provider'],
      apiKey: doc.apiKey || undefined,
      clientId: doc.clientId || undefined,
      clientSecret: doc.clientSecret || undefined,
      tenantUrl: doc.tenantUrl || undefined,
      webhookUrl: doc.webhookUrl || undefined,
      _id: String(doc._id),
    };
  } catch (error) {
    logger.error({ err: error, provider }, 'Failed to get ATS config from MongoDB');
    return null;
  }
}

async function saveProviderConfig(config: ATSConfig): Promise<void> {
  await ATSConfigModel.findOneAndUpdate(
    { provider: config.provider },
    { $set: { ...config, connected: true } },
    { upsert: true, new: true },
  );
}

function hasApiCredentials(config: ATSConfig): boolean {
  return !!(config.apiKey || (config.clientId && config.clientSecret));
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

async function fetchBambooHRJobs(apiKey: string, subdomain: string): Promise<ATSJob[]> {
  logger.info("Fetching jobs from BambooHR API");
  const res = await axios.get(`https://${subdomain}.bamboohr.com/api/gateway.php/${subdomain}/v1/employment/job/openings`, {
    headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}` },
    timeout: 15000,
  });
  return (res.data || []).map((j: any) => ({
    id: String(j.id),
    title: String(j.title || ""),
    description: String(j.description || ""),
    requirements: (j.educationRequirements || []).map(String),
    location: String(j.location?.city || ""),
    department: String(j.department?.title || ""),
    status: j.status === "open" ? "open" : "closed",
    createdAt: j.postedDate || new Date().toISOString(),
  }));
}

/* ------------------------------------------------------------------ */
/*  Exported API                                                      */
/* ------------------------------------------------------------------ */

export async function configureATS(config: ATSConfig): Promise<{ success: boolean; message: string }> {
  try {
    await saveProviderConfig(config);
    logger.info({ provider: config.provider }, "ATS provider configured");
    return { success: true, message: `Connected to ${config.provider} ATS` };
  } catch (error) {
    logger.error({ err: error, provider: config.provider }, "Failed to configure ATS");
    return { success: false, message: 'Failed to save ATS configuration' };
  }
}

export async function fetchJobs(config?: ATSConfig, provider?: string): Promise<ATSJob[]> {
  const resolvedConfig = config || (provider ? await getProviderConfig(provider) : null);
  if (!resolvedConfig) return [];

  const prov = resolvedConfig.provider;

  if (hasApiCredentials(resolvedConfig)) {
    try {
      let jobs: ATSJob[] = [];
      switch (prov) {
        case "greenhouse":
          jobs = await fetchGreenhouseJobs(resolvedConfig.apiKey!);
          break;
        case "lever":
          jobs = await fetchLeverJobs(resolvedConfig.apiKey!);
          break;
        case "workday":
          jobs = await fetchWorkdayJobs(resolvedConfig);
          break;
        case "bamboohr":
          jobs = await fetchBambooHRJobs(resolvedConfig.apiKey!, resolvedConfig.tenantUrl || 'default');
          break;
        default:
          jobs = [];
      }
      for (const job of jobs) {
        await LocalJobModel.findOneAndUpdate(
          { provider: prov, 'job.id': job.id },
          { $set: { job } },
          { upsert: true },
        );
      }
      return jobs;
    } catch (err: any) {
      logger.error({ provider: prov, err: err.message }, "Failed to fetch ATS jobs from API, falling back to local");
    }
  }

  const localJobs = await LocalJobModel.find({ provider: prov }).lean();
  return localJobs.map((j: any) => j.job as ATSJob);
}

export async function fetchCandidates(config?: ATSConfig, jobId?: string, provider?: string): Promise<ATSCandidate[]> {
  const resolvedConfig = config || (provider ? await getProviderConfig(provider) : null);
  if (!resolvedConfig) return [];

  const prov = resolvedConfig.provider;

  if (hasApiCredentials(resolvedConfig)) {
    try {
      let candidates: ATSCandidate[] = [];
      switch (prov) {
        case "greenhouse":
          candidates = await fetchGreenhouseCandidates(resolvedConfig.apiKey!, jobId || "");
          break;
        case "lever":
          candidates = await fetchLeverCandidates(resolvedConfig.apiKey!);
          break;
        case "workday":
          candidates = await fetchWorkdayCandidates(resolvedConfig);
          break;
        default:
          candidates = [];
      }
      for (const candidate of candidates) {
        await LocalCandidateModel.findOneAndUpdate(
          { provider: prov, 'candidate.id': candidate.id },
          { $set: { jobId: jobId || null, provider: prov, candidate } },
          { upsert: true },
        );
      }
      return candidates;
    } catch (err: any) {
      logger.error({ provider: prov, jobId, err: err.message }, "Failed to fetch ATS candidates, falling back to local");
    }
  }

  const filter: Record<string, unknown> = { provider: prov };
  if (jobId) filter.jobId = jobId;
  const localCandidates = await LocalCandidateModel.find(filter).lean();
  return localCandidates.map((c: any) => c.candidate as ATSCandidate);
}

export async function pushInterviewResults(config?: ATSConfig, result?: ATSInterviewResult, provider?: string): Promise<{ success: boolean; externalId?: string }> {
  const resolvedConfig = config || (provider ? await getProviderConfig(provider) : null);
  if (!resolvedConfig) return { success: false };

  const prov = resolvedConfig.provider;
  const resultData = result || { candidateId: '', jobId: '', interviewId: '', score: 0, assessment: '', recommendation: 'hold' as const, conductedAt: new Date().toISOString() };

  let externalId = generateATSId();

  if (hasApiCredentials(resolvedConfig)) {
    try {
      if (prov === "greenhouse" && resolvedConfig.apiKey) {
        const res = await axios.post(
          `https://harvest.greenhouse.io/v1/candidates/${resultData.candidateId}/scorecards`,
          { score: resultData.score, interview: resultData.assessment, recommendation: resultData.recommendation },
          { auth: { username: resolvedConfig.apiKey, password: "" }, timeout: 15000 }
        );
        externalId = String(res.data?.id || externalId);
      }
      if (prov === "lever" && resolvedConfig.apiKey) {
        const res = await axios.post(
          `https://api.lever.co/v1/opportunities/${resultData.candidateId}/interviews`,
          { result: resultData },
          { headers: { Authorization: `Bearer ${resolvedConfig.apiKey}` }, timeout: 15000 }
        );
        externalId = String(res.data?.data?.id || externalId);
      }
    } catch (err: any) {
      logger.error({ err: err.message }, "Failed to push interview results to ATS API, storing locally");
    }
  }

  await LocalResultModel.create({ provider: prov, result: resultData, externalId });
  return { success: true, externalId };
}

export async function syncCandidate(config?: ATSConfig, candidate?: ATSCandidate, provider?: string): Promise<{ success: boolean; externalId?: string }> {
  const resolvedConfig = config || (provider ? await getProviderConfig(provider) : null);
  const cand = candidate || { id: generateATSId(), email: '', firstName: '', lastName: '', status: 'new' as const };

  if (!resolvedConfig) {
    await LocalCandidateModel.create({ provider: 'local', candidate: cand });
    return { success: true, externalId: cand.id };
  }

  const prov = resolvedConfig.provider;
  let externalId = generateATSId();

  if (hasApiCredentials(resolvedConfig)) {
    try {
      if (prov === "greenhouse" && resolvedConfig.apiKey) {
        const res = await axios.post(
          "https://harvest.greenhouse.io/v1/candidates",
          { first_name: cand.firstName, last_name: cand.lastName, email_addresses: [{ value: cand.email, type: "personal" }] },
          { auth: { username: resolvedConfig.apiKey, password: "" }, timeout: 15000 }
        );
        externalId = String(res.data?.id || externalId);
      }
    } catch (err: any) {
      logger.error({ err: err.message }, "Failed to sync candidate to ATS API, storing locally");
    }
  }

  await LocalCandidateModel.findOneAndUpdate(
    { provider: prov, 'candidate.email': cand.email },
    { $set: { provider: prov, candidate: { ...cand, id: externalId } } },
    { upsert: true },
  );

  return { success: true, externalId };
}

export function getWebhooks(config?: ATSConfig, provider?: string): { events: string[]; url: string } {
  return {
    events: ['candidate.created', 'candidate.status_changed', 'job.created'],
    url: config?.webhookUrl || provider ? process.env.ATS_WEBHOOK_URL || 'https://api.interviewminds.com/webhooks/ats' : ''
  };
}

export async function createWebhook(config?: ATSConfig, events?: string[], provider?: string): Promise<{ success: boolean; webhookId?: string }> {
  const resolvedConfig = config || (provider ? await getProviderConfig(provider) : null);
  if (!resolvedConfig?.webhookUrl) {
    return { success: false };
  }

  try {
    let webhookId = `wh_${crypto.randomUUID().slice(0, 8)}`;
    const prov = resolvedConfig.provider;

    if (prov === "greenhouse" && resolvedConfig.apiKey) {
      const res = await axios.post(
        "https://harvest.greenhouse.io/v1/webhooks",
        { url: resolvedConfig.webhookUrl, events: events || [] },
        { auth: { username: resolvedConfig.apiKey, password: "" }, timeout: 15000 }
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
