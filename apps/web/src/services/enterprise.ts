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

// ============== Scheduling ==============
export const schedulingService = {
  getTimezones: () => fetchAPI<string[]>('/scheduling/timezones'),

  getUserTimezone: () => fetchAPI<string>('/scheduling/user-timezone'),

  getAvailableSlots: (interviewerId: string, date: string, timezone: string) =>
    fetchAPI<{ slots: any[] }>(`/scheduling/slots/${interviewerId}?date=${date}&timezone=${timezone}`),

  bookSlot: (interviewerId: string, slotId: string, interviewType: 'live' | 'async' | 'take-home') =>
    fetchAPI<any>('/scheduling/book', {
      method: 'POST',
      body: JSON.stringify({ interviewerId, slotId, interviewType }),
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

  getSchedule: (interviewerId: string) =>
    fetchAPI<{ interviews: any[] }>(`/scheduling/schedule/${interviewerId}`),
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
};

// ============== Scorecard ==============
export const scorecardService = {
  getTemplates: (role?: string) =>
    fetchAPI<{ templates: any[] }>(`/scorecard/templates${role ? `?role=${role}` : ''}`),

  getTemplate: (id: string) => fetchAPI<any>(`/scorecard/templates/${id}`),

  createTemplate: (data: any) =>
    fetchAPI<any>('/scorecard/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createScorecard: (interviewId: string, templateId: string) =>
    fetchAPI<any>('/scorecard', {
      method: 'POST',
      body: JSON.stringify({ interviewId, templateId }),
    }),

  getScorecard: (id: string) => fetchAPI<any>(`/scorecard/${id}`),

  updateScore: (scorecardId: string, criterionId: string, score: number, comments: string) =>
    fetchAPI<any>(`/scorecard/${scorecardId}/score`, {
      method: 'POST',
      body: JSON.stringify({ criterionId, score, comments }),
    }),

  addNote: (scorecardId: string, content: string, timestamp: number, category: string) =>
    fetchAPI<any>(`/scorecard/${scorecardId}/note`, {
      method: 'POST',
      body: JSON.stringify({ content, timestamp, category }),
    }),

  submit: (id: string) =>
    fetchAPI<any>(`/scorecard/${id}/submit`, { method: 'POST' }),

  getInterviewScorecards: (interviewId: string) =>
    fetchAPI<{ scorecards: any[] }>(`/scorecard/interview/${interviewId}`),
};

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

  downloadPDF: (reportId: string) =>
    fetchAPI<any>(`/reports/${reportId}/pdf`),

  downloadCSV: (reportIds: string[]) =>
    fetchAPI<string>('/reports/export/csv', {
      method: 'POST',
      body: JSON.stringify({ reportIds }),
    }),

  downloadJSON: (reportIds: string[]) =>
    fetchAPI<string>('/reports/export/json', {
      method: 'POST',
      body: JSON.stringify({ reportIds }),
    }),
};

// ============== Async Video ==============
export const asyncVideoService = {
  create: (data: any) =>
    fetchAPI<any>('/async-video/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  send: (interviewId: string) =>
    fetchAPI<any>(`/async-video/${interviewId}/send`, { method: 'POST' }),

  start: (interviewId: string) =>
    fetchAPI<any>(`/async-video/${interviewId}/start`, { method: 'POST' }),

  saveAnswer: (interviewId: string, questionId: string, answer: any) =>
    fetchAPI<any>(`/async-video/${interviewId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ questionId, answer }),
    }),

  complete: (interviewId: string) =>
    fetchAPI<any>(`/async-video/${interviewId}/complete`, { method: 'POST' }),

  getInterview: (id: string) => fetchAPI<any>(`/async-video/${id}`),

  getPending: () => fetchAPI<{ interviews: any[] }>('/async-video/pending'),

  getCompleted: () => fetchAPI<{ interviews: any[] }>('/async-video/completed'),

  getProgress: (interviewId: string) =>
    fetchAPI<{ answered: number; total: number; percentage: number }>(`/async-video/${interviewId}/progress`),
};

// ============== Take-home Challenges ==============
export const takeHomeService = {
  create: (data: any) =>
    fetchAPI<any>('/take-home/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  invite: (challengeId: string, candidateEmail: string) =>
    fetchAPI<any>(`/take-home/${challengeId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ candidateEmail }),
    }),

  bulkInvite: (challengeId: string, candidates: { id: string; email: string }[]) =>
    fetchAPI<any>(`/take-home/${challengeId}/bulk-invite`, {
      method: 'POST',
      body: JSON.stringify({ candidates }),
    }),

  start: (inviteId: string) =>
    fetchAPI<any>(`/take-home/${inviteId}/start`, { method: 'POST' }),

  submit: (challengeId: string, answers: any[]) =>
    fetchAPI<any>(`/take-home/${challengeId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),

  getChallenge: (id: string) => fetchAPI<any>(`/take-home/${id}`),

  getPending: () => fetchAPI<{ challenges: any[] }>('/take-home/pending'),

  getSubmitted: () => fetchAPI<{ challenges: any[] }>('/take-home/submitted'),

  getStats: (challengeId: string) =>
    fetchAPI<{ stats: any }>(`/take-home/${challengeId}/stats`),
};

// ============== Preparation Mode ==============
export const preparationService = {
  checkSystem: () => fetchAPI<any>('/preparation/system-check'),

  startSession: (role: string) =>
    fetchAPI<any>('/preparation/start', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  getSession: (sessionId: string) => fetchAPI<any>(`/preparation/session/${sessionId}`),

  completeSession: (sessionId: string) =>
    fetchAPI<any>(`/preparation/session/${sessionId}/complete`, { method: 'POST' }),

  getBreakTimer: (interviewId: string) => fetchAPI<any>(`/preparation/break-timer/${interviewId}`),

  startBreakTimer: (interviewId: string, totalDuration: number, breakDuration: number) =>
    fetchAPI<any>('/preparation/break-timer/start', {
      method: 'POST',
      body: JSON.stringify({ interviewId, totalDuration, breakDuration }),
    }),

  takeBreak: (interviewId: string) =>
    fetchAPI<any>(`/preparation/break-timer/${interviewId}/take-break`, { method: 'POST' }),
};

// ============== Mock Interview ==============
export const mockInterviewService = {
  create: (role: string, difficulty: string, questionCount: number) =>
    fetchAPI<any>('/mock-interview/create', {
      method: 'POST',
      body: JSON.stringify({ role, difficulty, questionCount }),
    }),

  start: (mockId: string) =>
    fetchAPI<any>(`/mock-interview/${mockId}/start`, { method: 'POST' }),

  submitAnswer: (mockId: string, questionId: string, answer: string, code?: string) =>
    fetchAPI<any>(`/mock-interview/${mockId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ questionId, answer, code }),
    }),

  complete: (mockId: string) =>
    fetchAPI<any>(`/mock-interview/${mockId}/complete`, { method: 'POST' }),

  getFeedback: (mockId: string) => fetchAPI<any>(`/mock-interview/${mockId}/feedback`),

  getMyMocks: () => fetchAPI<{ mocks: any[] }>('/mock-interview/my-mocks'),
};

