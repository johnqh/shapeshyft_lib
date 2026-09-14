import { describe, it, expect } from 'vitest';
import { toBindingFields } from './binding';
import { applyTemplate, ALL_TEMPLATES } from './endpoint-templates';

describe('toBindingFields', () => {
  it('maps a legacy key id to llm_key_id', () => {
    expect(toBindingFields('key-1')).toEqual({ llm_key_id: 'key-1' });
  });

  it('passes binding fields through', () => {
    expect(toBindingFields({ provider: 'openai' })).toEqual({
      provider: 'openai',
    });
  });
});

describe('applyTemplate with binding fields', () => {
  it('puts the binding on every endpoint and adds no llm_key_id', () => {
    const template = ALL_TEMPLATES[0]!;
    const { endpoints } = applyTemplate(template, 'demo', {
      provider: 'anthropic',
    });
    expect(endpoints.length).toBe(template.endpoints.length);
    for (const endpoint of endpoints) {
      expect(endpoint.provider).toBe('anthropic');
      expect('llm_key_id' in endpoint).toBe(false);
    }
  });
});
