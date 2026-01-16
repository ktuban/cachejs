import { CacheKeyParts } from "./index.js";
import { CacheBackend, ICacheOptions, ICacheStats} from "./types.js";


export interface ICacheProvider<T = any> {
  readonly backend: CacheBackend;
  generateKey(cachekeypart: Partial<CacheKeyParts>): string
  // Core operations
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  
  // Prefix clearing (your core requirement)
  clearByPrefix(): Promise<void>;
  
  // Configuration
  getOptions(): ICacheOptions;
  setOptions(options: Partial<ICacheOptions>): void;
  
  // Stats
  getStats(): Promise<ICacheStats>;
  size(): Promise<number>;
}

