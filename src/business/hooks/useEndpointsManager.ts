/**
 * Endpoints Manager Hook
 * Business logic hook that wraps the client useEndpoints hook with Zustand caching
 */

import { useCallback, useEffect, useMemo } from 'react';
import type {
  Endpoint,
  EndpointCreateRequest,
  EndpointQueryParams,
  EndpointUpdateRequest,
  NetworkClient,
  Optional,
} from '@sudobility/shapeshyft_types';
import {
  type FirebaseIdToken,
  useEndpoints,
} from '@sudobility/shapeshyft_client';
import { useEndpointsStore } from '../stores/endpointsStore';

/**
 * Configuration for useEndpointsManager
 */
export interface UseEndpointsManagerConfig {
  baseUrl: string;
  networkClient: NetworkClient;
  userId: string;
  projectId: string;
  token: Optional<FirebaseIdToken>;
  /** Auto-fetch on mount when token is available */
  autoFetch?: boolean;
  /** Query params for filtering */
  params?: EndpointQueryParams;
}

/**
 * Return type for useEndpointsManager
 */
export interface UseEndpointsManagerReturn {
  endpoints: Endpoint[];
  isLoading: boolean;
  error: Optional<string>;
  isCached: boolean;
  cachedAt: Optional<number>;

  refresh: (params?: EndpointQueryParams) => Promise<void>;
  createEndpoint: (data: EndpointCreateRequest) => Promise<void>;
  updateEndpoint: (
    endpointId: string,
    data: EndpointUpdateRequest
  ) => Promise<void>;
  deleteEndpoint: (endpointId: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Manager hook for endpoints with caching
 */
export const useEndpointsManager = ({
  baseUrl,
  networkClient,
  userId,
  projectId,
  token,
  autoFetch = true,
  params,
}: UseEndpointsManagerConfig): UseEndpointsManagerReturn => {
  const clientHook = useEndpoints(networkClient, baseUrl);
  const store = useEndpointsStore();

  // Get cached data
  const cacheEntry = store.getCacheEntry(userId, projectId);
  const cachedEndpoints = cacheEntry?.endpoints;
  const cachedAt = cacheEntry?.cachedAt;

  // Determine data source - memoize to prevent dependency changes
  const endpoints = useMemo(
    () =>
      clientHook.endpoints.length > 0
        ? clientHook.endpoints
        : (cachedEndpoints ?? []),
    [clientHook.endpoints, cachedEndpoints]
  );
  const isCached =
    clientHook.endpoints.length === 0 && (cachedEndpoints?.length ?? 0) > 0;

  // Sync client data to store
  useEffect(() => {
    if (clientHook.endpoints.length > 0) {
      store.setEndpoints(userId, projectId, clientHook.endpoints);
    }
  }, [clientHook.endpoints, userId, projectId, store]);

  /**
   * Refresh endpoints from server
   */
  const refresh = useCallback(
    async (queryParams?: EndpointQueryParams): Promise<void> => {
      if (!token) {
        return;
      }
      await clientHook.refresh(userId, projectId, token, queryParams ?? params);
    },
    [clientHook, userId, projectId, token, params]
  );

  /**
   * Create a new endpoint
   */
  const createEndpoint = useCallback(
    async (data: EndpointCreateRequest): Promise<void> => {
      if (!token) {
        return;
      }
      const response = await clientHook.createEndpoint(
        userId,
        projectId,
        data,
        token
      );
      if (response.success && response.data) {
        store.addEndpoint(userId, projectId, response.data);
      }
    },
    [clientHook, userId, projectId, token, store]
  );

  /**
   * Update an endpoint
   */
  const updateEndpoint = useCallback(
    async (endpointId: string, data: EndpointUpdateRequest): Promise<void> => {
      if (!token) {
        return;
      }
      const response = await clientHook.updateEndpoint(
        userId,
        projectId,
        endpointId,
        data,
        token
      );
      if (response.success && response.data) {
        store.updateEndpoint(userId, projectId, endpointId, response.data);
      }
    },
    [clientHook, userId, projectId, token, store]
  );

  /**
   * Delete an endpoint
   */
  const deleteEndpoint = useCallback(
    async (endpointId: string): Promise<void> => {
      if (!token) {
        return;
      }
      const response = await clientHook.deleteEndpoint(
        userId,
        projectId,
        endpointId,
        token
      );
      if (response.success) {
        store.removeEndpoint(userId, projectId, endpointId);
      }
    },
    [clientHook, userId, projectId, token, store]
  );

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && token && endpoints.length === 0) {
      refresh();
    }
  }, [autoFetch, token, endpoints.length, refresh]);

  return useMemo(
    () => ({
      endpoints,
      isLoading: clientHook.isLoading,
      error: clientHook.error,
      isCached,
      cachedAt: cachedAt ?? null,
      refresh,
      createEndpoint,
      updateEndpoint,
      deleteEndpoint,
      clearError: clientHook.clearError,
    }),
    [
      endpoints,
      clientHook.isLoading,
      clientHook.error,
      clientHook.clearError,
      isCached,
      cachedAt,
      refresh,
      createEndpoint,
      updateEndpoint,
      deleteEndpoint,
    ]
  );
};
