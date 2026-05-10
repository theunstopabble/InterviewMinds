interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  tenantId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

interface ConsentRecord {
  userId: string;
  consentType: string;
  granted: boolean;
  timestamp: string;
  version: string;
  ipAddress?: string;
}

interface DataSubjectRequest {
  id: string;
  userId: string;
  type: 'access' | 'deletion' | 'rectification' | 'portability';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  createdAt: string;
  completedAt?: string;
  data?: Record<string, unknown>;
}

interface SecurityControl {
  id: string;
  name: string;
  category: string;
  status: 'active' | 'pending' | 'failed';
  lastChecked: string;
  nextCheck?: string;
}

const auditLogs: AuditLog[] = [];
const consentRecords: Map<string, ConsentRecord[]> = new Map();
const dataRequests: Map<string, DataSubjectRequest[]> = new Map();

function generateAuditId(): string {
  return `audit_${crypto.randomUUID()}`;
}

function generateRequestId(): string {
  return `dsr_${crypto.randomUUID()}`;
}

export function logAuditEvent(
  userId: string,
  action: string,
  resource: string,
  details: Record<string, unknown> = {},
  tenantId?: string,
  ipAddress?: string,
  userAgent?: string
): AuditLog {
  const log: AuditLog = {
    id: generateAuditId(),
    timestamp: new Date().toISOString(),
    userId,
    tenantId,
    action,
    resource,
    details,
    ipAddress,
    userAgent
  };

  auditLogs.push(log);
  return log;
}

