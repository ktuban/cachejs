// src/cache/redis.client.ts
import { LoggerContract } from '@ktuban/structured-logger';
import {Redis} from 'ioredis';


export async function createRedisClient(logger?: Required<LoggerContract>) {
    const redisUrl = process.env["REDIS_URL"];
  if (!redisUrl) {
    return null;
  }

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    lazyConnect: true
    
  });

  client.on('error', (err) => {
    logger?.warn("Redis connection failed, falling back to memory cache")
    logger?.error("redis client error: ",err)
    // Log only – app must not crash
  });

  return client;
}
