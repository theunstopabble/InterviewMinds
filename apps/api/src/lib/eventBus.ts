import { logger } from "./logger";

export interface Event {
  type: string;
  payload: any;
  metadata: {
    timestamp: number;
    source: string;
    correlationId?: string;
    userId?: string;
  };
}

export interface EventHandler {
  eventType: string;
  handler: (event: Event) => Promise<void>;
}

const handlers: EventHandler[] = [];

export function registerEventHandler(eventType: string, handler: (event: Event) => Promise<void>): void {
  handlers.push({ eventType, handler });
  logger.info({ eventType }, "Event handler registered");
}

export async function emitEvent(event: Omit<Event, "metadata"> & { metadata?: Partial<Event["metadata"]> }): Promise<void> {
  const fullEvent: Event = {
    type: event.type,
    payload: event.payload,
    metadata: {
      timestamp: Date.now(),
      source: "interview-minds-api",
      ...event.metadata,
    },
  };

  logger.info({ eventType: event.type }, "Event emitted");

  const matchingHandlers = handlers.filter(h => h.eventType === event.type || h.eventType === "*");
  
  await Promise.allSettled(
    matchingHandlers.map(h => 
      h.handler(fullEvent).catch(err => 
        logger.error({ err, eventType: event.type }, "Event handler failed")
      )
    )
  );
}

export const EventTypes = {
  INTERVIEW_STARTED: "interview.started",
  INTERVIEW_COMPLETED: "interview.completed",
  INTERVIEW_FAILED: "interview.failed",
  RESUME_UPLOADED: "resume.uploaded",
  RESUME_PROCESSED: "resume.processed",
  VIDEO_RECORDED: "video.recorded",
  VIDEO_PROCESSED: "video.processed",
  SCORE_CALCULATED: "score.calculated",
  REPORT_GENERATED: "report.generated",
  USER_REGISTERED: "user.registered",
  USER_UPDATED: "user.updated",
  PAYMENT_COMPLETED: "payment.completed",
  NOTIFICATION_SENT: "notification.sent",
} as const;

export async function createEventProcessor(): Promise<(event: Event) => Promise<void>> {
  return async (event: Event) => {
    const handlers = getHandlersForEvent(event.type);
    
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        logger.error({ err: error, eventType: event.type }, "Failed to process event");
      }
    }
  };
}

function getHandlersForEvent(eventType: string): ((event: Event) => Promise<void>)[] {
  return handlers
    .filter(h => h.eventType === eventType || h.eventType === "*")
    .map(h => h.handler);
}

export class EventBus {
  private static instance: EventBus;
  private queue: Event[] = [];
  private processing = false;

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  async publish(event: Omit<Event, "metadata"> & { metadata?: Partial<Event["metadata"]> }): Promise<void> {
    const fullEvent: Event = {
      type: event.type,
      payload: event.payload,
      metadata: {
        timestamp: Date.now(),
        source: "interview-minds-api",
        ...event.metadata,
      },
    };

    this.queue.push(fullEvent);
    
    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (event) {
        await emitEvent(event);
      }
    }

    this.processing = false;
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

export function createEventMetadata(userId?: string, correlationId?: string): Event["metadata"] {
  return {
    timestamp: Date.now(),
    source: "interview-minds-api",
    userId,
    correlationId,
  };
}