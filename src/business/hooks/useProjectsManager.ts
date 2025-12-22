/**
 * Projects Manager Hook
 * Business logic hook that wraps the client useProjects hook with Zustand caching
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  NetworkClient,
  Optional,
  Project,
  ProjectCreateRequest,
  ProjectQueryParams,
  ProjectUpdateRequest,
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
  userId: string;
  token: Optional<FirebaseIdToken>;
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

  refresh: (params?: ProjectQueryParams) => Promise<void>;
  createProject: (data: ProjectCreateRequest) => Promise<Project | undefined>;
  updateProject: (
    projectId: string,
    data: ProjectUpdateRequest
  ) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Manager hook for projects with caching
 */
export const useProjectsManager = ({
  baseUrl,
  networkClient,
  userId,
  token,
  autoFetch = true,
  params,
}: UseProjectsManagerConfig): UseProjectsManagerReturn => {
  const {
    projects: clientProjects,
    isLoading,
    error,
    refresh: clientRefresh,
    createProject: clientCreateProject,
    updateProject: clientUpdateProject,
    deleteProject: clientDeleteProject,
    clearError,
  } = useProjects(networkClient, baseUrl);
  const cacheEntry = useProjectsStore(
    useCallback(state => state.cache[userId], [userId])
  );
  const setProjects = useProjectsStore(state => state.setProjects);
  const addProject = useProjectsStore(state => state.addProject);
  const updateProjectInStore = useProjectsStore(state => state.updateProject);
  const removeProject = useProjectsStore(state => state.removeProject);

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
      setProjects(userId, clientProjects);
    }
  }, [clientProjects, userId, setProjects]);

  /**
   * Refresh projects from server
   */
  const refresh = useCallback(
    async (queryParams?: ProjectQueryParams): Promise<void> => {
      if (!token) {
        return;
      }
      await clientRefresh(userId, token, queryParams ?? params);
    },
    [clientRefresh, userId, token, params]
  );

  /**
   * Create a new project
   */
  const createProject = useCallback(
    async (data: ProjectCreateRequest): Promise<Project | undefined> => {
      if (!token) {
        return undefined;
      }
      const response = await clientCreateProject(userId, data, token);
      if (response.success && response.data) {
        addProject(userId, response.data);
        return response.data;
      }
      return undefined;
    },
    [clientCreateProject, userId, token, addProject]
  );

  /**
   * Update a project
   */
  const updateProject = useCallback(
    async (projectId: string, data: ProjectUpdateRequest): Promise<void> => {
      if (!token) {
        return;
      }
      const response = await clientUpdateProject(
        userId,
        projectId,
        data,
        token
      );
      if (response.success && response.data) {
        updateProjectInStore(userId, projectId, response.data);
      }
    },
    [clientUpdateProject, userId, token, updateProjectInStore]
  );

  /**
   * Delete a project
   */
  const deleteProject = useCallback(
    async (projectId: string): Promise<void> => {
      if (!token) {
        return;
      }
      const response = await clientDeleteProject(userId, projectId, token);
      if (response.success) {
        removeProject(userId, projectId);
      }
    },
    [clientDeleteProject, userId, token, removeProject]
  );

  // Track if we've already attempted auto-fetch to prevent retry loops
  const hasAttemptedFetchRef = useRef(false);

  // Auto-fetch on mount (only once per token)
  useEffect(() => {
    if (
      autoFetch &&
      token &&
      projects.length === 0 &&
      !hasAttemptedFetchRef.current
    ) {
      hasAttemptedFetchRef.current = true;
      refresh();
    }
  }, [autoFetch, token, projects.length, refresh]);

  // Reset attempt flag when token changes (e.g., user re-authenticates)
  useEffect(() => {
    hasAttemptedFetchRef.current = false;
  }, [token]);

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
    ]
  );
};
