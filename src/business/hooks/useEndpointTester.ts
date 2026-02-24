/**
 * Endpoint Tester Hook
 *
 * Provides endpoint testing functionality including:
 * - Executing endpoints with sample data via the AI execution API
 * - Generating sample input from JSON Schema definitions
 * - Validating input against JSON Schema before execution
 * - Tracking test results with latency and token usage metrics
 * - Retrieving assembled prompts without execution (dry-run)
 *
 * Schema validation and sample generation are delegated to the extracted
 * utilities in `src/utils/schema-validation.ts` for independent testability.
 */

import { useCallback, useMemo, useState } from 'react';
import type {
  Endpoint,
  GeneratedMedia,
  HttpMethod,
  JsonSchema,
  NetworkClient,
  Optional,
} from '@sudobility/shapeshyft_types';
import { useAiExecute } from '@sudobility/shapeshyft_client';
import {
  generateSampleValue,
  validateValue,
  type ValidationResult,
} from '../../utils/schema-validation';

/**
 * Result of testing an endpoint with sample data.
 *
 * Captures the full round-trip of a test execution including input/output,
 * timing, token usage, and any errors encountered.
 */
export interface TestResult {
  /** Unique identifier for this test result */
  id: string;
  /** UUID of the tested endpoint */
  endpointId: string;
  /** Slug name of the tested endpoint */
  endpointName: string;
  /** The input payload sent to the endpoint */
  input: unknown;
  /** The output received from the endpoint (null on failure) */
  output: unknown;
  /** Whether the test execution succeeded */
  success: boolean;
  /** Error message if the test failed */
  error: Optional<string>;
  /** Unix timestamp (ms) when the test was executed */
  timestamp: number;
  /** Round-trip latency in milliseconds (null if not measurable) */
  latencyMs: Optional<number>;
  /** Number of input tokens consumed (null if not reported) */
  tokensInput: Optional<number>;
  /** Number of output tokens generated (null if not reported) */
  tokensOutput: Optional<number>;
  /** Generated media from models like GPT-4o (audio), Imagen (images), Veo (video) */
  generatedMedia: Optional<GeneratedMedia[]>;
}

// Re-export ValidationResult from the schema-validation utility
// so consumers importing from useEndpointTester still get it
export type { ValidationResult } from '../../utils/schema-validation';

/**
 * Return type for useEndpointTester
 */
export interface UseEndpointTesterReturn {
  /** History of test results, most recent first */
  testResults: TestResult[];
  /** Whether a test is currently executing */
  isLoading: boolean;
  /** Most recent error message, if any */
  error: Optional<string>;

  /**
   * Execute an endpoint test with the given input.
   * Validates input against the endpoint's input_schema before execution.
   * Results are prepended to the testResults array.
   */
  testEndpoint: (
    organizationPath: string,
    projectName: string,
    endpoint: Endpoint,
    sampleInput: unknown,
    apiKey?: string,
    timeout?: number
  ) => Promise<TestResult>;
  /**
   * Get the assembled prompt for an endpoint without executing it (dry-run).
   * Useful for debugging and understanding what the LLM will receive.
   */
  getPrompt: (
    organizationPath: string,
    projectName: string,
    endpointName: string,
    input: unknown,
    apiKey?: string,
    timeout?: number
  ) => Promise<{ success: boolean; prompt?: string; error?: string }>;
  /**
   * Generate sample input data from a JSON Schema.
   * Returns an empty object if the schema is null.
   */
  generateSampleInput: (inputSchema: JsonSchema | null) => unknown;
  /**
   * Validate input data against a JSON Schema.
   * Returns { valid: true, errors: [] } if schema is null (no validation needed).
   */
  validateInput: (
    input: unknown,
    schema: JsonSchema | null
  ) => ValidationResult;
  /** Clear all test results and errors */
  clearResults: () => void;
}

/**
 * Hook for testing endpoints with sample data
 */
