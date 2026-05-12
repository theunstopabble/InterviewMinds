import mongoose from "mongoose";
import { logger } from "./logger";

interface PoolConfig {
  maxPoolSize: number;
  minPoolSize: number;
  socketTimeoutMS: number;
  serverSelectionTimeoutMS: number;
  maxIdleTimeMS: number;
}

const DEFAULT_POOL_CONFIG: PoolConfig = {
  maxPoolSize: 20,
  minPoolSize: 5,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  maxIdleTimeMS: 30000,
};

let connectionPool: mongoose.Connection | null = null;

export async function initConnectionPool(
  mongoUri: string,
  config: Partial<PoolConfig> = {}
): Promise<mongoose.Connection> {
  const poolConfig = { ...DEFAULT_POOL_CONFIG, ...config };

  logger.info({ mongoUri: mongoUri.split("@").pop(), config: poolConfig }, "Initializing connection pool");

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: poolConfig.maxPoolSize,
      minPoolSize: poolConfig.minPoolSize,
      socketTimeoutMS: poolConfig.socketTimeoutMS,
      serverSelectionTimeoutMS: poolConfig.serverSelectionTimeoutMS,
      maxIdleTimeMS: poolConfig.maxIdleTimeMS,
      retryWrites: true,
      retryReads: true,
    });

    connectionPool = mongoose.connection;

    mongoose.connection.on("connected", () => {
      logger.info("MongoDB connected to pool");
    });

    mongoose.connection.on("error", (err) => {
      logger.error({ err }, "MongoDB connection error");
    });

    mongoose.connection.on("close", () => {
      logger.info("MongoDB connection closed");
    });

    logger.info({ poolSize: poolConfig.maxPoolSize }, "Connection pool initialized");
    return connectionPool;
  } catch (error) {
    logger.error({ err: error }, "Failed to initialize connection pool");
    throw error;
  }
}

export function getConnectionPool(): mongoose.Connection {
  if (!connectionPool) {
    throw new Error("Connection pool not initialized");
  }
  return connectionPool;
}

export async function closeConnectionPool(): Promise<void> {
  if (connectionPool) {
    await mongoose.disconnect();
    connectionPool = null;
    logger.info("Connection pool closed");
  }
}

export function getPoolStats(): {
  size: number;
  available: number;
  pending: number;
} {
  if (!mongoose.connection.readyState) {
    return { size: 0, available: 0, pending: 0 };
  }

  const pool = (mongoose.connection as any).pool;
  
  return {
    size: pool?.size || 0,
    available: pool?.availableConnectionCount || 0,
    pending: pool?.pendingConnectionCount || 0,
  };
}

export async function warmUpPool(minConnections: number = 5): Promise<void> {
  const connections: mongoose.Connection[] = [];
  
  for (let i = 0; i < minConnections; i++) {
    const conn = mongoose.connection.useDb(`warmup_${i}`);
    connections.push(conn);
  }

  await Promise.all(connections.map(c => c.asPromise()));
  logger.info({ connections: minConnections }, "Pool warmed up");
}

export { mongoose };