// ============== Panel Interview ==============
export const panelInterviewService = {
  create: (data: any) =>
    fetchAPI<any>('/panel-interview/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (panelId: string) => fetchAPI<any>(`/panel-interview/${panelId}`),

  addPanelist: (panelId: string, panelist: any) =>
    fetchAPI<any>(`/panel-interview/${panelId}/panelist`, {
      method: 'POST',
      body: JSON.stringify(panelist),
    }),

  join: (panelId: string, panelistId: string) =>
    fetchAPI<any>(`/panel-interview/${panelId}/join`, {
      method: 'POST',
      body: JSON.stringify({ panelistId }),
    }),

  sendMessage: (panelId: string, content: string, isPrivate: boolean) =>
    fetchAPI<any>(`/panel-interview/${panelId}/message`, {
      method: 'POST',
      body: JSON.stringify({ content, isPrivate }),
    }),

  submitScore: (panelId: string, score: number, feedback: string) =>
    fetchAPI<any>(`/panel-interview/${panelId}/score`, {
      method: 'POST',
      body: JSON.stringify({ score, feedback }),
    }),

  complete: (panelId: string) =>
    fetchAPI<any>(`/panel-interview/${panelId}/complete`, { method: 'POST' }),
};

// ============== AI Analysis ==============
export const aiAnalysisService = {
  getConfidence: (evaluationId: string) => fetchAPI<any>(`/ai-analysis/confidence/${evaluationId}`),

  getComparative: (candidateId: string, role: string) =>
    fetchAPI<any>(`/ai-analysis/comparative`, {
      method: 'POST',
      body: JSON.stringify({ candidateId, role }),
    }),

  getSkillRadar: (candidateId: string) => fetchAPI<any>(`/ai-analysis/skill-radar/${candidateId}`),

  analyzeSentiment: (text: string) =>
    fetchAPI<any>('/ai-analysis/sentiment', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
};

// ============== Notifications ==============
export const notificationService = {
  send: (userId: string, type: string, channel: string, title: string, message: string, data?: any) =>
    fetchAPI<any>('/notifications/send', {
      method: 'POST',
      body: JSON.stringify({ userId, type, channel, title, message, data }),
    }),

  sendTemplated: (templateId: string, variables: any) =>
    fetchAPI<any>('/notifications/send-template', {
      method: 'POST',
      body: JSON.stringify({ templateId, variables }),
    }),

  getTemplates: () => fetchAPI<{ templates: any[] }>('/notifications/templates'),

  getUserNotifications: (unreadOnly: boolean) =>
    fetchAPI<{ notifications: any[] }>(`/notifications/my${unreadOnly ? '?unread=true' : ''}`),

  markAsRead: (notificationId: string) =>
    fetchAPI<any>(`/notifications/${notificationId}/read`, { method: 'POST' }),

  getUnreadCount: () => fetchAPI<{ count: number }>('/notifications/unread-count'),
};

// ============== Resume Screener ==============
export const resumeScreenerService = {
  screen: (resumeId: string, targetRole: string, resumeText: string) =>
    fetchAPI<any>('/resume-screener/screen', {
      method: 'POST',
      body: JSON.stringify({ resumeId, targetRole, resumeText }),
    }),

  getResult: (resultId: string) => fetchAPI<any>(`/resume-screener/result/${resultId}`),

  getCandidateResults: (candidateId: string) =>
    fetchAPI<{ results: any[] }>(`/resume-screener/candidate/${candidateId}`),
};

// ============== SQL Challenges ==============
export const sqlChallengeService = {
  getChallenges: (filters?: { difficulty?: string; category?: string }) => {
    const params = new URLSearchParams();
    if (filters?.difficulty) params.set('difficulty', filters.difficulty);
    if (filters?.category) params.set('category', filters.category);
    return fetchAPI<{ challenges: any[] }>(`/sql-challenges?${params}`);
  },

  getChallenge: (id: string) => fetchAPI<any>(`/sql-challenges/${id}`),

  submitQuery: (challengeId: string, query: string) =>
    fetchAPI<any>(`/sql-challenges/${challengeId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  getStats: (challengeId: string) => fetchAPI<any>(`/sql-challenges/${challengeId}/stats`),
};

// ============== Git Integration ==============
export const gitIntegrationService = {
  connect: (accessToken: string) =>
    fetchAPI<any>('/git/connect', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    }),

  disconnect: () => fetchAPI<any>('/git/disconnect', { method: 'POST' }),

  getRepositories: () => fetchAPI<{ repositories: any[] }>('/git/repositories'),

  analyzeRepository: (repoId: number) =>
    fetchAPI<any>(`/git/repositories/${repoId}/analyze`, { method: 'POST' }),

  getAnalysis: (repoId: number) => fetchAPI<any>(`/git/repositories/${repoId}/analysis`),

  getReport: () => fetchAPI<any>('/git/report'),
};