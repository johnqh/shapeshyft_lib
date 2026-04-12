import { describe, it, expect } from 'vitest';
import type { JsonSchema } from '@sudobility/shapeshyft_types';
import {
  validateValue,
  validateInput,
  generateSampleValue,
  generateSampleInput,
  keyToSampleLabel,
} from './schema-validation';

describe('schema-validation', () => {
  describe('keyToSampleLabel', () => {
    it('should strip source_ prefix', () => {
      expect(keyToSampleLabel('source_language_code')).toBe('language code');
    });

    it('should strip target_ prefix', () => {
      expect(keyToSampleLabel('target_language_code')).toBe('language code');
    });

    it('should strip input_ prefix', () => {
      expect(keyToSampleLabel('input_data')).toBe('data');
    });

    it('should strip output_ prefix', () => {
      expect(keyToSampleLabel('output_format')).toBe('format');
    });

    it('should replace underscores with spaces', () => {
      expect(keyToSampleLabel('some_key_name')).toBe('some key name');
    });

    it('should not modify simple keys', () => {
      expect(keyToSampleLabel('texts')).toBe('texts');
    });
  });

  describe('generateSampleValue', () => {
    describe('string type', () => {
      it('should return first enum value when enum is defined', () => {
        const schema: JsonSchema = {
          type: 'string',
          enum: ['positive', 'negative', 'neutral'],
        };
        expect(generateSampleValue(schema)).toBe('positive');
      });

      it('should return default when defined', () => {
        const schema: JsonSchema = { type: 'string', default: 'hello' };
        expect(generateSampleValue(schema)).toBe('hello');
      });

      it('should generate label from key name', () => {
        const schema: JsonSchema = { type: 'string' };
        expect(generateSampleValue(schema, 'source_language_code')).toBe(
          'sample language code'
        );
      });

      it('should return "sample string" when no key provided', () => {
        const schema: JsonSchema = { type: 'string' };
        expect(generateSampleValue(schema)).toBe('sample string');
      });
    });

    describe('number type', () => {
      it('should return default when defined', () => {
        const schema: JsonSchema = { type: 'number', default: 42 };
        expect(generateSampleValue(schema)).toBe(42);
      });

      it('should return minimum when defined', () => {
        const schema: JsonSchema = { type: 'number', minimum: 5 };
        expect(generateSampleValue(schema)).toBe(5);
      });

      it('should return 0 when no constraints', () => {
        const schema: JsonSchema = { type: 'number' };
        expect(generateSampleValue(schema)).toBe(0);
      });
    });

    describe('integer type', () => {
      it('should return default when defined', () => {
        const schema: JsonSchema = { type: 'integer', default: 10 };
        expect(generateSampleValue(schema)).toBe(10);
      });

      it('should return minimum when defined', () => {
        const schema: JsonSchema = { type: 'integer', minimum: 1 };
        expect(generateSampleValue(schema)).toBe(1);
      });

      it('should return 0 when no constraints', () => {
        const schema: JsonSchema = { type: 'integer' };
        expect(generateSampleValue(schema)).toBe(0);
      });
    });

    describe('boolean type', () => {
      it('should return default when defined', () => {
        const schema: JsonSchema = { type: 'boolean', default: false };
        expect(generateSampleValue(schema)).toBe(false);
      });

      it('should return true when no default', () => {
        const schema: JsonSchema = { type: 'boolean' };
        expect(generateSampleValue(schema)).toBe(true);
      });
    });

    describe('array type', () => {
      it('should return single-element array with sample item', () => {
        const schema: JsonSchema = {
          type: 'array',
          items: { type: 'string' },
        };
        expect(generateSampleValue(schema)).toEqual(['sample string']);
      });

      it('should singularize key name for items', () => {
        const schema: JsonSchema = {
          type: 'array',
          items: { type: 'string' },
        };
        expect(generateSampleValue(schema, 'categories')).toEqual([
          'sample categorie',
        ]);
      });

      it('should return empty array when no items schema', () => {
        const schema: JsonSchema = { type: 'array' };
        expect(generateSampleValue(schema)).toEqual([]);
      });
    });

    describe('object type', () => {
      it('should generate values for all properties', () => {
        const schema: JsonSchema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer' },
            active: { type: 'boolean' },
          },
        };
        expect(generateSampleValue(schema)).toEqual({
          name: 'sample name',
          age: 0,
          active: true,
        });
      });

      it('should return empty object when no properties', () => {
        const schema: JsonSchema = { type: 'object' };
        expect(generateSampleValue(schema)).toEqual({});
      });

      it('should handle nested objects', () => {
        const schema: JsonSchema = {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
            },
          },
        };
        expect(generateSampleValue(schema)).toEqual({
          user: { name: 'sample name' },
        });
      });
    });

    describe('unknown type', () => {
      it('should return null for unknown types', () => {
        const schema = { type: 'unknown' } as unknown as JsonSchema;
        expect(generateSampleValue(schema)).toBeNull();
      });
    });
  });

  describe('validateValue', () => {
    describe('null/undefined handling', () => {
      it('should return no errors for null value', () => {
        expect(validateValue(null, { type: 'string' }, 'root')).toEqual([]);
      });

      it('should return no errors for undefined value', () => {
        expect(validateValue(undefined, { type: 'string' }, 'root')).toEqual(
          []
        );
      });
    });

    describe('string validation', () => {
      it('should accept valid string', () => {
        expect(validateValue('hello', { type: 'string' }, 'root')).toEqual([]);
      });

      it('should reject non-string value', () => {
        const errors = validateValue(42, { type: 'string' }, 'root');
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('expected string, got number');
      });

      it('should validate minLength', () => {
        const errors = validateValue(
          'ab',
          { type: 'string', minLength: 3 },
          'root'
        );
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('less than minLength 3');
      });

      it('should validate maxLength', () => {
        const errors = validateValue(
          'abcdef',
          { type: 'string', maxLength: 3 },
          'root'
        );
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('exceeds maxLength 3');
      });

      it('should validate enum', () => {
        const errors = validateValue(
          'invalid',
          { type: 'string', enum: ['a', 'b', 'c'] },
          'root'
        );
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('not in enum');
      });

      it('should accept valid enum value', () => {
        expect(
          validateValue('b', { type: 'string', enum: ['a', 'b', 'c'] }, 'root')
        ).toEqual([]);
      });

      it('should pass minLength at boundary', () => {
        expect(
          validateValue('abc', { type: 'string', minLength: 3 }, 'root')
        ).toEqual([]);
      });

      it('should pass maxLength at boundary', () => {
        expect(
          validateValue('abc', { type: 'string', maxLength: 3 }, 'root')
        ).toEqual([]);
      });
    });

    describe('number validation', () => {
      it('should accept valid number', () => {
        expect(validateValue(42, { type: 'number' }, 'root')).toEqual([]);
      });

      it('should reject non-number value', () => {
        const errors = validateValue('hello', { type: 'number' }, 'root');
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('expected number, got string');
      });

      it('should validate minimum', () => {
        const errors = validateValue(3, { type: 'number', minimum: 5 }, 'root');
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('less than minimum 5');
      });

      it('should validate maximum', () => {
        const errors = validateValue(
          10,
          { type: 'number', maximum: 5 },
          'root'
        );
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('exceeds maximum 5');
      });

      it('should pass minimum at boundary', () => {
        expect(
          validateValue(5, { type: 'number', minimum: 5 }, 'root')
        ).toEqual([]);
      });
    });

    describe('integer validation', () => {
      it('should accept valid integer', () => {
        expect(validateValue(42, { type: 'integer' }, 'root')).toEqual([]);
      });

      it('should reject float for integer type', () => {
        const errors = validateValue(3.14, { type: 'integer' }, 'root');
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('expected integer, got float');
      });

      it('should validate minimum for integer', () => {
        const errors = validateValue(
          2,
          { type: 'integer', minimum: 5 },
          'root'
        );
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('less than minimum 5');
      });
    });

    describe('boolean validation', () => {
      it('should accept true', () => {
        expect(validateValue(true, { type: 'boolean' }, 'root')).toEqual([]);
      });

      it('should accept false', () => {
        expect(validateValue(false, { type: 'boolean' }, 'root')).toEqual([]);
      });

      it('should reject non-boolean', () => {
        const errors = validateValue('true', { type: 'boolean' }, 'root');
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('expected boolean, got string');
      });
    });

    describe('array validation', () => {
      it('should accept valid array', () => {
        expect(
          validateValue(
            ['a', 'b'],
            { type: 'array', items: { type: 'string' } },
            'root'
          )
        ).toEqual([]);
      });

      it('should reject non-array', () => {
        const errors = validateValue('not-array', { type: 'array' }, 'root');
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('expected array, got string');
      });

      it('should validate array items', () => {
        const errors = validateValue(
          ['a', 42, 'b'],
          { type: 'array', items: { type: 'string' } },
          'root'
        );
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('root[1]: expected string, got number');
      });

      it('should accept array without items schema', () => {
        expect(
          validateValue([1, 'mixed', true], { type: 'array' }, 'root')
        ).toEqual([]);
      });
    });

    describe('object validation', () => {
      it('should accept valid object', () => {
        const schema: JsonSchema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
        };
        expect(
          validateValue({ name: 'Alice', age: 30 }, schema, 'root')
        ).toEqual([]);
      });

      it('should reject non-object', () => {
        const errors = validateValue('not-object', { type: 'object' }, 'root');
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('expected object, got string');
      });

      it('should reject arrays as objects', () => {
        const errors = validateValue([], { type: 'object' }, 'root');
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('expected object, got object');
      });

      it('should validate required properties', () => {
        const schema: JsonSchema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
          required: ['name', 'age'],
        };
        const errors = validateValue({ name: 'Alice' }, schema, 'root');
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('missing required property "age"');
      });

      it('should validate property types', () => {
        const schema: JsonSchema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
        };
        const errors = validateValue(
          { name: 'Alice', age: 'not-a-number' },
          schema,
          'root'
        );
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('root.age: expected number, got string');
      });

      it('should handle nested objects recursively', () => {
        const schema: JsonSchema = {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
              required: ['name'],
            },
          },
        };
        const errors = validateValue({ user: {} }, schema, 'root');
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain(
          'root.user: missing required property "name"'
        );
      });

      it('should allow extra properties not in schema', () => {
        const schema: JsonSchema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        };
        expect(
          validateValue({ name: 'Alice', extra: 'field' }, schema, 'root')
        ).toEqual([]);
      });

      it('should collect multiple errors', () => {
        const schema: JsonSchema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
          required: ['name', 'age'],
        };
        const errors = validateValue({}, schema, 'root');
        expect(errors).toHaveLength(2);
      });
    });

    describe('path tracking', () => {
      it('should include correct path in errors', () => {
        const schema: JsonSchema = {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                },
              },
            },
          },
        };
        const errors = validateValue({ items: [{ name: 42 }] }, schema, 'root');
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain(
          'root.items[0].name: expected string, got number'
        );
      });
    });
  });

  describe('validateInput', () => {
    it('should return valid for null schema', () => {
      const result = validateInput({ anything: 'goes' }, null);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return valid for matching input', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      };
      const result = validateInput({ text: 'hello' }, schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return invalid for mismatched input', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      };
      const result = validateInput({}, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('generateSampleInput', () => {
    it('should return empty object for null schema', () => {
      expect(generateSampleInput(null)).toEqual({});
    });

    it('should generate sample from schema', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          text: { type: 'string' },
          count: { type: 'integer', default: 5 },
        },
      };
      expect(generateSampleInput(schema)).toEqual({
        text: 'sample text',
        count: 5,
      });
    });
  });
});
