interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Ultra-fast In-Memory Cache with TTL and pattern invalidation.
 * Boosts read endpoint throughput and delivers sub-millisecond responses.
 */
export class MemoryCache {
  private static store = new Map<string, CacheEntry<any>>();

  static get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  static set<T>(key: string, data: T, ttlSeconds = 15): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  static invalidatePattern(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  static clear(): void {
    this.store.clear();
  }
}
