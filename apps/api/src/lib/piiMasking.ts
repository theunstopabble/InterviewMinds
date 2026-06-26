import { logger } from "./logger";

export interface PIIDetection {
  field: string;
  type: "email" | "phone" | "ssn" | "name" | "address" | "dob" | "credit_card";
  confidence: number;
  value: string;
}

export interface MaskingConfig {
  mode: "full" | "partial" | "hash" | "redact";
  preserveLength: boolean;
  char: string;
}

const defaultConfig: MaskingConfig = {
  mode: "partial",
  preserveLength: true,
  char: "*",
};

const piiPatterns: Record<string, RegExp> = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(\+1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g,
  ssn: /\d{3}[-\s]?\d{2}[-\s]?\d{4}/g,
  credit_card: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g,
  dob: /\b(0[1-9]|1[0-2])[/-](0[1-9]|[12]\d|3[01])[/-](19|20)\d{2}\b/g,
  address: /\d+\s+[A-Za-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln)\b/gi,
};

export function detectPII(text: string): PIIDetection[] {
  const detections: PIIDetection[] = [];

  for (const [type, pattern] of Object.entries(piiPatterns)) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        detections.push({
          field: type,
          type: type as PIIDetection["type"],
          confidence: 0.95,
          value: match,
        });
      });
    }
  }

  logger.info(`Detected ${detections.length} PII fields`);
  return detections;
}

export function maskValue(value: string, config: Partial<MaskingConfig> = {}): string {
  const merged = { ...defaultConfig, ...config };

  if (!value) return value;

  switch (merged.mode) {
    case "full":
      return merged.char.repeat(value.length);

    case "partial": {
      if (value.length <= 4) return merged.char.repeat(value.length);
      const visible = value.slice(-4);
      const masked = merged.char.repeat(value.length - 4);
      return merged.preserveLength ? masked + visible : masked;
    }

    case "hash": {
      let hash = 0;
      for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash) + value.charCodeAt(i);
        hash |= 0;
      }
      return `hash_${Math.abs(hash).toString(16)}`;
    }

    case "redact":
      return "[REDACTED]";

    default:
      return value;
  }
}

export function maskObject(obj: Record<string, unknown>, fields: string[], config?: Partial<MaskingConfig>): Record<string, unknown> {
  const masked = { ...obj };

  fields.forEach(field => {
    if (masked[field] && typeof masked[field] === "string") {
      masked[field] = maskValue(masked[field] as string, config);
    }
  });

  return masked;
}

export function maskLogData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ["email", "phone", "ssn", "password", "creditCard", "address", "name"];
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveFields.some(f => key.toLowerCase().includes(f))) {
      result[key] = maskValue(String(value), { mode: "redact" });
    } else if (typeof value === "object") {
      result[key] = maskLogData(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

export function anonymizeCandidate(candidate: {
  name: string;
  email: string;
  phone: string;
  address?: string;
  ssn?: string;
}): {
  anonymizedId: string;
  maskedName: string;
  maskedEmail: string;
  maskedPhone: string;
} {
  return {
    anonymizedId: `candidate_${Math.random().toString(36).substr(2, 9)}`,
    maskedName: maskValue(candidate.name, { mode: "partial", char: "X" }),
    maskedEmail: maskValue(candidate.email, { mode: "partial" }),
    maskedPhone: maskValue(candidate.phone, { mode: "partial" }),
  };
}

export function sanitizeForExport(data: Record<string, unknown>): Record<string, unknown> {
  const detections = detectPII(JSON.stringify(data));
  const fieldsToMask = detections.map(d => d.field);
  return maskObject(data, [...new Set(fieldsToMask)], { mode: "partial" });
}