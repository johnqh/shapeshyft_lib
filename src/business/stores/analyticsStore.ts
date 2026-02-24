/**
 * Analytics Store
 *
 * Zustand store for caching usage analytics by user ID. This is a global
 * singleton store that persists across React renders and unmounts.
 *
 * This store does **not** use the `persist` middleware and is purely in-memory.
 * Analytics data is re-fetched from the server on each session.
 *
 * **Important**: Call `clearAnalytics(userId)` or `clearAll()` when the user
 * logs out to avoid leaking data between sessions.
 *
 * @module
 */

import { create } from 'zustand';
import type { AnalyticsResponse } from '@sudobility/shapeshyft_types';

/**
 * Analytics cache entry containing the cached analytics response and metadata.
 */
interface AnalyticsCacheEntry {
  /** Analytics data for this user */
  analytics: AnalyticsResponse;
  /** Unix timestamp (ms) when this data was cached */
  cachedAt: number;
}

/**
 * Analytics store state and actions.
 *
 * All methods are scoped by `userId` to support multi-user caching.
 */
interface AnalyticsStoreState {
  /** Cache of analytics keyed by user ID */
  cache: Record<string, AnalyticsCacheEntry>;

  /**
   * Set (replace) the cached analytics for a user.
   * Overwrites any existing cache entry and updates the `cachedAt` timestamp.
   */
  setAnalytics: (userId: string, analytics: AnalyticsResponse) => void;

  /**
   * Get the cached analytics for a user.
   * @returns The analytics response, or `undefined` if no cache entry exists.
   */
  getAnalytics: (userId: string) => AnalyticsResponse | undefined;

  /**
   * Get the full cache entry (analytics + metadata) for a user.
   * @returns The cache entry with `analytics` and `cachedAt`, or `undefined` if not cached.
   */
  getCacheEntry: (userId: string) => AnalyticsCacheEntry | undefined;

  /**
   * Clear the cache entry for a specific user.
   * After this call, `getAnalytics(userId)` will return `undefined`.
   */
  clearAnalytics: (userId: string) => void;

  /**
   * Clear all cached analytics for all users.
   * Should be called on logout to prevent data leakage.
   */
  clearAll: () => void;
}

/**
 * Zustand store for analytics caching.
 *
 * This store is a global singleton -- it persists across renders and unmounts.
 * Use `clearAll()` on logout to prevent data leakage between users.
 *
 * @example
 * ```ts
 * // Read analytics for a user
 * const analytics = useAnalyticsStore.getState().getAnalytics(userId);
 *
 * // Subscribe to analytics in a React component
 * const analytics = useAnalyticsStore(state => state.getAnalytics(userId));
 * ```
 */
export const useAnalyticsStore = create<AnalyticsStoreState>((set, get) => ({
  cache: {},

  setAnalytics: (userId: string, analytics: AnalyticsResponse) =>
    set(state => ({
      cache: {
        ...state.cache,
        [userId]: {
          analytics,
          cachedAt: Date.now(),
        },
      },
    })),

  getAnalytics: (userId: string) => {
    const entry = get().cache[userId];
    return entry?.analytics;
  },

  getCacheEntry: (userId: string) => {
    return get().cache[userId];
  },

  clearAnalytics: (userId: string) =>
    set(state => {
      const newCache = { ...state.cache };
      delete newCache[userId];
      return { cache: newCache };
    }),

  clearAll: () => set({ cache: {} }),
}));
