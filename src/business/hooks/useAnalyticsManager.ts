/**
 * Analytics Manager Hook
 * Business logic hook that wraps the client useAnalytics hook with Zustand caching
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
  baseUrl: string;
  networkClient: NetworkClient;
  userId: string;
  token: Optional<FirebaseIdToken>;
  /** Testnet/sandbox mode */
  testMode?: boolean;
  /** Auto-fetch on mount when token is available */
  autoFetch?: boolean;
  /** Query params for filtering */
  params?: UsageAnalyticsQueryParams;
}

/**
 * Return type for useAnalyticsManager
 */
export interface UseAnalyticsManagerReturn {
  analytics: Optional<AnalyticsResponse>;
  isLoading: boolean;
  error: Optional<string>;
  isCached: boolean;
  cachedAt: Optional<number>;

  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Manager hook for analytics with caching
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
