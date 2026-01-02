/**
 * Projects Store
 * Zustand store for caching projects by entity slug
 */

import { create } from 'zustand';
import type { Project } from '@sudobility/shapeshyft_types';

/**
 * Projects cache entry
 */
interface ProjectsCacheEntry {
  /** Array of projects for this entity */
  projects: Project[];
  /** Timestamp when this data was cached */
  cachedAt: number;
}

/**
 * Projects store state
 */
interface ProjectsStoreState {
  /** Cache of projects keyed by entity slug */
  cache: Record<string, ProjectsCacheEntry>;
  /** Set projects for a specific entity slug */
  setProjects: (entitySlug: string, projects: Project[]) => void;
  /** Get projects for a specific entity slug */
  getProjects: (entitySlug: string) => Project[] | undefined;
  /** Get cache entry for a specific entity slug */
  getCacheEntry: (entitySlug: string) => ProjectsCacheEntry | undefined;
  /** Add a single project to the cache */
  addProject: (entitySlug: string, project: Project) => void;
  /** Update a project in the cache */
  updateProject: (
    entitySlug: string,
    projectId: string,
    project: Project
  ) => void;
  /** Remove a project from the cache */
  removeProject: (entitySlug: string, projectId: string) => void;
  /** Clear projects for a specific entity slug */
  clearProjects: (entitySlug: string) => void;
  /** Clear all cached projects */
  clearAll: () => void;
}

/**
 * Zustand store for projects caching
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
