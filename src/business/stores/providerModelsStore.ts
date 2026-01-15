/**
 * Provider Models Store
 * Zustand store for caching provider configurations and models by provider ID
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  LlmProvider,
  ModelInfo,
  ProviderConfig,
} from '@sudobility/shapeshyft_types';

/**
 * Provider models cache entry
 */
interface ProviderModelsCacheEntry {
  /** Provider configuration */
  providerConfig: ProviderConfig;
  /** Array of models for this provider */
  models: ModelInfo[];
  /** Timestamp when this data was cached */
  cachedAt: number;
}

/**
 * Provider models store state
 */
interface ProviderModelsStoreState {
  /** Cache of provider models keyed by provider ID */
  cache: Partial<Record<LlmProvider, ProviderModelsCacheEntry>>;
  /** Set provider data for a specific provider */
  setProviderModels: (
    provider: LlmProvider,
    providerConfig: ProviderConfig,
    models: ModelInfo[]
  ) => void;
  /** Get provider data for a specific provider */
  getProviderModels: (
    provider: LlmProvider
  ) => ProviderModelsCacheEntry | undefined;
  /** Clear cache for a specific provider */
  clearProvider: (provider: LlmProvider) => void;
  /** Clear all cached provider data */
  clearAll: () => void;
  /** Check if cache entry is stale (older than maxAge in ms) */
  isStale: (provider: LlmProvider, maxAgeMs: number) => boolean;
}

/** Default cache max age: 1 hour */
export const DEFAULT_CACHE_MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Zustand store for provider models caching with localStorage persistence
 */
export const useProviderModelsStore = create<ProviderModelsStoreState>()(
  persist(
    (set, get) => ({
      cache: {},

      setProviderModels: (
        provider: LlmProvider,
        providerConfig: ProviderConfig,
        models: ModelInfo[]
      ) =>
        set(state => ({
          cache: {
            ...state.cache,
            [provider]: {
              providerConfig,
              models,
              cachedAt: Date.now(),
            },
          },
        })),

      getProviderModels: (provider: LlmProvider) => {
        return get().cache[provider];
      },

      clearProvider: (provider: LlmProvider) =>
        set(state => {
          const newCache = { ...state.cache };
          delete newCache[provider];
          return { cache: newCache };
        }),

      clearAll: () => set({ cache: {} }),

      isStale: (provider: LlmProvider, maxAgeMs: number) => {
        const entry = get().cache[provider];
        if (!entry) return true;
        return Date.now() - entry.cachedAt > maxAgeMs;
      },
    }),
    {
      name: 'shapeshyft-provider-models',
      // Only persist the cache, not the functions
      partialize: state => ({ cache: state.cache }),
    }
  )
);
