declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>;
      };
      user?: {
        get: (id: string) => Promise<{ id: string }>;
      };
    };
  }
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = await window.Clerk?.session?.getToken();
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export interface FeedbackResult {
  summary: string;
  overallScore: number;
  categoryScores: {
    technicalSkills: number;
    communication: number;
    problemSolving: number;
    culturalFit: number;
  };
  strengths: string[];
  areasForImprovement: string[];
  detailedAnalysis: {
    questionId: number;
    question: string;
    score: number;
    feedback: string;
    keyPoints: string[];
  }[];
  recommendations: {
    hiring: 'strong_yes' | 'yes' | 'maybe' | 'no';
    nextSteps: string[];
    suggestedRoles?: string[];
  };
  redFlags: string[];
  keyInsights: string[];
}

// ============== Phase 9: AI & LLM ==============

// LLM Interviewer Service
export const llmInterviewerService = {
  createSession: (config: any) =>
    fetchAPI<any>('/llm-interviewer/create', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  sendMessage: (sessionId: string, message: string) =>
    fetchAPI<any>('/llm-interviewer/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message }),
    }),
  getFollowup: (sessionId: string, lastAnswer: string) =>
    fetchAPI<any>('/llm-interviewer/followup', {
      method: 'POST',
      body: JSON.stringify({ sessionId, lastAnswer }),
    }),
  getFeedback: (sessionId: string) =>
    fetchAPI<any>(`/llm-interviewer/feedback/${sessionId}`),
  explainCode: (sessionId: string, code: string) =>
    fetchAPI<any>('/llm-interviewer/explain-code', {
      method: 'POST',
      body: JSON.stringify({ sessionId, code }),
    }),
  getMetrics: (sessionId: string) =>
    fetchAPI<any>(`/llm-interviewer/metrics/${sessionId}`),
  endSession: (sessionId: string) =>
    fetchAPI<any>(`/llm-interviewer/end/${sessionId}`, { method: 'DELETE' }),
};

// Multimodal AI Service
export const multimodalAIService = {
  analyze: (sessionId: string, frameData: string) =>
    fetchAPI<any>('/multimodal-ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ sessionId, frameData }),
    }),
  analyzeVoice: (audioData: string) =>
    fetchAPI<any>('/multimodal-ai/voice/analyze', {
      method: 'POST',
      body: JSON.stringify({ audioData }),
    }),
  analyzeFacial: (frameData: string) =>
    fetchAPI<any>('/multimodal-ai/facial/analyze', {
      method: 'POST',
      body: JSON.stringify({ frameData }),
    }),
  analyzeEyeGaze: (frameData: string) =>
    fetchAPI<any>('/multimodal-ai/eye-gaze/analyze', {
      method: 'POST',
      body: JSON.stringify({ frameData }),
    }),
  analyzePosture: (frameData: string) =>
    fetchAPI<any>('/multimodal-ai/posture/analyze', {
      method: 'POST',
      body: JSON.stringify({ frameData }),
    }),
  detectVoiceAnomaly: (audioData: string) =>
    fetchAPI<any>('/multimodal-ai/voice/anomaly', {
      method: 'POST',
      body: JSON.stringify({ audioData }),
    }),
  getEngagementScore: (sessionId: string) =>
    fetchAPI<any>(`/multimodal-ai/engagement/score/${sessionId}`),
};

// Smart Assessment Service
export const smartAssessmentService = {
  generateQuestions: (jobDescription: string, count?: number) =>
    fetchAPI<any>('/smart-assessment/generate-questions', {
      method: 'POST',
      body: JSON.stringify({ jobDescription, count }),
    }),
  analyzeCompetencyGap: (candidateSkills: string[], jobRequirements: string[]) =>
    fetchAPI<any>('/smart-assessment/competency-gap', {
      method: 'POST',
      body: JSON.stringify({ candidateSkills, jobRequirements }),
    }),
  matchResume: (resumeText: string, jobDescription: string) =>
    fetchAPI<any>('/smart-assessment/resume-match', {
      method: 'POST',
      body: JSON.stringify({ resumeText, jobDescription }),
    }),
  adjustDifficulty: (sessionId: string, performanceScore: number) =>
    fetchAPI<any>('/smart-assessment/difficulty-adjust', {
      method: 'POST',
      body: JSON.stringify({ sessionId, performanceScore }),
    }),
  predictSuccess: (candidateData: any) =>
    fetchAPI<any>('/smart-assessment/predict-success', {
      method: 'POST',
      body: JSON.stringify(candidateData),
    }),
  analyzeTechnicalDepth: (answer: string, question: string) =>
    fetchAPI<any>('/smart-assessment/technical-depth', {
      method: 'POST',
      body: JSON.stringify({ answer, question }),
    }),
  getJobTemplates: () =>
    fetchAPI<any>('/smart-assessment/job-requirements/templates'),
};

// ============== Job Matching ==============
export const jobMatchingService = {
  extractResumeEntities: (resumeText: string) =>
    fetchAPI<{ entities: any }>('/job-matching/extract', {
      method: 'POST',
      body: JSON.stringify({ resumeText }),
    }),

  matchResume: (resume: any, requirement: any) =>
    fetchAPI<any>('/job-matching/match', {
      method: 'POST',
      body: JSON.stringify({ resume, requirement }),
    }),
};

// ============== Question Generation ==============
export const questionService = {
  getCompetencies: () =>
    fetchAPI<{ competencies: any[] }>('/questions/competencies'),

  generateQuestions: (jobType: string, experienceYears: number, requiredSkills?: string[], count?: number) =>
    fetchAPI<{ questions: any[] }>('/questions/generate', {
      method: 'POST',
      body: JSON.stringify({ jobType, experienceYears, requiredSkills, count }),
    }),
};

