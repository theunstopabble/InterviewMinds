import { Router } from 'express';
import { logger } from '../lib/logger';
import { validateIP, getSecurityConfig } from '../lib/geoFencing';

const router = Router();

interface IPValidationRequest {
  ip: string;
  config?: {
    allowedIPs?: string[];
    blockedIPs?: string[];
    allowedCountries?: string[];
    blockedCountries?: string[];
    vpnDetection?: boolean;
    proxyDetection?: boolean;
    datacenterIPBlock?: boolean;
  };
}

router.post('/validate', async (req, res) => {
  try {
    const body = req.body as IPValidationRequest;

    if (!body.ip) {
      res.status(400).json({ error: 'IP address is required' });
      return;
    }

    const result = await validateIP(body.ip, body.config);

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error validating IP:');
    res.status(500).json({ error: 'Failed to validate IP address' });
  }
});

router.get('/config', async (req, res) => {
  try {
    const config = getSecurityConfig();
    res.json({
      allowedCountries: config.allowedCountries,
      blockedCountries: config.blockedCountries,
      vpnDetection: config.vpnDetection,
      proxyDetection: config.proxyDetection,
      datacenterIPBlock: config.datacenterIPBlock
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching security config:');
    res.status(500).json({ error: 'Failed to fetch security config' });
  }
});

router.get('/my-ip', async (req, res) => {
  try {
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    const result = await validateIP(clientIP);
    res.json({
      ip: clientIP,
      ...result
    });
  } catch (error) {
    logger.error({ err: error }, 'Error getting IP info:');
    res.status(500).json({ error: 'Failed to get IP information' });
  }
});

export default router;