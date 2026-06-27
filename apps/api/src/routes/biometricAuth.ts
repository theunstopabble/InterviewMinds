import { Router } from 'express';
import { logger } from '../lib/logger';
import {
  enrollFace,
  enrollVoice,
  enrollFingerprint,
  verifyFace,
  verifyVoice,
  verifyFingerprint,
  getEnrollmentStatus,
  removeBiometricEnrollment,
  checkRateLimit,
  getDefaultSettings
} from '../lib/biometricAuth';

const router = Router();

interface EnrollRequest {
  userId: string;
  type: 'face' | 'voice' | 'fingerprint';
  data: number[];
}

interface VerifyRequest {
  userId: string;
  type: 'face' | 'voice' | 'fingerprint';
  data: number[];
  sessionData?: Record<string, unknown>;
}

router.get('/settings', async (req, res) => {
  try {
    const settings = getDefaultSettings();
    res.json(settings);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching settings:');
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.post('/enroll', async (req, res) => {
  try {
    const body = req.body as EnrollRequest;

    if (!body.userId || !body.type || !body.data) {
      res.status(400).json({ error: 'userId, type, and data are required' });
      return;
    }

    const validTypes = ['face', 'voice', 'fingerprint'];
    if (!validTypes.includes(body.type)) {
      res.status(400).json({ error: 'Invalid biometric type' });
      return;
    }

    let template;
    switch (body.type) {
      case 'face':
        template = await enrollFace(body.userId, body.data);
        break;
      case 'voice':
        template = await enrollVoice(body.userId, body.data);
        break;
      case 'fingerprint':
        template = await enrollFingerprint(body.userId, body.data);
        break;
    }

    res.json({ success: true, template });
  } catch (error) {
    logger.error({ err: error }, 'Error enrolling biometric:');
    res.status(500).json({ error: 'Failed to enroll biometric' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const body = req.body as VerifyRequest;

    if (!body.userId || !body.type || !body.data) {
      res.status(400).json({ error: 'userId, type, and data are required' });
      return;
    }

    if (!checkRateLimit(body.userId)) {
      res.status(429).json({ error: 'Too many verification attempts. Please try again later.' });
      return;
    }

    let result;
    switch (body.type) {
      case 'face':
        result = await verifyFace(body.userId, body.data, body.sessionData);
        break;
      case 'voice':
        result = await verifyVoice(body.userId, body.data);
        break;
      case 'fingerprint':
        result = await verifyFingerprint(body.userId, body.data);
        break;
    }

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error verifying biometric:');
    res.status(500).json({ error: 'Failed to verify biometric' });
  }
});

router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const status = await getEnrollmentStatus(userId);

    if (!status) {
      res.json({ userId, enrolled: false });
      return;
    }

    res.json({
      userId,
      enrolled: true,
      status: status.status,
      enrolledTypes: [
        status.faceTemplate && 'face',
        status.voiceTemplate && 'voice',
        status.fingerprintTemplate && 'fingerprint'
      ].filter(Boolean)
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching enrollment status:');
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

router.delete('/enrollment/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.query as { type?: 'face' | 'voice' | 'fingerprint' };

    if (!type) {
      res.status(400).json({ error: 'Biometric type is required' });
      return;
    }

    const success = await removeBiometricEnrollment(userId, type);

    if (!success) {
      res.status(404).json({ error: 'Enrollment not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Error removing enrollment:');
    res.status(500).json({ error: 'Failed to remove enrollment' });
  }
});

export default router;
