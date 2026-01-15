/**
 * Provider Models Manager Hook
 * Business logic hook that wraps the client useProviderModels hook with capability filtering
 * and Zustand caching for local storage persistence
 */

import { useCallback, useEffect, useMemo } from 'react';
import type {
  LlmProvider,
  ModelCapabilities,
  ModelInfo,
  NetworkClient,
  ProviderConfig,
  RequiredCapabilities,
} from '@sudobility/shapeshyft_types';
import { useProviderModels } from '@sudobility/shapeshyft_client';
import {
  DEFAULT_CACHE_MAX_AGE_MS,
  useProviderModelsStore,
} from '../stores/providerModelsStore';

// Stable empty array to prevent unnecessary re-renders
const EMPTY_MODELS: ModelInfo[] = [];

/**
 * Configuration for useProviderModelsManager
 */
export interface UseProviderModelsManagerConfig {
  /** Network client for API calls */
  networkClient: NetworkClient;
  /** Base URL for the API */
  baseUrl: string;
  /** Provider to fetch models for */
  provider: LlmProvider | null;
  /** Required capabilities for filtering models */
  requiredCapabilities?: RequiredCapabilities;
  /** Testnet/sandbox mode */
  testMode?: boolean;
  /** Cache max age in milliseconds (default: 1 hour) */
  cacheMaxAgeMs?: number;
}

/**
 * Return type for useProviderModelsManager
 */
export interface UseProviderModelsManagerReturn {
  /** Provider configuration */
  providerConfig: ProviderConfig | null;
  /** All models for the provider (unfiltered) */
  allModels: ModelInfo[];
  /** Filtered models that meet the required capabilities */
  models: ModelInfo[];
  /** Loading state for initial load */
  isLoading: boolean;
  /** Error message for models fetch */
  error: string | null;
  /** Refetch models */
  refetch: () => void;
  /** Whether custom model input is allowed for this provider */
  allowsCustomModel: boolean;
  /** Default model for this provider */
  defaultModel: string | null;
  /** Whether the data is from cache */
  isCached: boolean;
  /** Timestamp when the data was cached */
  cachedAt: number | null;
}

/**
 * Filter models by required capabilities
 * A model passes if it has all required capabilities set to true
 */
function filterModelsByCapabilities(
  models: ModelInfo[],
  required: RequiredCapabilities
): ModelInfo[] {
  // If no requirements, return all models
  const requiredEntries = Object.entries(required).filter(
    ([, value]) => value === true
  );
  if (requiredEntries.length === 0) {
    return models;
  }

  return models.filter(model => {
    const caps = model.capabilities;
    for (const [key] of requiredEntries) {
      // Check if the model has this capability
      if (!caps[key as keyof ModelCapabilities]) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Manager hook for provider models with capability filtering and local storage caching
 *
 * This hook wraps the client useProviderModels hook and adds:
 * - Capability-based filtering based on template requirements
 * - Zustand-based local storage caching
 * - Convenience properties for provider configuration
 *
 * @example
 * ```tsx
 * const { models, isLoading, allowsCustomModel, isCached } = useProviderModelsManager({
 *   networkClient,
 *   baseUrl,
 *   provider: 'openai',
 *   requiredCapabilities: { visionInput: true }, // Only show models with vision input
 * });
 * ```
 */
export const useProviderModelsManager = ({
  networkClient,
  baseUrl,
  provider,
  requiredCapabilities = {},
  testMode = false,
  cacheMaxAgeMs = DEFAULT_CACHE_MAX_AGE_MS,
}: UseProviderModelsManagerConfig): UseProviderModelsManagerReturn => {
  // Get store methods
  const cacheEntry = useProviderModelsStore(
    useCallback(
      state => (provider ? state.cache[provider] : undefined),
      [provider]
    )
  );
  const setProviderModels = useProviderModelsStore(
    state => state.setProviderModels
  );
  const isStale = useProviderModelsStore(state => state.isStale);

  // Check if we have valid cached data
  const hasFreshCache = provider ? !isStale(provider, cacheMaxAgeMs) : false;

  // Use the client hook to fetch models
  const {
    provider: clientProviderConfig,
    models: clientModels,
    isLoading: clientIsLoading,
    error,
    refetch,
  } = useProviderModels(networkClient, baseUrl, provider, testMode);

  // Sync client data to store when it changes
  useEffect(() => {
    if (provider && clientProviderConfig && clientModels.length > 0) {
      setProviderModels(provider, clientProviderConfig, clientModels);
    }
  }, [provider, clientProviderConfig, clientModels, setProviderModels]);

  // Determine data source - prefer fresh client data, fall back to cache
  const providerConfig = useMemo(() => {
    if (clientProviderConfig) return clientProviderConfig;
    return cacheEntry?.providerConfig ?? null;
  }, [clientProviderConfig, cacheEntry?.providerConfig]);

  const allModels = useMemo(() => {
    if (clientModels.length > 0) return clientModels;
    return cacheEntry?.models ?? EMPTY_MODELS;
  }, [clientModels, cacheEntry?.models]);

  // Determine if we're showing cached data
  const isCached =
    clientModels.length === 0 && (cacheEntry?.models?.length ?? 0) > 0;
  const cachedAt = cacheEntry?.cachedAt ?? null;

  // Only show loading if we don't have cached data
  const isLoading = clientIsLoading && !hasFreshCache;

  // Filter models by required capabilities
  const filteredModels = useMemo(() => {
    if (allModels.length === 0) {
      return EMPTY_MODELS;
    }
    return filterModelsByCapabilities(allModels, requiredCapabilities);
  }, [allModels, requiredCapabilities]);

  // Convenience properties
  const allowsCustomModel = providerConfig?.allowsCustomModel ?? false;
  const defaultModel = providerConfig?.defaultModel ?? null;

  return useMemo(
    () => ({
      providerConfig,
      allModels,
      models: filteredModels,
      isLoading,
      error,
      refetch,
      allowsCustomModel,
      defaultModel,
      isCached,
      cachedAt,
    }),
    [
      providerConfig,
      allModels,
      filteredModels,
      isLoading,
      error,
      refetch,
      allowsCustomModel,
      defaultModel,
      isCached,
      cachedAt,
    ]
  );
};
