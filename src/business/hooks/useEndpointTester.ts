/**
 * Endpoint Tester Hook
 * Test endpoints with sample data and validate input/output
 */

import { useCallback, useMemo, useState } from 'react';
import type {
  Endpoint,
  HttpMethod,
  JsonSchema,
  NetworkClient,
  Optional,
} from '@sudobility/shapeshyft_types';
import { useAiExecute } from '@sudobility/shapeshyft_client';

/**
 * Test result type
 */
export interface TestResult {
  id: string;
  endpointId: string;
  endpointName: string;
  input: unknown;
  output: unknown;
  success: boolean;
  error: Optional<string>;
  timestamp: number;
  latencyMs: Optional<number>;
  tokensInput: Optional<number>;
  tokensOutput: Optional<number>;
}

/**
 * Input validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Return type for useEndpointTester
 */
export interface UseEndpointTesterReturn {
  testResults: TestResult[];
  isLoading: boolean;
  error: Optional<string>;

  testEndpoint: (
    projectName: string,
    endpoint: Endpoint,
    sampleInput: unknown
  ) => Promise<TestResult>;
  generateSampleInput: (inputSchema: JsonSchema | null) => unknown;
  validateInput: (
    input: unknown,
    schema: JsonSchema | null
  ) => ValidationResult;
  clearResults: () => void;
}

/**
 * Generate a sample value for a JSON Schema type
 */
function generateSampleValue(schema: JsonSchema): unknown {
  switch (schema.type) {
    case 'string':
      if (schema.enum && Array.isArray(schema.enum)) {
        return schema.enum[0];
      }
      if (schema.default !== undefined) {
        return schema.default;
      }
      return 'sample string';

    case 'number':
    case 'integer':
      if (schema.default !== undefined) {
        return schema.default;
      }
      if (schema.minimum !== undefined) {
        return schema.minimum;
      }
      return 0;

    case 'boolean':
      if (schema.default !== undefined) {
        return schema.default;
      }
      return true;

    case 'array':
      if (schema.items) {
        return [generateSampleValue(schema.items)];
      }
      return [];

    case 'object':
      if (schema.properties) {
        const obj: Record<string, unknown> = {};
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          obj[key] = generateSampleValue(propSchema as JsonSchema);
        }
        return obj;
      }
      return {};

    default:
      return null;
  }
}

/**
 * Validate a value against a JSON Schema (basic validation)
 */
function validateValue(
  value: unknown,
  schema: JsonSchema,
  path: string
): string[] {
  const errors: string[] = [];

  if (value === null || value === undefined) {
    return errors;
  }

  switch (schema.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push(`${path}: expected string, got ${typeof value}`);
      } else {
        if (schema.minLength !== undefined && value.length < schema.minLength) {
          errors.push(
            `${path}: string length ${value.length} is less than minLength ${schema.minLength}`
          );
        }
        if (schema.maxLength !== undefined && value.length > schema.maxLength) {
          errors.push(
            `${path}: string length ${value.length} exceeds maxLength ${schema.maxLength}`
          );
        }
        if (schema.enum && !schema.enum.includes(value)) {
          errors.push(
            `${path}: value "${value}" is not in enum [${schema.enum.join(', ')}]`
          );
        }
      }
      break;

    case 'number':
    case 'integer':
      if (typeof value !== 'number') {
        errors.push(`${path}: expected number, got ${typeof value}`);
      } else {
        if (schema.type === 'integer' && !Number.isInteger(value)) {
          errors.push(`${path}: expected integer, got float`);
        }
        if (schema.minimum !== undefined && value < schema.minimum) {
          errors.push(
            `${path}: value ${value} is less than minimum ${schema.minimum}`
          );
        }
        if (schema.maximum !== undefined && value > schema.maximum) {
          errors.push(
            `${path}: value ${value} exceeds maximum ${schema.maximum}`
          );
        }
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push(`${path}: expected boolean, got ${typeof value}`);
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        errors.push(`${path}: expected array, got ${typeof value}`);
      } else if (schema.items) {
        value.forEach((item, index) => {
          errors.push(
            ...validateValue(
              item,
              schema.items as JsonSchema,
              `${path}[${index}]`
            )
          );
        });
      }
      break;

    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push(`${path}: expected object, got ${typeof value}`);
      } else if (schema.properties) {
        const obj = value as Record<string, unknown>;

        // Check required properties
        if (schema.required) {
          for (const reqKey of schema.required) {
            if (!(reqKey in obj)) {
              errors.push(`${path}: missing required property "${reqKey}"`);
            }
          }
        }

        // Validate each property
        for (const [key, propValue] of Object.entries(obj)) {
          const propSchema = schema.properties[key];
          if (propSchema) {
            errors.push(
              ...validateValue(
                propValue,
                propSchema as JsonSchema,
                `${path}.${key}`
              )
            );
          }
        }
      }
      break;
  }

  return errors;
}

/**
 * Hook for testing endpoints with sample data
 */
export const useEndpointTester = (
  networkClient: NetworkClient,
  baseUrl: string
): UseEndpointTesterReturn => {
  const aiExecute = useAiExecute(networkClient, baseUrl);

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
      projectName: string,
      endpoint: Endpoint,
      sampleInput: unknown
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
          };
          setTestResults(prev => [result, ...prev]);
          return result;
        }

        // Execute the endpoint
        const response = await aiExecute.execute(
          projectName,
          endpoint.endpoint_name,
          sampleInput,
          endpoint.http_method as HttpMethod
        );

        const latencyMs = Date.now() - startTime;

        const result: TestResult = {
          id: testId,
          endpointId: endpoint.uuid,
          endpointName: endpoint.endpoint_name,
          input: sampleInput,
          output: response.success ? response.data : null,
          success: response.success,
          error: response.error ?? null,
          timestamp: Date.now(),
          latencyMs,
          tokensInput:
            response.success && response.data && 'usage' in response.data
              ? (response.data as { usage: { tokens_input: number } }).usage
                  .tokens_input
              : null,
          tokensOutput:
            response.success && response.data && 'usage' in response.data
              ? (response.data as { usage: { tokens_output: number } }).usage
                  .tokens_output
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
      generateSampleInput,
      validateInput,
      clearResults,
    }),
    [
      testResults,
      isLoading,
      error,
      testEndpoint,
      generateSampleInput,
      validateInput,
      clearResults,
    ]
  );
};
