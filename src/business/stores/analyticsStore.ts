/**
 * Analytics Store
 * Zustand store for caching usage analytics by user ID
 */

import { create } from 'zustand';
import type { AnalyticsData } from '@sudobility/shapeshyft_client';

/**
 * Analytics cache entry
 */
interface AnalyticsCacheEntry {
  /** Analytics data for this user */
  analytics: AnalyticsData;
  /** Timestamp when this data was cached */
  cachedAt: number;
}

/**
 * Analytics store state
 */
interface AnalyticsStoreState {
  /** Cache of analytics keyed by user ID */
  cache: Record<string, AnalyticsCacheEntry>;
  /** Set analytics for a specific user ID */
  setAnalytics: (userId: string, analytics: AnalyticsData) => void;
  /** Get analytics for a specific user ID */
  getAnalytics: (userId: string) => AnalyticsData | undefined;
  /** Get cache entry for a specific user ID */
  getCacheEntry: (userId: string) => AnalyticsCacheEntry | undefined;
  /** Clear analytics for a specific user ID */
  clearAnalytics: (userId: string) => void;
  /** Clear all cached analytics */
  clearAll: () => void;
}

/**
 * Zustand store for analytics caching
 */
export const useAnalyticsStore = create<AnalyticsStoreState>((set, get) => ({
  cache: {},

  setAnalytics: (userId: string, analytics: AnalyticsData) =>
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
