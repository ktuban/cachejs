import { CacheKeyParts } from "./index.js";
import { CacheBackend, ICacheOptions, ICacheStats, LoggerContract} from "./types.js";


export interface ICacheProvider<T = any> {
  readonly backend: CacheBackend;
  readonly logger: LoggerContract | Console;

  generateKey(cachekeypart: Partial<CacheKeyParts>): string
  // Core operations
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;

  getKeys(pattern: string): Promise<string[]>;

  clear(): Promise<void>;
  // Prefix clearing (your core requirement)
  clearByPrefix(): Promise<void>;
  deleteByPrefix(prefix: string): Promise<void>
  deleteByPattern(pattern: string): Promise<void>;

  // Configuration
  getOptions(): ICacheOptions;
  setOptions(options: Partial<ICacheOptions>): void;
  
  // Stats
  getStats(): Promise<ICacheStats>;
  size(): Promise<number>;

  // Resource cleanup (optional for backward compatibility)
  disconnect?(): Promise<void>;
  dispose?(): Promise<void>;
}

