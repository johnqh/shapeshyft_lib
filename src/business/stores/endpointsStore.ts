/**
 * Endpoints Store
 *
 * Zustand store for caching endpoints by entity slug and project ID.
 * Uses a composite cache key of `entitySlug:projectId` to support
 * caching endpoints for multiple projects across multiple entities.
 *
 * This is a global singleton store that persists across React renders
 * and unmounts.
 *
 * **Important**: Call `clearEndpoints()`, `clearEntityEndpoints()`, or `clearAll()`
 * when the user switches entities or logs out to avoid leaking data between sessions.
 *
 * @module
 */

import { create } from 'zustand';
import type { Endpoint } from '@sudobility/shapeshyft_types';

/**
 * Endpoints cache entry containing the cached endpoints and metadata.
 */
interface EndpointsCacheEntry {
  /** Array of endpoints for this project */
  endpoints: Endpoint[];
  /** Unix timestamp (ms) when this data was cached */
  cachedAt: number;
}

/**
 * Create a composite cache key from entitySlug and projectId.
 * Format: `"entitySlug:projectId"`
 */
function makeCacheKey(entitySlug: string, projectId: string): string {
  return `${entitySlug}:${projectId}`;
}

/**
 * Endpoints store state and actions.
 *
 * All methods are scoped by `entitySlug` and `projectId` to support
 * multi-entity, multi-project caching.
 */
interface EndpointsStoreState {
  /** Cache of endpoints keyed by composite key `entitySlug:projectId` */
  cache: Record<string, EndpointsCacheEntry>;

  /**
   * Replace all cached endpoints for an entity/project pair.
   * Overwrites any existing cache entry and updates the `cachedAt` timestamp.
   */
  setEndpoints: (
    entitySlug: string,
    projectId: string,
    endpoints: Endpoint[]
  ) => void;

  /**
   * Get the cached endpoints array for an entity/project pair.
   * @returns The endpoints array, or `undefined` if no cache entry exists.
   */
  getEndpoints: (
    entitySlug: string,
    projectId: string
  ) => Endpoint[] | undefined;

  /**
   * Get the full cache entry (endpoints + metadata) for an entity/project pair.
   * @returns The cache entry with `endpoints` and `cachedAt`, or `undefined` if not cached.
   */
  getCacheEntry: (
    entitySlug: string,
    projectId: string
  ) => EndpointsCacheEntry | undefined;

  /**
   * Add a single endpoint to the entity/project cache.
   * If no cache entry exists, a new entry is created with just this endpoint.
   * If an entry already exists, the endpoint is appended to the existing array.
   */
  addEndpoint: (
    entitySlug: string,
    projectId: string,
    endpoint: Endpoint
  ) => void;

  /**
   * Update a specific endpoint in the cache by its UUID.
   * Matches endpoints by `endpoint.uuid === endpointId`. If no cache entry exists,
   * or the endpoint ID is not found, the state is not modified.
   */
  updateEndpoint: (
    entitySlug: string,
    projectId: string,
    endpointId: string,
    endpoint: Endpoint
  ) => void;

  /**
   * Remove a specific endpoint from the cache by its UUID.
   * If no cache entry exists, the state is not modified.
   */
  removeEndpoint: (
    entitySlug: string,
    projectId: string,
    endpointId: string
  ) => void;

  /**
   * Clear the cache entry for a specific entity/project pair.
   * After this call, `getEndpoints(entitySlug, projectId)` will return `undefined`.
   */
  clearEndpoints: (entitySlug: string, projectId: string) => void;

  /**
   * Clear all cache entries for a specific entity (across all projects).
   * Useful when a user leaves an organization.
   */
  clearEntityEndpoints: (entitySlug: string) => void;

  /**
   * Clear all cached endpoints for all entities and projects.
   * Should be called on logout to prevent data leakage.
   */
  clearAll: () => void;
}

/**
 * Zustand store for endpoints caching.
 *
 * This store is a global singleton -- it persists across renders and unmounts.
 * Use `clearAll()` on logout to prevent data leakage between entities.
 *
 * @example
 * ```ts
 * // Read endpoints for a project
 * const endpoints = useEndpointsStore.getState().getEndpoints(entitySlug, projectId);
 *
 * // Subscribe to endpoints in a React component
 * const endpoints = useEndpointsStore(state => state.getEndpoints(entitySlug, projectId));
 *
 * // Add a new endpoint
 * useEndpointsStore.getState().addEndpoint(entitySlug, projectId, newEndpoint);
 * ```
 */
export const useEndpointsStore = create<EndpointsStoreState>((set, get) => ({
  cache: {},

  setEndpoints: (
    entitySlug: string,
    projectId: string,
    endpoints: Endpoint[]
  ) => {
    const key = makeCacheKey(entitySlug, projectId);
    set(state => ({
      cache: {
        ...state.cache,
        [key]: {
          endpoints,
          cachedAt: Date.now(),
        },
      },
    }));
  },

  getEndpoints: (entitySlug: string, projectId: string) => {
    const key = makeCacheKey(entitySlug, projectId);
    const entry = get().cache[key];
    return entry?.endpoints;
  },

  getCacheEntry: (entitySlug: string, projectId: string) => {
    const key = makeCacheKey(entitySlug, projectId);
    return get().cache[key];
  },

  addEndpoint: (entitySlug: string, projectId: string, endpoint: Endpoint) => {
    const key = makeCacheKey(entitySlug, projectId);
    set(state => {
      const existing = state.cache[key];
      if (!existing) {
        return {
          cache: {
            ...state.cache,
            [key]: {
              endpoints: [endpoint],
              cachedAt: Date.now(),
            },
          },
        };
      }
      return {
        cache: {
          ...state.cache,
          [key]: {
            endpoints: [...existing.endpoints, endpoint],
            cachedAt: Date.now(),
          },
        },
      };
    });
  },

  updateEndpoint: (
    entitySlug: string,
    projectId: string,
    endpointId: string,
    endpoint: Endpoint
  ) => {
    const key = makeCacheKey(entitySlug, projectId);
    set(state => {
      const existing = state.cache[key];
      if (!existing) return state;
      return {
        cache: {
          ...state.cache,
          [key]: {
            endpoints: existing.endpoints.map(e =>
              e.uuid === endpointId ? endpoint : e
            ),
            cachedAt: Date.now(),
          },
        },
      };
    });
  },

  removeEndpoint: (
    entitySlug: string,
    projectId: string,
    endpointId: string
  ) => {
    const key = makeCacheKey(entitySlug, projectId);
    set(state => {
      const existing = state.cache[key];
      if (!existing) return state;
      return {
        cache: {
          ...state.cache,
          [key]: {
            endpoints: existing.endpoints.filter(e => e.uuid !== endpointId),
            cachedAt: Date.now(),
          },
        },
      };
    });
  },

  clearEndpoints: (entitySlug: string, projectId: string) => {
    const key = makeCacheKey(entitySlug, projectId);
    set(state => {
      const newCache = { ...state.cache };
      delete newCache[key];
      return { cache: newCache };
    });
  },

  clearEntityEndpoints: (entitySlug: string) =>
    set(state => {
      const newCache: Record<string, EndpointsCacheEntry> = {};
      const prefix = `${entitySlug}:`;
      for (const [key, value] of Object.entries(state.cache)) {
        if (!key.startsWith(prefix)) {
          newCache[key] = value;
        }
      }
      return { cache: newCache };
    }),

  clearAll: () => set({ cache: {} }),
}));
