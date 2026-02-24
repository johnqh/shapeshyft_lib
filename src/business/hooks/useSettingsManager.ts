/**
 * Settings Manager Hook
 *
 * Business logic hook that wraps the client `useSettings` hook with Zustand caching.
 *
 * **Data flow**:
 * 1. On mount (if `autoFetch` is true and `token` is available), fetches settings from the server.
 * 2. Server data is synced to `useSettingsStore` for caching.
 * 3. Returns fresh server data when available, falls back to cached data otherwise.
 * 4. `isCached` flag indicates whether the data source is the cache.
 *
 * **User scoping**: All data is scoped by `userId`.
 *
 * @module
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
  /** Base URL of the ShapeShyft API */
  baseUrl: string;
  /** Network client instance for making HTTP requests */
  networkClient: NetworkClient;
  /** User ID to fetch settings for */
  userId: string;
  /** Firebase ID token for authentication, or null if not yet authenticated */
  token: Optional<FirebaseIdToken>;
  /** Enable testnet/sandbox mode (default: false) */
  testMode?: boolean;
  /**
   * Auto-fetch settings on mount when token is available (default: true).
   * Set to false to defer fetching until `refresh()` is called manually.
   */
  autoFetch?: boolean;
}

/**
 * Return type for useSettingsManager
 */
export interface UseSettingsManagerReturn {
  /** User settings. Falls back to cached data if server data is unavailable. Null if neither available. */
  settings: Optional<UserSettings>;
  /** Whether settings are currently being fetched from the server */
  isLoading: boolean;
  /** Error message from the most recent operation, or null */
  error: Optional<string>;
  /** Whether the returned settings are from the Zustand cache */
  isCached: boolean;
  /** Unix timestamp (ms) when the cache was last updated, or null */
  cachedAt: Optional<number>;

  /** Force refresh settings from the server */
  refresh: () => Promise<void>;
  /** Update user settings */
  updateSettings: (data: UserSettingsUpdateRequest) => Promise<void>;
  /** Clear the current error state */
  clearError: () => void;
}

/**
 * Manager hook for user settings with Zustand caching.
 *
 * @example
 * ```tsx
 * const { settings, isLoading, updateSettings } = useSettingsManager({
 *   baseUrl: "https://api.shapeshyft.com",
 *   networkClient,
 *   userId: "user-123",
 *   token: firebaseToken,
 * });
 * ```
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