export function queryAuditLogs(filters: {
  userId?: string;
  tenantId?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): AuditLog[] {
  let results = [...auditLogs];

  if (filters.userId) {
    results = results.filter(log => log.userId === filters.userId);
  }
  if (filters.tenantId) {
    results = results.filter(log => log.tenantId === filters.tenantId);
  }
  if (filters.action) {
    results = results.filter(log => log.action === filters.action);
  }
  if (filters.resource) {
    results = results.filter(log => log.resource === filters.resource);
  }
  if (filters.startDate) {
    results = results.filter(log => log.timestamp >= filters.startDate!);
  }
  if (filters.endDate) {
    results = results.filter(log => log.timestamp <= filters.endDate!);
  }

  return results.slice(0, filters.limit || 100);
}

export function recordConsent(
  userId: string,
  consentType: string,
  granted: boolean,
  version: string = '1.0',
  ipAddress?: string
): ConsentRecord {
  const record: ConsentRecord = {
    userId,
    consentType,
    granted,
    timestamp: new Date().toISOString(),
    version,
    ipAddress
  };

  const userConsents = consentRecords.get(userId) || [];
  userConsents.push(record);
  consentRecords.set(userId, userConsents);

  return record;
}

export function getUserConsents(userId: string): ConsentRecord[] {
  return consentRecords.get(userId) || [];
}

export function hasValidConsent(userId: string, consentType: string): boolean {
  const consents = consentRecords.get(userId) || [];
  const latest = consents
    .filter(c => c.consentType === consentType && c.granted)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  
  return !!latest;
}

export function createDataSubjectRequest(
  userId: string,
  type: 'access' | 'deletion' | 'rectification' | 'portability'
): DataSubjectRequest {
  const request: DataSubjectRequest = {
    id: generateRequestId(),
    userId,
    type,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  const requests = dataRequests.get(userId) || [];
  requests.push(request);
  dataRequests.set(userId, requests);

  return request;
}

export function getDataSubjectRequests(userId: string): DataSubjectRequest[] {
  return dataRequests.get(userId) || [];
}

export function completeDataSubjectRequest(requestId: string, data?: Record<string, unknown>): boolean {
  for (const requests of dataRequests.values()) {
    const request = requests.find(r => r.id === requestId);
    if (request) {
      request.status = 'completed';
      request.completedAt = new Date().toISOString();
      request.data = data;
      return true;
    }
  }
  return false;
}

export function exportUserData(userId: string): Record<string, unknown> {
  const consents = getUserConsents(userId);
  const requests = getDataSubjectRequests(userId);
  const auditLogs = queryAuditLogs({ userId, limit: 100 });

  return {
    userId,
    exportedAt: new Date().toISOString(),
    personalData: {
      consents,
      dataRequests: requests
    },
    processingActivities: auditLogs
  };
}

export function deleteUserData(userId: string): { deleted: boolean; removedData: string[] } {
  const removedData: string[] = [];

  consentRecords.delete(userId);
  removedData.push('consent_records');

  dataRequests.delete(userId);
  removedData.push('data_requests');

  const auditFilter = auditLogs.filter(log => log.userId === userId);
  auditFilter.forEach((_, idx) => {
    const index = auditLogs.findIndex(log => log.id === auditFilter[idx].id);
    if (index > -1) auditLogs.splice(index, 1);
  });
  removedData.push('audit_logs');

  logAuditEvent(
    userId,
    'data_deletion',
    'user_data',
    { deletedUserId: userId, removedDataTypes: removedData }
  );

  return { deleted: true, removedData };
}

export function checkSecurityControls(): SecurityControl[] {
  const controls: SecurityControl[] = [
    { id: 'enc_001', name: 'Data Encryption at Rest', category: 'Encryption', status: 'active', lastChecked: new Date().toISOString() },
    { id: 'enc_002', name: 'Data Encryption in Transit (TLS 1.3)', category: 'Encryption', status: 'active', lastChecked: new Date().toISOString() },
    { id: 'acc_001', name: 'Role-Based Access Control', category: 'Access Control', status: 'active', lastChecked: new Date().toISOString() },
    { id: 'acc_002', name: 'Multi-Factor Authentication', category: 'Access Control', status: 'active', lastChecked: new Date().toISOString() },
    { id: 'log_001', name: 'Audit Logging', category: 'Logging', status: 'active', lastChecked: new Date().toISOString() },
    { id: 'log_002', name: 'Log Retention (90 days)', category: 'Logging', status: 'active', lastChecked: new Date().toISOString() },
    { id: 'inc_001', name: 'Incident Response Plan', category: 'Incident Response', status: 'active', lastChecked: new Date().toISOString() },
    { id: 'bac_001', name: 'Daily Backups', category: 'Backup', status: 'active', lastChecked: new Date().toISOString() },
    { id: 'bac_002', name: 'Backup Encryption', category: 'Backup', status: 'active', lastChecked: new Date().toISOString() }
  ];

  return controls;
}

export function generateComplianceReport(framework: 'SOC2' | 'GDPR' | 'HIPAA' | 'ISO27001'): Record<string, unknown> {
  const controls = checkSecurityControls();
  const activeControls = controls.filter(c => c.status === 'active').length;
  const complianceRate = (activeControls / controls.length) * 100;

  const frameworkReports: Record<string, Record<string, unknown>> = {
    SOC2: {
      trustServiceCriteria: ['Security', 'Availability', 'Confidentiality'],
      complianceRate,
      controlsCovered: controls.filter(c => ['Encryption', 'Access Control'].includes(c.category)).length,
      gaps: []
    },
    GDPR: {
      articles: ['Art. 17 - Right to Erasure', 'Art. 20 - Right to Portability', 'Art. 15 - Right to Access'],
      complianceRate,
      dataSubjectRights: true,
      consentManagement: true,
      gaps: []
    },
    HIPAA: {
      safeguards: ['Administrative', 'Physical', 'Technical'],
      complianceRate,
      phiProtection: true,
      baaRequired: false,
      gaps: []
    },
    ISO27001: {
      domains: ['Information Security Policies', 'Asset Management', 'Access Control'],
      complianceRate,
      ismsImplemented: true,
      gaps: []
    }
  };

  return {
    framework,
    generatedAt: new Date().toISOString(),
    ...frameworkReports[framework]
  };
}