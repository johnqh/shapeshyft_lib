/**
 * Endpoints Manager Hook
 *
 * Business logic hook that wraps the client `useEndpoints` hook with Zustand caching.
 *
 * **Data flow**:
 * 1. On mount (if `autoFetch` is true and `token` is available), fetches endpoints from the server.
 * 2. Server data is synced to `useEndpointsStore` using the composite key `entitySlug:projectId`.
 * 3. Returns fresh server data when available, falls back to cached data otherwise.
 * 4. `isCached` flag indicates whether the data source is the cache.
 *
 * **Scoping**: Data is scoped by both `entitySlug` and `projectId`.
 *
 * @module
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
  /** Base URL of the ShapeShyft API */
  baseUrl: string;
  /** Network client instance for making HTTP requests */
  networkClient: NetworkClient;
  /** Entity slug (organization path) to scope the endpoints to */
  entitySlug: string;
  /** Project UUID to fetch endpoints for */
  projectId: string;
  /** Firebase ID token for authentication, or null if not yet authenticated */
  token: Optional<FirebaseIdToken>;
  /** Enable testnet/sandbox mode (default: false) */
  testMode?: boolean;
  /**
   * Auto-fetch endpoints on mount when token is available (default: true).
   * Set to false to defer fetching until `refresh()` is called manually.
   */
  autoFetch?: boolean;
  /** Optional query params for filtering endpoints */
  params?: EndpointQueryParams;
}

/**
 * Return type for useEndpointsManager
 */
export interface UseEndpointsManagerReturn {
  /** Array of endpoints. Falls back to cached data if server data is unavailable. */
  endpoints: Endpoint[];
  /** Whether endpoints are currently being fetched from the server */
  isLoading: boolean;
  /** Error message from the most recent operation, or null */
  error: Optional<string>;
  /** Whether the returned endpoints are from the Zustand cache */
  isCached: boolean;
  /** Unix timestamp (ms) when the cache was last updated, or null */
  cachedAt: Optional<number>;

  /** Force refresh endpoints from the server */
  refresh: () => Promise<void>;
  /** Create a new endpoint. Returns the created Endpoint on success, or null on failure. */
  createEndpoint: (data: EndpointCreateRequest) => Promise<Endpoint | null>;
  /** Update an existing endpoint. Returns true on success, false on failure. */
  updateEndpoint: (
    endpointId: string,
    data: EndpointUpdateRequest
  ) => Promise<boolean>;
  /** Delete an endpoint by its UUID */
  deleteEndpoint: (endpointId: string) => Promise<void>;
  /** Clear the current error state */
  clearError: () => void;
}

/**
 * Manager hook for endpoints with Zustand caching.
 *
 * @example
 * ```tsx
 * const { endpoints, isLoading, createEndpoint } = useEndpointsManager({
 *   baseUrl: "https://api.shapeshyft.com",
 *   networkClient,
 *   entitySlug: "my-org",
 *   projectId: "project-123",
 *   token: firebaseToken,
 * });
 * ```
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
  } = useEndpoints(
    networkClient,
    baseUrl,
    entitySlug,
    projectId,
    token ?? null,
    {
      testMode,
      enabled: autoFetch,
      params,
    }
  );

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
