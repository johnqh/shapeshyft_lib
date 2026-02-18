/**
 * Projects Manager Hook
 * Business logic hook that wraps the client useProjects hook with Zustand caching
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
  baseUrl: string;
  networkClient: NetworkClient;
  entitySlug: string;
  token: Optional<FirebaseIdToken>;
  /** Testnet/sandbox mode */
  testMode?: boolean;
  /** Auto-fetch on mount when token is available */
  autoFetch?: boolean;
  /** Query params for filtering */
  params?: ProjectQueryParams;
}

/**
 * Return type for useProjectsManager
 */
export interface UseProjectsManagerReturn {
  projects: Project[];
  isLoading: boolean;
  error: Optional<string>;
  isCached: boolean;
  cachedAt: Optional<number>;

  refresh: () => Promise<void>;
  createProject: (data: ProjectCreateRequest) => Promise<Project | undefined>;
  updateProject: (
    projectId: string,
    data: ProjectUpdateRequest
  ) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  getProjectApiKey: (projectId: string) => Promise<GetApiKeyResponse | null>;
  refreshProjectApiKey: (
    projectId: string
  ) => Promise<RefreshApiKeyResponse | null>;
  clearError: () => void;
}

/**
 * Manager hook for projects with caching
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
