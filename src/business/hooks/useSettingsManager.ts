/**
 * Settings Manager Hook
 * Business logic hook that wraps the client useSettings hook with Zustand caching
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  NetworkClient,
  Optional,
  UserSettings,
  UserSettingsUpdateRequest,
} from '@sudobility/shapeshyft_types';
import {
  type FirebaseIdToken,
  useSettings,
} from '@sudobility/shapeshyft_client';
import { useSettingsStore } from '../stores/settingsStore';

/**
 * Configuration for useSettingsManager
 */
export interface UseSettingsManagerConfig {
  baseUrl: string;
  networkClient: NetworkClient;
  userId: string;
  token: Optional<FirebaseIdToken>;
  /** Auto-fetch on mount when token is available */
  autoFetch?: boolean;
}

/**
 * Return type for useSettingsManager
 */
export interface UseSettingsManagerReturn {
  settings: Optional<UserSettings>;
  isLoading: boolean;
  error: Optional<string>;
  isCached: boolean;
  cachedAt: Optional<number>;

  refresh: () => Promise<void>;
  updateSettings: (data: UserSettingsUpdateRequest) => Promise<void>;
  clearError: () => void;
}

/**
 * Manager hook for user settings with caching
 */
export const useSettingsManager = ({
  baseUrl,
  networkClient,
  userId,
  token,
  autoFetch = true,
}: UseSettingsManagerConfig): UseSettingsManagerReturn => {
  const {
    settings: clientSettings,
    isLoading,
    error,
    refresh: clientRefresh,
    updateSettings: clientUpdateSettings,
    clearError,
  } = useSettings(networkClient, baseUrl);

  const cacheEntry = useSettingsStore(
    useCallback(state => state.cache[userId], [userId])
  );
  const setSettings = useSettingsStore(state => state.setSettings);

  // Get cached data
  const cachedSettings = cacheEntry?.settings;
  const cachedAt = cacheEntry?.cachedAt;

  // Determine data source - prefer fresh client data, fall back to cache
  const settings = useMemo(
    () => (clientSettings ? clientSettings : (cachedSettings ?? null)),
    [clientSettings, cachedSettings]
  );
  const isCached = !clientSettings && !!cachedSettings;

  // Sync client data to store when it changes
  useEffect(() => {
    if (clientSettings) {
      setSettings(userId, clientSettings);
    }
  }, [clientSettings, userId, setSettings]);

  /**
   * Refresh settings from server
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (!token) {
      return;
    }
    await clientRefresh(userId, token);
  }, [clientRefresh, userId, token]);

  /**
   * Update settings
   */
  const updateSettings = useCallback(
    async (data: UserSettingsUpdateRequest): Promise<void> => {
      if (!token) {
        return;
      }
      const response = await clientUpdateSettings(userId, data, token);
      if (response.success && response.data) {
        setSettings(userId, response.data);
      }
    },
    [clientUpdateSettings, userId, token, setSettings]
  );

  // Track if we've already attempted auto-fetch to prevent retry loops
  const hasAttemptedFetchRef = useRef(false);

  // Auto-fetch on mount (only once per token)
  useEffect(() => {
    if (autoFetch && token && !settings && !hasAttemptedFetchRef.current) {
      hasAttemptedFetchRef.current = true;
      refresh();
    }
  }, [autoFetch, token, settings, refresh]);

  // Reset attempt flag when token changes (e.g., user re-authenticates)
  useEffect(() => {
    hasAttemptedFetchRef.current = false;
  }, [token]);

  return useMemo(
    () => ({
      settings,
      isLoading,
      error,
      isCached,
      cachedAt: cachedAt ?? null,
      refresh,
      updateSettings,
      clearError,
    }),
    [
      settings,
      isLoading,
      error,
      clearError,
      isCached,
      cachedAt,
      refresh,
      updateSettings,
    ]
  );
};
