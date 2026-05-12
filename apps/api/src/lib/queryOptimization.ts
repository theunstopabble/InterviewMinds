import { logger } from "./logger";

export interface QueryMetrics {
  executionTime: number;
  indexUsed: string | null;
  documentsExamined: number;
  documentsReturned: number;
  strategy: string;
}

export interface OptimizedQuery<T> {
  query: any;
  projection?: any;
  sort?: any;
  limit?: number;
  skip?: number;
  hint?: any;
}

const INDEX_HINTS: Record<string, any> = {
  "users.email": { email: 1 },
  "interviews.userId": { userId: 1, createdAt: -1 },
  "interviews.status": { status: 1, createdAt: -1 },
  "resumes.userId": { userId: 1, createdAt: -1 },
  "auditLogs.userId": { userId: 1, createdAt: -1 },
  "auditLogs.createdAt": { createdAt: -1 },
  "messages.roomId": { roomId: 1, createdAt: -1 },
};

export function optimizeQuery<T>(
  collection: string,
  filter: any,
  options: {
    sort?: any;
    projection?: any;
    limit?: number;
    skip?: number;
  } = {}
): OptimizedQuery<T> {
  const optimized: OptimizedQuery<T> = {
    query: { ...filter },
  };

  if (options.sort) {
    optimized.sort = options.sort;
  }

  if (options.projection) {
    optimized.projection = options.projection;
  }

  if (options.limit) {
    optimized.limit = options.limit;
  }

  if (options.skip) {
    optimized.skip = options.skip;
  }

  const hintKey = Object.keys(INDEX_HINTS).find(k => 
    k.startsWith(collection) || Object.keys(filter).some(f => k.includes(f))
  );

  if (hintKey) {
    optimized.hint = INDEX_HINTS[hintKey];
    logger.debug({ collection, hint: hintKey }, "Query hint applied");
  }

  return optimized;
}

export async function analyzeQuery<T>(
  model: any,
  filter: any,
  options: any = {}
): Promise<QueryMetrics> {
  const startTime = Date.now();

  const explain = await model.find(filter, options.projection, {
    ...options,
    explain: true,
  });

  const executionTime = Date.now() - startTime;
  
  const executionStats = explain[0]?.executionStats || {};
  
  return {
    executionTime,
    indexUsed: explain[0]?.queryPlanner?.winningPlan?.inputStage?.indexName || null,
    documentsExamined: executionStats.totalDocsExamined || 0,
    documentsReturned: executionStats.nReturned || 0,
    strategy: explain[0]?.queryPlanner?.winningPlan?.stage || "UNKNOWN",
  };
}

export function createCompoundIndex(
  fields: Array<{ field: string; order: 1 | -1 }>
): any {
  const index: Record<string, 1 | -1> = {};
  fields.forEach(({ field, order }) => {
    index[field] = order;
  });
  return index;
}

export function suggestIndexes(collectionName: string, sampleQueries: any[]): any[] {
  const suggestions: any[] = [];
  const fieldFrequency: Record<string, number> = {};

  sampleQueries.forEach(query => {
    Object.keys(query).forEach(field => {
      fieldFrequency[field] = (fieldFrequency[field] || 0) + 1;
    });
  });

  Object.entries(fieldFrequency)
    .filter(([_, freq]) => freq > 1)
    .forEach(([field]) => {
      suggestions.push({
        collection: collectionName,
        index: { [field]: 1 },
        reason: `Field used in ${fieldFrequency[field]} queries`,
      });
    });

  return suggestions;
}

export function applyPagination(page: number, pageSize: number = 20): {
  limit: number;
  skip: number;
} {
  const limit = Math.min(pageSize, 100);
  const skip = (Math.max(page, 1) - 1) * limit;
  return { limit, skip };
}

export function buildSort(sortBy: string, order: "asc" | "desc" = "desc"): any {
  const sortFields: Record<string, 1 | -1> = {
    createdAt: -1,
    updatedAt: -1,
    score: -1,
  };

  return sortFields[sortBy] ? { [sortBy]: order === "asc" ? 1 : -1 } : { createdAt: -1 };
}

export async function ensureIndexes(model: any): Promise<void> {
  try {
    await model.createIndexes();
    logger.info({ model: model.modelName }, "Indexes ensured");
  } catch (error) {
    logger.error({ err: error, model: model.modelName }, "Failed to ensure indexes");
  }
}