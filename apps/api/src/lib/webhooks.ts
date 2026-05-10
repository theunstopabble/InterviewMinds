import axios from 'axios';

interface WebhookConfig {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  enabled: boolean;
  retryPolicy: RetryPolicy;
}

interface RetryPolicy {
  maxRetries: number;
  retryInterval: number;
  backoffMultiplier: number;
}

type WebhookEvent = 
  | 'interview.started'
  | 'interview.completed'
  | 'interview.terminated'
  | 'candidate.registered'
  | 'candidate.completed'
  | 'candidate.failed'
  | 'verification.completed'
  | 'fraud.detected';

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
  webhookId: string;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: WebhookPayload;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  attempts: number;
  response?: {
    statusCode: number;
    body: string;
  };
  createdAt: string;
  deliveredAt?: string;
}

function generateSignature(payload: string, secret: string): string {
  const crypto = require('crypto');
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function generateWebhookId(): string {
  return `wh_${crypto.randomUUID()}`;
}

export function createWebhookConfig(
  url: string,
  events: WebhookEvent[],
  secret?: string
): WebhookConfig {
  return {
    id: generateWebhookId(),
    url,
    events,
    secret: secret || crypto.randomUUID(),
    enabled: true,
    retryPolicy: {
      maxRetries: 3,
      retryInterval: 1000,
      backoffMultiplier: 2
    }
  };
}

export function createWebhookPayload(
  event: WebhookEvent,
  data: Record<string, unknown>,
  webhookId: string
): WebhookPayload {
  return {
    event,
    timestamp: new Date().toISOString(),
    data,
    webhookId
  };
}

async function deliverWebhook(
  webhook: WebhookConfig,
  payload: WebhookPayload
): Promise<WebhookDelivery> {
  const delivery: WebhookDelivery = {
    id: `dl_${crypto.randomUUID()}`,
    webhookId: webhook.id,
    event: payload.event,
    payload,
    status: 'pending',
    attempts: 0,
    createdAt: new Date().toISOString()
  };

  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, webhook.secret);

  try {
    const response = await axios.post(webhook.url, payloadString, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': payload.event,
        'X-Webhook-ID': webhook.id
      },
      timeout: 30000
    });

    delivery.status = 'delivered';
    delivery.response = {
      statusCode: response.status,
      body: JSON.stringify(response.data)
    };
    delivery.deliveredAt = new Date().toISOString();
  } catch (error) {
    delivery.status = 'failed';
    if (axios.isAxiosError(error) && error.response) {
      delivery.response = {
        statusCode: error.response.status,
        body: JSON.stringify(error.response.data)
      };
    }
  }

  return delivery;
}

async function retryDelivery(
  webhook: WebhookConfig,
  delivery: WebhookDelivery
): Promise<WebhookDelivery> {
  if (delivery.attempts >= webhook.retryPolicy.maxRetries) {
    delivery.status = 'failed';
    return delivery;
  }

  const delay = webhook.retryPolicy.retryInterval * 
    Math.pow(webhook.retryPolicy.backoffMultiplier, delivery.attempts);
  
  await new Promise(resolve => setTimeout(resolve, delay));

  delivery.attempts++;
  delivery.status = 'retrying';

  const result = await deliverWebhook(webhook, delivery.payload);
  return result;
}

export async function sendWebhook(
  webhook: WebhookConfig,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<WebhookDelivery> {
  if (!webhook.enabled) {
    return {
      id: `dl_${crypto.randomUUID()}`,
      webhookId: webhook.id,
      event,
      payload: createWebhookPayload(event, data, webhook.id),
      status: 'failed',
      attempts: 0,
      createdAt: new Date().toISOString()
    };
  }

  if (!webhook.events.includes(event)) {
    return {
      id: `dl_${crypto.randomUUID()}`,
      webhookId: webhook.id,
      event,
      payload: createWebhookPayload(event, data, webhook.id),
      status: 'failed',
      attempts: 0,
      createdAt: new Date().toISOString()
    };
  }

  const payload = createWebhookPayload(event, data, webhook.id);
  let delivery = await deliverWebhook(webhook, payload);

  if (delivery.status === 'failed' && webhook.retryPolicy.maxRetries > 0) {
    delivery = await retryDelivery(webhook, delivery);
  }

  return delivery;
}

export async function sendBatchWebhooks(
  webhooks: WebhookConfig[],
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<WebhookDelivery[]> {
  const deliveries = await Promise.all(
    webhooks.map(webhook => sendWebhook(webhook, event, data))
  );
  return deliveries;
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return signature === expectedSignature;
}

export function getEventTypes(): { event: WebhookEvent; description: string }[] {
  return [
    { event: 'interview.started', description: 'When an interview session begins' },
    { event: 'interview.completed', description: 'When an interview session finishes normally' },
    { event: 'interview.terminated', description: 'When an interview is terminated early' },
    { event: 'candidate.registered', description: 'When a new candidate registers' },
    { event: 'candidate.completed', description: 'When a candidate completes assessment' },
    { event: 'candidate.failed', description: 'When a candidate fails verification' },
    { event: 'verification.completed', description: 'When resume verification completes' },
    { event: 'fraud.detected', description: 'When fraud is detected during interview' }
  ];
}