/**
 * Projects Manager Hook
 *
 * Business logic hook that wraps the client `useProjects` hook with Zustand caching.
 *
 * **Data flow**:
 * 1. On mount (if `autoFetch` is true and `token` is available), fetches projects from the server.
 * 2. Server data is synced to `useProjectsStore` for caching.
 * 3. Returns fresh server data when available, falls back to cached data otherwise.
 * 4. `isCached` flag indicates whether the data source is the cache.
 *
 * **Entity scoping**: All data is scoped by `entitySlug`.
 *
 * @module
 */

import { useCallback, useEffect, useMemo } from 'react';
import type {
  GetApiKeyResponse,
  NetworkClient,
  Optional,
  Project,
  ProjectCreateRequest,
  ProjectQueryParams,
  ProjectUpdateRequest,
  RefreshApiKeyResponse,
} from '@sudobility/shapeshyft_types';
import {
  type FirebaseIdToken,
  useProjects,
} from '@sudobility/shapeshyft_client';
import { useProjectsStore } from '../stores/projectsStore';

/**
 * Configuration for useProjectsManager
 */
export interface UseProjectsManagerConfig {
  /** Base URL of the ShapeShyft API */
  baseUrl: string;
  /** Network client instance for making HTTP requests */
  networkClient: NetworkClient;
  /** Entity slug (organization path) to scope the projects to */
  entitySlug: string;
  /** Firebase ID token for authentication, or null if not yet authenticated */
  token: Optional<FirebaseIdToken>;
  /** Enable testnet/sandbox mode (default: false) */
  testMode?: boolean;
  /**
   * Auto-fetch projects on mount when token is available (default: true).
   * Set to false to defer fetching until `refresh()` is called manually.
   */
  autoFetch?: boolean;
  /** Optional query params for filtering projects */
  params?: ProjectQueryParams;
}

/**
 * Return type for useProjectsManager
 */
export interface UseProjectsManagerReturn {
  /** Array of projects. Falls back to cached data if server data is unavailable. */
  projects: Project[];
  /** Whether projects are currently being fetched from the server */
  isLoading: boolean;
  /** Error message from the most recent operation, or null */
  error: Optional<string>;
  /** Whether the returned projects are from the Zustand cache */
  isCached: boolean;
  /** Unix timestamp (ms) when the cache was last updated, or null */
  cachedAt: Optional<number>;

  /** Force refresh projects from the server */
  refresh: () => Promise<void>;
  /** Create a new project. Returns the created Project on success, or undefined on failure. */
  createProject: (data: ProjectCreateRequest) => Promise<Project | undefined>;
  /** Update an existing project by its UUID */
  updateProject: (
    projectId: string,
    data: ProjectUpdateRequest
  ) => Promise<void>;
  /** Delete a project by its UUID */
  deleteProject: (projectId: string) => Promise<void>;
  /** Retrieve the full API key for a project (sensitive operation) */
  getProjectApiKey: (projectId: string) => Promise<GetApiKeyResponse | null>;
  /** Generate a new API key for a project, invalidating the old one */
  refreshProjectApiKey: (
    projectId: string
  ) => Promise<RefreshApiKeyResponse | null>;
  /** Clear the current error state */
  clearError: () => void;
}

/**
 * Manager hook for projects with Zustand caching.
 *
 * @example
 * ```tsx
 * const { projects, isLoading, createProject } = useProjectsManager({
 *   baseUrl: "https://api.shapeshyft.com",
 *   networkClient,
 *   entitySlug: "my-org",
 *   token: firebaseToken,
 * });
 * ```
 */
export const useProjectsManager = ({
  baseUrl,
  networkClient,
  entitySlug,
  token,
  testMode = false,
  autoFetch = true,
  params,
}: UseProjectsManagerConfig): UseProjectsManagerReturn => {
  const {
    projects: clientProjects,
    isLoading,
    error,
    refetch,
    createProject: clientCreateProject,
    updateProject: clientUpdateProject,
    deleteProject: clientDeleteProject,
    getProjectApiKey: clientGetProjectApiKey,
    refreshProjectApiKey: clientRefreshProjectApiKey,
    clearError,
  } = useProjects(networkClient, baseUrl, entitySlug, token ?? null, {
    testMode,
    enabled: autoFetch,
    params,
  });

  const cacheEntry = useProjectsStore(
    useCallback(state => state.cache[entitySlug], [entitySlug])
  );
  const setProjects = useProjectsStore(state => state.setProjects);

  // Get cached data
  const cachedProjects = cacheEntry?.projects;
  const cachedAt = cacheEntry?.cachedAt;

  // Determine data source - memoize to prevent dependency changes
  const projects = useMemo(
    () => (clientProjects.length > 0 ? clientProjects : (cachedProjects ?? [])),
    [clientProjects, cachedProjects]
  );
  const isCached =
    clientProjects.length === 0 && (cachedProjects?.length ?? 0) > 0;

  // Sync client data to store
  useEffect(() => {
    if (clientProjects.length > 0) {
      setProjects(entitySlug, clientProjects);
    }
  }, [clientProjects, entitySlug, setProjects]);

  /**
   * Refresh projects from server
   */
  const refresh = useCallback(async (): Promise<void> => {
    await refetch();
  }, [refetch]);

  /**
   * Create a new project
   */
  const createProject = useCallback(
    async (data: ProjectCreateRequest): Promise<Project | undefined> => {
      const response = await clientCreateProject(data);
      if (response.success && response.data) {
        return response.data;
      }
      return undefined;
    },
    [clientCreateProject]
  );

  /**
   * Update a project
   */
  const updateProject = useCallback(
    async (projectId: string, data: ProjectUpdateRequest): Promise<void> => {
      await clientUpdateProject(projectId, data);
    },
    [clientUpdateProject]
  );

  /**
   * Delete a project
   */
  const deleteProject = useCallback(
    async (projectId: string): Promise<void> => {
      await clientDeleteProject(projectId);
    },
    [clientDeleteProject]
  );

  /**
   * Get project API key (full key)
   */
  const getProjectApiKey = useCallback(
    async (projectId: string): Promise<GetApiKeyResponse | null> => {
      const response = await clientGetProjectApiKey(projectId);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    [clientGetProjectApiKey]
  );

  /**
   * Refresh project API key (generates new key)
   */
  const refreshProjectApiKey = useCallback(
    async (projectId: string): Promise<RefreshApiKeyResponse | null> => {
      const response = await clientRefreshProjectApiKey(projectId);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    [clientRefreshProjectApiKey]
  );

  return useMemo(
    () => ({
      projects,
      isLoading,
      error,
      isCached,
      cachedAt: cachedAt ?? null,
      refresh,
      createProject,
      updateProject,
      deleteProject,
      getProjectApiKey,
      refreshProjectApiKey,
      clearError,
    }),
    [
      projects,
      isLoading,
      error,
      clearError,
      isCached,
      cachedAt,
      refresh,
      createProject,
      updateProject,
      deleteProject,
      getProjectApiKey,
      refreshProjectApiKey,
    ]
  );
};
