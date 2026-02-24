/**
 * Utility functions for schema validation and sample generation.
 *
 * Note: `ValidationResult` is exported via `business/hooks/useEndpointTester`
 * (which re-exports it from `./schema-validation`) to avoid duplicate exports
 * at the package level. Import it from `@sudobility/shapeshyft_lib` directly.
 */
export {
  validateValue,
  validateInput,
  generateSampleValue,
  generateSampleInput,
  keyToSampleLabel,
} from './schema-validation';
