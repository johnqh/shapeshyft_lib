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
  entitySlug: string;
  projectId: string;
  token: Optional<FirebaseIdToken>;
  /** Testnet/sandbox mode */
  testMode?: boolean;
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

  refresh: () => Promise<void>;
  createEndpoint: (data: EndpointCreateRequest) => Promise<Endpoint | null>;
  updateEndpoint: (
    endpointId: string,
    data: EndpointUpdateRequest
  ) => Promise<boolean>;
  deleteEndpoint: (endpointId: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Manager hook for endpoints with caching
 */
export const useEndpointsManager = ({
  baseUrl,
  networkClient,
  entitySlug,
  projectId,
  token,
  testMode = false,
  autoFetch = true,
  params,
}: UseEndpointsManagerConfig): UseEndpointsManagerReturn => {
  const {
    endpoints: clientEndpoints,
    isLoading,
    error,
    refetch,
    createEndpoint: clientCreateEndpoint,
    updateEndpoint: clientUpdateEndpoint,
    deleteEndpoint: clientDeleteEndpoint,
    clearError,
  } = useEndpoints(networkClient, baseUrl, entitySlug, projectId, token ?? null, {
    testMode,
    enabled: autoFetch,
    params,
  });

  const cacheKey = useMemo(
    () => `${entitySlug}:${projectId}`,
    [entitySlug, projectId]
  );
  const cacheEntry = useEndpointsStore(
    useCallback(state => state.cache[cacheKey], [cacheKey])
  );
  const setEndpoints = useEndpointsStore(state => state.setEndpoints);

  // Get cached data
  const cachedEndpoints = cacheEntry?.endpoints;
  const cachedAt = cacheEntry?.cachedAt;

  // Determine data source - memoize to prevent dependency changes
  const endpoints = useMemo(
    () =>
      clientEndpoints.length > 0 ? clientEndpoints : (cachedEndpoints ?? []),
    [clientEndpoints, cachedEndpoints]
  );
  const isCached =
    clientEndpoints.length === 0 && (cachedEndpoints?.length ?? 0) > 0;

  // Sync client data to store
  useEffect(() => {
    if (clientEndpoints.length > 0) {
      setEndpoints(entitySlug, projectId, clientEndpoints);
    }
  }, [clientEndpoints, entitySlug, projectId, setEndpoints]);

  /**
   * Refresh endpoints from server
   */
  const refresh = useCallback(async (): Promise<void> => {
    await refetch();
  }, [refetch]);

  /**
   * Create a new endpoint
   */
  const createEndpoint = useCallback(
    async (data: EndpointCreateRequest): Promise<Endpoint | null> => {
      const response = await clientCreateEndpoint(data);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    [clientCreateEndpoint]
  );

  /**
   * Update an endpoint
   */
  const updateEndpoint = useCallback(
    async (
      endpointId: string,
      data: EndpointUpdateRequest
    ): Promise<boolean> => {
      const response = await clientUpdateEndpoint(endpointId, data);
      return response.success;
    },
    [clientUpdateEndpoint]
  );

  /**
   * Delete an endpoint
   */
  const deleteEndpoint = useCallback(
    async (endpointId: string): Promise<void> => {
      await clientDeleteEndpoint(endpointId);
    },
    [clientDeleteEndpoint]
  );

  return useMemo(
    () => ({
      endpoints,
      isLoading,
      error,
      isCached,
      cachedAt: cachedAt ?? null,
      refresh,
      createEndpoint,
      updateEndpoint,
      deleteEndpoint,
      clearError,
    }),
    [
      endpoints,
      isLoading,
      error,
      clearError,
      isCached,
      cachedAt,
      refresh,
      createEndpoint,
      updateEndpoint,
      deleteEndpoint,
    ]
  );
};
