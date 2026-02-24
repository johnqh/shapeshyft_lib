/**
 * Analytics Manager Hook
 *
 * Business logic hook that wraps the client `useAnalytics` hook with Zustand caching.
 *
 * **Data flow**:
 * 1. On mount (if `autoFetch` is true and `token` is available), fetches analytics from the server.
 * 2. Server data is synced to `useAnalyticsStore` for caching.
 * 3. Returns fresh server data when available, falls back to cached data otherwise.
 * 4. `isCached` flag indicates whether the data source is the cache.
 *
 * **User scoping**: All data is scoped by `userId`.
 *
 * @module
 */

import { useCallback, useEffect, useMemo } from 'react';
import type {
  AnalyticsResponse,
  NetworkClient,
  Optional,
  UsageAnalyticsQueryParams,
} from '@sudobility/shapeshyft_types';
import {
  type FirebaseIdToken,
  useAnalytics,
} from '@sudobility/shapeshyft_client';
import { useAnalyticsStore } from '../stores/analyticsStore';

/**
 * Configuration for useAnalyticsManager
 */
export interface UseAnalyticsManagerConfig {
  /** Base URL of the ShapeShyft API */
  baseUrl: string;
  /** Network client instance for making HTTP requests */
  networkClient: NetworkClient;
  /** User ID to fetch analytics for */
  userId: string;
  /** Firebase ID token for authentication, or null if not yet authenticated */
  token: Optional<FirebaseIdToken>;
  /** Enable testnet/sandbox mode (default: false) */
  testMode?: boolean;
  /**
   * Auto-fetch analytics on mount when token is available (default: true).
   * Set to false to defer fetching until `refresh()` is called manually.
   */
  autoFetch?: boolean;
  /** Optional query params for filtering analytics (date range, project, etc.) */
  params?: UsageAnalyticsQueryParams;
}

/**
 * Return type for useAnalyticsManager
 */
export interface UseAnalyticsManagerReturn {
  /** Analytics response. Falls back to cached data if server data is unavailable. Null if neither. */
  analytics: Optional<AnalyticsResponse>;
  /** Whether analytics are currently being fetched from the server */
  isLoading: boolean;
  /** Error message from the most recent operation, or null */
  error: Optional<string>;
  /** Whether the returned analytics are from the Zustand cache */
  isCached: boolean;
  /** Unix timestamp (ms) when the cache was last updated, or null */
  cachedAt: Optional<number>;

  /** Force refresh analytics from the server */
  refresh: () => Promise<void>;
  /** Clear the current error state */
  clearError: () => void;
}

/**
 * Manager hook for analytics with Zustand caching.
 *
 * @example
 * ```tsx
 * const { analytics, isLoading, refresh } = useAnalyticsManager({
 *   baseUrl: "https://api.shapeshyft.com",
 *   networkClient,
 *   userId: "user-123",
 *   token: firebaseToken,
 *   params: { start_date: "2025-01-01" },
 * });
 * ```
 */
export const useAnalyticsManager = ({
  baseUrl,
  networkClient,
  userId,
  token,
  testMode = false,
  autoFetch = true,
  params,
}: UseAnalyticsManagerConfig): UseAnalyticsManagerReturn => {
  const {
    analytics: clientAnalytics,
    isLoading,
    error,
    refetch,
    clearError,
  } = useAnalytics(networkClient, baseUrl, userId, token ?? null, {
    testMode,
    enabled: autoFetch,
    params,
  });

  const cacheEntry = useAnalyticsStore(
    useCallback(state => state.cache[userId], [userId])
  );
  const setAnalytics = useAnalyticsStore(state => state.setAnalytics);

  // Get cached data
  const cachedAnalytics = cacheEntry?.analytics;
  const cachedAt = cacheEntry?.cachedAt;

  // Determine data source
  const analytics = clientAnalytics ?? cachedAnalytics ?? null;
  const isCached = clientAnalytics === null && cachedAnalytics !== undefined;

  // Sync client data to store
  useEffect(() => {
    if (clientAnalytics) {
      setAnalytics(userId, clientAnalytics);
    }
  }, [clientAnalytics, userId, setAnalytics]);

  /**
   * Refresh analytics from server
   */
  const refresh = useCallback(async (): Promise<void> => {
    await refetch();
  }, [refetch]);

  return useMemo(
    () => ({
      analytics,
      isLoading,
      error,
      isCached,
      cachedAt: cachedAt ?? null,
      refresh,
      clearError,
    }),
    [analytics, isLoading, error, clearError, isCached, cachedAt, refresh]
  );
};
