/**
 * Keys Store
 *
 * Zustand store for caching LLM API keys by user ID. This is a global
 * singleton store that persists across React renders and unmounts.
 *
 * **Important**: Call `clearKeys(userId)` or `clearAll()` when the user
 * switches entities or logs out to avoid leaking data between sessions.
 *
 * @module
 */

import { create } from 'zustand';
import type { LlmApiKeySafe } from '@sudobility/shapeshyft_types';

/**
 * Keys cache entry containing the cached keys and metadata.
 */
interface KeysCacheEntry {
  /** Array of LLM API keys for this user */
  keys: LlmApiKeySafe[];
  /** Unix timestamp (ms) when this data was cached */
  cachedAt: number;
}

/**
 * Keys store state and actions.
 *
 * All methods are scoped by `userId` to support multi-user caching.
 */
interface KeysStoreState {
  /** Cache of keys keyed by user ID */
  cache: Record<string, KeysCacheEntry>;

  /**
   * Replace all cached keys for a user.
   * Overwrites any existing cache entry and updates the `cachedAt` timestamp.
   */
  setKeys: (userId: string, keys: LlmApiKeySafe[]) => void;

  /**
   * Get the cached keys array for a user.
   * @returns The keys array, or `undefined` if no cache entry exists.
   */
  getKeys: (userId: string) => LlmApiKeySafe[] | undefined;

  /**
   * Get the full cache entry (keys + metadata) for a user.
   * @returns The cache entry with `keys` and `cachedAt`, or `undefined` if not cached.
   */
  getCacheEntry: (userId: string) => KeysCacheEntry | undefined;

  /**
   * Add a single key to the user's cache.
   * If no cache entry exists for the user, a new entry is created with just this key.
   * If an entry already exists, the key is appended to the existing array.
   */
  addKey: (userId: string, key: LlmApiKeySafe) => void;

  /**
   * Update a specific key in the cache by its UUID.
   * Matches keys by `key.uuid === keyId`. If the user has no cache entry,
   * or the key ID is not found, the state is not modified.
   */
  updateKey: (userId: string, keyId: string, key: LlmApiKeySafe) => void;

  /**
   * Remove a specific key from the cache by its UUID.
   * If the user has no cache entry, the state is not modified.
   */
  removeKey: (userId: string, keyId: string) => void;

  /**
   * Clear the entire cache entry for a specific user.
   * After this call, `getKeys(userId)` will return `undefined`.
   */
  clearKeys: (userId: string) => void;

  /**
   * Clear all cached keys for all users.
   * Should be called on logout to prevent data leakage.
   */
  clearAll: () => void;
}

/**
 * Zustand store for LLM API keys caching.
 *
 * This store is a global singleton -- it persists across renders and unmounts.
 * Use `clearAll()` on logout to prevent data leakage between users.
 *
 * @example
 * ```ts
 * // Read keys for a user
 * const keys = useKeysStore.getState().getKeys(userId);
 *
 * // Subscribe to keys in a React component
 * const keys = useKeysStore(state => state.getKeys(userId));
 *
 * // Add a new key
 * useKeysStore.getState().addKey(userId, newKey);
 * ```
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
