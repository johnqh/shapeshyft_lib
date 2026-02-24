/**
 * Settings Store
 *
 * Zustand store for caching user settings by user ID. This is a global
 * singleton store that persists across React renders and unmounts.
 *
 * Unlike the `useBudgetStore` and `useProviderModelsStore`, this store
 * does **not** use the `persist` middleware and is purely in-memory.
 * Settings are re-fetched from the server on each session.
 *
 * **Important**: Call `clearSettings(userId)` or `clearAll()` when the user
 * logs out to avoid leaking data between sessions.
 *
 * @module
 */

import { create } from 'zustand';
import type { UserSettings } from '@sudobility/shapeshyft_types';

/**
 * Settings cache entry containing the cached settings and metadata.
 */
interface SettingsCacheEntry {
  /** User settings data */
  settings: UserSettings;
  /** Unix timestamp (ms) when this data was cached */
  cachedAt: number;
}

/**
 * Settings store state and actions.
 *
 * All methods are scoped by `userId` to support multi-user caching.
 */
interface SettingsStoreState {
  /** Cache of settings keyed by user ID */
  cache: Record<string, SettingsCacheEntry>;

  /**
   * Set (replace) the cached settings for a user.
   * Overwrites any existing cache entry and updates the `cachedAt` timestamp.
   */
  setSettings: (userId: string, settings: UserSettings) => void;

  /**
   * Get the cached settings for a user.
   * @returns The settings object, or `undefined` if no cache entry exists.
   */
  getSettings: (userId: string) => UserSettings | undefined;

  /**
   * Get the full cache entry (settings + metadata) for a user.
   * @returns The cache entry with `settings` and `cachedAt`, or `undefined` if not cached.
   */
  getCacheEntry: (userId: string) => SettingsCacheEntry | undefined;

  /**
   * Clear the cache entry for a specific user.
   * After this call, `getSettings(userId)` will return `undefined`.
   */
  clearSettings: (userId: string) => void;

  /**
   * Clear all cached settings for all users.
   * Should be called on logout to prevent data leakage.
   */
  clearAll: () => void;
}

/**
 * Zustand store for user settings caching.
 *
 * This store is a global singleton -- it persists across renders and unmounts.
 * Use `clearAll()` on logout to prevent data leakage between users.
 *
 * @example
 * ```ts
 * // Read settings for a user
 * const settings = useSettingsStore.getState().getSettings(userId);
 *
 * // Subscribe to settings in a React component
 * const settings = useSettingsStore(state => state.getSettings(userId));
 * ```
 */
export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  cache: {},

  setSettings: (userId: string, settings: UserSettings) =>
    set(state => ({
      cache: {
        ...state.cache,
        [userId]: {
          settings,
          cachedAt: Date.now(),
        },
      },
    })),

  getSettings: (userId: string) => {
    const entry = get().cache[userId];
    return entry?.settings;
  },

  getCacheEntry: (userId: string) => {
    return get().cache[userId];
  },

  clearSettings: (userId: string) =>
    set(state => {
      const newCache = { ...state.cache };
      delete newCache[userId];
      return { cache: newCache };
    }),

  clearAll: () => set({ cache: {} }),
}));
