/**
 * @fileoverview Provider binding fields for endpoint requests
 * @description A string is the legacy form -- a ShapeShyft LLM key id -- and maps
 * to `{ llm_key_id }`. An object is used as-is, which is how ShapeRouter will
 * send `{ provider }`.
 */

import type { EndpointBindingFields } from '@sudobility/shapeshyft_client';

export type EndpointBindingInput = string | EndpointBindingFields;

export function toBindingFields(
  binding: EndpointBindingInput
): EndpointBindingFields {
  return typeof binding === 'string' ? { llm_key_id: binding } : binding;
}
