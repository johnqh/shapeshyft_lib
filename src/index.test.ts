import { describe, expect, it } from 'vitest';

describe('shapeshyft_lib', () => {
  it('should export stores', async () => {
    const exports = await import('./index');
    expect(exports.useKeysStore).toBeDefined();
    expect(exports.useProjectsStore).toBeDefined();
    expect(exports.useEndpointsStore).toBeDefined();
    expect(exports.useAnalyticsStore).toBeDefined();
  });

  it('should export hooks', async () => {
    const exports = await import('./index');
    expect(exports.useKeysManager).toBeDefined();
    expect(exports.useProjectsManager).toBeDefined();
    expect(exports.useEndpointsManager).toBeDefined();
    expect(exports.useAnalyticsManager).toBeDefined();
  });
});
