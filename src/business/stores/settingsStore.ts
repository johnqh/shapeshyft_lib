/**
 * Settings Store
 * Zustand store for caching user settings by user ID
 */

import { create } from 'zustand';
import type { UserSettings } from '@sudobility/shapeshyft_types';

/**
 * Settings cache entry
 */
interface SettingsCacheEntry {
  /** User settings data */
  settings: UserSettings;
  /** Timestamp when this data was cached */
  cachedAt: number;
}

/**
 * Settings store state
 */
interface SettingsStoreState {
  /** Cache of settings keyed by user ID */
  cache: Record<string, SettingsCacheEntry>;
  /** Set settings for a specific user ID */
  setSettings: (userId: string, settings: UserSettings) => void;
  /** Get settings for a specific user ID */
  getSettings: (userId: string) => UserSettings | undefined;
  /** Get cache entry for a specific user ID */
  getCacheEntry: (userId: string) => SettingsCacheEntry | undefined;
  /** Clear settings for a specific user ID */
  clearSettings: (userId: string) => void;
  /** Clear all cached settings */
  clearAll: () => void;
}

/**
 * Zustand store for settings caching
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
