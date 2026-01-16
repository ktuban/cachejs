import { ICacheOptions, CacheBackend , ICacheProvider, MemoryCache,RedisCache, createRedisClient} from './index.js';


// Factory for creating new cache instances

export async function createCache<T = any>(
  backend: CacheBackend = 'memory',
  options: ICacheOptions = {}
): Promise<ICacheProvider<T>> {
  switch (backend) {
    case 'memory':
      return new MemoryCache<T>(options);
      
    case 'redis':
              
      const redisUrl = process.env["REDIS_URL"];
      if (!redisUrl) {
        console.warn('REDIS_URL not set, falling back to memory cache');
        return new MemoryCache<T>(options);
      }
      
    const redisInstance = await createRedisClient();

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
