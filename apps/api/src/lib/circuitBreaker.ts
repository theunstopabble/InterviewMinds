import { logger } from "./logger";

export type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

interface CircuitBreakerMetrics {
  failures: number;
  successes: number;
  lastFailureTime: number;
  state: CircuitState;
}

export class CircuitBreaker {
  private name: string;
  private config: CircuitBreakerConfig;
  private metrics: CircuitBreakerMetrics;
  private nextAttempt: number;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 3,
      timeout: config.timeout ?? 30000,
      resetTimeout: config.resetTimeout ?? 60000,
    };
    this.metrics = {
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      state: "closed",
    };
    this.nextAttempt = 0;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.metrics.state === "open") {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit breaker [${this.name}] is open`);
      }
      this.metrics.state = "half-open";
    }

    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Circuit breaker [${this.name}] timeout`));
      }, this.config.timeout);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private onSuccess(): void {
    this.metrics.failures = 0;
    this.metrics.successes += 1;

    if (this.metrics.state === "half-open") {
      if (this.metrics.successes >= this.config.successThreshold) {
        this.metrics.state = "closed";
        logger.info({ circuit: this.name }, "Circuit breaker closed");
      }
    }
  }

  private onFailure(): void {
    this.metrics.failures += 1;
    this.metrics.lastFailureTime = Date.now();

    if (this.metrics.state === "half-open") {
      this.metrics.state = "open";
      this.nextAttempt = Date.now() + this.config.resetTimeout;
      logger.warn({ circuit: this.name }, "Circuit breaker opened (half-open failure)");
    } else if (this.metrics.failures >= this.config.failureThreshold) {
      this.metrics.state = "open";
      this.nextAttempt = Date.now() + this.config.resetTimeout;
      logger.warn(
        { circuit: this.name, failures: this.metrics.failures },
        "Circuit breaker opened"
      );
    }
  }

  getState(): { state: CircuitState; failures: number; nextAttempt: number } {
    return {
      state: this.metrics.state,
      failures: this.metrics.failures,
      nextAttempt: this.nextAttempt,
    };
  }

  reset(): void {
    this.metrics = {
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      state: "closed",
    };
    this.nextAttempt = 0;
    logger.info({ circuit: this.name }, "Circuit breaker reset");
  }
}

// Pre-configured circuit breakers for external services
export const groqCircuitBreaker = new CircuitBreaker("groq", {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000,
  resetTimeout: 60000,
});

export const geminiCircuitBreaker = new CircuitBreaker("gemini", {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000,
  resetTimeout: 60000,
});

export const azureSpeechCircuitBreaker = new CircuitBreaker("azure-speech", {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 15000,
  resetTimeout: 30000,
});

export const pistonCircuitBreaker = new CircuitBreaker("piston", {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 10000,
  resetTimeout: 30000,
});

// Health check for all circuit breakers
export function getCircuitBreakersHealth() {
  return {
    groq: groqCircuitBreaker.getState(),
    gemini: geminiCircuitBreaker.getState(),
    "azure-speech": azureSpeechCircuitBreaker.getState(),
    piston: pistonCircuitBreaker.getState(),
  };
}