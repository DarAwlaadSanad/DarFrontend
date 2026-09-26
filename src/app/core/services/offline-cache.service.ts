import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  url: string;
  size: number;
}

export interface CacheStats {
  count: number;
  estimatedSizeKb: number;
  oldestEntryDate: Date | null;
  newestEntryDate: Date | null;
}

const CACHE_PREFIX = 'kotab_http_cache_';
const DEFAULT_TTL_MINUTES = 60 * 24 * 7; // 7 days default
const MAX_CACHE_ENTRIES = 250; // Guard against runaway storage

@Injectable({
  providedIn: 'root'
})
export class OfflineCacheService {
  private platformId = inject(PLATFORM_ID);

  // Reactive signals
  lastCacheHit = signal<{ url: string; timestamp: Date } | null>(null);
  cachedEntriesCount = signal<number>(0);
  isServingFromCache = signal<boolean>(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.updateStats();
      this.cleanExpired();
    }
  }

  /**
   * Save data into Local Storage cache
   */
  set<T>(url: string, data: T, ttlMinutes: number = DEFAULT_TTL_MINUTES): void {
    if (!isPlatformBrowser(this.platformId) || !data) return;

    try {
      const key = this.getStorageKey(url);
      const now = Date.now();
      const expiresAt = now + ttlMinutes * 60 * 1000;

      const serialized = JSON.stringify(data);
      const entry: CacheEntry<T> = {
        data,
        timestamp: now,
        expiresAt,
        url,
        size: serialized.length
      };

      try {
        localStorage.setItem(key, JSON.stringify(entry));
      } catch (err: any) {
        // Handle QuotaExceededError by pruning oldest 35% of cached entries
        if (this.isQuotaExceeded(err)) {
          console.warn('[OfflineCache] LocalStorage quota reached. Pruning oldest entries...');
          this.pruneOldestEntries(0.35);
          // Retry once
          localStorage.setItem(key, JSON.stringify(entry));
        } else {
          console.error('[OfflineCache] Error writing to LocalStorage:', err);
        }
      }

      this.updateStats();
    } catch (e) {
      console.warn(`[OfflineCache] Could not cache response for ${url}:`, e);
    }
  }

  /**
   * Retrieve cached data if valid and not expired
   */
  get<T>(url: string): T | null {
    if (!isPlatformBrowser(this.platformId)) return null;

    try {
      const key = this.getStorageKey(url);
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);
      const now = Date.now();

      // Check if expired
      if (entry.expiresAt && now > entry.expiresAt) {
        localStorage.removeItem(key);
        this.updateStats();
        return null;
      }

      return entry.data;
    } catch (e) {
      console.warn(`[OfflineCache] Could not read cache for ${url}:`, e);
      return null;
    }
  }

  /**
   * Check if a valid cache entry exists for URL
   */
  has(url: string): boolean {
    return this.get(url) !== null;
  }

  /**
   * Record that a cache hit occurred (used for UI indicators)
   */
  recordCacheHit(url: string): void {
    this.lastCacheHit.set({
      url,
      timestamp: new Date()
    });
    this.isServingFromCache.set(true);

    // Reset flag after 4 seconds of inactivity
    setTimeout(() => {
      this.isServingFromCache.set(false);
    }, 4000);
  }

  /**
   * Remove a specific cache entry
   */
  remove(url: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.removeItem(this.getStorageKey(url));
    this.updateStats();
  }

  /**
   * Invalidate cached data when mutations occur (POST, PUT, DELETE)
   * e.g. invalidateForUrl('/api/Student/12') invalidates '/api/Student' queries
   */
  invalidateForUrl(url: string): number {
    if (!isPlatformBrowser(this.platformId)) return 0;

    // Extract base entity endpoint (e.g. /api/Student, /api/Group, /api/StudentFee)
    const match = url.match(/\/api\/[a-zA-Z0-9_-]+/i);
    const pattern = match ? match[0] : url;

    return this.invalidatePattern(pattern);
  }

  /**
   * Invalidate all keys matching a specific substring
   */
  invalidatePattern(pattern: string): number {
    if (!isPlatformBrowser(this.platformId)) return 0;

    let removed = 0;
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith(CACHE_PREFIX) && k.includes(pattern)) {
          localStorage.removeItem(k);
          removed++;
        }
      }
      if (removed > 0) {
        this.updateStats();
      }
    } catch (e) {
      console.warn('[OfflineCache] Invalidation error:', e);
    }
    return removed;
  }

  /**
   * Clear all HTTP API cache from Local Storage
   */
  clearAllApiCache(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(k);
        }
      }
      this.updateStats();
    } catch (e) {
      console.warn('[OfflineCache] Clear cache error:', e);
    }
  }

  /**
   * Get statistics about cached data
   */
  getCacheStats(): CacheStats {
    if (!isPlatformBrowser(this.platformId)) {
      return { count: 0, estimatedSizeKb: 0, oldestEntryDate: null, newestEntryDate: null };
    }

    let count = 0;
    let totalChars = 0;
    let minTime = Infinity;
    let maxTime = -Infinity;

    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith(CACHE_PREFIX)) {
          count++;
          const val = localStorage.getItem(k);
          if (val) {
            totalChars += val.length;
            try {
              const parsed: CacheEntry = JSON.parse(val);
              if (parsed.timestamp) {
                if (parsed.timestamp < minTime) minTime = parsed.timestamp;
                if (parsed.timestamp > maxTime) maxTime = parsed.timestamp;
              }
            } catch {}
          }
        }
      }
    } catch {}

    return {
      count,
      estimatedSizeKb: Math.round((totalChars * 2) / 1024), // UTF-16 approx 2 bytes per char
      oldestEntryDate: minTime !== Infinity ? new Date(minTime) : null,
      newestEntryDate: maxTime !== -Infinity ? new Date(maxTime) : null
    };
  }

  /**
   * Helper to clean expired entries periodically
   */
  private cleanExpired(): void {
    try {
      const now = Date.now();
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith(CACHE_PREFIX)) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              const entry: CacheEntry = JSON.parse(raw);
              if (entry.expiresAt && now > entry.expiresAt) {
                localStorage.removeItem(k);
              }
            } catch {
              localStorage.removeItem(k);
            }
          }
        }
      }
    } catch {}
  }

  /**
   * Prune oldest entries when storage quota is tight
   */
  private pruneOldestEntries(ratio: number): void {
    try {
      const items: Array<{ key: string; timestamp: number }> = [];
      const keys = Object.keys(localStorage);

      for (const k of keys) {
        if (k.startsWith(CACHE_PREFIX)) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              const entry: CacheEntry = JSON.parse(raw);
              items.push({ key: k, timestamp: entry.timestamp || 0 });
            } catch {
              items.push({ key: k, timestamp: 0 });
            }
          }
        }
      }

      // Sort ascending by timestamp (oldest first)
      items.sort((a, b) => a.timestamp - b.timestamp);
      const toDeleteCount = Math.max(1, Math.floor(items.length * ratio));

      for (let i = 0; i < toDeleteCount && i < items.length; i++) {
        localStorage.removeItem(items[i].key);
      }
    } catch (e) {
      console.warn('[OfflineCache] Pruning error:', e);
    }
  }

  private isQuotaExceeded(e: any): boolean {
    return (
      e &&
      (e.code === 22 ||
        e.code === 1014 ||
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    );
  }

  private getStorageKey(url: string): string {
    return `${CACHE_PREFIX}${url}`;
  }

  private updateStats(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      let count = 0;
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith(CACHE_PREFIX)) count++;
      }
      this.cachedEntriesCount.set(count);
    } catch {}
  }
}
