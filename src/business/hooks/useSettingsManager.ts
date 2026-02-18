/**
 * Settings Manager Hook
 * Business logic hook that wraps the client useSettings hook with Zustand caching
 */

import { useCallback, useEffect, useMemo } from 'react';
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
  /** Testnet/sandbox mode */
  testMode?: boolean;
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
  testMode = false,
  autoFetch = true,
}: UseSettingsManagerConfig): UseSettingsManagerReturn => {
  const {
    settings: clientSettings,
    isLoading,
    error,
    refetch,
    updateSettings: clientUpdateSettings,
    clearError,
  } = useSettings(networkClient, baseUrl, userId, token ?? null, {
    testMode,
    enabled: autoFetch,
  });

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
    await refetch();
  }, [refetch]);

  /**
   * Update settings
   */
  const updateSettings = useCallback(
    async (data: UserSettingsUpdateRequest): Promise<void> => {
      await clientUpdateSettings(data);
    },
    [clientUpdateSettings]
  );

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
