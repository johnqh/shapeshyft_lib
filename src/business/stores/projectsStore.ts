/**
 * Projects Store
 * Zustand store for caching projects by user ID
 */

import { create } from 'zustand';
import type { Project } from '@sudobility/shapeshyft_types';

/**
 * Projects cache entry
 */
interface ProjectsCacheEntry {
  /** Array of projects for this user */
  projects: Project[];
  /** Timestamp when this data was cached */
  cachedAt: number;
}

/**
 * Projects store state
 */
interface ProjectsStoreState {
  /** Cache of projects keyed by user ID */
  cache: Record<string, ProjectsCacheEntry>;
  /** Set projects for a specific user ID */
  setProjects: (userId: string, projects: Project[]) => void;
  /** Get projects for a specific user ID */
  getProjects: (userId: string) => Project[] | undefined;
  /** Get cache entry for a specific user ID */
  getCacheEntry: (userId: string) => ProjectsCacheEntry | undefined;
  /** Add a single project to the cache */
  addProject: (userId: string, project: Project) => void;
  /** Update a project in the cache */
  updateProject: (userId: string, projectId: string, project: Project) => void;
  /** Remove a project from the cache */
  removeProject: (userId: string, projectId: string) => void;
  /** Clear projects for a specific user ID */
  clearProjects: (userId: string) => void;
  /** Clear all cached projects */
  clearAll: () => void;
}

/**
 * Zustand store for projects caching
 */
export const useProjectsStore = create<ProjectsStoreState>((set, get) => ({
  cache: {},

  setProjects: (userId: string, projects: Project[]) =>
    set(state => ({
      cache: {
        ...state.cache,
        [userId]: {
          projects,
          cachedAt: Date.now(),
        },
      },
    })),

  getProjects: (userId: string) => {
    const entry = get().cache[userId];
    return entry?.projects;
  },

  getCacheEntry: (userId: string) => {
    return get().cache[userId];
  },

  addProject: (userId: string, project: Project) =>
    set(state => {
      const existing = state.cache[userId];
      if (!existing) {
        return {
          cache: {
            ...state.cache,
            [userId]: {
              projects: [project],
              cachedAt: Date.now(),
            },
          },
        };
      }
      return {
        cache: {
          ...state.cache,
          [userId]: {
            projects: [...existing.projects, project],
            cachedAt: Date.now(),
          },
        },
      };
    }),

  updateProject: (userId: string, projectId: string, project: Project) =>
    set(state => {
      const existing = state.cache[userId];
      if (!existing) return state;
      return {
        cache: {
          ...state.cache,
          [userId]: {
            projects: existing.projects.map(p =>
              p.uuid === projectId ? project : p
            ),
            cachedAt: Date.now(),
          },
        },
      };
    }),

  removeProject: (userId: string, projectId: string) =>
    set(state => {
      const existing = state.cache[userId];
      if (!existing) return state;
      return {
        cache: {
          ...state.cache,
          [userId]: {
            projects: existing.projects.filter(p => p.uuid !== projectId),
            cachedAt: Date.now(),
          },
        },
      };
    }),

  clearProjects: (userId: string) =>
    set(state => {
      const newCache = { ...state.cache };
      delete newCache[userId];
      return { cache: newCache };
    }),

  clearAll: () => set({ cache: {} }),
}));
