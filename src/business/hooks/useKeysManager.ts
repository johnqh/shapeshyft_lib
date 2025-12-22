/**
 * Keys Manager Hook
 * Business logic hook that wraps the client useKeys hook with Zustand caching
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
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
  userId: string;
  token: Optional<FirebaseIdToken>;
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
  userId,
  token,
  autoFetch = true,
}: UseKeysManagerConfig): UseKeysManagerReturn => {
  const {
    keys: clientKeys,
    isLoading,
    error,
    refresh: clientRefresh,
    createKey: clientCreateKey,
    updateKey: clientUpdateKey,
    deleteKey: clientDeleteKey,
    clearError,
  } = useKeys(networkClient, baseUrl);
  const cacheEntry = useKeysStore(
    useCallback(state => state.cache[userId], [userId])
  );
  const setKeys = useKeysStore(state => state.setKeys);
  const addKey = useKeysStore(state => state.addKey);
  const updateKeyInStore = useKeysStore(state => state.updateKey);
  const removeKey = useKeysStore(state => state.removeKey);

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
      setKeys(userId, clientKeys);
    }
  }, [clientKeys, userId, setKeys]);

  /**
   * Refresh keys from server
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (!token) {
      return;
    }
    await clientRefresh(userId, token);
  }, [clientRefresh, userId, token]);

  /**
   * Create a new key
   */
  const createKey = useCallback(
    async (data: LlmApiKeyCreateRequest): Promise<void> => {
      if (!token) {
        return;
      }
      const response = await clientCreateKey(userId, data, token);
      if (response.success && response.data) {
        addKey(userId, response.data);
      }
    },
    [clientCreateKey, userId, token, addKey]
  );

  /**
   * Update a key
   */
  const updateKey = useCallback(
    async (keyId: string, data: LlmApiKeyUpdateRequest): Promise<void> => {
      if (!token) {
        return;
      }
      const response = await clientUpdateKey(userId, keyId, data, token);
      if (response.success && response.data) {
        updateKeyInStore(userId, keyId, response.data);
      }
    },
    [clientUpdateKey, userId, token, updateKeyInStore]
  );

  /**
   * Delete a key
   */
  const deleteKey = useCallback(
    async (keyId: string): Promise<void> => {
      if (!token) {
        return;
      }
      const response = await clientDeleteKey(userId, keyId, token);
      if (response.success) {
        removeKey(userId, keyId);
      }
    },
    [clientDeleteKey, userId, token, removeKey]
  );

  // Track if we've already attempted auto-fetch to prevent retry loops
  const hasAttemptedFetchRef = useRef(false);

  // Auto-fetch on mount (only once per token)
  useEffect(() => {
    if (
      autoFetch &&
      token &&
      keys.length === 0 &&
      !hasAttemptedFetchRef.current
    ) {
      hasAttemptedFetchRef.current = true;
      refresh();
    }
  }, [autoFetch, token, keys.length, refresh]);

  // Reset attempt flag when token changes (e.g., user re-authenticates)
  useEffect(() => {
    hasAttemptedFetchRef.current = false;
  }, [token]);

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