// ============== Code Analysis ==============
export const codeAnalysisService = {
  analyze: (code: string, language: string, filename?: string) =>
    fetchAPI<any>('/code-analysis/analyze', {
      method: 'POST',
      body: JSON.stringify({ code, language, filename }),
    }),

  securityScan: (code: string, language: string) =>
    fetchAPI<any>('/code-analysis/security-scan', {
      method: 'POST',
      body: JSON.stringify({ code, language }),
    }),
};

// ============== E2E Encryption ==============
export const encryptionService = {
  createKeys: (userId: string, password: string) =>
    fetchAPI<{ success: boolean; publicKey: string; fingerprint: string }>('/e2e-encryption/keys/create', {
      method: 'POST',
      body: JSON.stringify({ userId, password }),
    }),

  rotateKeys: (userId: string, oldPassword: string, newPassword: string) =>
    fetchAPI<any>('/e2e-encryption/keys/rotate', {
      method: 'POST',
      body: JSON.stringify({ userId, oldPassword, newPassword }),
    }),

  getKeys: (userId: string) =>
    fetchAPI<any>(`/e2e-encryption/keys/${userId}`),

  encrypt: (recipientPublicKey: string, message: string) =>
    fetchAPI<any>('/e2e-encryption/encrypt', {
      method: 'POST',
      body: JSON.stringify({ recipientPublicKey, message }),
    }),

  decrypt: (ciphertext: string, iv: string, tag: string, encryptedKey: string, privateKey: string) =>
    fetchAPI<{ message: string }>('/e2e-encryption/decrypt', {
      method: 'POST',
      body: JSON.stringify({ ciphertext, iv, tag, encryptedKey, privateKey }),
    }),
};

// ============== Biometric Auth ==============
export const biometricService = {
  getSettings: () => fetchAPI<any>('/biometric/settings'),

  enroll: (userId: string, type: 'face' | 'voice' | 'fingerprint', data: number[]) =>
    fetchAPI<{ success: boolean; template: any }>('/biometric/enroll', {
      method: 'POST',
      body: JSON.stringify({ userId, type, data }),
    }),

  verify: (userId: string, type: 'face' | 'voice' | 'fingerprint', data: number[], sessionData?: any) =>
    fetchAPI<any>('/biometric/verify', {
      method: 'POST',
      body: JSON.stringify({ userId, type, data, sessionData }),
    }),

  getStatus: (userId: string) =>
    fetchAPI<any>(`/biometric/status/${userId}`),

  removeEnrollment: (userId: string, type: 'face' | 'voice' | 'fingerprint') =>
    fetchAPI<{ success: boolean }>(`/biometric/enrollment/${userId}?type=${type}`, {
      method: 'DELETE',
    }),
};

// ============== Fraud Detection ==============
export const fraudDetectionService = {
  analyze: (fingerprint: any, behavior: any, session: any) =>
    fetchAPI<any>('/fraud-detection/analyze', {
      method: 'POST',
      body: JSON.stringify({ fingerprint, behavior, session }),
    }),

  getSessionAnalysis: (sessionId: string) =>
    fetchAPI<any>(`/fraud-detection/session/${sessionId}`),
};

// ============== Geo-Fencing ==============
export const geoFencingService = {
  validateIP: (ip: string, config?: any) =>
    fetchAPI<any>('/geo-fencing/validate', {
      method: 'POST',
      body: JSON.stringify({ ip, config }),
    }),

  getConfig: () => fetchAPI<any>('/geo-fencing/config'),
  getMyIP: () => fetchAPI<any>('/geo-fencing/my-ip'),
};

// ============== Proctoring ==============
export const proctoringService = {
  analyzeVideo: (interviewId: string, frameData: string, previousPositions?: any[]) =>
    fetchAPI<any>('/proctoring/video/analyze', {
      method: 'POST',
      body: JSON.stringify({ interviewId, frameData, previousPositions }),
    }),

  analyzeAudio: (interviewId: string, audioData: number[]) =>
    fetchAPI<any>('/proctoring/audio/analyze', {
      method: 'POST',
      body: JSON.stringify({ interviewId, audioData }),
    }),

  checkScreen: () => fetchAPI<any>('/proctoring/screen/check'),

  evaluateSession: (interviewId: string, videoMetrics: any[], audioMetrics: any[], screenMetrics: any[]) =>
    fetchAPI<any>('/proctoring/session/evaluate', {
      method: 'POST',
      body: JSON.stringify({ interviewId, videoMetrics, audioMetrics, screenMetrics }),
    }),

  getResults: (interviewId: string) =>
    fetchAPI<any>(`/proctoring/interview/${interviewId}/results`),

  getRecordingSessions: (interviewId: string) =>
    fetchAPI<{ sessions: any[] }>(`/proctoring/sessions/${interviewId}`),

  saveRecordingSession: (interviewId: string, session: any) =>
    fetchAPI<any>(`/proctoring/sessions/${interviewId}`, {
      method: 'POST',
      body: JSON.stringify(session),
    }),
};

