import { CacheBackend, createCache, ICacheOptions, ICacheProvider } from "./index.js";


export class CacheRegistry {
  private static instance: CacheRegistry | null = null;
  private caches = new Map<string, ICacheProvider>();
  private defaultCacheName?: CacheBackend;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): CacheRegistry {
    if (!CacheRegistry.instance) {
      CacheRegistry.instance = new CacheRegistry();
    }
    return CacheRegistry.instance;
  }

  static reset(): void {
    // For testing purposes only
    CacheRegistry.instance = null;
  }

  async register(name: CacheBackend, cache: ICacheProvider, isDefault = false): Promise<void> {
    if (this.caches.has(name)) {
      throw new Error(`Cache "${name}" already registered`);
    }

    this.caches.set(name, cache);

    if (isDefault || !this.defaultCacheName) {
      this.defaultCacheName = name;
    }
    
    console.info(`Cache Registery- Registerd new Backend :${name} is Default: ${isDefault}`)
  }

  get(name: CacheBackend): ICacheProvider {
    const cache = this.caches.get(name);
    if (!cache) {
      throw new Error(`Cache "${name}" not found. Available: ${Array.from(this.caches.keys()).join(', ')}`);
    }
    return cache;
  }

  getOrDefault(opts:{name?: CacheBackend, options?:Partial<ICacheOptions>}={}): ICacheProvider {
       const {name,options} = opts;

    if(!name){
      
      if(this.defaultCacheName) {
        return this.get(this.defaultCacheName);
      }
    }

    if (name) {
    let  cache = this.caches.get(name);
    
      if (cache) {
        if(options) cache.setOptions(options);
        return cache;
      } 

      if(this.defaultCacheName) {
        return this.get(this.defaultCacheName);
      }
    }
      
    throw new Error('No cache registered and no default set');
  }

  async clearAll(): Promise<void> {
    const promises = Array.from(this.caches.values()).map(cache =>
      cache.clear().catch(err => {
        console.warn(`Failed to clear cache: ${err.message}`);
      })
    );
    await Promise.all(promises);
  }

  async clearAllByPrefix(prefix: string): Promise<void> {
    const promises = Array.from(this.caches.values()).map(cache =>
      cache.clear().catch(err => {
        console.warn(`Failed to clear prefix "${prefix}": ${err.message}`);
      })
    );
    
    await Promise.all(promises);
  }

  list(): string[] {
    return Array.from(this.caches.keys());
  }

  has(name: string): boolean {
    return this.caches.has(name);
  }

  getDefaultName(): string | undefined {
    return this.defaultCacheName;
  }

  async getStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};

    for (const [name, cache] of this.caches) {
      try {
        stats[name] = await cache.getStats();
      } catch (err: any) {
        stats[name] = { error: err.message };
      }
    }

    return stats;
  }
}

// register cache provider redis | memmory and set one as default 
export async function setupApplicationCaches() {

  let isRadis = process.env["REDIS_URL"] !== null;
  const defaultCache = await createCache((isRadis ? "redis" : "memory"), { maxSize: (isRadis ? 0 : 1000) });
  isRadis = defaultCache.backend === "redis";

  const registry = CacheRegistry.getInstance();

  await registry.register(defaultCache.backend, defaultCache, true); // register Default cache

  if (isRadis) { // if its default aws radis then create memmory instance
    const secondaryCache = await createCache("memory");
    await registry.register(secondaryCache.backend, secondaryCache);
  }
  return registry;
}

const cacheRegister =  setupApplicationCaches();

export { cacheRegister }
