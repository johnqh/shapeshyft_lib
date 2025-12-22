/**
 * Analytics Manager Hook
 * Business logic hook that wraps the client useAnalytics hook with Zustand caching
 */

import { useCallback, useEffect, useMemo } from 'react';
import type {
  NetworkClient,
  Optional,
  UsageAnalyticsQueryParams,
} from '@sudobility/shapeshyft_types';
import {
  type AnalyticsData,
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
  /** Auto-fetch on mount when token is available */
  autoFetch?: boolean;
  /** Query params for filtering */
  params?: UsageAnalyticsQueryParams;
}

/**
 * Return type for useAnalyticsManager
 */
export interface UseAnalyticsManagerReturn {
  analytics: Optional<AnalyticsData>;
  isLoading: boolean;
  error: Optional<string>;
  isCached: boolean;
  cachedAt: Optional<number>;

  refresh: (params?: UsageAnalyticsQueryParams) => Promise<void>;
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
  autoFetch = true,
  params,
}: UseAnalyticsManagerConfig): UseAnalyticsManagerReturn => {
  const {
    analytics: clientAnalytics,
    isLoading,
    error,
    refresh: clientRefresh,
    clearError,
  } = useAnalytics(networkClient, baseUrl);
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
  const refresh = useCallback(
    async (queryParams?: UsageAnalyticsQueryParams): Promise<void> => {
      if (!token) {
        return;
      }
      await clientRefresh(userId, token, queryParams ?? params);
    },
    [clientRefresh, userId, token, params]
  );

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && token && !analytics) {
      refresh();
    }
  }, [autoFetch, token, analytics, refresh]);

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
