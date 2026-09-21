// Tests run under Node, where 25+ exposes a `localStorage` getter that warns
// (and returns undefined) unless --localstorage-file is set. zustand's
// `persist` reads it eagerly, so define an in-memory one before stores load.
const memory = new Map<string, string>();

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    get length() {
      return memory.size;
    },
    clear: () => memory.clear(),
    getItem: (key: string) => memory.get(key) ?? null,
    key: (index: number) => Array.from(memory.keys())[index] ?? null,
    removeItem: (key: string) => {
      memory.delete(key);
    },
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
  } satisfies Storage,
});