// ============== Answer Validation ==============
export const answerValidationService = {
  evaluate: (question: string, transcript: string, resumeEntities?: any, questionType?: string, expectedCompetencies?: string[]) =>
    fetchAPI<any>('/answer-validation/evaluate', {
      method: 'POST',
      body: JSON.stringify({ question, transcript, resumeEntities, questionType, expectedCompetencies }),
    }),

  batchEvaluate: (answers: any[]) =>
    fetchAPI<{ results: any[] }>('/answer-validation/batch-evaluate', {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),
};

// ============== Dynamic Questions ==============
export const dynamicQuestionService = {
  generate: (context: any) =>
    fetchAPI<any>('/dynamic-questions/generate', {
      method: 'POST',
      body: JSON.stringify(context),
    }),

  generateSequence: (context: any, count?: number) =>
    fetchAPI<{ followUps: any[] }>('/dynamic-questions/generate-sequence', {
      method: 'POST',
      body: JSON.stringify({ context, count }),
    }),
};

// ============== SSO ==============
export const ssoService = {
  getConfig: () => fetchAPI<any>('/sso/config'),

  configure: (config: any) =>
    fetchAPI<any>('/sso/config', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  getLoginUrl: (provider: string) =>
    fetchAPI<{ redirectUrl: string; state: string }>(`/sso/login/${provider}`),
};

// ============== Webhooks ==============
export const webhookService = {
  getEvents: () => fetchAPI<{ events: any[] }>('/webhooks/events'),

  register: (url: string, events: string[], secret?: string) =>
    fetchAPI<any>('/webhooks/register', {
      method: 'POST',
      body: JSON.stringify({ url, events, secret }),
    }),

  get: (webhookId: string) => fetchAPI<any>(`/webhooks/${webhookId}`),

  update: (webhookId: string, updates: any) =>
    fetchAPI<any>(`/webhooks/${webhookId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  delete: (webhookId: string) =>
    fetchAPI<{ success: boolean }>(`/webhooks/${webhookId}`, {
      method: 'DELETE',
    }),

  trigger: (event: string, data: any, webhookIds?: string[]) =>
    fetchAPI<any>('/webhooks/trigger', {
      method: 'POST',
      body: JSON.stringify({ event, data, webhookIds }),
    }),

  verify: (payload: string, signature: string, secret: string) =>
    fetchAPI<{ valid: boolean }>('/webhooks/verify', {
      method: 'POST',
      body: JSON.stringify({ payload, signature, secret }),
    }),
};

// ============== ATS ==============
export const atsService = {
  configure: (config: any) =>
    fetchAPI<any>('/ats/configure', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  getJobs: (provider?: string) =>
    fetchAPI<{ jobs: any[] }>(`/ats/jobs${provider ? `?provider=${provider}` : ''}`),

  getCandidates: (jobId: string, provider?: string) =>
    fetchAPI<{ candidates: any[] }>(`/ats/jobs/${jobId}/candidates${provider ? `?provider=${provider}` : ''}`),

  pushResults: (result: any, provider?: string) =>
    fetchAPI<any>(`/ats/results${provider ? `?provider=${provider}` : ''}`, {
      method: 'POST',
      body: JSON.stringify(result),
    }),

  sync: (candidate: any, provider?: string) =>
    fetchAPI<any>(`/ats/sync${provider ? `?provider=${provider}` : ''}`, {
      method: 'POST',
      body: JSON.stringify({ candidate }),
    }),
};

// ============== Multi-Tenancy ==============
export const tenantService = {
  create: (data: { name: string; domain?: string; plan?: string }) =>
    fetchAPI<{ success: boolean; tenant: any }>('/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAll: () => fetchAPI<{ tenants: any[]; count: number }>('/tenants'),

  get: (tenantId: string) => fetchAPI<any>(`/tenants/${tenantId}`),

  updateSettings: (tenantId: string, settings: any) =>
    fetchAPI<any>(`/tenants/${tenantId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  checkFeature: (tenantId: string, feature: string) =>
    fetchAPI<{ feature: string; hasAccess: boolean }>(`/tenants/${tenantId}/check-feature`, {
      method: 'POST',
      body: JSON.stringify({ feature }),
    }),

  getPlan: (tenantId: string) => fetchAPI<any>(`/tenants/${tenantId}/plan`),

  validateStatus: (tenantId: string) =>
    fetchAPI<{ tenantId: string; valid: boolean; status: string }>('/tenants/validate-status', {
      method: 'POST',
      body: JSON.stringify({ tenantId }),
    }),
};

// ============== Compliance ==============
export const complianceService = {
  queryAudit: (filters: any) => {
    const params = new URLSearchParams(filters).toString();
    return fetchAPI<{ data: any[] }>(`/compliance/audit/logs?${params}`, {
      method: 'GET',
    });
  },

  recordConsent: (userId: string, consentType: string, granted: boolean, version?: string) =>
    fetchAPI<any>('/compliance/consent', {
      method: 'POST',
      body: JSON.stringify({ userId, consentType, granted, version }),
    }),

  getConsents: (userId: string) =>
    fetchAPI<{ userId: string; consents: any[] }>(`/compliance/consent/${userId}`),

  createDataRequest: (userId: string, type: 'access' | 'deletion' | 'rectification' | 'portability') =>
    fetchAPI<{ success: boolean; request: any }>('/compliance/data-request', {
      method: 'POST',
      body: JSON.stringify({ userId, type }),
    }),

  getDataRequests: (userId: string) =>
    fetchAPI<{ userId: string; requests: any[] }>(`/compliance/data-request/${userId}`),

  getSecurityControls: () => fetchAPI<{ controls: any[]; count: number }>('/compliance/security-controls'),

  getReport: (framework: 'SOC2' | 'GDPR' | 'HIPAA' | 'ISO27001') =>
    fetchAPI<any>(`/compliance/report/${framework}`),
};

// ============== Analytics ==============
export const analyticsService = {
  getDashboard: (tenantId?: string) => fetchAPI<any>(
    tenantId ? `/analytics/dashboard?tenantId=${tenantId}` : '/analytics/dashboard'
  ),

  getTrends: (days?: number) =>
    fetchAPI<{ trends: any[] }>(`/analytics/trends${days ? `?days=${days}` : ''}`),

  getTopPerformers: (limit?: number) =>
    fetchAPI<{ performers: any[] }>(`/analytics/top-performers${limit ? `?limit=${limit}` : ''}`),

  getPipeline: (tenantId?: string) => fetchAPI<{ candidates: any[]; count: number }>(`/analytics/pipeline${tenantId ? `?tenantId=${tenantId}` : ''}`),

  updateCandidateStage: (candidateId: string, stage: string) =>
    fetchAPI<any>(`/analytics/pipeline/candidate/${candidateId}/stage`, {
      method: 'PUT',
      body: JSON.stringify({ stage }),
    }),

  addCandidate: (candidate: { name: string; email: string; role: string; tags?: string[] }) =>
    fetchAPI<any>('/analytics/pipeline/candidate', {
      method: 'POST',
      body: JSON.stringify(candidate),
    }),

  deleteCandidate: (candidateId: string) =>
    fetchAPI<any>(`/analytics/pipeline/candidate/${candidateId}`, { method: 'DELETE' }),
};

// ============== Scheduling ==============
export const schedulingService = {
  getTimezones: () => fetchAPI<string[]>('/scheduling/timezones'),

  getUserTimezone: () => fetchAPI<{ timezone: string }>('/scheduling/user-timezone'),

  getAvailableSlots: (interviewerId: string, date: string, timezone: string) =>
    fetchAPI<{ slots: any[] }>(`/scheduling/slots/${interviewerId}?date=${date}&timezone=${timezone}`),

  bookSlot: (interviewerId: string, slotId: string, interviewType: 'live' | 'async' | 'take-home') =>
    fetchAPI<any>('/scheduling/book', {
      method: 'POST',
      body: JSON.stringify({ tenantId: interviewerId, slotId, type: interviewType, candidateId: 'current' }),
    }),

  reschedule: (interviewId: string, newSlotId: string) =>
    fetchAPI<any>('/scheduling/reschedule', {
      method: 'POST',
      body: JSON.stringify({ interviewId, newSlotId }),
    }),

  cancel: (interviewId: string, reason?: string) =>
    fetchAPI<any>('/scheduling/cancel', {
      method: 'POST',
      body: JSON.stringify({ interviewId, reason }),
    }),

  getUpcoming: () => fetchAPI<{ interviews: any[] }>('/scheduling/upcoming'),
};

// ============== Question Bank ==============
export const questionBankService = {
  getQuestions: (category?: string, filters?: { difficulty?: string; type?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (filters?.difficulty) params.set('difficulty', filters.difficulty);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.limit) params.set('limit', filters.limit.toString());
    return fetchAPI<{ questions: any[] }>(`/question-bank?${params}`);
  },

  getQuestion: (id: string) => fetchAPI<any>(`/question-bank/${id}`),

  search: (query: string, filters?: { category?: string; difficulty?: string; tags?: string[] }) => {
    const params = new URLSearchParams({ q: query });
    if (filters?.category) params.set('category', filters.category);
    if (filters?.difficulty) params.set('difficulty', filters.difficulty);
    return fetchAPI<{ questions: any[] }>(`/question-bank/search?${params}`);
  },

  create: (data: any) =>
    fetchAPI<any>('/question-bank', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, updates: any) =>
    fetchAPI<any>(`/question-bank/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  delete: (id: string) =>
    fetchAPI<any>(`/question-bank/${id}`, { method: 'DELETE' }),

  getCategories: () => fetchAPI<{ categories: any[] }>('/question-bank/categories'),

  getStats: () => fetchAPI<{ stats: any }>('/question-bank/stats'),

  getPracticeQuestions: (count: number = 5, type?: string, difficulty?: string) => {
    const params = new URLSearchParams({ count: count.toString() });
    if (type) params.set('type', type);
    if (difficulty) params.set('difficulty', difficulty);
    return fetchAPI<{ questions: any[] }>(`/questions/practice/random?${params}`);
  },
};

// ============== Scorecard ==============
// ============== Reports ==============
export const reportService = {
  generate: (candidateId: string, interviewIds: string[]) =>
    fetchAPI<any>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ candidateId, interviewIds }),
    }),

  getReport: (reportId: string) => fetchAPI<any>(`/reports/${reportId}`),

  getCandidateReports: (candidateId: string) =>
    fetchAPI<{ reports: any[] }>(`/reports/candidate/${candidateId}`),

  downloadPDF: async (reportId: string) => {
    const token = await window.Clerk?.session?.getToken();
    const response = await fetch(`${API_URL}/reports/${reportId}/pdf`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!response.ok) throw new Error('PDF download failed');
    const text = await response.text();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${reportId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  },

  downloadCSV: async (reportIds: string[]) => {
    const token = await window.Clerk?.session?.getToken();
    const response = await fetch(`${API_URL}/reports/export/csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ reportIds }),
    });
    if (!response.ok) throw new Error('CSV download failed');
    const text = await response.text();
    const blob = new Blob([text], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  downloadJSON: async (reportIds: string[]) => {
    const token = await window.Clerk?.session?.getToken();
    const response = await fetch(`${API_URL}/reports/export/json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ reportIds }),
    });
    if (!response.ok) throw new Error('JSON download failed');
    const text = await response.text();
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// ==================== Phase 18: AI Agent & Automation ====================

export const agentService = {
  getAgents: () => fetchAPI<{ agents: any[] }>('/agent/agents'),
  getAgent: (name: string) => fetchAPI<any>(`/agent/agents/${name}`),
  createAgent: (config: any) =>
    fetchAPI<any>('/agent/agents', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  updateAgent: (name: string, updates: any) =>
    fetchAPI<any>(`/agent/agents/${name}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  deleteAgent: (name: string) =>
    fetchAPI<{ success: boolean }>(`/agent/agents/${name}`, { method: 'DELETE' }),
  runAgent: (agentName: string, input: any) =>
    fetchAPI<any>('/agent/agents/run', {
      method: 'POST',
      body: JSON.stringify({ agentName, input }),
    }),
  getTasks: (agentId?: string) =>
    fetchAPI<{ tasks: any[] }>(`/agent/tasks${agentId ? `?agentId=${agentId}` : ''}`),
  getTask: (taskId: string) => fetchAPI<any>(`/agent/tasks/${taskId}`),
  getAutomations: () => fetchAPI<{ automations: any[] }>('/agent/automations'),
  getAutomation: (id: string) => fetchAPI<any>(`/agent/automations/${id}`),
  createAutomation: (config: any) =>
    fetchAPI<any>('/agent/automations', { method: 'POST', body: JSON.stringify(config) }),
  updateAutomation: (id: string, updates: any) =>
    fetchAPI<any>(`/agent/automations/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  deleteAutomation: (id: string) =>
    fetchAPI<{ success: boolean }>(`/agent/automations/${id}`, { method: 'DELETE' }),
  runAutomation: (id: string, context?: any) =>
    fetchAPI<any>(`/agent/automations/${id}/run`, { method: 'POST', body: JSON.stringify({ context }) }),
  testAutomation: (id: string, testContext?: any) =>
    fetchAPI<any>(`/agent/automations/${id}/test`, { method: 'POST', body: JSON.stringify({ testContext }) }),
  getRuns: (automationId?: string) =>
    fetchAPI<{ runs: any[] }>(`/agent/runs${automationId ? `?automationId=${automationId}` : ''}`),
  getRun: (runId: string) => fetchAPI<any>(`/agent/runs/${runId}`),
  trigger: (event: string, context?: any) =>
    fetchAPI<any>('/agent/trigger', { method: 'POST', body: JSON.stringify({ event, context }) }),
};


// ============== Phase 10: Infrastructure ==============

export const infrastructureService = {
  getPoolStats: () => fetchAPI<any>('/infrastructure/health/pool'),
  closePool: () => fetchAPI<any>('/infrastructure/health/pool/close', { method: 'POST' }),
  clearCache: (key?: string) =>
    fetchAPI<any>('/infrastructure/cache/clear', {
      method: 'POST',
      body: JSON.stringify({ key }),
    }),
  clearAllCache: () => fetchAPI<any>('/infrastructure/cache/clear-all', { method: 'POST' }),
  invalidateCDN: (pattern: string) =>
    fetchAPI<any>('/infrastructure/cdn/invalidate', {
      method: 'POST',
      body: JSON.stringify({ pattern }),
    }),
  analyzeQuery: (query: string) =>
    fetchAPI<any>('/infrastructure/query/analyze', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
  getQueueSize: () => fetchAPI<any>('/infrastructure/events/queue-size'),
  publishEvent: (event: string, data: any) =>
    fetchAPI<any>('/infrastructure/events/publish', {
      method: 'POST',
      body: JSON.stringify({ event, data }),
    }),
  getSystemInfo: () => fetchAPI<any>('/infrastructure/system/info'),
  getSystemMetrics: () => fetchAPI<any>('/infrastructure/system/metrics'),
};

// ============== Phase 11: Collaboration ==============

export const collaborationService = {
  // Editor
  createEditor: (config: any) =>
    fetchAPI<any>('/collaboration/editor/create', { method: 'POST', body: JSON.stringify(config) }),
  joinEditor: (sessionId: string) =>
    fetchAPI<any>('/collaboration/editor/join', { method: 'POST', body: JSON.stringify({ sessionId }) }),
  leaveEditor: (sessionId: string) =>
    fetchAPI<any>('/collaboration/editor/leave', { method: 'POST', body: JSON.stringify({ sessionId }) }),
  updateEditor: (sessionId: string, content: string) =>
    fetchAPI<any>('/collaboration/editor/update', { method: 'POST', body: JSON.stringify({ sessionId, content }) }),
  getEditorUsers: (sessionId: string) =>
    fetchAPI<any>(`/collaboration/editor/users/${sessionId}`),

  // Whiteboard
  createWhiteboard: (config: any) =>
    fetchAPI<any>('/collaboration/whiteboard/create', { method: 'POST', body: JSON.stringify(config) }),
  joinWhiteboard: (sessionId: string) =>
    fetchAPI<any>('/collaboration/whiteboard/join', { method: 'POST', body: JSON.stringify({ sessionId }) }),
  addElement: (sessionId: string, element: any) =>
    fetchAPI<any>('/collaboration/whiteboard/element', { method: 'POST', body: JSON.stringify({ sessionId, element }) }),
  getWhiteboard: (sessionId: string) =>
    fetchAPI<any>(`/collaboration/whiteboard/${sessionId}`),

  // Video
  createVideoSession: (config: any) =>
    fetchAPI<any>('/collaboration/video/create', { method: 'POST', body: JSON.stringify(config) }),
  joinVideoSession: (sessionId: string) =>
    fetchAPI<any>('/collaboration/video/join', { method: 'POST', body: JSON.stringify({ sessionId }) }),
  leaveVideoSession: (sessionId: string) =>
    fetchAPI<any>('/collaboration/video/leave', { method: 'POST', body: JSON.stringify({ sessionId }) }),
  toggleAudio: (sessionId: string, enabled: boolean) =>
    fetchAPI<any>('/collaboration/video/toggle-audio', { method: 'POST', body: JSON.stringify({ sessionId, enabled }) }),
  toggleVideo: (sessionId: string, enabled: boolean) =>
    fetchAPI<any>('/collaboration/video/toggle-video', { method: 'POST', body: JSON.stringify({ sessionId, enabled }) }),
  getVideoSession: (sessionId: string) =>
    fetchAPI<any>(`/collaboration/video/${sessionId}`),

  // Notes
  createNote: (sessionId: string, content: string) =>
    fetchAPI<any>('/collaboration/note/create', { method: 'POST', body: JSON.stringify({ sessionId, content }) }),
  getNotes: (sessionId: string) =>
    fetchAPI<any>(`/collaboration/notes/${sessionId}`),

  // Voting
  createVote: (sessionId: string, options: string[]) =>
    fetchAPI<any>('/collaboration/vote/create', { method: 'POST', body: JSON.stringify({ sessionId, options }) }),
  castVote: (voteId: string, optionIndex: number) =>
    fetchAPI<any>('/collaboration/vote/cast', { method: 'POST', body: JSON.stringify({ voteId, optionIndex }) }),
  getVotes: (sessionId: string) =>
    fetchAPI<any>(`/collaboration/votes/${sessionId}`),

  // Chat
  sendChatMessage: (sessionId: string, message: string) =>
    fetchAPI<any>('/collaboration/chat/send', { method: 'POST', body: JSON.stringify({ sessionId, message }) }),
  getChatMessages: (sessionId: string) =>
    fetchAPI<any>(`/collaboration/chat/${sessionId}`),
};

// ============== Phase 13: Developer ==============

export const developerService = {
  // GitHub
  getGitHubRepos: (username: string) =>
    fetchAPI<any>('/developer/github/repos', { method: 'POST', body: JSON.stringify({ username }) }),
  getGitHubContents: (config: any, path?: string) =>
    fetchAPI<any>('/developer/github/contents', { method: 'POST', body: JSON.stringify({ ...config, path }) }),
  getGitHubFile: (config: any, filePath: string) =>
    fetchAPI<any>('/developer/github/file', { method: 'POST', body: JSON.stringify({ ...config, filePath }) }),
  createGitHubCommit: (config: any, path: string, content: string, message: string) =>
    fetchAPI<any>('/developer/github/commit', { method: 'POST', body: JSON.stringify({ ...config, path, content, message }) }),
  getGitHubBranches: (config: any) =>
    fetchAPI<any>(`/developer/github/branches?accessToken=${config.accessToken}&owner=${config.owner}&repo=${config.repo}`),
  getGitHubCommits: (config: any, limit?: number) =>
    fetchAPI<any>(`/developer/github/commits?accessToken=${config.accessToken}&owner=${config.owner}&repo=${config.repo}&limit=${limit || 10}`),
  validateGitHubUrl: (url: string) =>
    fetchAPI<any>('/developer/github/validate', { method: 'POST', body: JSON.stringify({ url }) }),

  // GitLab
  getGitLabProjects: (username: string) =>
    fetchAPI<any>('/developer/gitlab/projects', { method: 'POST', body: JSON.stringify({ username }) }),
  getGitLabContents: (config: any, path?: string) =>
    fetchAPI<any>('/developer/gitlab/contents', { method: 'POST', body: JSON.stringify({ ...config, path }) }),
  getGitLabFile: (config: any, filePath: string) =>
    fetchAPI<any>('/developer/gitlab/file', { method: 'POST', body: JSON.stringify({ ...config, filePath }) }),
  validateGitLabUrl: (url: string) =>
    fetchAPI<any>('/developer/gitlab/validate', { method: 'POST', body: JSON.stringify({ url }) }),

  // Code Review
  reviewCode: (code: string, language: string, filename?: string) =>
    fetchAPI<any>('/developer/code-review', { method: 'POST', body: JSON.stringify({ code, language, filename }) }),
  getCodeMetrics: (code: string, language: string) =>
    fetchAPI<any>('/developer/code-metrics', { method: 'POST', body: JSON.stringify({ code, language }) }),
  getRefactorSuggestions: (code: string) =>
    fetchAPI<any>('/developer/code-refactor', { method: 'POST', body: JSON.stringify({ code }) }),

  // Test Runner
  runTests: (code: string, language: string, testCases: any[]) =>
    fetchAPI<any>('/developer/test/run', { method: 'POST', body: JSON.stringify({ code, language, testCases }) }),
  runHiddenTests: (code: string, language: string, testCases: any[]) =>
    fetchAPI<any>('/developer/test/hidden', { method: 'POST', body: JSON.stringify({ code, language, testCases }) }),
  getSupportedLanguages: () =>
    fetchAPI<any>('/developer/languages'),
  generateTestCases: (problemType: string) =>
    fetchAPI<any>('/developer/test/generate', { method: 'POST', body: JSON.stringify({ problemType }) }),
  validateSyntax: (code: string, language: string) =>
    fetchAPI<any>('/developer/syntax/validate', { method: 'POST', body: JSON.stringify({ code, language }) }),
  detectLanguage: (filename: string) =>
    fetchAPI<any>('/developer/language/detect', { method: 'POST', body: JSON.stringify({ filename }) }),

  // Sandbox
  createSandbox: (code: string, language: string, config?: any) =>
    fetchAPI<any>('/developer/sandbox/create', { method: 'POST', body: JSON.stringify({ code, language, ...config }) }),
  executeInSandbox: (sandboxId: string, input?: string) =>
    fetchAPI<any>('/developer/sandbox/execute', { method: 'POST', body: JSON.stringify({ sandboxId, input }) }),
  terminateSandbox: (sandboxId: string) =>
    fetchAPI<any>('/developer/sandbox/terminate', { method: 'POST', body: JSON.stringify({ sandboxId }) }),
  getSandboxStatus: (sandboxId: string) =>
    fetchAPI<any>(`/developer/sandbox/status/${sandboxId}`),
  validateCodeForSandbox: (code: string, language: string) =>
    fetchAPI<any>('/developer/sandbox/validate', { method: 'POST', body: JSON.stringify({ code, language }) }),
  estimateExecutionTime: (codeSize: number, complexity: number, language: string) =>
    fetchAPI<any>('/developer/sandbox/estimate', { method: 'POST', body: JSON.stringify({ codeSize, complexity, language }) }),
};

// ============== Phase 15: Integration ==============

export const integrationService = {
  // HRIS
  validateHRIS: (config: any) =>
    fetchAPI<any>('/integration/hris/validate', { method: 'POST', body: JSON.stringify({ config }) }),
  syncHRIS: (config: any) =>
    fetchAPI<any>('/integration/hris/sync', { method: 'POST', body: JSON.stringify({ config }) }),
  getWorkdayEmployees: (config: any) =>
    fetchAPI<any>('/integration/hris/workday/employees', { method: 'POST', body: JSON.stringify({ config }) }),
  pushCandidateToWorkday: (candidate: any, config: any) =>
    fetchAPI<any>('/integration/hris/workday/candidate', { method: 'POST', body: JSON.stringify({ candidate, config }) }),
  getWorkdayCandidateStatus: (id: string) =>
    fetchAPI<any>(`/integration/hris/workday/candidate/${id}/status`),
  getBambooEmployees: (config: any) =>
    fetchAPI<any>('/integration/hris/bamboo/employees', { method: 'POST', body: JSON.stringify({ config }) }),
  getSAPEmployees: (config: any) =>
    fetchAPI<any>('/integration/hris/sap/employees', { method: 'POST', body: JSON.stringify({ config }) }),

  // Communication
  sendSlackMessage: (webhookUrl: string, message: any) =>
    fetchAPI<any>('/integration/slack/send', { method: 'POST', body: JSON.stringify({ webhookUrl, message }) }),
  createSlackChannel: (name: string, topic?: string) =>
    fetchAPI<any>('/integration/slack/channel', { method: 'POST', body: JSON.stringify({ name, topic }) }),
  addUserToSlackChannel: (channelId: string, userId: string) =>
    fetchAPI<any>('/integration/slack/channel/add-user', { method: 'POST', body: JSON.stringify({ channelId, userId }) }),
  sendSlackNotification: (webhookUrl: string, notification: any) =>
    fetchAPI<any>('/integration/slack/notification', { method: 'POST', body: JSON.stringify({ webhookUrl, notification }) }),
  sendTeamsMessage: (webhookUrl: string, message: any) =>
    fetchAPI<any>('/integration/teams/send', { method: 'POST', body: JSON.stringify({ webhookUrl, message }) }),
  createTeamsChannel: (name: string) =>
    fetchAPI<any>('/integration/teams/channel', { method: 'POST', body: JSON.stringify({ name }) }),
  sendDiscordMessage: (webhookUrl: string, message: any) =>
    fetchAPI<any>('/integration/discord/send', { method: 'POST', body: JSON.stringify({ webhookUrl, message }) }),
  createZoomMeeting: (meeting: any) =>
    fetchAPI<any>('/integration/video/zoom/create', { method: 'POST', body: JSON.stringify(meeting) }),
  getZoomMeeting: (meetingId: string) =>
    fetchAPI<any>(`/integration/video/zoom/${meetingId}`),
  deleteZoomMeeting: (meetingId: string) =>
    fetchAPI<any>(`/integration/video/zoom/${meetingId}`, { method: 'DELETE' }),
  createGoogleMeetEvent: (config: any, event: any) =>
    fetchAPI<any>('/integration/video/google-meet/create', { method: 'POST', body: JSON.stringify({ config, event }) }),
  generateCalendarInvite: (invite: any) =>
    fetchAPI<any>('/integration/calendar/invite', { method: 'POST', body: JSON.stringify(invite) }),

  // Background Checks
  verifyIdentity: (data: any) =>
    fetchAPI<any>('/integration/background/verify-identity', { method: 'POST', body: JSON.stringify({ data }) }),
  initiateBackgroundCheck: (request: any) =>
    fetchAPI<any>('/integration/background/check', { method: 'POST', body: JSON.stringify({ request }) }),
  getBackgroundCheckStatus: (checkId: string) =>
    fetchAPI<any>(`/integration/background/check/${checkId}`),
  verifyEmployment: (data: any) =>
    fetchAPI<any>('/integration/background/verify-employment', { method: 'POST', body: JSON.stringify(data) }),
  verifyEducation: (data: any) =>
    fetchAPI<any>('/integration/background/verify-education', { method: 'POST', body: JSON.stringify(data) }),
  scheduleDrugTest: (candidateId: string, panel: string[]) =>
    fetchAPI<any>('/integration/background/drug-test/schedule', { method: 'POST', body: JSON.stringify({ candidateId, panel }) }),
  getDrugTestResult: (testId: string) =>
    fetchAPI<any>(`/integration/background/drug-test/${testId}`),
  generateComplianceReport: (data: any) =>
    fetchAPI<any>('/integration/compliance/report', { method: 'POST', body: JSON.stringify(data) }),
};

// ============== Phase 16: Mobile ==============

export const mobileService = {
  // Device
  registerDevice: (device: any) =>
    fetchAPI<any>('/mobile/device/register', { method: 'POST', body: JSON.stringify(device) }),
  unregisterDevice: (deviceId: string) =>
    fetchAPI<any>('/mobile/device/unregister', { method: 'POST', body: JSON.stringify({ deviceId }) }),
  listDevices: () => fetchAPI<any>('/mobile/device/list'),
  updateDeviceSettings: (deviceId: string, settings: any) =>
    fetchAPI<any>('/mobile/device/settings', { method: 'PUT', body: JSON.stringify({ deviceId, settings }) }),

  // Notifications
  sendNotification: (userId: string, notification: any) =>
    fetchAPI<any>('/mobile/notification/send', { method: 'POST', body: JSON.stringify({ userId, notification }) }),
  sendBatchNotifications: (notifications: any[]) =>
    fetchAPI<any>('/mobile/notification/batch', { method: 'POST', body: JSON.stringify({ notifications }) }),
  getNotificationTemplates: () => fetchAPI<any>('/mobile/notification/templates'),
  renderTemplate: (templateId: string, data: any) =>
    fetchAPI<any>('/mobile/notification/template/render', { method: 'POST', body: JSON.stringify({ templateId, data }) }),
  scheduleNotification: (userId: string, templateId: string, data: any, scheduledTime: string) =>
    fetchAPI<any>('/mobile/notification/schedule', { method: 'POST', body: JSON.stringify({ userId, templateId, data, scheduledTime }) }),
  getNotificationStats: () => fetchAPI<any>('/mobile/notification/stats'),

  // Offline
  queueOfflineAction: (action: string, payload: any) =>
    fetchAPI<any>('/mobile/offline/action', { method: 'POST', body: JSON.stringify({ action, payload }) }),
  getPendingActions: () => fetchAPI<any>('/mobile/offline/pending'),
  syncOfflineActions: () => fetchAPI<any>('/mobile/offline/sync', { method: 'POST' }),
  saveOfflineData: (dataType: string, data: any, id: string) =>
    fetchAPI<any>('/mobile/offline/data', { method: 'POST', body: JSON.stringify({ dataType, data, id }) }),
  getOfflineData: (dataType: string) => fetchAPI<any>(`/mobile/offline/data/${dataType}`),
  deleteOfflineData: (dataType: string, id: string) =>
    fetchAPI<any>(`/mobile/offline/data/${dataType}/${id}`, { method: 'DELETE' }),
  clearOfflineData: () => fetchAPI<any>('/mobile/offline/clear', { method: 'DELETE' }),
  getOfflineStorage: () => fetchAPI<any>('/mobile/offline/storage'),

  // Mobile Features
  checkVersion: (version: string, minVersion: string) =>
    fetchAPI<any>(`/mobile/version/check?version=${version}&minVersion=${minVersion}`),
  getFeatureFlags: () => fetchAPI<any>('/mobile/features'),
  updateFeatureFlags: (flags: any) =>
    fetchAPI<any>('/mobile/features', { method: 'PUT', body: JSON.stringify(flags) }),
  submitFeedback: (feedback: any) =>
    fetchAPI<any>('/mobile/feedback', { method: 'POST', body: JSON.stringify(feedback) }),
  getLanguages: () => fetchAPI<any>('/mobile/localization/languages'),
  getTimezones: () => fetchAPI<any>('/mobile/localization/timezones'),
  formatDate: (date: string, locale: string, format: string) =>
    fetchAPI<any>('/mobile/localization/format-date', { method: 'POST', body: JSON.stringify({ date, locale, format }) }),
  getCachePolicy: (endpoint: string) => fetchAPI<any>(`/mobile/cache-policy/${endpoint}`),
};

// ============== Phase 17: Observability ==============

export const observabilityService = {
  // Metrics
  getSystemMetrics: () => fetchAPI<any>('/observability/metrics/system'),
  recordMetric: (name: string, value: number, tags?: any) =>
    fetchAPI<any>('/observability/metrics/record', { method: 'POST', body: JSON.stringify({ name, value, tags }) }),

  // Alerts
  getAlertRules: () => fetchAPI<any>('/observability/alerts/rules'),
  createAlertRule: (rule: any) =>
    fetchAPI<any>('/observability/alerts/rules', { method: 'POST', body: JSON.stringify(rule) }),
  updateAlertRule: (id: string, updates: any) =>
    fetchAPI<any>(`/observability/alerts/rules/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  deleteAlertRule: (id: string) =>
    fetchAPI<any>(`/observability/alerts/rules/${id}`, { method: 'DELETE' }),
  checkAlerts: (metrics: any[]) =>
    fetchAPI<any>('/observability/alerts/check', { method: 'POST', body: JSON.stringify({ metrics }) }),
  getActiveAlerts: () => fetchAPI<any>('/observability/alerts/active'),
  resolveAlert: (alertId: string) =>
    fetchAPI<any>(`/observability/alerts/${alertId}/resolve`, { method: 'POST' }),

  // Uptime
  getUptimeChecks: () => fetchAPI<any>('/observability/uptime'),
  createUptimeCheck: (check: any) =>
    fetchAPI<any>('/observability/uptime', { method: 'POST', body: JSON.stringify(check) }),
  runUptimeCheck: (checkId: string) =>
    fetchAPI<any>(`/observability/uptime/${checkId}/run`, { method: 'POST' }),

  // Logs
  createLogEntry: (entry: any) =>
    fetchAPI<any>('/observability/logs', { method: 'POST', body: JSON.stringify(entry) }),
  queryLogs: (filters?: any) =>
    fetchAPI<any>(`/observability/logs?${new URLSearchParams(filters || {}).toString()}`),
  aggregateLogs: (startDate: string, endDate: string) =>
    fetchAPI<any>(`/observability/logs/aggregate?startDate=${startDate}&endDate=${endDate}`),
  getLogStats: (startDate: string, endDate: string) =>
    fetchAPI<any>(`/observability/logs/stats?startDate=${startDate}&endDate=${endDate}`),
  exportLogs: (format: string, filters?: any) =>
    fetchAPI<any>('/observability/logs/export', { method: 'POST', body: JSON.stringify({ format, ...filters }) }),

  // Tracing
  startTrace: (traceId: string, spanName: string, service: string, parentSpanId?: string) =>
    fetchAPI<any>('/observability/tracing/start', { method: 'POST', body: JSON.stringify({ traceId, spanName, service, parentSpanId }) }),
  endTrace: (traceId: string, spanId: string, status?: string) =>
    fetchAPI<any>('/observability/tracing/end', { method: 'POST', body: JSON.stringify({ traceId, spanId, status }) }),
  getTrace: (traceId: string) => fetchAPI<any>(`/observability/tracing/${traceId}`),
  addSpanLog: (traceId: string, spanId: string, message: string) =>
    fetchAPI<any>('/observability/tracing/log', { method: 'POST', body: JSON.stringify({ traceId, spanId, message }) }),

  // Health
  healthCheck: () => fetchAPI<any>('/observability/health'),
  readinessCheck: () => fetchAPI<any>('/observability/health/ready'),
  livenessCheck: () => fetchAPI<any>('/observability/health/live'),
};

// ============== AI Feedback Service ==============
export const feedbackService = {
  generateFeedback: (data: {
    candidateName: string;
    role: string;
    interviewDate: string;
    messages: { role: string; content: string; timestamp?: string }[];
    questions: { question: string; type: string; difficulty?: string }[];
    scores?: { technical?: number; communication?: number; problemSolving?: number; overall?: number };
    interviewerPersona?: string;
    language?: string;
  }) =>
    fetchAPI<any>('/feedback/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ============== Code Evaluation Service ==============
export const codeEvaluationService = {
  evaluateCode: (data: {
    code: string;
    language: string;
    problemStatement: string;
    testCases?: { input: string; expectedOutput: string }[];
    candidateName?: string;
  }) =>
    fetchAPI<any>('/code-evaluation/evaluate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const interviewService = {
  reject: (interviewId: string, reason?: string) =>
    fetchAPI<any>('/interview/reject', {
      method: 'POST',
      body: JSON.stringify({ interviewId, reason }),
    }),

  sendOffer: (interviewId: string, companyName: string, responseDeadline: string) =>
    fetchAPI<any>('/interview/offer', {
      method: 'POST',
      body: JSON.stringify({ interviewId, companyName, responseDeadline }),
    }),
};