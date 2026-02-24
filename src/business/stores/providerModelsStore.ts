/**
 * Provider Models Store
 *
 * Zustand store for caching provider configurations and models by provider ID.
 * This store uses the `persist` middleware to save data to localStorage,
 * allowing cached models to survive page reloads and reduce API calls.
 *
 * Unlike the other stores (keys, projects, endpoints, settings, analytics),
 * this store **intentionally uses localStorage persistence** because provider
 * models change infrequently and are expensive to re-fetch.
 *
 * The store includes an `isStale` method for TTL-based cache invalidation,
 * with a default max age of 1 hour ({@link DEFAULT_CACHE_MAX_AGE_MS}).
 *
 * **Important**: Call `clearAll()` when the user logs out to remove
 * persisted data from localStorage.
 *
 * @module
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  LlmProvider,
  ModelInfo,
  ProviderConfig,
} from '@sudobility/shapeshyft_types';

/**
 * Provider models cache entry containing configuration, models, and metadata.
 */
interface ProviderModelsCacheEntry {
  /** Provider configuration (default model, capabilities, etc.) */
  providerConfig: ProviderConfig;
  /** Array of available models for this provider */
  models: ModelInfo[];
  /** Unix timestamp (ms) when this data was cached */
  cachedAt: number;
}

/**
 * Provider models store state and actions.
 *
 * All methods are scoped by `LlmProvider` enum value.
 */
interface ProviderModelsStoreState {
  /** Cache of provider models keyed by provider ID (e.g., 'openai', 'anthropic') */
  cache: Partial<Record<LlmProvider, ProviderModelsCacheEntry>>;

  /**
   * Set (replace) the cached config and models for a provider.
   * Overwrites any existing cache entry and updates the `cachedAt` timestamp.
   */
  setProviderModels: (
    provider: LlmProvider,
    providerConfig: ProviderConfig,
    models: ModelInfo[]
  ) => void;

  /**
   * Get the full cache entry for a provider.
   * @returns The cache entry with `providerConfig`, `models`, and `cachedAt`,
   *          or `undefined` if not cached.
   */
  getProviderModels: (
    provider: LlmProvider
  ) => ProviderModelsCacheEntry | undefined;

  /**
   * Clear the cache entry for a specific provider.
   * This also removes the entry from localStorage.
   */
  clearProvider: (provider: LlmProvider) => void;

  /**
   * Clear all cached provider data.
   * Should be called on logout to remove persisted data from localStorage.
   */
  clearAll: () => void;

  /**
   * Check if a provider's cache entry is stale (older than maxAgeMs).
   * Returns `true` if the entry does not exist or has expired.
   *
   * @param provider - The provider to check
   * @param maxAgeMs - Maximum age in milliseconds before considering stale
   * @returns `true` if stale or missing, `false` if fresh
   */
  isStale: (provider: LlmProvider, maxAgeMs: number) => boolean;
}

/**
 * Default cache max age: 1 hour (3,600,000 ms).
 * Used by `useProviderModelsManager` when no custom `cacheMaxAgeMs` is provided.
 */
export const DEFAULT_CACHE_MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Zustand store for provider models caching with localStorage persistence.
 *
 * This store persists to localStorage under the key `"shapeshyft-provider-models"`.
 * Only the `cache` field is persisted (not the store methods).
 *
 * @example
 * ```ts
 * // Check if cache is stale
 * const stale = useProviderModelsStore.getState().isStale('openai', DEFAULT_CACHE_MAX_AGE_MS);
 *
 * // Read cached models
 * const entry = useProviderModelsStore.getState().getProviderModels('openai');
 * if (entry) {
 *   console.log(entry.models.length, "models available");
 * }
 * ```
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
