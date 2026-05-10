import { Router } from 'express';
import { 
  logAuditEvent, 
  queryAuditLogs, 
  recordConsent, 
  getUserConsents, 
  hasValidConsent,
  createDataSubjectRequest,
  getDataSubjectRequests,
  completeDataSubjectRequest,
  exportUserData,
  deleteUserData,
  checkSecurityControls,
  generateComplianceReport
} from '../lib/compliance';

const router = Router();

router.post('/audit', async (req, res) => {
  try {
    const { userId, action, resource, details, tenantId, ipAddress, userAgent } = req.body;

    if (!userId || !action || !resource) {
      res.status(400).json({ error: 'userId, action, and resource are required' });
      return;
    }

    const auditLog = logAuditEvent(userId, action, resource, details, tenantId, ipAddress, userAgent);

    res.json({ success: true, auditLog });
  } catch (error) {
    console.error('Error logging audit event:', error);
    res.status(500).json({ error: 'Failed to log audit event' });
  }
});

router.get('/audit', async (req, res) => {
  try {
    const filters = {
      userId: req.query.userId as string,
      tenantId: req.query.tenantId as string,
      action: req.query.action as string,
      resource: req.query.resource as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    };

    const logs = queryAuditLogs(filters);

    res.json({ logs, count: logs.length });
  } catch (error) {
    console.error('Error querying audit logs:', error);
    res.status(500).json({ error: 'Failed to query audit logs' });
  }
});

router.post('/consent', async (req, res) => {
  try {
    const { userId, consentType, granted, version, ipAddress } = req.body;

    if (!userId || !consentType) {
      res.status(400).json({ error: 'userId and consentType are required' });
      return;
    }

    const record = recordConsent(userId, consentType, granted, version, ipAddress);

    res.json({ success: true, record });
  } catch (error) {
    console.error('Error recording consent:', error);
    res.status(500).json({ error: 'Failed to record consent' });
  }
});

router.get('/consent/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const consents = getUserConsents(userId);

    res.json({ userId, consents });
  } catch (error) {
    console.error('Error fetching consents:', error);
    res.status(500).json({ error: 'Failed to fetch consents' });
  }
});

router.post('/consent/check', async (req, res) => {
  try {
    const { userId, consentType } = req.body;

    if (!userId || !consentType) {
      res.status(400).json({ error: 'userId and consentType are required' });
      return;
    }

    const hasConsent = hasValidConsent(userId, consentType);

    res.json({ userId, consentType, hasConsent });
  } catch (error) {
    console.error('Error checking consent:', error);
    res.status(500).json({ error: 'Failed to check consent' });
  }
});

router.post('/data-request', async (req, res) => {
  try {
    const { userId, type } = req.body;

    if (!userId || !type) {
      res.status(400).json({ error: 'userId and type are required' });
      return;
    }

    const validTypes = ['access', 'deletion', 'rectification', 'portability'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: 'Invalid request type' });
      return;
    }

    const request = createDataSubjectRequest(userId, type);

    res.status(201).json({ success: true, request });
  } catch (error) {
    console.error('Error creating data subject request:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

router.get('/data-request/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const requests = getDataSubjectRequests(userId);

    res.json({ userId, requests });
  } catch (error) {
    console.error('Error fetching data requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

router.post('/data-request/:requestId/complete', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { data } = req.body;

    const success = completeDataSubjectRequest(requestId, data);

    if (!success) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error completing data request:', error);
    res.status(500).json({ error: 'Failed to complete request' });
  }
});

router.post('/export/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const data = exportUserData(userId);

    res.json(data);
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

router.delete('/delete/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = deleteUserData(userId);

    res.json(result);
  } catch (error) {
    console.error('Error deleting user data:', error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

router.get('/security-controls', async (req, res) => {
  try {
    const controls = checkSecurityControls();

    res.json({ controls, count: controls.length });
  } catch (error) {
    console.error('Error checking security controls:', error);
    res.status(500).json({ error: 'Failed to check controls' });
  }
});

router.get('/report/:framework', async (req, res) => {
  try {
    const { framework } = req.params;
    const validFrameworks = ['SOC2', 'GDPR', 'HIPAA', 'ISO27001'];

    if (!validFrameworks.includes(framework)) {
      res.status(400).json({ error: 'Invalid framework' });
      return;
    }

    const report = generateComplianceReport(framework as 'SOC2' | 'GDPR' | 'HIPAA' | 'ISO27001');

    res.json(report);
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;