import { logger } from "./logger";

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

const offlineActions: OfflineAction[] = [];
const offlineDataStore: Map<string, OfflineData[]> = new Map();

export async function queueOfflineAction(
  userId: string,
  action: string,
  payload: Record<string, unknown>
): Promise<OfflineAction> {
  const offlineAction: OfflineAction = {
    id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    action,
    payload,
    timestamp: new Date(),
    status: "pending",
    retryCount: 0,
  };
  
  offlineActions.push(offlineAction);
  logger.info(`Queued offline action: ${offlineAction.id} for user ${userId}`);
  
  return offlineAction;
}

export async function getPendingActions(userId: string): Promise<OfflineAction[]> {
  return offlineActions.filter(a => a.userId === userId && a.status === "pending");
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
      action.status = "synced";
      synced++;
      results.push({ actionId: action.id, success: true });
    } catch (error) {
      action.retryCount++;
      if (action.retryCount >= 3) {
        action.status = "failed";
        failed++;
      }
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
  const key = `${userId}_${dataType}`;
  const existing = offlineDataStore.get(key) || [];
  
  const offlineData: OfflineData = {
    type: dataType,
    id,
    data,
    lastModified: new Date(),
  };
  
  const existingIdx = existing.findIndex(d => d.id === id);
  if (existingIdx !== -1) {
    existing[existingIdx] = offlineData;
  } else {
    existing.push(offlineData);
  }
  
  offlineDataStore.set(key, existing);
  logger.info(`Saved offline data: ${dataType}/${id} for user ${userId}`);
}

export async function getOfflineData(
  userId: string,
  dataType: OfflineData["type"]
): Promise<OfflineData[]> {
  const key = `${userId}_${dataType}`;
  return offlineDataStore.get(key) || [];
}

export async function deleteOfflineData(
  userId: string,
  dataType: OfflineData["type"],
  id: string
): Promise<boolean> {
  const key = `${userId}_${dataType}`;
  const existing = offlineDataStore.get(key) || [];
  const filtered = existing.filter(d => d.id !== id);
  
  if (filtered.length !== existing.length) {
    offlineDataStore.set(key, filtered);
    return true;
  }
  return false;
}

export async function clearOfflineData(userId: string): Promise<void> {
  for (const [key] of offlineDataStore) {
    if (key.startsWith(userId)) {
      offlineDataStore.delete(key);
    }
  }
  
  const actionsToRemove = offlineActions.filter(a => a.userId === userId);
  for (const action of actionsToRemove) {
    const idx = offlineActions.indexOf(action);
    if (idx !== -1) offlineActions.splice(idx, 1);
  }
  
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
  
  return actions.sort((a, b) => {
    const aPriority = priorityOrder[a.action] || 99;
    const bPriority = priorityOrder[b.action] || 99;
    return aPriority - bPriority;
  });
}

export function estimateOfflineStorageSize(userId: string): {
  actions: number;
  dataItems: number;
  estimatedBytes: number;
} {
  const actions = offlineActions.filter(a => a.userId === userId).length;
  let dataItems = 0;
  
  for (const [, data] of offlineDataStore) {
    if (data[0] && data[0].id.includes(userId)) {
      dataItems += data.length;
    }
  }
  
  const estimatedBytes = actions * 200 + dataItems * 500;
  
  return { actions, dataItems, estimatedBytes };
}

export function isOfflineReady(userId: string): boolean {
  const { actions, dataItems } = estimateOfflineStorageSize(userId);
  return actions > 0 || dataItems > 0;
}