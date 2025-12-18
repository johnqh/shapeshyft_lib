import { describe, expect, it } from 'vitest';
import {
  useAnalyticsStore,
  useEndpointsStore,
  useKeysStore,
  useProjectsStore,
} from './business/stores';

describe('shapeshyft_lib stores', () => {
  it('should export useKeysStore', () => {
    expect(useKeysStore).toBeDefined();
    expect(typeof useKeysStore).toBe('function');
  });

  it('should export useProjectsStore', () => {
    expect(useProjectsStore).toBeDefined();
    expect(typeof useProjectsStore).toBe('function');
  });

  it('should export useEndpointsStore', () => {
    expect(useEndpointsStore).toBeDefined();
    expect(typeof useEndpointsStore).toBe('function');
  });

  it('should export useAnalyticsStore', () => {
    expect(useAnalyticsStore).toBeDefined();
    expect(typeof useAnalyticsStore).toBe('function');
  });
});
