/**
 * JSON Schema Validation Utilities
 *
 * Pure functions for validating values against JSON Schema and generating sample values.
 * Extracted from useEndpointTester for reusability and independent testability.
 *
 * **Limitations**: This is a basic JSON Schema validator. It does NOT support:
 * - `allOf`, `oneOf`, `anyOf` combinators
 * - `$ref` references
 * - `patternProperties`
 * - `additionalProperties` validation (the flag is accepted but not enforced)
 * - `format` validation (e.g., email, date-time)
 * - `pattern` regex validation for strings
 * - `if`/`then`/`else` conditional schemas
 *
 * For comprehensive JSON Schema validation, consider using a dedicated library
 * like ajv. This utility is intended for lightweight client-side validation
 * and sample data generation for endpoint testing.
 */

import type { JsonSchema } from '@sudobility/shapeshyft_types';

/**
 * Result of validating a value against a JSON Schema.
 */
export interface ValidationResult {
  /** Whether the value is valid according to the schema */
  valid: boolean;
  /** Array of validation error messages. Empty if valid. */
  errors: string[];
}

/**
 * Convert a key name to a readable sample label.
 *
 * Strips common prefixes (`source_`, `target_`, `input_`, `output_`) and
 * replaces underscores with spaces to produce a human-friendly label.
 *
 * @param key - The property key name (e.g., "source_language_code")
 * @returns A readable label (e.g., "language code")
 *
 * @example
 * ```ts
 * keyToSampleLabel("source_language_code"); // "language code"
 * keyToSampleLabel("texts");                // "texts"
 * keyToSampleLabel("input_data");           // "data"
 * ```
 */
export function keyToSampleLabel(key: string): string {
  // Remove common prefixes like source_, target_, input_, output_
  let label = key.replace(/^(source_|target_|input_|output_)/, '');
  // Replace underscores with spaces
  label = label.replace(/_/g, ' ');
  return label;
}

/**
 * Generate a sample value for a JSON Schema type.
 *
 * Produces a representative value that conforms to the given schema.
 * Useful for pre-populating endpoint test forms or generating example payloads.
 *
 * Generation rules:
 * - **string**: Returns `schema.enum[0]` if enum is defined, `schema.default` if set,
 *   or a descriptive string derived from the key name.
 * - **number/integer**: Returns `schema.default` if set, `schema.minimum` if set, or `0`.
 * - **boolean**: Returns `schema.default` if set, or `true`.
 * - **array**: Returns a single-element array with a sample item if `schema.items` is defined,
 *   or an empty array.
 * - **object**: Returns an object with sample values for each property in `schema.properties`,
 *   or an empty object.
 * - **unknown types**: Returns `null`.
 *
 * @param schema - The JSON Schema to generate a sample for
 * @param key - Optional property key name used to derive descriptive sample strings
 * @returns A sample value conforming to the schema
 *
 * @example
 * ```ts
 * generateSampleValue({ type: 'string' }, 'email');
 * // => "sample email"
 *
 * generateSampleValue({ type: 'number', minimum: 5 });
 * // => 5
 *
 * generateSampleValue({
 *   type: 'object',
 *   properties: { name: { type: 'string' }, age: { type: 'integer' } }
 * });
 * // => { name: "sample name", age: 0 }
 * ```
 */
