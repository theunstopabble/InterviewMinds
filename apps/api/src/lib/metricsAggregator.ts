import { logger } from "./logger";

export interface MetricValue {
  value: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface AggregatedMetrics {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  stdDev: number;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
}

export function aggregateMetrics(values: MetricValue[]): AggregatedMetrics {
  if (values.length === 0) {
    return { count: 0, sum: 0, avg: 0, min: 0, max: 0, stdDev: 0 };
  }

  const numericValues = values.map(v => v.value);
  const sum = numericValues.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);

  const squaredDiffs = numericValues.map(v => Math.pow(v - avg, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return { count: values.length, sum, avg: Math.round(avg * 100) / 100, min, max, stdDev: Math.round(stdDev * 100) / 100 };
}

export function aggregateTimeSeries(
  data: TimeSeriesData[],
  interval: "hour" | "day" | "week" | "month"
): TimeSeriesData[] {
  if (data.length === 0) return [];

  const buckets = new Map<string, number[]>();

  data.forEach(point => {
    let bucketKey: string;
    const date = new Date(point.timestamp);

    if (interval === "hour") {
      bucketKey = `${date.toISOString().slice(0, 13)}:00:00Z`;
    } else if (interval === "day") {
      bucketKey = date.toISOString().slice(0, 10);
    } else if (interval === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      bucketKey = weekStart.toISOString().slice(0, 10);
    } else {
      bucketKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    const bucket = buckets.get(bucketKey) || [];
    bucket.push(point.value);
    buckets.set(bucketKey, bucket);
  });

  const result: TimeSeriesData[] = [];
  buckets.forEach((values, key) => {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    result.push({ timestamp: new Date(key), value: Math.round(avg * 100) / 100 });
  });

  return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  
  return sorted[Math.max(0, index)];
}

export function calculateMovingAverage(
  data: TimeSeriesData[],
  windowSize: number
): TimeSeriesData[] {
  if (data.length < windowSize) return data;

  const result: TimeSeriesData[] = [];

  for (let i = windowSize - 1; i < data.length; i++) {
    const window = data.slice(i - windowSize + 1, i + 1);
    const avg = window.reduce((sum, d) => sum + d.value, 0) / windowSize;
    result.push({ timestamp: data[i].timestamp, value: Math.round(avg * 100) / 100 });
  }

  return result;
}

export function computeCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const xAvg = x.reduce((a, b) => a + b, 0) / x.length;
  const yAvg = y.reduce((a, b) => a + b, 0) / y.length;

  let numerator = 0;
  let xDenom = 0;
  let yDenom = 0;

  for (let i = 0; i < x.length; i++) {
    const xDiff = x[i] - xAvg;
    const yDiff = y[i] - yAvg;
    numerator += xDiff * yDiff;
    xDenom += xDiff * xDiff;
    yDenom += yDiff * yDiff;
  }

  const denominator = Math.sqrt(xDenom * yDenom);
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 1000) / 1000;
}