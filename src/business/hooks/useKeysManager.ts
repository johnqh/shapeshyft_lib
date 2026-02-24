/**
 * Keys Manager Hook
 *
 * Business logic hook that wraps the client `useKeys` hook with Zustand caching.
 *
 * **Data flow**:
 * 1. On mount (if `autoFetch` is true and `token` is available), fetches keys from the server
 *    via `@sudobility/shapeshyft_client`'s `useKeys` hook.
 * 2. When server data arrives, it is synced to the Zustand `useKeysStore` for caching.
 * 3. The returned `keys` array prefers fresh server data. If server data is empty
 *    (e.g., during loading or network failure), it falls back to cached data.
 * 4. The `isCached` flag indicates whether the returned data is from the cache
 *    (true) or fresh from the server (false).
 *
 * **Entity scoping**: All data is scoped by `entitySlug`. Switching entities
 * will fetch new data and update the cache under the new key.
 *
 * @module
 */

import { useCallback, useEffect, useMemo } from 'react';
import type {
  LlmApiKeyCreateRequest,
  LlmApiKeySafe,
  LlmApiKeyUpdateRequest,
  NetworkClient,
  Optional,
} from '@sudobility/shapeshyft_types';
import { type FirebaseIdToken, useKeys } from '@sudobility/shapeshyft_client';
import { useKeysStore } from '../stores/keysStore';

/**
 * Configuration for useKeysManager
 */
export interface UseKeysManagerConfig {
  /** Base URL of the ShapeShyft API (e.g., "https://api.shapeshyft.com") */
  baseUrl: string;
  /** Network client instance for making HTTP requests */
  networkClient: NetworkClient;
  /** Entity slug (organization path) to scope the keys to */
  entitySlug: string;
  /** Firebase ID token for authentication, or null if not yet authenticated */
  token: Optional<FirebaseIdToken>;
  /** Enable testnet/sandbox mode (default: false) */
  testMode?: boolean;
  /**
   * Auto-fetch keys on mount when token is available (default: true).
   * Set to false to defer fetching until `refresh()` is called manually.
   */
  autoFetch?: boolean;
}

/**
 * Return type for useKeysManager
 */
export interface UseKeysManagerReturn {
  /** Array of LLM API keys. Falls back to cached data if server data is unavailable. */
  keys: LlmApiKeySafe[];
  /** Whether keys are currently being fetched from the server */
  isLoading: boolean;
  /** Error message from the most recent operation, or null */
  error: Optional<string>;
  /** Whether the returned keys are from the Zustand cache (not fresh from server) */
  isCached: boolean;
  /** Unix timestamp (ms) when the cache was last updated, or null if not cached */
  cachedAt: Optional<number>;

  /** Force refresh keys from the server, bypassing cache */
  refresh: () => Promise<void>;
  /** Create a new LLM API key */
  createKey: (data: LlmApiKeyCreateRequest) => Promise<void>;
  /** Update an existing LLM API key */
  updateKey: (keyId: string, data: LlmApiKeyUpdateRequest) => Promise<void>;
  /** Delete an LLM API key by its UUID */
  deleteKey: (keyId: string) => Promise<void>;
  /** Clear the current error state */
  clearError: () => void;
}

/**
 * Manager hook for LLM API keys with Zustand caching.
 *
 * Wraps `@sudobility/shapeshyft_client`'s `useKeys` hook and adds:
 * - Automatic cache synchronization to `useKeysStore`
 * - Cache fallback when server data is empty
 * - `isCached`/`cachedAt` metadata for UI staleness indicators
 *
 * @example
 * ```tsx
 * const { keys, isLoading, createKey } = useKeysManager({
 *   baseUrl: "https://api.shapeshyft.com",
 *   networkClient,
 *   entitySlug: "my-org",
 *   token: firebaseToken,
 * });
 * ```
 */
export const useKeysManager = ({
  baseUrl,
  networkClient,
  entitySlug,
  token,
  testMode = false,
  autoFetch = true,
}: UseKeysManagerConfig): UseKeysManagerReturn => {
  const {
    keys: clientKeys,
    isLoading,
    error,
    refetch,
    createKey: clientCreateKey,
    updateKey: clientUpdateKey,
    deleteKey: clientDeleteKey,
    clearError,
  } = useKeys(networkClient, baseUrl, entitySlug, token ?? null, {
    testMode,
    enabled: autoFetch,
  });

  const cacheEntry = useKeysStore(
    useCallback(state => state.cache[entitySlug], [entitySlug])
  );
  const setKeys = useKeysStore(state => state.setKeys);

  // Get cached data
  const cachedKeys = cacheEntry?.keys;
  const cachedAt = cacheEntry?.cachedAt;

  // Determine data source - prefer fresh client data, fall back to cache
  const keys = useMemo(
    () => (clientKeys.length > 0 ? clientKeys : (cachedKeys ?? [])),
    [clientKeys, cachedKeys]
  );
  const isCached = clientKeys.length === 0 && (cachedKeys?.length ?? 0) > 0;

  // Sync client data to store when it changes
  useEffect(() => {
    if (clientKeys.length > 0) {
      setKeys(entitySlug, clientKeys);
    }
  }, [clientKeys, entitySlug, setKeys]);

  /**
   * Refresh keys from server
   */
  const refresh = useCallback(async (): Promise<void> => {
    await refetch();
  }, [refetch]);

  /**
   * Create a new key
   */
  const createKey = useCallback(
    async (data: LlmApiKeyCreateRequest): Promise<void> => {
      await clientCreateKey(data);
    },
    [clientCreateKey]
  );

  /**
   * Update a key
   */
  const updateKey = useCallback(
    async (keyId: string, data: LlmApiKeyUpdateRequest): Promise<void> => {
      await clientUpdateKey(keyId, data);
    },
    [clientUpdateKey]
  );

  /**
   * Delete a key
   */
  const deleteKey = useCallback(
    async (keyId: string): Promise<void> => {
      await clientDeleteKey(keyId);
    },
    [clientDeleteKey]
  );

  return useMemo(
    () => ({
      keys,
      isLoading,
      error,
      isCached,
      cachedAt: cachedAt ?? null,
      refresh,
      createKey,
      updateKey,
      deleteKey,
      clearError,
    }),
    [
      keys,
      isLoading,
      error,
      clearError,
      isCached,
      cachedAt,
      refresh,
      createKey,
      updateKey,
      deleteKey,
    ]
  );
};
