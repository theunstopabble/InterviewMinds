import { Router } from 'express';
import { logger } from '../lib/logger';
import { WebhookModel } from '../models/Webhook';
import { 
  createWebhookConfig,
  sendWebhook, 
  sendBatchWebhooks,
  verifyWebhookSignature,
  getEventTypes 
} from '../lib/webhooks';

const router = Router();

interface CreateWebhookRequest {
  url: string;
  events: string[];
  secret?: string;
  userId?: string;
}

interface SendWebhookRequest {
  webhookIds?: string[];
  event: string;
  data: Record<string, unknown>;
}

interface VerifySignatureRequest {
  payload: string;
  signature: string;
  secret: string;
}

const validEvents = ['interview.started', 'interview.completed', 'interview.terminated', 
  'candidate.registered', 'candidate.completed', 'candidate.failed', 
  'verification.completed', 'fraud.detected'];

router.get('/events', async (_req, res) => {
  try {
    const events = getEventTypes();
    res.json({ events });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching event types:');
    res.status(500).json({ error: 'Failed to fetch event types' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const body = req.body as CreateWebhookRequest;

    if (!body.url || !body.events || body.events.length === 0) {
      res.status(400).json({ error: 'URL and events are required' });
      return;
    }

    const invalidEvents = body.events.filter(e => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      res.status(400).json({ error: `Invalid events: ${invalidEvents.join(', ')}` });
      return;
    }

    const config = createWebhookConfig(body.url, body.events as any, body.secret);
    const doc = await new WebhookModel({
      userId: body.userId || 'anonymous',
      url: body.url,
      events: body.events,
      secret: config.secret,
      active: true,
    }).save();

    res.json({
      success: true,
      webhook: {
        id: doc._id.toString(),
        url: doc.url,
        events: doc.events,
        enabled: doc.active,
        secret: doc.secret
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error registering webhook:');
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

router.get('/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const doc = await WebhookModel.findById(webhookId);

    if (!doc) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }

    res.json({
      id: doc._id.toString(),
      url: doc.url,
      events: doc.events,
      enabled: doc.active,
      retryPolicy: {
        maxRetries: 3,
        retryInterval: 1000,
        backoffMultiplier: 2
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching webhook:');
    res.status(500).json({ error: 'Failed to fetch webhook' });
  }
});

router.put('/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const doc = await WebhookModel.findById(webhookId);

    if (!doc) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }

    const { url, events, enabled, secret } = req.body;

    if (url) doc.url = url;
    if (events) {
      const invalidEvents = events.filter((e: string) => !validEvents.includes(e));
      if (invalidEvents.length > 0) {
        res.status(400).json({ error: `Invalid events: ${invalidEvents.join(', ')}` });
        return;
      }
      doc.events = events;
    }
    if (typeof enabled === 'boolean') doc.active = enabled;
    if (secret) doc.secret = secret;

    await doc.save();

    res.json({
      success: true,
      webhook: {
        id: doc._id.toString(),
        url: doc.url,
        events: doc.events,
        enabled: doc.active
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error updating webhook:');
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

router.delete('/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const doc = await WebhookModel.findByIdAndDelete(webhookId);

    if (!doc) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }

    res.json({ success: true, message: 'Webhook deleted' });
  } catch (error) {
    logger.error({ err: error }, 'Error deleting webhook:');
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

router.post('/trigger', async (req, res) => {
  try {
    const body = req.body as SendWebhookRequest;

    if (!body.event || !body.data) {
      res.status(400).json({ error: 'Event and data are required' });
      return;
    }

    let docs;

    if (body.webhookIds && body.webhookIds.length > 0) {
      docs = await WebhookModel.find({ _id: { $in: body.webhookIds }, active: true });
    } else {
      docs = await WebhookModel.find({ active: true, events: body.event });
    }

    const webhooks = docs.map(doc => ({
      id: doc._id.toString(),
      url: doc.url,
      events: doc.events as any,
      secret: doc.secret || '',
      enabled: doc.active,
      retryPolicy: {
        maxRetries: 3,
        retryInterval: 1000,
        backoffMultiplier: 2
      }
    }));

    const deliveries = await sendBatchWebhooks(
      webhooks,
      body.event as any,
      body.data
    );

    res.json({
      event: body.event,
      deliveries: deliveries.map(d => ({
        webhookId: d.webhookId,
        status: d.status,
        attempts: d.attempts
      }))
    });
  } catch (error) {
    logger.error({ err: error }, 'Error triggering webhook:');
    res.status(500).json({ error: 'Failed to trigger webhook' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const body = req.body as VerifySignatureRequest;

    if (!body.payload || !body.signature || !body.secret) {
      res.status(400).json({ error: 'Payload, signature, and secret are required' });
      return;
    }

    const isValid = verifyWebhookSignature(body.payload, body.signature, body.secret);

    res.json({ valid: isValid });
  } catch (error) {
    logger.error({ err: error }, 'Error verifying signature:');
    res.status(500).json({ error: 'Failed to verify signature' });
  }
});

export default router;
