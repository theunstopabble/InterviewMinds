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

// ============== Resume Verification ==============
export const resumeVerificationService = {
  verify: (resumeId: string, targetRole?: string) =>
    fetchAPI<any>('/resume-verification/verify', {
      method: 'POST',
      body: JSON.stringify({ resumeId, targetRole }),
    }),

  getResults: (verificationId: string) =>
    fetchAPI<any>(`/resume-verification/${verificationId}`),
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
  logAudit: (userId: string, action: string, resource: string, details?: any) =>
    fetchAPI<any>('/compliance/audit', {
      method: 'POST',
      body: JSON.stringify({ userId, action, resource, details }),
    }),

  queryAudit: (filters: any) => {
    const params = new URLSearchParams(filters).toString();
    return fetchAPI<{ logs: any[]; count: number }>(`/compliance/audit?${params}`, {
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

  checkConsent: (userId: string, consentType: string) =>
    fetchAPI<{ userId: string; consentType: string; hasConsent: boolean }>('/compliance/consent/check', {
      method: 'POST',
      body: JSON.stringify({ userId, consentType }),
    }),

  createDataRequest: (userId: string, type: 'access' | 'deletion' | 'rectification' | 'portability') =>
    fetchAPI<{ success: boolean; request: any }>('/compliance/data-request', {
      method: 'POST',
      body: JSON.stringify({ userId, type }),
    }),

  getDataRequests: (userId: string) =>
    fetchAPI<{ userId: string; requests: any[] }>(`/compliance/data-request/${userId}`),

  exportData: (userId: string) => fetchAPI<any>(`/compliance/export/${userId}`),

  deleteData: (userId: string) =>
    fetchAPI<{ deleted: boolean; removedData: string[] }>(`/compliance/delete/${userId}`, {
      method: 'DELETE',
    }),

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

  predict: (candidateId: string, interviewId: string) =>
    fetchAPI<any>('/analytics/predict', {
      method: 'POST',
      body: JSON.stringify({ candidateId, interviewId }),
    }),

  getPipeline: (tenantId?: string) => fetchAPI<any>(`/analytics/pipeline${tenantId ? `?tenantId=${tenantId}` : ''}`),

  getTrainingRecommendations: (candidateId: string) =>
    fetchAPI<{ candidateId: string; recommendations: any[] }>(`/analytics/training/${candidateId}`),

  getReport: (type: 'summary' | 'detailed' | 'export') =>
    fetchAPI<any>(`/analytics/report/${type}`),
};