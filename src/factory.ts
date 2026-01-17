
import { ICacheOptions, CacheBackend , ICacheProvider,createRedisClient} from './index.js';
import {MemoryCache} from "./providers/memory-cache.js";
import {RedisCache} from "./providers/redis-cache.js";

// Factory for creating new cache instances

export async function createCache<T = any>(
  backend: CacheBackend = 'memory',
  options: ICacheOptions = {logger: console}
): Promise<ICacheProvider<T>> {
  switch (backend) {
    case 'memory':
      return new MemoryCache<T>(options);
      
    case 'redis':
              
      const redisUrl = process.env["REDIS_URL"];
      if (!redisUrl) {
        options.logger?.warn('REDIS_URL not set, falling back to memory cache');
        return new MemoryCache<T>(options);
      }
      
    const redisInstance = await createRedisClient(options.logger);

      if(!redisInstance){
        return new MemoryCache<T>(options);
      }else {
        await redisInstance.ping();
        return new RedisCache<T>(redisInstance, options);
      } 
      
    default:
      // TypeScript should prevent this, but just in case
      throw new Error(`Unsupported backend: ${backend}`);
  }
}
