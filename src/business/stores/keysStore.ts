/**
 * Keys Store
 * Zustand store for caching LLM API keys by user ID
 */

import { create } from 'zustand';
import type { LlmApiKeySafe } from '@sudobility/shapeshyft_types';

/**
 * Keys cache entry
 */
interface KeysCacheEntry {
  /** Array of LLM API keys for this user */
  keys: LlmApiKeySafe[];
  /** Timestamp when this data was cached */
  cachedAt: number;
}

/**
 * Keys store state
 */
interface KeysStoreState {
  /** Cache of keys keyed by user ID */
  cache: Record<string, KeysCacheEntry>;
  /** Set keys for a specific user ID */
  setKeys: (userId: string, keys: LlmApiKeySafe[]) => void;
  /** Get keys for a specific user ID */
  getKeys: (userId: string) => LlmApiKeySafe[] | undefined;
  /** Get cache entry for a specific user ID */
  getCacheEntry: (userId: string) => KeysCacheEntry | undefined;
  /** Add a single key to the cache */
  addKey: (userId: string, key: LlmApiKeySafe) => void;
  /** Update a key in the cache */
  updateKey: (userId: string, keyId: string, key: LlmApiKeySafe) => void;
  /** Remove a key from the cache */
  removeKey: (userId: string, keyId: string) => void;
  /** Clear keys for a specific user ID */
  clearKeys: (userId: string) => void;
  /** Clear all cached keys */
  clearAll: () => void;
}

/**
 * Zustand store for keys caching
 */
export const useKeysStore = create<KeysStoreState>((set, get) => ({
  cache: {},

  setKeys: (userId: string, keys: LlmApiKeySafe[]) =>
    set(state => ({
      cache: {
        ...state.cache,
        [userId]: {
          keys,
          cachedAt: Date.now(),
        },
      },
    })),

  getKeys: (userId: string) => {
    const entry = get().cache[userId];
    return entry?.keys;
  },

  getCacheEntry: (userId: string) => {
    return get().cache[userId];
  },

  addKey: (userId: string, key: LlmApiKeySafe) =>
    set(state => {
      const existing = state.cache[userId];
      if (!existing) {
        return {
          cache: {
            ...state.cache,
            [userId]: {
              keys: [key],
              cachedAt: Date.now(),
            },
          },
        };
      }
      return {
        cache: {
          ...state.cache,
          [userId]: {
            keys: [...existing.keys, key],
            cachedAt: Date.now(),
          },
        },
      };
    }),

  updateKey: (userId: string, keyId: string, key: LlmApiKeySafe) =>
    set(state => {
      const existing = state.cache[userId];
      if (!existing) return state;
      return {
        cache: {
          ...state.cache,
          [userId]: {
            keys: existing.keys.map(k => (k.uuid === keyId ? key : k)),
            cachedAt: Date.now(),
          },
        },
      };
    }),

  removeKey: (userId: string, keyId: string) =>
    set(state => {
      const existing = state.cache[userId];
      if (!existing) return state;
      return {
        cache: {
          ...state.cache,
          [userId]: {
            keys: existing.keys.filter(k => k.uuid !== keyId),
            cachedAt: Date.now(),
          },
        },
      };
    }),

  clearKeys: (userId: string) =>
    set(state => {
      const newCache = { ...state.cache };
      delete newCache[userId];
      return { cache: newCache };
    }),

  clearAll: () => set({ cache: {} }),
}));
