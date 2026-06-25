import { logger } from "./logger";
import { aggregateMetrics, calculatePercentile } from "./metricsAggregator";

export interface Anomaly {
  id: string;
  type: "spike" | "drop" | "trend" | "pattern";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  detectedAt: Date;
  metrics: {
    expected: number;
    actual: number;
    deviation: number;
  };
}

export interface ThresholdConfig {
  metric: string;
  upper?: number;
  lower?: number;
  deviation?: number;
  zScore?: number;
}

export function detectAnomalies(
  values: number[],
  method: "zscore" | "iqr" | "threshold" = "zscore"
): { isAnomaly: boolean; score: number }[] {
  if (values.length < 3) {
    return values.map(v => ({ isAnomaly: false, score: 0 }));
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stats = {
    mean,
    std: Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length),
  };

  return values.map(value => {
    let isAnomaly = false;
    let score = 0;

    if (method === "zscore") {
      score = Math.abs((value - stats.mean) / (stats.std || 1));
      isAnomaly = score > 2;
    } else if (method === "iqr") {
      const sorted = [...values].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      isAnomaly = value < lowerBound || value > upperBound;
      score = isAnomaly ? 1 : 0;
    }

    return { isAnomaly, score: Math.round(score * 100) / 100 };
  });
}

export function checkThreshold(
  value: number,
  config: ThresholdConfig
): { passed: boolean; deviation: number } {
  if (config.upper !== undefined && value > config.upper) {
    return { passed: false, deviation: ((value - config.upper) / config.upper) * 100 };
  }

  if (config.lower !== undefined && value < config.lower) {
    return { passed: false, deviation: ((config.lower - value) / config.lower) * 100 };
  }

  return { passed: true, deviation: 0 };
}

export function detectSessionAnomalies(
  sessionData: {
    duration: number;
    responseTime: number[];
    engagement: number[];
    score: number;
    questionsAnswered: number;
  },
  baseline: {
    avgDuration: number;
    avgResponseTime: number;
    avgEngagement: number;
    avgScore: number;
  }
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  if (sessionData.duration > baseline.avgDuration * 1.5) {
    anomalies.push({
      id: `anomaly_${Date.now()}_duration`,
      type: "spike",
      severity: "medium",
      description: "Session duration significantly longer than average",
      detectedAt: new Date(),
      metrics: {
        expected: baseline.avgDuration,
        actual: sessionData.duration,
        deviation: ((sessionData.duration - baseline.avgDuration) / baseline.avgDuration) * 100,
      },
    });
  }

  const avgResponseTime = sessionData.responseTime.reduce((a, b) => a + b, 0) / sessionData.responseTime.length;
  if (avgResponseTime > baseline.avgResponseTime * 2) {
    anomalies.push({
      id: `anomaly_${Date.now()}_response`,
      type: "pattern",
      severity: "high",
      description: "Response time significantly slower than baseline",
      detectedAt: new Date(),
      metrics: {
        expected: baseline.avgResponseTime,
        actual: avgResponseTime,
        deviation: ((avgResponseTime - baseline.avgResponseTime) / baseline.avgResponseTime) * 100,
      },
    });
  }

  if (sessionData.score > baseline.avgScore * 1.3 || sessionData.score < baseline.avgScore * 0.7) {
    anomalies.push({
      id: `anomaly_${Date.now()}_score`,
      type: sessionData.score > baseline.avgScore * 1.3 ? "spike" : "drop",
      severity: "low",
      description: "Score deviation detected",
      detectedAt: new Date(),
      metrics: {
        expected: baseline.avgScore,
        actual: sessionData.score,
        deviation: Math.abs(sessionData.score - baseline.avgScore),
      },
    });
  }

  logger.info(`Detected ${anomalies.length} anomalies in session`);
  return anomalies;
}

export function predictAnomaly(
  historicalData: number[],
  horizon: number = 3
): { predictions: number[]; confidence: number } {
  if (historicalData.length < 5) {
    return { predictions: [], confidence: 0 };
  }

  const recent = historicalData.slice(-10);
  const trend = (recent[recent.length - 1] - recent[0]) / recent.length;
  const predictions: number[] = [];

  for (let i = 1; i <= horizon; i++) {
    predictions.push(Math.round((recent[recent.length - 1] + trend * i) * 100) / 100);
  }

  const confidence = Math.min(95, 50 + recent.length * 2);

  return { predictions, confidence };
}