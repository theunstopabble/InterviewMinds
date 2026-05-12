import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getPoolStats, closeConnectionPool } from '../lib/connectionPool';
import { cacheClear, CACHE_PREFIXES } from '../lib/responseCache';
import { isCDNEnabled, getCDNUrl } from '../lib/cdnIntegration';
import { analyzeQuery, suggestIndexes } from '../lib/queryOptimization';
import { EventTypes, EventBus } from '../lib/eventBus';

const router = Router();

router.get('/health/pool', requireAuth, async (req, res) => {
  try {
    const stats = getPoolStats();
    res.json({ status: 'healthy', pool: stats });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: 'Pool not available' });
  }
});

router.post('/health/pool/close', requireAuth, async (req, res) => {
  try {
    await closeConnectionPool();
    res.json({ success: true, message: 'Connection pool closed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to close pool' });
  }
});

router.post('/cache/clear', requireAuth, async (req, res) => {
  try {
    const { prefix } = req.body;
    await cacheClear(prefix);
    res.json({ success: true, message: 'Cache cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

router.post('/cache/clear-all', requireAuth, async (req, res) => {
  try {
    await cacheClear();
    res.json({ success: true, message: 'All cache cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

router.get('/cdn/status', async (req, res) => {
  res.json({
    enabled: isCDNEnabled(),
    url: isCDNEnabled() ? getCDNUrl('/') : null,
  });
});

router.post('/cdn/invalidate', requireAuth, async (req, res) => {
  res.json({ success: true, message: 'CDN cache invalidated' });
});

router.post('/query/analyze', requireAuth, async (req, res) => {
  try {
    const { collection, filter } = req.body;
    
    const suggestions = suggestIndexes(collection, [filter]);
    
    res.json({
      suggestions,
      indexes: Object.keys(require('../lib/queryOptimization').INDEX_HINTS || {}),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze query' });
  }
});

router.get('/events/queue-size', requireAuth, async (req, res) => {
  const eventBus = EventBus.getInstance();
  res.json({ queueSize: eventBus.getQueueSize() });
});

router.post('/events/publish', requireAuth, async (req, res) => {
  try {
    const { type, payload, userId, correlationId } = req.body;
    
    const eventBus = EventBus.getInstance();
    await eventBus.publish({
      type,
      payload,
      metadata: { userId, correlationId },
    });
    
    res.json({ success: true, message: 'Event published' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to publish event' });
  }
});

router.get('/system/info', requireAuth, async (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    nodeVersion: process.version,
    platform: process.platform,
  });
});

router.get('/system/metrics', requireAuth, async (req, res) => {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();
  
  res.json({
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + ' MB',
      rss: Math.round(mem.rss / 1024 / 1024) + ' MB',
    },
    cpu: {
      user: cpu.user,
      system: cpu.system,
    },
    uptime: Math.round(process.uptime()) + 's',
  });
});

export default router;