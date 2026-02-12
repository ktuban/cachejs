import { CacheBackend, createCache, ICacheOptions, ICacheProvider } from "./index.js";
import { CacheError } from "./cacheError.js";
import type { LoggerContract } from './types.js';
import { ScopedCache } from "./scoped-cache.js"; // <-- NEW WRAPPER

export class CacheRegistry {
  private static instance: CacheRegistry | null = null;

  // Store ONLY backend instances (MemoryCache, RedisCache)
  private backends = new Map<CacheBackend, ICacheProvider>();
  private defaultBackend?: CacheBackend;

  constructor(private readonly logger: LoggerContract | Console = console) { }

  static getInstance(logger: LoggerContract | Console = console): CacheRegistry {
    if (!CacheRegistry.instance) {
      CacheRegistry.instance = new CacheRegistry(logger);
    }
    return CacheRegistry.instance;
  }

  static reset(): void {
    CacheRegistry.instance = null;
  }

  // Register backend instance (MemoryCache or RedisCache)
  async registerBackend(cache: ICacheProvider, isDefault = false): Promise<void> {
    if (this.backends.has(cache.backend)) {
      return;
    }

    this.backends.set(cache.backend, cache);

    if (isDefault) {
      this.defaultBackend = cache.backend;
    }

    this.logger.info(
      `CacheRegistry - Registered backend: ${cache.backend}, default: ${isDefault}`
    );
  }

  // Return backend instance (internal use only)
  private getBackend(name: CacheBackend): ICacheProvider {

    const backend = this.backends.get(name);
    if (!backend) {
      throw new CacheError(
        `Backend "${name}" not found. Available: ${Array.from(this.backends.keys()).join(", ")}`,
        "BACKEND_NOT_FOUND",
        404
      );
    }
    return backend;
  }

 // Strict version: if name is provided and not found → throw
getScoped(opts: { name?: CacheBackend; options?: Partial<ICacheOptions> } = {}): ICacheProvider {
  const { name, options = {} } = opts;

  const backendName = name ?? this.defaultBackend;
  if (!backendName) {
    throw new CacheError("No backend registered and no default set", "NO_BACKEND_REGISTERED", 500);
  }

  if (!this.backends.has(backendName)) {
    throw new CacheError(`Backend "${backendName}" not registered`, "BACKEND_NOT_FOUND", 404);
  }

  const backend = this.backends.get(backendName)!;
  return new ScopedCache(backend, options);
}


// Soft version: if name missing or invalid → fallback to default
getScopedOrDefault(opts: { name?: CacheBackend; options?: Partial<ICacheOptions> } = {}): ICacheProvider {
  const { name, options = {} } = opts;

  // If name provided and exists → use it
  if (name && this.backends.has(name)) {
    return new ScopedCache(this.backends.get(name)!, options);
  }

  // Otherwise fallback to default
  if (this.defaultBackend && this.backends.has(this.defaultBackend)) {
    return new ScopedCache(this.backends.get(this.defaultBackend)!, options);
  }

  throw new CacheError("No backend registered and no default set", "NO_BACKEND_REGISTERED", 500);
}
  // Clear all backends (namespace clearing)
  async clearAll(): Promise<void> {
    const tasks = Array.from(this.backends.values()).map(backend =>
      backend.clear().catch(err => {
        this.logger.warn(`Failed to clear backend "${backend.backend}": ${err.message}`);
      })
    );
    await Promise.all(tasks);
  }

  // Clear prefix across all backends
  async clearAllByPrefix(prefix: string): Promise<void> {
    const tasks = Array.from(this.backends.values()).map(backend =>
      backend.deleteByPrefix(prefix).catch(err => {
        this.logger.warn(`Failed to clear prefix "${prefix}" on backend "${backend.backend}": ${err.message}`);
      })
    );
    await Promise.all(tasks);
  }

  listBackends(): CacheBackend[] {
    return Array.from(this.backends.keys());
  }

  hasBackend(name: CacheBackend): boolean {
    return this.backends.has(name);
  }

  getDefaultBackend(): CacheBackend | undefined {
    return this.defaultBackend;
  }

  async getStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};

    for (const [name, backend] of this.backends) {
      try {
        stats[name] = await backend.getStats();
      } catch (err: any) {
        stats[name] = { error: err.message };
      }
    }

    return stats;
  }
}

export async function setupApplicationCaches(logger?: LoggerContract | Console) {
  let isRedis = process.env["REDIS_URL"] !== undefined;

  const defaultBackend = await createCache(
    isRedis ? "redis" : "memory",
    { maxSize: isRedis ? 0 : 1000 }
  );

  isRedis = defaultBackend.backend === "redis";

  const registry = CacheRegistry.getInstance(logger);

  await registry.registerBackend(defaultBackend, true);

  if (isRedis) {
    const memoryBackend = await createCache("memory");
    await registry.registerBackend(memoryBackend);
  }

  return registry;
}