export function generateSampleValue(schema: JsonSchema, key?: string): unknown {
  switch (schema.type) {
    case 'string':
      if (schema.enum && Array.isArray(schema.enum)) {
        return schema.enum[0];
      }
      if (schema.default !== undefined) {
        return schema.default;
      }
      // Generate sample based on key name
      if (key) {
        return `sample ${keyToSampleLabel(key)}`;
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
        // For arrays, generate a sample item using the key (singular if possible)
        const itemKey = key?.replace(/s$/, ''); // Simple singularization
        return [generateSampleValue(schema.items, itemKey)];
      }
      return [];

    case 'object':
      // Map type: object with x-map and additionalProperties but no fixed properties
      if (
        (schema as Record<string, unknown>)['x-map'] &&
        schema.additionalProperties &&
        typeof schema.additionalProperties === 'object'
      ) {
        const keyDesc = (schema as Record<string, unknown>)[
          'x-key-description'
        ] as string | undefined;
        const sampleKey = keyDesc
          ? `sample_${keyDesc.split(/[\s(,]/)[0].toLowerCase()}`
          : 'sample_key';
        const valueSchema = schema.additionalProperties as JsonSchema;
        return { [sampleKey]: generateSampleValue(valueSchema) };
      }
      if (schema.properties) {
        const obj: Record<string, unknown> = {};
        for (const [propKey, propSchema] of Object.entries(schema.properties)) {
          obj[propKey] = generateSampleValue(propSchema as JsonSchema, propKey);
        }
        return obj;
      }
      return {};

    default:
      return null;
  }
}

/**
 * Validate a value against a JSON Schema (basic validation).
 *
 * Performs recursive type checking, constraint validation (min/max, enum, required),
 * and structural validation (object properties, array items).
 *
 * **Note**: `null` and `undefined` values are considered valid (no errors generated).
 * Use `required` in object schemas to enforce presence of properties.
 *
 * @param value - The value to validate
 * @param schema - The JSON Schema to validate against
 * @param path - The current property path for error messages (e.g., "root.items[0].name")
 * @returns An array of error message strings. Empty array means the value is valid.
 *
 * @example
 * ```ts
 * validateValue("hello", { type: 'string', minLength: 1 }, "root");
 * // => []
 *
 * validateValue(42, { type: 'string' }, "root.name");
 * // => ['root.name: expected string, got number']
 *
 * validateValue(
 *   { text: "hello" },
 *   { type: 'object', properties: { text: { type: 'string' } }, required: ['text', 'category'] },
 *   "root"
 * );
 * // => ['root: missing required property "category"']
 * ```
 */
export function validateValue(
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
      } else {
        const obj = value as Record<string, unknown>;

        // Map type: validate all values against additionalProperties schema
        if (
          (schema as Record<string, unknown>)['x-map'] &&
          schema.additionalProperties &&
          typeof schema.additionalProperties === 'object'
        ) {
          const valueSchema = schema.additionalProperties as JsonSchema;
          for (const [key, propValue] of Object.entries(obj)) {
            errors.push(
              ...validateValue(propValue, valueSchema, `${path}["${key}"]`)
            );
          }
        } else if (schema.properties) {
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
      }
      break;
  }

  return errors;
}

/**
 * Validate a value against a JSON Schema, returning a structured result.
 *
 * This is a convenience wrapper around {@link validateValue} that returns
 * a {@link ValidationResult} object instead of a raw error array.
 *
 * @param input - The value to validate
 * @param schema - The JSON Schema to validate against, or null to skip validation
 * @returns A ValidationResult with `valid` boolean and `errors` array
 *
 * @example
 * ```ts
 * const result = validateInput({ text: "hello" }, mySchema);
 * if (!result.valid) {
 *   console.error("Validation errors:", result.errors);
 * }
 * ```
 */
export function validateInput(
  input: unknown,
  schema: JsonSchema | null
): ValidationResult {
  if (!schema) {
    return { valid: true, errors: [] };
  }
  const errors = validateValue(input, schema, 'root');
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a sample input from a JSON Schema.
 *
 * Convenience wrapper around {@link generateSampleValue} that handles
 * null schemas by returning an empty object.
 *
 * @param inputSchema - The JSON Schema to generate sample input for, or null
 * @returns A sample value conforming to the schema, or an empty object if schema is null
 */
export function generateSampleInput(inputSchema: JsonSchema | null): unknown {
  if (!inputSchema) {
    return {};
  }
  return generateSampleValue(inputSchema);
}
