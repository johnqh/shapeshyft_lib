import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useKeysStore } from './keysStore';
import { useProjectsStore } from './projectsStore';
import { useEndpointsStore } from './endpointsStore';
import { useAnalyticsStore } from './analyticsStore';
import { useSettingsStore } from './settingsStore';
import type {
  LlmApiKeySafe,
  Project,
  Endpoint,
  AnalyticsResponse,
  UserSettings,
} from '@sudobility/shapeshyft_types';

// Mock data helpers
const createMockKey = (overrides: Partial<LlmApiKeySafe> = {}): LlmApiKeySafe => ({
  uuid: `key-${Math.random().toString(36).slice(2)}`,
  entity_id: 'entity-123',
  key_name: 'Test Key',
  provider: 'openai',
  has_api_key: true,
  endpoint_url: null,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const createMockProject = (overrides: Partial<Project> = {}): Project => ({
  uuid: `project-${Math.random().toString(36).slice(2)}`,
  entity_id: 'entity-123',
  project_name: 'test-project',
  display_name: 'Test Project',
  description: 'A test project',
  is_active: true,
  api_key_prefix: null,
  api_key_created_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const createMockEndpoint = (overrides: Partial<Endpoint> = {}): Endpoint => ({
  uuid: `endpoint-${Math.random().toString(36).slice(2)}`,
  project_id: 'project-123',
  endpoint_name: 'test-endpoint',
  display_name: 'Test Endpoint',
  http_method: 'POST',
  llm_key_id: 'key-123',
  input_schema: { type: 'object' },
  output_schema: { type: 'object' },
  instructions: 'Test instructions',
  context: null,
  is_active: true,
  ip_allowlist: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const createMockAnalytics = (overrides: Partial<AnalyticsResponse> = {}): AnalyticsResponse => ({
  aggregate: {
    total_requests: 100,
    successful_requests: 95,
    failed_requests: 5,
    total_tokens_input: 10000,
    total_tokens_output: 5000,
    total_estimated_cost_cents: 150,
    average_latency_ms: 250,
  },
  by_endpoint: [],
  ...overrides,
});

const createMockSettings = (overrides: Partial<UserSettings> = {}): UserSettings => ({
  id: 'settings-123',
  user_id: 'user-123',
  organization_name: 'Test Org',
  organization_path: 'test_org',
  is_default: false,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

describe('Zustand Stores', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    // Reset all stores
    useKeysStore.getState().clearAll();
    useProjectsStore.getState().clearAll();
    useEndpointsStore.getState().clearAll();
    useAnalyticsStore.getState().clearAll();
    useSettingsStore.getState().clearAll();
  });

  describe('useKeysStore', () => {
    const userId = 'user-123';

    describe('setKeys and getKeys', () => {
      it('should set and get keys for a user', () => {
        const keys = [createMockKey(), createMockKey()];

        useKeysStore.getState().setKeys(userId, keys);
        const result = useKeysStore.getState().getKeys(userId);

        expect(result).toHaveLength(2);
        expect(result).toEqual(keys);
      });

      it('should return undefined for non-existent user', () => {
        const result = useKeysStore.getState().getKeys('non-existent');
        expect(result).toBeUndefined();
      });

      it('should overwrite existing keys', () => {
        const oldKeys = [createMockKey()];
        const newKeys = [createMockKey(), createMockKey()];

        useKeysStore.getState().setKeys(userId, oldKeys);
        useKeysStore.getState().setKeys(userId, newKeys);

        expect(useKeysStore.getState().getKeys(userId)).toHaveLength(2);
      });
    });

    describe('getCacheEntry', () => {
      it('should return cache entry with timestamp', () => {
        const keys = [createMockKey()];
        useKeysStore.getState().setKeys(userId, keys);

        const entry = useKeysStore.getState().getCacheEntry(userId);

        expect(entry?.keys).toEqual(keys);
        expect(entry?.cachedAt).toBe(Date.now());
      });

      it('should return undefined for non-existent user', () => {
        const entry = useKeysStore.getState().getCacheEntry('non-existent');
        expect(entry).toBeUndefined();
      });
    });

    describe('addKey', () => {
      it('should add key to empty cache', () => {
        const key = createMockKey();

        useKeysStore.getState().addKey(userId, key);

        expect(useKeysStore.getState().getKeys(userId)).toHaveLength(1);
        expect(useKeysStore.getState().getKeys(userId)?.[0]).toEqual(key);
      });

      it('should append key to existing keys', () => {
        const existingKey = createMockKey();
        const newKey = createMockKey();

        useKeysStore.getState().setKeys(userId, [existingKey]);
        useKeysStore.getState().addKey(userId, newKey);

        const keys = useKeysStore.getState().getKeys(userId);
        expect(keys).toHaveLength(2);
        expect(keys?.[1]).toEqual(newKey);
      });
    });

    describe('updateKey', () => {
      it('should update existing key', () => {
        const key = createMockKey({ uuid: 'key-to-update', key_name: 'Old Name' });
        const updatedKey = createMockKey({ uuid: 'key-to-update', key_name: 'New Name' });

        useKeysStore.getState().setKeys(userId, [key]);
        useKeysStore.getState().updateKey(userId, 'key-to-update', updatedKey);

        expect(useKeysStore.getState().getKeys(userId)?.[0].key_name).toBe('New Name');
      });

      it('should not modify state for non-existent user', () => {
        const key = createMockKey();

        useKeysStore.getState().updateKey('non-existent', 'key-id', key);

        expect(useKeysStore.getState().getKeys('non-existent')).toBeUndefined();
      });

      it('should keep other keys unchanged', () => {
        const key1 = createMockKey({ uuid: 'key-1' });
        const key2 = createMockKey({ uuid: 'key-2' });
        const updatedKey2 = createMockKey({ uuid: 'key-2', key_name: 'Updated' });

        useKeysStore.getState().setKeys(userId, [key1, key2]);
        useKeysStore.getState().updateKey(userId, 'key-2', updatedKey2);

        const keys = useKeysStore.getState().getKeys(userId);
        expect(keys?.[0]).toEqual(key1);
        expect(keys?.[1].key_name).toBe('Updated');
      });
    });

    describe('removeKey', () => {
      it('should remove key from cache', () => {
        const key1 = createMockKey({ uuid: 'key-1' });
        const key2 = createMockKey({ uuid: 'key-2' });

        useKeysStore.getState().setKeys(userId, [key1, key2]);
        useKeysStore.getState().removeKey(userId, 'key-1');

        const keys = useKeysStore.getState().getKeys(userId);
        expect(keys).toHaveLength(1);
        expect(keys?.[0].uuid).toBe('key-2');
      });

      it('should not modify state for non-existent user', () => {
        useKeysStore.getState().removeKey('non-existent', 'key-id');
        expect(useKeysStore.getState().getKeys('non-existent')).toBeUndefined();
      });
    });

    describe('clearKeys', () => {
      it('should clear keys for specific user', () => {
        const user1 = 'user-1';
        const user2 = 'user-2';

        useKeysStore.getState().setKeys(user1, [createMockKey()]);
        useKeysStore.getState().setKeys(user2, [createMockKey()]);
        useKeysStore.getState().clearKeys(user1);

        expect(useKeysStore.getState().getKeys(user1)).toBeUndefined();
        expect(useKeysStore.getState().getKeys(user2)).toBeDefined();
      });
    });

    describe('clearAll', () => {
      it('should clear all cached keys', () => {
        useKeysStore.getState().setKeys('user-1', [createMockKey()]);
        useKeysStore.getState().setKeys('user-2', [createMockKey()]);
        useKeysStore.getState().clearAll();

        expect(useKeysStore.getState().getKeys('user-1')).toBeUndefined();
        expect(useKeysStore.getState().getKeys('user-2')).toBeUndefined();
      });
    });
  });

  describe('useProjectsStore', () => {
    const entitySlug = 'my-org';

    describe('setProjects and getProjects', () => {
      it('should set and get projects for an entity', () => {
        const projects = [createMockProject(), createMockProject()];

        useProjectsStore.getState().setProjects(entitySlug, projects);
        const result = useProjectsStore.getState().getProjects(entitySlug);

        expect(result).toHaveLength(2);
        expect(result).toEqual(projects);
      });

      it('should return undefined for non-existent entity', () => {
        const result = useProjectsStore.getState().getProjects('non-existent');
        expect(result).toBeUndefined();
      });
    });

    describe('addProject', () => {
      it('should add project to empty cache', () => {
        const project = createMockProject();

        useProjectsStore.getState().addProject(entitySlug, project);

        expect(useProjectsStore.getState().getProjects(entitySlug)).toHaveLength(1);
      });

      it('should append project to existing projects', () => {
        const existingProject = createMockProject();
        const newProject = createMockProject();

        useProjectsStore.getState().setProjects(entitySlug, [existingProject]);
        useProjectsStore.getState().addProject(entitySlug, newProject);

        expect(useProjectsStore.getState().getProjects(entitySlug)).toHaveLength(2);
      });
    });

    describe('updateProject', () => {
      it('should update existing project', () => {
        const project = createMockProject({ uuid: 'project-1', display_name: 'Old Name' });
        const updatedProject = createMockProject({ uuid: 'project-1', display_name: 'New Name' });

        useProjectsStore.getState().setProjects(entitySlug, [project]);
        useProjectsStore.getState().updateProject(entitySlug, 'project-1', updatedProject);

        expect(useProjectsStore.getState().getProjects(entitySlug)?.[0].display_name).toBe('New Name');
      });

      it('should not modify state for non-existent entity', () => {
        const project = createMockProject();

        useProjectsStore.getState().updateProject('non-existent', 'project-id', project);

        expect(useProjectsStore.getState().getProjects('non-existent')).toBeUndefined();
      });
    });

    describe('removeProject', () => {
      it('should remove project from cache', () => {
        const project1 = createMockProject({ uuid: 'project-1' });
        const project2 = createMockProject({ uuid: 'project-2' });

        useProjectsStore.getState().setProjects(entitySlug, [project1, project2]);
        useProjectsStore.getState().removeProject(entitySlug, 'project-1');

        const projects = useProjectsStore.getState().getProjects(entitySlug);
        expect(projects).toHaveLength(1);
        expect(projects?.[0].uuid).toBe('project-2');
      });
    });

    describe('clearProjects', () => {
      it('should clear projects for specific entity', () => {
        const entity1 = 'entity-1';
        const entity2 = 'entity-2';

        useProjectsStore.getState().setProjects(entity1, [createMockProject()]);
        useProjectsStore.getState().setProjects(entity2, [createMockProject()]);
        useProjectsStore.getState().clearProjects(entity1);

        expect(useProjectsStore.getState().getProjects(entity1)).toBeUndefined();
        expect(useProjectsStore.getState().getProjects(entity2)).toBeDefined();
      });
    });
  });

  describe('useEndpointsStore', () => {
    const entitySlug = 'my-org';
    const projectId = 'project-123';

    describe('setEndpoints and getEndpoints', () => {
      it('should set and get endpoints for an entity/project', () => {
        const endpoints = [createMockEndpoint(), createMockEndpoint()];

        useEndpointsStore.getState().setEndpoints(entitySlug, projectId, endpoints);
        const result = useEndpointsStore.getState().getEndpoints(entitySlug, projectId);

        expect(result).toHaveLength(2);
        expect(result).toEqual(endpoints);
      });

      it('should return undefined for non-existent entity/project', () => {
        const result = useEndpointsStore.getState().getEndpoints('non-existent', 'non-existent');
        expect(result).toBeUndefined();
      });

      it('should use composite key (entitySlug:projectId)', () => {
        const endpoints1 = [createMockEndpoint({ uuid: 'endpoint-1' })];
        const endpoints2 = [createMockEndpoint({ uuid: 'endpoint-2' })];

        useEndpointsStore.getState().setEndpoints('org-1', 'project-a', endpoints1);
        useEndpointsStore.getState().setEndpoints('org-1', 'project-b', endpoints2);

        expect(useEndpointsStore.getState().getEndpoints('org-1', 'project-a')?.[0].uuid).toBe('endpoint-1');
        expect(useEndpointsStore.getState().getEndpoints('org-1', 'project-b')?.[0].uuid).toBe('endpoint-2');
      });
    });

    describe('getCacheEntry', () => {
      it('should return cache entry with timestamp', () => {
        const endpoints = [createMockEndpoint()];
        useEndpointsStore.getState().setEndpoints(entitySlug, projectId, endpoints);

        const entry = useEndpointsStore.getState().getCacheEntry(entitySlug, projectId);

        expect(entry?.endpoints).toEqual(endpoints);
        expect(entry?.cachedAt).toBe(Date.now());
      });
    });

    describe('addEndpoint', () => {
      it('should add endpoint to empty cache', () => {
        const endpoint = createMockEndpoint();

        useEndpointsStore.getState().addEndpoint(entitySlug, projectId, endpoint);

        expect(useEndpointsStore.getState().getEndpoints(entitySlug, projectId)).toHaveLength(1);
      });

      it('should append endpoint to existing endpoints', () => {
        const existingEndpoint = createMockEndpoint();
        const newEndpoint = createMockEndpoint();

        useEndpointsStore.getState().setEndpoints(entitySlug, projectId, [existingEndpoint]);
        useEndpointsStore.getState().addEndpoint(entitySlug, projectId, newEndpoint);

        expect(useEndpointsStore.getState().getEndpoints(entitySlug, projectId)).toHaveLength(2);
      });
    });

    describe('updateEndpoint', () => {
      it('should update existing endpoint', () => {
        const endpoint = createMockEndpoint({ uuid: 'endpoint-1', display_name: 'Old Name' });
        const updatedEndpoint = createMockEndpoint({ uuid: 'endpoint-1', display_name: 'New Name' });

        useEndpointsStore.getState().setEndpoints(entitySlug, projectId, [endpoint]);
        useEndpointsStore.getState().updateEndpoint(entitySlug, projectId, 'endpoint-1', updatedEndpoint);

        expect(useEndpointsStore.getState().getEndpoints(entitySlug, projectId)?.[0].display_name).toBe('New Name');
      });

      it('should not modify state for non-existent cache entry', () => {
        const endpoint = createMockEndpoint();

        useEndpointsStore.getState().updateEndpoint('non-existent', 'non-existent', 'endpoint-id', endpoint);

        expect(useEndpointsStore.getState().getEndpoints('non-existent', 'non-existent')).toBeUndefined();
      });
    });

    describe('removeEndpoint', () => {
      it('should remove endpoint from cache', () => {
        const endpoint1 = createMockEndpoint({ uuid: 'endpoint-1' });
        const endpoint2 = createMockEndpoint({ uuid: 'endpoint-2' });

        useEndpointsStore.getState().setEndpoints(entitySlug, projectId, [endpoint1, endpoint2]);
        useEndpointsStore.getState().removeEndpoint(entitySlug, projectId, 'endpoint-1');

        const endpoints = useEndpointsStore.getState().getEndpoints(entitySlug, projectId);
        expect(endpoints).toHaveLength(1);
        expect(endpoints?.[0].uuid).toBe('endpoint-2');
      });

      it('should not modify state for non-existent cache entry', () => {
        useEndpointsStore.getState().removeEndpoint('non-existent', 'non-existent', 'endpoint-id');
        expect(useEndpointsStore.getState().getEndpoints('non-existent', 'non-existent')).toBeUndefined();
      });
    });

    describe('clearEndpoints', () => {
      it('should clear endpoints for specific entity/project', () => {
        useEndpointsStore.getState().setEndpoints(entitySlug, 'project-1', [createMockEndpoint()]);
        useEndpointsStore.getState().setEndpoints(entitySlug, 'project-2', [createMockEndpoint()]);
        useEndpointsStore.getState().clearEndpoints(entitySlug, 'project-1');

        expect(useEndpointsStore.getState().getEndpoints(entitySlug, 'project-1')).toBeUndefined();
        expect(useEndpointsStore.getState().getEndpoints(entitySlug, 'project-2')).toBeDefined();
      });
    });

    describe('clearEntityEndpoints', () => {
      it('should clear all endpoints for an entity', () => {
        useEndpointsStore.getState().setEndpoints('org-1', 'project-1', [createMockEndpoint()]);
        useEndpointsStore.getState().setEndpoints('org-1', 'project-2', [createMockEndpoint()]);
        useEndpointsStore.getState().setEndpoints('org-2', 'project-1', [createMockEndpoint()]);

        useEndpointsStore.getState().clearEntityEndpoints('org-1');

        expect(useEndpointsStore.getState().getEndpoints('org-1', 'project-1')).toBeUndefined();
        expect(useEndpointsStore.getState().getEndpoints('org-1', 'project-2')).toBeUndefined();
        expect(useEndpointsStore.getState().getEndpoints('org-2', 'project-1')).toBeDefined();
      });
    });

    describe('clearAll', () => {
      it('should clear all cached endpoints', () => {
        useEndpointsStore.getState().setEndpoints('org-1', 'project-1', [createMockEndpoint()]);
        useEndpointsStore.getState().setEndpoints('org-2', 'project-2', [createMockEndpoint()]);
        useEndpointsStore.getState().clearAll();

        expect(useEndpointsStore.getState().getEndpoints('org-1', 'project-1')).toBeUndefined();
        expect(useEndpointsStore.getState().getEndpoints('org-2', 'project-2')).toBeUndefined();
      });
    });
  });

  describe('useAnalyticsStore', () => {
    const userId = 'user-123';

    describe('setAnalytics and getAnalytics', () => {
      it('should set and get analytics for a user', () => {
        const analytics = createMockAnalytics();

        useAnalyticsStore.getState().setAnalytics(userId, analytics);
        const result = useAnalyticsStore.getState().getAnalytics(userId);

        expect(result).toEqual(analytics);
      });

      it('should return undefined for non-existent user', () => {
        const result = useAnalyticsStore.getState().getAnalytics('non-existent');
        expect(result).toBeUndefined();
      });

      it('should overwrite existing analytics', () => {
        const oldAnalytics = createMockAnalytics({ aggregate: { ...createMockAnalytics().aggregate, total_requests: 50 } });
        const newAnalytics = createMockAnalytics({ aggregate: { ...createMockAnalytics().aggregate, total_requests: 100 } });

        useAnalyticsStore.getState().setAnalytics(userId, oldAnalytics);
        useAnalyticsStore.getState().setAnalytics(userId, newAnalytics);

        expect(useAnalyticsStore.getState().getAnalytics(userId)?.aggregate.total_requests).toBe(100);
      });
    });

    describe('getCacheEntry', () => {
      it('should return cache entry with timestamp', () => {
        const analytics = createMockAnalytics();
        useAnalyticsStore.getState().setAnalytics(userId, analytics);

        const entry = useAnalyticsStore.getState().getCacheEntry(userId);

        expect(entry?.analytics).toEqual(analytics);
        expect(entry?.cachedAt).toBe(Date.now());
      });

      it('should return undefined for non-existent user', () => {
        const entry = useAnalyticsStore.getState().getCacheEntry('non-existent');
        expect(entry).toBeUndefined();
      });
    });

    describe('clearAnalytics', () => {
      it('should clear analytics for specific user', () => {
        const user1 = 'user-1';
        const user2 = 'user-2';

        useAnalyticsStore.getState().setAnalytics(user1, createMockAnalytics());
        useAnalyticsStore.getState().setAnalytics(user2, createMockAnalytics());
        useAnalyticsStore.getState().clearAnalytics(user1);

        expect(useAnalyticsStore.getState().getAnalytics(user1)).toBeUndefined();
        expect(useAnalyticsStore.getState().getAnalytics(user2)).toBeDefined();
      });
    });

    describe('clearAll', () => {
      it('should clear all cached analytics', () => {
        useAnalyticsStore.getState().setAnalytics('user-1', createMockAnalytics());
        useAnalyticsStore.getState().setAnalytics('user-2', createMockAnalytics());
        useAnalyticsStore.getState().clearAll();

        expect(useAnalyticsStore.getState().getAnalytics('user-1')).toBeUndefined();
        expect(useAnalyticsStore.getState().getAnalytics('user-2')).toBeUndefined();
      });
    });
  });

  describe('useSettingsStore', () => {
    const userId = 'user-123';

    describe('setSettings and getSettings', () => {
      it('should set and get settings for a user', () => {
        const settings = createMockSettings();

        useSettingsStore.getState().setSettings(userId, settings);
        const result = useSettingsStore.getState().getSettings(userId);

        expect(result).toEqual(settings);
      });

      it('should return undefined for non-existent user', () => {
        const result = useSettingsStore.getState().getSettings('non-existent');
        expect(result).toBeUndefined();
      });

      it('should overwrite existing settings', () => {
        const oldSettings = createMockSettings({ organization_name: 'Old Org' });
        const newSettings = createMockSettings({ organization_name: 'New Org' });

        useSettingsStore.getState().setSettings(userId, oldSettings);
        useSettingsStore.getState().setSettings(userId, newSettings);

        expect(useSettingsStore.getState().getSettings(userId)?.organization_name).toBe('New Org');
      });
    });

    describe('getCacheEntry', () => {
      it('should return cache entry with timestamp', () => {
        const settings = createMockSettings();
        useSettingsStore.getState().setSettings(userId, settings);

        const entry = useSettingsStore.getState().getCacheEntry(userId);

        expect(entry?.settings).toEqual(settings);
        expect(entry?.cachedAt).toBe(Date.now());
      });

      it('should return undefined for non-existent user', () => {
        const entry = useSettingsStore.getState().getCacheEntry('non-existent');
        expect(entry).toBeUndefined();
      });
    });

    describe('clearSettings', () => {
      it('should clear settings for specific user', () => {
        const user1 = 'user-1';
        const user2 = 'user-2';

        useSettingsStore.getState().setSettings(user1, createMockSettings());
        useSettingsStore.getState().setSettings(user2, createMockSettings());
        useSettingsStore.getState().clearSettings(user1);

        expect(useSettingsStore.getState().getSettings(user1)).toBeUndefined();
        expect(useSettingsStore.getState().getSettings(user2)).toBeDefined();
      });
    });

    describe('clearAll', () => {
      it('should clear all cached settings', () => {
        useSettingsStore.getState().setSettings('user-1', createMockSettings());
        useSettingsStore.getState().setSettings('user-2', createMockSettings());
        useSettingsStore.getState().clearAll();

        expect(useSettingsStore.getState().getSettings('user-1')).toBeUndefined();
        expect(useSettingsStore.getState().getSettings('user-2')).toBeUndefined();
      });
    });
  });

  describe('store isolation', () => {
    it('stores should not interfere with each other', () => {
      useKeysStore.getState().setKeys('user-1', [createMockKey()]);
      useProjectsStore.getState().setProjects('org-1', [createMockProject()]);
      useEndpointsStore.getState().setEndpoints('org-1', 'project-1', [createMockEndpoint()]);
      useAnalyticsStore.getState().setAnalytics('user-1', createMockAnalytics());
      useSettingsStore.getState().setSettings('user-1', createMockSettings());

      // Clear one store
      useKeysStore.getState().clearAll();

      // Other stores should be unaffected
      expect(useProjectsStore.getState().getProjects('org-1')).toBeDefined();
      expect(useEndpointsStore.getState().getEndpoints('org-1', 'project-1')).toBeDefined();
      expect(useAnalyticsStore.getState().getAnalytics('user-1')).toBeDefined();
      expect(useSettingsStore.getState().getSettings('user-1')).toBeDefined();
    });
  });
});
