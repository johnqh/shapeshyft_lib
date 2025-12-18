/**
 * Endpoints Store
 * Zustand store for caching endpoints by user ID and project ID
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
 * Create a cache key from userId and projectId
 */
function makeCacheKey(userId: string, projectId: string): string {
  return `${userId}:${projectId}`;
}

/**
 * Endpoints store state
 */
interface EndpointsStoreState {
  /** Cache of endpoints keyed by userId:projectId */
  cache: Record<string, EndpointsCacheEntry>;
  /** Set endpoints for a specific user/project */
  setEndpoints: (
    userId: string,
    projectId: string,
    endpoints: Endpoint[]
  ) => void;
  /** Get endpoints for a specific user/project */
  getEndpoints: (userId: string, projectId: string) => Endpoint[] | undefined;
  /** Get cache entry for a specific user/project */
  getCacheEntry: (
    userId: string,
    projectId: string
  ) => EndpointsCacheEntry | undefined;
  /** Add a single endpoint to the cache */
  addEndpoint: (userId: string, projectId: string, endpoint: Endpoint) => void;
  /** Update an endpoint in the cache */
  updateEndpoint: (
    userId: string,
    projectId: string,
    endpointId: string,
    endpoint: Endpoint
  ) => void;
  /** Remove an endpoint from the cache */
  removeEndpoint: (
    userId: string,
    projectId: string,
    endpointId: string
  ) => void;
  /** Clear endpoints for a specific user/project */
  clearEndpoints: (userId: string, projectId: string) => void;
  /** Clear all endpoints for a user */
  clearUserEndpoints: (userId: string) => void;
  /** Clear all cached endpoints */
  clearAll: () => void;
}

/**
 * Zustand store for endpoints caching
 */
export const useEndpointsStore = create<EndpointsStoreState>((set, get) => ({
  cache: {},

  setEndpoints: (userId: string, projectId: string, endpoints: Endpoint[]) => {
    const key = makeCacheKey(userId, projectId);
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

  getEndpoints: (userId: string, projectId: string) => {
    const key = makeCacheKey(userId, projectId);
    const entry = get().cache[key];
    return entry?.endpoints;
  },

  getCacheEntry: (userId: string, projectId: string) => {
    const key = makeCacheKey(userId, projectId);
    return get().cache[key];
  },

  addEndpoint: (userId: string, projectId: string, endpoint: Endpoint) => {
    const key = makeCacheKey(userId, projectId);
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
    userId: string,
    projectId: string,
    endpointId: string,
    endpoint: Endpoint
  ) => {
    const key = makeCacheKey(userId, projectId);
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

  removeEndpoint: (userId: string, projectId: string, endpointId: string) => {
    const key = makeCacheKey(userId, projectId);
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

  clearEndpoints: (userId: string, projectId: string) => {
    const key = makeCacheKey(userId, projectId);
    set(state => {
      const newCache = { ...state.cache };
      delete newCache[key];
      return { cache: newCache };
    });
  },

  clearUserEndpoints: (userId: string) =>
    set(state => {
      const newCache: Record<string, EndpointsCacheEntry> = {};
      const prefix = `${userId}:`;
      for (const [key, value] of Object.entries(state.cache)) {
        if (!key.startsWith(prefix)) {
          newCache[key] = value;
        }
      }
      return { cache: newCache };
    }),

  clearAll: () => set({ cache: {} }),
}));
