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
  const clientHook = useKeys(networkClient, baseUrl);
  const store = useKeysStore();

  // Get cached data
  const cacheEntry = store.getCacheEntry(userId);
  const cachedKeys = cacheEntry?.keys;
  const cachedAt = cacheEntry?.cachedAt;

  // Determine data source - prefer fresh client data, fall back to cache
  const keys = useMemo(
    () => (clientHook.keys.length > 0 ? clientHook.keys : (cachedKeys ?? [])),
    [clientHook.keys, cachedKeys]
  );
  const isCached =
    clientHook.keys.length === 0 && (cachedKeys?.length ?? 0) > 0;

  // Sync client data to store when it changes
  useEffect(() => {
    if (clientHook.keys.length > 0) {
      store.setKeys(userId, clientHook.keys);
    }
  }, [clientHook.keys, userId, store]);

  /**
   * Refresh keys from server
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (!token) {
      return;
    }
    await clientHook.refresh(userId, token);
  }, [clientHook, userId, token]);

  /**
   * Create a new key
   */
  const createKey = useCallback(
    async (data: LlmApiKeyCreateRequest): Promise<void> => {
      if (!token) {
        return;
      }
      const response = await clientHook.createKey(userId, data, token);
      if (response.success && response.data) {
        store.addKey(userId, response.data);
      }
    },
    [clientHook, userId, token, store]
  );

  /**
   * Update a key
   */
  const updateKey = useCallback(
    async (keyId: string, data: LlmApiKeyUpdateRequest): Promise<void> => {
      if (!token) {
        return;
      }
      const response = await clientHook.updateKey(userId, keyId, data, token);
      if (response.success && response.data) {
        store.updateKey(userId, keyId, response.data);
      }
    },
    [clientHook, userId, token, store]
  );

  /**
   * Delete a key
   */
  const deleteKey = useCallback(
    async (keyId: string): Promise<void> => {
      if (!token) {
        return;
      }
      const response = await clientHook.deleteKey(userId, keyId, token);
      if (response.success) {
        store.removeKey(userId, keyId);
      }
    },
    [clientHook, userId, token, store]
  );

  // Auto-fetch on mount if enabled and token is available
  useEffect(() => {
    if (autoFetch && token && keys.length === 0) {
      refresh();
    }
  }, [autoFetch, token, keys.length, refresh]);

  return useMemo(
    () => ({
      keys,
      isLoading: clientHook.isLoading,
      error: clientHook.error,
      isCached,
      cachedAt: cachedAt ?? null,
      refresh,
      createKey,
      updateKey,
      deleteKey,
      clearError: clientHook.clearError,
    }),
    [
      keys,
      clientHook.isLoading,
      clientHook.error,
      clientHook.clearError,
      isCached,
      cachedAt,
      refresh,
      createKey,
      updateKey,
      deleteKey,
    ]
  );
};
