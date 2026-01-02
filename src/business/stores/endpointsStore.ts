/**
 * Endpoints Store
 * Zustand store for caching endpoints by entity slug and project ID
 */

import { create } from 'zustand';
import type { Endpoint } from '@sudobility/shapeshyft_types';

/**
 * Endpoints cache entry
 */
interface EndpointsCacheEntry {
  /** Array of endpoints for this project */
  endpoints: Endpoint[];
  /** Timestamp when this data was cached */
  cachedAt: number;
}

/**
 * Create a cache key from entitySlug and projectId
 */
function makeCacheKey(entitySlug: string, projectId: string): string {
  return `${entitySlug}:${projectId}`;
}

/**
 * Endpoints store state
 */
interface EndpointsStoreState {
  /** Cache of endpoints keyed by entitySlug:projectId */
  cache: Record<string, EndpointsCacheEntry>;
  /** Set endpoints for a specific entity/project */
  setEndpoints: (
    entitySlug: string,
    projectId: string,
    endpoints: Endpoint[]
  ) => void;
  /** Get endpoints for a specific entity/project */
  getEndpoints: (
    entitySlug: string,
    projectId: string
  ) => Endpoint[] | undefined;
  /** Get cache entry for a specific entity/project */
  getCacheEntry: (
    entitySlug: string,
    projectId: string
  ) => EndpointsCacheEntry | undefined;
  /** Add a single endpoint to the cache */
  addEndpoint: (
    entitySlug: string,
    projectId: string,
    endpoint: Endpoint
  ) => void;
  /** Update an endpoint in the cache */
  updateEndpoint: (
    entitySlug: string,
    projectId: string,
    endpointId: string,
    endpoint: Endpoint
  ) => void;
  /** Remove an endpoint from the cache */
  removeEndpoint: (
    entitySlug: string,
    projectId: string,
    endpointId: string
  ) => void;
  /** Clear endpoints for a specific entity/project */
  clearEndpoints: (entitySlug: string, projectId: string) => void;
  /** Clear all endpoints for an entity */
  clearEntityEndpoints: (entitySlug: string) => void;
  /** Clear all cached endpoints */
  clearAll: () => void;
}

/**
 * Zustand store for endpoints caching
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
