import { Router } from 'express';
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

const webhookConfigs: Map<string, ReturnType<typeof createWebhookConfig>> = new Map();

router.get('/events', async (req, res) => {
  try {
    const events = getEventTypes();
    res.json({ events });
  } catch (error) {
    console.error('Error fetching event types:', error);
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

    const validEvents = ['interview.started', 'interview.completed', 'interview.terminated', 
      'candidate.registered', 'candidate.completed', 'candidate.failed', 
      'verification.completed', 'fraud.detected'];
    
    const invalidEvents = body.events.filter(e => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      res.status(400).json({ error: `Invalid events: ${invalidEvents.join(', ')}` });
      return;
    }

    const webhook = createWebhookConfig(body.url, body.events as any, body.secret);
    webhookConfigs.set(webhook.id, webhook);

    res.json({
      success: true,
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        enabled: webhook.enabled,
        secret: webhook.secret
      }
    });
  } catch (error) {
    console.error('Error registering webhook:', error);
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

router.get('/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const webhook = webhookConfigs.get(webhookId);

    if (!webhook) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }

    res.json({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      enabled: webhook.enabled,
      retryPolicy: webhook.retryPolicy
    });
  } catch (error) {
    console.error('Error fetching webhook:', error);
    res.status(500).json({ error: 'Failed to fetch webhook' });
  }
});

router.put('/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const webhook = webhookConfigs.get(webhookId);

    if (!webhook) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }

    const { url, events, enabled, secret } = req.body;

    if (url) webhook.url = url;
    if (events) webhook.events = events as any;
    if (typeof enabled === 'boolean') webhook.enabled = enabled;
    if (secret) webhook.secret = secret;

    res.json({
      success: true,
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        enabled: webhook.enabled
      }
    });
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

router.delete('/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    
    if (!webhookConfigs.has(webhookId)) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }

    webhookConfigs.delete(webhookId);

    res.json({ success: true, message: 'Webhook deleted' });
  } catch (error) {
    console.error('Error deleting webhook:', error);
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

    let webhooks: ReturnType<typeof createWebhookConfig>[] = [];
    
    if (body.webhookIds && body.webhookIds.length > 0) {
      webhooks = body.webhookIds
        .map(id => webhookConfigs.get(id))
        .filter((w): w is ReturnType<typeof createWebhookConfig> => !!w);
    } else {
      webhooks = Array.from(webhookConfigs.values());
    }

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
    console.error('Error triggering webhook:', error);
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
    console.error('Error verifying signature:', error);
    res.status(500).json({ error: 'Failed to verify signature' });
  }
});

export default router;