export const useEndpointTester = (
  networkClient: NetworkClient,
  baseUrl: string,
  testMode: boolean = false
): UseEndpointTesterReturn => {
  const aiExecute = useAiExecute(networkClient, baseUrl, testMode);

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Optional<string>>(null);

  /**
   * Generate sample input from schema
   */
  const generateSampleInput = useCallback(
    (inputSchema: JsonSchema | null): unknown => {
      if (!inputSchema) {
        return {};
      }
      return generateSampleValue(inputSchema);
    },
    []
  );

  /**
   * Validate input against schema
   */
  const validateInput = useCallback(
    (input: unknown, schema: JsonSchema | null): ValidationResult => {
      if (!schema) {
        return { valid: true, errors: [] };
      }
      const errors = validateValue(input, schema, 'root');
      return {
        valid: errors.length === 0,
        errors,
      };
    },
    []
  );

  /**
   * Test an endpoint with sample input
   */
  const testEndpoint = useCallback(
    async (
      organizationPath: string,
      projectName: string,
      endpoint: Endpoint,
      sampleInput: unknown,
      apiKey?: string,
      timeout?: number
    ): Promise<TestResult> => {
      setIsLoading(true);
      setError(null);

      const startTime = Date.now();
      const testId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      try {
        // Validate input first
        const validation = validateInput(sampleInput, endpoint.input_schema);
        if (!validation.valid) {
          const result: TestResult = {
            id: testId,
            endpointId: endpoint.uuid,
            endpointName: endpoint.endpoint_name,
            input: sampleInput,
            output: null,
            success: false,
            error: `Input validation failed: ${validation.errors.join(', ')}`,
            timestamp: Date.now(),
            latencyMs: null,
            tokensInput: null,
            tokensOutput: null,
            generatedMedia: null,
          };
          setTestResults(prev => [result, ...prev]);
          return result;
        }

        // Execute the endpoint
        const response = await aiExecute.execute(
          organizationPath,
          projectName,
          endpoint.endpoint_name,
          sampleInput,
          endpoint.http_method as HttpMethod,
          apiKey,
          timeout
        );

        const latencyMs = Date.now() - startTime;

        // Extract fields from response data
        const responseData = response.success ? response.data : null;
        const hasResponseData =
          responseData && typeof responseData === 'object';

        const result: TestResult = {
          id: testId,
          endpointId: endpoint.uuid,
          endpointName: endpoint.endpoint_name,
          input: sampleInput,
          output: responseData,
          success: response.success,
          error: response.error ?? null,
          timestamp: Date.now(),
          latencyMs,
          tokensInput:
            hasResponseData && 'usage' in responseData
              ? (responseData as { usage: { tokens_input: number } }).usage
                  .tokens_input
              : null,
          tokensOutput:
            hasResponseData && 'usage' in responseData
              ? (responseData as { usage: { tokens_output: number } }).usage
                  .tokens_output
              : null,
          generatedMedia:
            hasResponseData && 'generated_media' in responseData
              ? (responseData as { generated_media: GeneratedMedia[] })
                  .generated_media
              : null,
        };

        setTestResults(prev => [result, ...prev]);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Test failed';
        setError(errorMessage);

        const result: TestResult = {
          id: testId,
          endpointId: endpoint.uuid,
          endpointName: endpoint.endpoint_name,
          input: sampleInput,
          output: null,
          success: false,
          error: errorMessage,
          timestamp: Date.now(),
          latencyMs: Date.now() - startTime,
          tokensInput: null,
          tokensOutput: null,
          generatedMedia: null,
        };

        setTestResults(prev => [result, ...prev]);
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [aiExecute, validateInput]
  );

  /**
   * Get the prompt for an endpoint without executing
   */
  const getPrompt = useCallback(
    async (
      organizationPath: string,
      projectName: string,
      endpointName: string,
      input: unknown,
      apiKey?: string,
      timeout?: number
    ): Promise<{ success: boolean; prompt?: string; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await aiExecute.getPrompt(
          organizationPath,
          projectName,
          endpointName,
          input,
          apiKey,
          timeout
        );

        if (response.success && response.data) {
          return { success: true, prompt: response.data.prompt };
        } else {
          return {
            success: false,
            error: response.error || 'Failed to get prompt',
          };
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to get prompt';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [aiExecute]
  );

  /**
   * Clear all test results
   */
  const clearResults = useCallback(() => {
    setTestResults([]);
    setError(null);
  }, []);

  return useMemo(
    () => ({
      testResults,
      isLoading,
      error,
      testEndpoint,
      getPrompt,
      generateSampleInput,
      validateInput,
      clearResults,
    }),
    [
      testResults,
      isLoading,
      error,
      testEndpoint,
      getPrompt,
      generateSampleInput,
      validateInput,
      clearResults,
    ]
  );
};
