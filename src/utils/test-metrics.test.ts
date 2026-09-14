import { describe, it, expect } from 'vitest';
import { extractTestMetrics } from './test-metrics';

describe('extractTestMetrics', () => {
  it('pulls token counts and latency out of a successful response', () => {
    const metrics = extractTestMetrics({
      output: { ok: true },
      usage: {
        tokens_input: 3143,
        tokens_output: 948,
        latency_ms: 200,
        estimated_cost_cents: 1,
      },
    });

    expect(metrics.tokensInput).toBe(3143);
    expect(metrics.tokensOutput).toBe(948);
    expect(metrics.estimatedCostCents).toBe(1);
  });

  it("keeps the API's sub-cent cost estimate at full precision", () => {
    const metrics = extractTestMetrics({
      output: {},
      usage: {
        tokens_input: 400,
        tokens_output: 150,
        estimated_cost_cents: 0.0065,
      },
    });

    expect(metrics.estimatedCostCents).toBe(0.0065);
  });

  it('reports a truncated generation so it is not mistaken for a malformed model', () => {
    const metrics = extractTestMetrics({
      output: {},
      usage: {
        tokens_input: 10,
        tokens_output: 8000,
        latency_ms: 200,
        estimated_cost_cents: 1,
        finish_reason: 'length',
      },
      truncated: true,
    });

    expect(metrics.finishReason).toBe('length');
    expect(metrics.truncated).toBe(true);
  });

  it('treats a finish_reason of length as truncated even without the flag', () => {
    const metrics = extractTestMetrics({
      output: {},
      usage: {
        tokens_input: 10,
        tokens_output: 100,
        latency_ms: 1,
        estimated_cost_cents: 0,
        finish_reason: 'length',
      },
    });

    expect(metrics.truncated).toBe(true);
  });

  it('is not truncated for a natural stop', () => {
    const metrics = extractTestMetrics({
      output: {},
      usage: {
        tokens_input: 10,
        tokens_output: 100,
        latency_ms: 1,
        estimated_cost_cents: 0,
        finish_reason: 'stop',
      },
    });

    expect(metrics.truncated).toBe(false);
    expect(metrics.finishReason).toBe('stop');
  });

  it('picks up generated media when present', () => {
    const media = [{ type: 'image', mime_type: 'image/png', data: 'abc' }];
    const metrics = extractTestMetrics({
      output: {},
      usage: {
        tokens_input: 1,
        tokens_output: 1,
        latency_ms: 1,
        estimated_cost_cents: 0,
      },
      generated_media: media,
    });

    expect(metrics.generatedMedia).toEqual(media);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'not an object'],
    ['a prompt response with no usage', { prompt: 'hello' }],
  ])('returns empty metrics for %s', (_label, input) => {
    const metrics = extractTestMetrics(input);

    expect(metrics).toEqual({
      tokensInput: null,
      tokensOutput: null,
      estimatedCostCents: null,
      finishReason: null,
      truncated: false,
      generatedMedia: null,
    });
  });
});
