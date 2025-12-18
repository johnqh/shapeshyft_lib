/**
 * Projects Manager Hook
 * Business logic hook that wraps the client useProjects hook with Zustand caching
 */

import { useCallback, useEffect, useMemo } from 'react';
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
  createProject: (data: ProjectCreateRequest) => Promise<void>;
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
  const clientHook = useProjects(networkClient, baseUrl);
  const store = useProjectsStore();

  // Get cached data
  const cacheEntry = store.getCacheEntry(userId);
  const cachedProjects = cacheEntry?.projects;
  const cachedAt = cacheEntry?.cachedAt;

  // Determine data source - memoize to prevent dependency changes
  const projects = useMemo(
    () =>
      clientHook.projects.length > 0
        ? clientHook.projects
        : (cachedProjects ?? []),
    [clientHook.projects, cachedProjects]
  );
  const isCached =
    clientHook.projects.length === 0 && (cachedProjects?.length ?? 0) > 0;

  // Sync client data to store
  useEffect(() => {
    if (clientHook.projects.length > 0) {
      store.setProjects(userId, clientHook.projects);
    }
  }, [clientHook.projects, userId, store]);

  /**
   * Refresh projects from server
   */
  const refresh = useCallback(
    async (queryParams?: ProjectQueryParams): Promise<void> => {
      if (!token) {
        return;
      }
      await clientHook.refresh(userId, token, queryParams ?? params);
    },
    [clientHook, userId, token, params]
  );

  /**
   * Create a new project
   */
  const createProject = useCallback(
    async (data: ProjectCreateRequest): Promise<void> => {
      if (!token) {
        return;
      }
      const response = await clientHook.createProject(userId, data, token);
      if (response.success && response.data) {
        store.addProject(userId, response.data);
      }
    },
    [clientHook, userId, token, store]
  );

  /**
   * Update a project
   */
  const updateProject = useCallback(
    async (projectId: string, data: ProjectUpdateRequest): Promise<void> => {
      if (!token) {
        return;
      }
      const response = await clientHook.updateProject(
        userId,
        projectId,
        data,
        token
      );
      if (response.success && response.data) {
        store.updateProject(userId, projectId, response.data);
      }
    },
    [clientHook, userId, token, store]
  );

  /**
   * Delete a project
   */
  const deleteProject = useCallback(
    async (projectId: string): Promise<void> => {
      if (!token) {
        return;
      }
      const response = await clientHook.deleteProject(userId, projectId, token);
      if (response.success) {
        store.removeProject(userId, projectId);
      }
    },
    [clientHook, userId, token, store]
  );

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && token && projects.length === 0) {
      refresh();
    }
  }, [autoFetch, token, projects.length, refresh]);

  return useMemo(
    () => ({
      projects,
      isLoading: clientHook.isLoading,
      error: clientHook.error,
      isCached,
      cachedAt: cachedAt ?? null,
      refresh,
      createProject,
      updateProject,
      deleteProject,
      clearError: clientHook.clearError,
    }),
    [
      projects,
      clientHook.isLoading,
      clientHook.error,
      clientHook.clearError,
      isCached,
      cachedAt,
      refresh,
      createProject,
      updateProject,
      deleteProject,
    ]
  );
};
