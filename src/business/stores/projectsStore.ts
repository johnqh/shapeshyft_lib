/**
 * Projects Store
 *
 * Zustand store for caching projects by entity slug. This is a global
 * singleton store that persists across React renders and unmounts.
 *
 * **Important**: Call `clearProjects(entitySlug)` or `clearAll()` when the user
 * switches entities or logs out to avoid leaking data between sessions.
 *
 * @module
 */

import { create } from 'zustand';
import type { Project } from '@sudobility/shapeshyft_types';

/**
 * Projects cache entry containing the cached projects and metadata.
 */
interface ProjectsCacheEntry {
  /** Array of projects for this entity */
  projects: Project[];
  /** Unix timestamp (ms) when this data was cached */
  cachedAt: number;
}

/**
 * Projects store state and actions.
 *
 * All methods are scoped by `entitySlug` to support multi-entity caching.
 */
interface ProjectsStoreState {
  /** Cache of projects keyed by entity slug */
  cache: Record<string, ProjectsCacheEntry>;

  /**
   * Replace all cached projects for an entity.
   * Overwrites any existing cache entry and updates the `cachedAt` timestamp.
   */
  setProjects: (entitySlug: string, projects: Project[]) => void;

  /**
   * Get the cached projects array for an entity.
   * @returns The projects array, or `undefined` if no cache entry exists.
   */
  getProjects: (entitySlug: string) => Project[] | undefined;

  /**
   * Get the full cache entry (projects + metadata) for an entity.
   * @returns The cache entry with `projects` and `cachedAt`, or `undefined` if not cached.
   */
  getCacheEntry: (entitySlug: string) => ProjectsCacheEntry | undefined;

  /**
   * Add a single project to the entity's cache.
   * If no cache entry exists for the entity, a new entry is created with just this project.
   * If an entry already exists, the project is appended to the existing array.
   */
  addProject: (entitySlug: string, project: Project) => void;

  /**
   * Update a specific project in the cache by its UUID.
   * Matches projects by `project.uuid === projectId`. If the entity has no cache entry,
   * or the project ID is not found, the state is not modified.
   */
  updateProject: (
    entitySlug: string,
    projectId: string,
    project: Project
  ) => void;

  /**
   * Remove a specific project from the cache by its UUID.
   * If the entity has no cache entry, the state is not modified.
   */
  removeProject: (entitySlug: string, projectId: string) => void;

  /**
   * Clear the entire cache entry for a specific entity.
   * After this call, `getProjects(entitySlug)` will return `undefined`.
   */
  clearProjects: (entitySlug: string) => void;

  /**
   * Clear all cached projects for all entities.
   * Should be called on logout to prevent data leakage.
   */
  clearAll: () => void;
}

/**
 * Zustand store for projects caching.
 *
 * This store is a global singleton -- it persists across renders and unmounts.
 * Use `clearAll()` on logout to prevent data leakage between entities.
 *
 * @example
 * ```ts
 * // Read projects for an entity
 * const projects = useProjectsStore.getState().getProjects(entitySlug);
 *
 * // Subscribe to projects in a React component
 * const projects = useProjectsStore(state => state.getProjects(entitySlug));
 *
 * // Add a new project
 * useProjectsStore.getState().addProject(entitySlug, newProject);
 * ```
 */
export const useProjectsStore = create<ProjectsStoreState>((set, get) => ({
  cache: {},

  setProjects: (entitySlug: string, projects: Project[]) =>
    set(state => ({
      cache: {
        ...state.cache,
        [entitySlug]: {
          projects,
          cachedAt: Date.now(),
        },
      },
    })),

  getProjects: (entitySlug: string) => {
    const entry = get().cache[entitySlug];
    return entry?.projects;
  },

  getCacheEntry: (entitySlug: string) => {
    return get().cache[entitySlug];
  },

  addProject: (entitySlug: string, project: Project) =>
    set(state => {
      const existing = state.cache[entitySlug];
      if (!existing) {
        return {
          cache: {
            ...state.cache,
            [entitySlug]: {
              projects: [project],
              cachedAt: Date.now(),
            },
          },
        };
      }
      return {
        cache: {
          ...state.cache,
          [entitySlug]: {
            projects: [...existing.projects, project],
            cachedAt: Date.now(),
          },
        },
      };
    }),

  updateProject: (entitySlug: string, projectId: string, project: Project) =>
    set(state => {
      const existing = state.cache[entitySlug];
      if (!existing) return state;
      return {
        cache: {
          ...state.cache,
          [entitySlug]: {
            projects: existing.projects.map(p =>
              p.uuid === projectId ? project : p
            ),
            cachedAt: Date.now(),
          },
        },
      };
    }),

  removeProject: (entitySlug: string, projectId: string) =>
    set(state => {
      const existing = state.cache[entitySlug];
      if (!existing) return state;
      return {
        cache: {
          ...state.cache,
          [entitySlug]: {
            projects: existing.projects.filter(p => p.uuid !== projectId),
            cachedAt: Date.now(),
          },
        },
      };
    }),

  clearProjects: (entitySlug: string) =>
    set(state => {
      const newCache = { ...state.cache };
      delete newCache[entitySlug];
      return { cache: newCache };
    }),

  clearAll: () => set({ cache: {} }),
}));
