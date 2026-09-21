/**
 * Storage helper for Zustand `persist` stores.
 *
 * @module
 */

import { createJSONStorage } from 'zustand/middleware';

/**
 * Resolve localStorage, falling back to an in-memory store when it is
 * unavailable (SSR, or runtimes such as Node 25+ that expose an undefined
 * `localStorage` global unless configured).
 */
const resolveStorage = (): Storage => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Access can throw (e.g. blocked site data); use the fallback below.
  }
  const memory = new Map<string, string>();
  return {
    get length() {
      return memory.size;
    },
    clear: () => memory.clear(),
    getItem: key => memory.get(key) ?? null,
    key: index => Array.from(memory.keys())[index] ?? null,
    removeItem: key => {
      memory.delete(key);
    },
    setItem: (key, value) => {
      memory.set(key, value);
    },
  };
};

/**
 * JSON storage for `persist` that uses localStorage when available and an
 * in-memory fallback otherwise.
 */
export const createSafeJSONStorage = <T>() =>
  createJSONStorage<T>(resolveStorage);
