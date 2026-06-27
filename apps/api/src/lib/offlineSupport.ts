import { logger } from "./logger";
import { OfflineActionModel } from "../models/OfflineAction";
import { OfflineDataModel } from "../models/OfflineData";

export interface OfflineAction {
  id: string;
  userId: string;
  action: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  status: "pending" | "synced" | "failed";
  retryCount: number;
}

export interface SyncQueue {
  userId: string;
  pendingActions: OfflineAction[];
  lastSyncAt: Date;
}

export interface OfflineData {
  type: "interview" | "question" | "note" | "code";
  id: string;
  data: unknown;
  lastModified: Date;
}

function docToOfflineAction(doc: any): OfflineAction {
  return {
    id: doc.id,
    userId: doc.userId,
    action: doc.action,
    payload: doc.payload || {},
    timestamp: doc.createdAt || new Date(),
    status: doc.status,
    retryCount: doc.syncAttempts || 0,
  };
}

function docToOfflineData(doc: any): OfflineData {
  return {
    type: doc.dataType as OfflineData["type"],
    id: doc.dataId,
    data: doc.data,
    lastModified: doc.lastModified || doc.createdAt,
  };
}

export async function queueOfflineAction(
  userId: string,
  action: string,
  payload: Record<string, unknown>
): Promise<OfflineAction> {
  const doc = await OfflineActionModel.create({
    userId,
    action,
    resource: action.split('.')[0] || action,
    payload,
    status: "pending",
    syncAttempts: 0,
  });

  logger.info(`Queued offline action: ${doc.id} for user ${userId}`);
  return docToOfflineAction(doc);
}

export async function getPendingActions(userId: string): Promise<OfflineAction[]> {
  const docs = await OfflineActionModel.find({ userId, status: "pending" })
    .sort({ createdAt: 1 })
    .lean();
  return docs.map(docToOfflineAction);
}

export async function syncOfflineActions(userId: string): Promise<{
  synced: number;
  failed: number;
  results: unknown[];
}> {
  const pending = await getPendingActions(userId);

  let synced = 0;
  let failed = 0;
  const results: unknown[] = [];

  for (const action of pending) {
    try {
      await processAction(action);
      await OfflineActionModel.findOneAndUpdate(
        { id: action.id },
        { status: "synced", lastSyncAttempt: new Date() }
      );
      synced++;
      results.push({ actionId: action.id, success: true });
    } catch (error) {
      const newRetryCount = action.retryCount + 1;
      const update: any = {
        syncAttempts: newRetryCount,
        lastSyncAttempt: new Date(),
        errorMessage: String(error),
      };
      if (newRetryCount >= 3) {
        update.status = "failed";
        failed++;
      }
      await OfflineActionModel.findOneAndUpdate({ id: action.id }, update);
      results.push({ actionId: action.id, success: false, error: String(error) });
    }
  }

  logger.info(`Synced offline actions for user ${userId}: ${synced} synced, ${failed} failed`);

  return { synced, failed, results };
}

async function processAction(action: OfflineAction): Promise<void> {
  logger.info(`Processing action: ${action.action}`);

  switch (action.action) {
    case "interview.submit":
      break;
    case "note.save":
      break;
    case "code.save":
      break;
    default:
      throw new Error(`Unknown action: ${action.action}`);
  }
}

export async function saveOfflineData(
  userId: string,
  dataType: OfflineData["type"],
  data: unknown,
  id: string
): Promise<void> {
  await OfflineDataModel.findOneAndUpdate(
    { userId, dataType, dataId: id },
    { userId, dataType, dataId: id, data, lastModified: new Date() },
    { upsert: true, new: true }
  );

  logger.info(`Saved offline data: ${dataType}/${id} for user ${userId}`);
}

export async function getOfflineData(
  userId: string,
  dataType: OfflineData["type"]
): Promise<OfflineData[]> {
  const docs = await OfflineDataModel.find({ userId, dataType })
    .sort({ lastModified: -1 })
    .lean();
  return docs.map(docToOfflineData);
}

export async function deleteOfflineData(
  userId: string,
  dataType: OfflineData["type"],
  id: string
): Promise<boolean> {
  const result = await OfflineDataModel.deleteOne({ userId, dataType, dataId: id });
  return result.deletedCount > 0;
}

export async function clearOfflineData(userId: string): Promise<void> {
  await OfflineActionModel.deleteMany({ userId });
  await OfflineDataModel.deleteMany({ userId });
  logger.info(`Cleared all offline data for user ${userId}`);
}

export interface ConflictResolution {
  type: "server_wins" | "client_wins" | "merge" | "manual";
  strategy: string;
}

export async function resolveConflicts(
  userId: string,
  dataType: OfflineData["type"]
): Promise<{
  resolved: number;
  conflicts: Array<{ id: string; resolution: ConflictResolution }>;
}> {
  const offline = await getOfflineData(userId, dataType);

  const conflicts: Array<{ id: string; resolution: ConflictResolution }> = [];
  let resolved = 0;

  for (const data of offline) {
    conflicts.push({
      id: data.id,
      resolution: { type: "server_wins", strategy: "Server version preserved" },
    });
    resolved++;
  }

  return { resolved, conflicts };
}

export function calculateSyncPriority(actions: OfflineAction[]): OfflineAction[] {
  const priorityOrder: Record<string, number> = {
    "interview.submit": 1,
    "interview.answer": 2,
    "code.save": 3,
    "note.save": 4,
  };

  return [...actions].sort((a, b) => {
    const aPriority = priorityOrder[a.action] || 99;
    const bPriority = priorityOrder[b.action] || 99;
    return aPriority - bPriority;
  });
}

export async function estimateOfflineStorageSize(userId: string): Promise<{
  actions: number;
  dataItems: number;
  estimatedBytes: number;
}> {
  const actions = await OfflineActionModel.countDocuments({ userId });
  const dataItems = await OfflineDataModel.countDocuments({ userId });
  const estimatedBytes = actions * 200 + dataItems * 500;

  return { actions, dataItems, estimatedBytes };
}

export async function isOfflineReady(userId: string): Promise<boolean> {
  const { actions, dataItems } = await estimateOfflineStorageSize(userId);
  return actions > 0 || dataItems > 0;
}
