/**
 * Endpoints Manager Hook
 * Business logic hook that wraps the client useEndpoints hook with Zustand caching
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
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
  autoFetch = true,
  params,
}: UseEndpointsManagerConfig): UseEndpointsManagerReturn => {
  const {
    endpoints: clientEndpoints,
    isLoading,
    error,
    refresh: clientRefresh,
    createEndpoint: clientCreateEndpoint,
    updateEndpoint: clientUpdateEndpoint,
    deleteEndpoint: clientDeleteEndpoint,
    clearError,
  } = useEndpoints(networkClient, baseUrl);
  const cacheKey = useMemo(
    () => `${entitySlug}:${projectId}`,
    [entitySlug, projectId]
  );
  const cacheEntry = useEndpointsStore(
    useCallback(state => state.cache[cacheKey], [cacheKey])
  );
  const setEndpoints = useEndpointsStore(state => state.setEndpoints);
  const addEndpoint = useEndpointsStore(state => state.addEndpoint);
  const updateEndpointInStore = useEndpointsStore(
    state => state.updateEndpoint
  );
  const removeEndpoint = useEndpointsStore(state => state.removeEndpoint);

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
  const refresh = useCallback(
    async (queryParams?: EndpointQueryParams): Promise<void> => {
      if (!token) {
        return;
      }
      await clientRefresh(entitySlug, projectId, token, queryParams ?? params);
    },
    [clientRefresh, entitySlug, projectId, token, params]
  );

  /**
   * Create a new endpoint
   */
  const createEndpoint = useCallback(
    async (data: EndpointCreateRequest): Promise<void> => {
      if (!token) {
        return;
      }
      const response = await clientCreateEndpoint(
        entitySlug,
        projectId,
        data,
        token
      );
      if (response.success && response.data) {
        addEndpoint(entitySlug, projectId, response.data);
      }
    },
    [clientCreateEndpoint, entitySlug, projectId, token, addEndpoint]
  );

  /**
   * Update an endpoint
   */
  const updateEndpoint = useCallback(
    async (
      endpointId: string,
      data: EndpointUpdateRequest
    ): Promise<boolean> => {
      if (!token) {
        return false;
      }
      const response = await clientUpdateEndpoint(
        entitySlug,
        projectId,
        endpointId,
        data,
        token
      );
      if (response.success && response.data) {
        updateEndpointInStore(entitySlug, projectId, endpointId, response.data);
        return true;
      }
      return false;
    },
    [clientUpdateEndpoint, entitySlug, projectId, token, updateEndpointInStore]
  );

  /**
   * Delete an endpoint
   */
  const deleteEndpoint = useCallback(
    async (endpointId: string): Promise<void> => {
      if (!token) {
        return;
      }
      const response = await clientDeleteEndpoint(
        entitySlug,
        projectId,
        endpointId,
        token
      );
      if (response.success) {
        removeEndpoint(entitySlug, projectId, endpointId);
      }
    },
    [clientDeleteEndpoint, entitySlug, projectId, token, removeEndpoint]
  );

  // Track if we've already attempted auto-fetch to prevent retry loops
  const hasAttemptedFetchRef = useRef(false);

  // Auto-fetch on mount (only once per token)
  useEffect(() => {
    if (
      autoFetch &&
      token &&
      endpoints.length === 0 &&
      !hasAttemptedFetchRef.current
    ) {
      hasAttemptedFetchRef.current = true;
      refresh();
    }
  }, [autoFetch, token, endpoints.length, refresh]);

  // Reset attempt flag when token changes (e.g., user re-authenticates)
  useEffect(() => {
    hasAttemptedFetchRef.current = false;
  }, [token]);

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
