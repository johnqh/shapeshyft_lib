/**
 * Keys Manager Hook
 * Business logic hook that wraps the client useKeys hook with Zustand caching
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
  baseUrl: string;
  networkClient: NetworkClient;
  entitySlug: string;
  token: Optional<FirebaseIdToken>;
  /** Testnet/sandbox mode */
  testMode?: boolean;
  /** Auto-fetch on mount when token is available */
  autoFetch?: boolean;
}

/**
 * Return type for useKeysManager
 */
export interface UseKeysManagerReturn {
  keys: LlmApiKeySafe[];
  isLoading: boolean;
  error: Optional<string>;
  isCached: boolean;
  cachedAt: Optional<number>;

  refresh: () => Promise<void>;
  createKey: (data: LlmApiKeyCreateRequest) => Promise<void>;
  updateKey: (keyId: string, data: LlmApiKeyUpdateRequest) => Promise<void>;
  deleteKey: (keyId: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Manager hook for LLM API keys with caching
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
