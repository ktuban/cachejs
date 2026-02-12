// src/cache/redis.client.ts
import type { LoggerContract } from './types.js';
import { Redis } from 'ioredis';

export async function createRedisClient(logger: LoggerContract | Console = console) {
  const redisUrl = process.env["REDIS_URL"];
  if (!redisUrl) {
    return null;
  }

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    lazyConnect: true,
    // REMOVED: port and password parameters - let ioredis parse them from the URL
    // Adding retry strategy for better reconnection handling
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000);
      logger.warn?.(`Redis reconnecting attempt ${times}, delay: ${delay}ms`);
      return delay;
    },
    reconnectOnError: (err) => {
      // Only reconnect on READONLY errors (common in Redis cluster failover)
      const targetError = "READONLY";
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    }
  });

  client.on('error', (err) => {
    logger.warn?.("Redis connection error", { error: err.message });
  });

  client.on('connect', () => {
    logger.debug?.("Redis connected successfully");
  });

  client.on('close', () => {
    logger.warn?.("Redis connection closed");
  });

  client.on('ready', () => {
    logger.debug?.("Redis client ready");
  });

  return client;
}
