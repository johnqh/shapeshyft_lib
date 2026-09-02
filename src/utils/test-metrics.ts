/**
 * Extraction of test metrics from an AI execution response.
 *
 * The execute call can return either an `AiExecutionResponse` or an
 * `AiPromptResponse`, and either may arrive as an error payload, so every field
 * has to be probed rather than assumed. Kept out of the hook so the probing is
 * testable without rendering anything.
 */

import type {
  FinishReason,
  GeneratedMedia,
} from '@sudobility/shapeshyft_types';

/** Metrics read off one execution response. */
export interface TestMetrics {
  /** Input tokens consumed, or null when the response did not report usage */
  tokensInput: number | null;
  /** Output tokens generated, or null when the response did not report usage */
  tokensOutput: number | null;
  /** Why the model stopped, or null when the provider reported nothing */
  finishReason: FinishReason | null;
  /** True when generation stopped at the output ceiling and `output` is cut off */
  truncated: boolean;
  /** Generated media, or null when the response carried none */
  generatedMedia: GeneratedMedia[] | null;
}

const EMPTY_METRICS: TestMetrics = {
  tokensInput: null,
  tokensOutput: null,
  finishReason: null,
  truncated: false,
  generatedMedia: null,
};

/**
 * Read the metrics out of an execution response.
 *
 * @param responseData - The `data` payload from an execute call, of any shape
 * @returns Metrics, with every field null/false when the payload lacks them
 */
export function extractTestMetrics(responseData: unknown): TestMetrics {
  if (typeof responseData !== 'object' || responseData === null) {
    return { ...EMPTY_METRICS };
  }

  const data = responseData as Record<string, unknown>;
  const usage =
    typeof data.usage === 'object' && data.usage !== null
      ? (data.usage as Record<string, unknown>)
      : null;

  const finishReason =
    typeof usage?.finish_reason === 'string'
      ? (usage.finish_reason as FinishReason)
      : null;

  return {
    tokensInput:
      typeof usage?.tokens_input === 'number' ? usage.tokens_input : null,
    tokensOutput:
      typeof usage?.tokens_output === 'number' ? usage.tokens_output : null,
    finishReason,
    // Trust the explicit flag, but a finish_reason of "length" means the same
    // thing -- don't miss a truncation just because the flag was absent.
    truncated: data.truncated === true || finishReason === 'length',
    generatedMedia: Array.isArray(data.generated_media)
      ? (data.generated_media as GeneratedMedia[])
      : null,
  };
}
