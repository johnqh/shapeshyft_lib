/**
 * Provider Models Manager Hook
 * Business logic hook that wraps the client useProviderModels hook with capability filtering
 */

import { useMemo } from 'react';
import type {
  LlmProvider,
  ModelCapabilities,
  ModelInfo,
  NetworkClient,
  ProviderConfig,
  RequiredCapabilities,
} from '@sudobility/shapeshyft_types';
import { useProviderModels } from '@sudobility/shapeshyft_client';

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
  const requiredEntries = Object.entries(required).filter(([, value]) => value === true);
  if (requiredEntries.length === 0) {
    return models;
  }

  return models.filter((model) => {
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
 * Manager hook for provider models with capability filtering
 *
 * This hook wraps the client useProviderModels hook and adds:
 * - Capability-based filtering based on template requirements
 * - Convenience properties for provider configuration
 *
 * @example
 * ```tsx
 * const { models, isLoading, allowsCustomModel } = useProviderModelsManager({
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
}: UseProviderModelsManagerConfig): UseProviderModelsManagerReturn => {
  // Use the client hook to fetch models
  const {
    provider: providerConfig,
    models: allModels,
    isLoading,
    error,
    refetch,
  } = useProviderModels(networkClient, baseUrl, provider, testMode);

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
    ]
  );
};
