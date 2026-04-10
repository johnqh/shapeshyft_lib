# ShapeShyft Lib

Business logic library for ShapeShyft with Zustand stores, manager hooks, and endpoint templates (v0.0.84).

**npm**: `@sudobility/shapeshyft_lib`

## Tech Stack

- **Language**: TypeScript (strict mode, ES2020 target)
- **Runtime**: Bun
- **Package Manager**: Bun (do not use npm/yarn/pnpm for installing dependencies)
- **State**: Zustand v5
- **Build**: TypeScript compiler (tsc)
- **Testing**: Vitest
- **Module**: ESM (ES2020 ESNext)

## Project Structure

```
src/
├── index.ts                    # Public exports (stores, hooks, templates, utils)
├── index.test.ts               # Integration tests
├── business/
│   ├── index.ts                # Re-exports stores, hooks, templates
│   ├── stores/
│   │   ├── keysStore.ts            # LLM API keys cache (by entitySlug, in-memory)
│   │   ├── projectsStore.ts        # Projects cache (by entitySlug, in-memory)
│   │   ├── endpointsStore.ts       # Endpoints cache (by entitySlug:projectId, in-memory)
│   │   ├── settingsStore.ts        # User settings cache (by userId, in-memory)
│   │   ├── analyticsStore.ts       # Analytics cache (by entitySlug, in-memory)
│   │   ├── providerModelsStore.ts  # Provider models cache (by LlmProvider, localStorage, 1hr TTL)
│   │   └── stores.test.ts
│   ├── hooks/
│   │   ├── useKeysManager.ts           # Keys CRUD with store caching
│   │   ├── useProjectsManager.ts       # Projects CRUD with store caching
│   │   ├── useEndpointsManager.ts      # Endpoints CRUD with store caching
│   │   ├── useSettingsManager.ts       # Settings R/W with store caching
│   │   ├── useAnalyticsManager.ts      # Analytics fetch with store caching
│   │   ├── useEndpointTester.ts        # Test endpoints + sample generation
│   │   ├── useBudgetTracker.ts         # Budget tracking & threshold alerts
│   │   ├── useBudgetTracker.test.ts
│   │   ├── useProjectTemplates.ts      # Access project templates
│   │   ├── useEndpointTemplates.ts     # Access endpoint templates (grouped by category)
│   │   └── useProviderModelsManager.ts # Fetch models with capability filtering + cache
│   └── templates/
│       ├── endpoint-templates.ts       # 9 project templates (928 lines)
│       └── endpoint-templates.test.ts
└── utils/
    ├── index.ts
    ├── schema-validation.ts            # JSON Schema validation, sample generation
    └── schema-validation.test.ts
```

## Commands

```bash
bun run build        # Build to dist/ (tsc)
bun run build:watch  # Watch mode build
bun run clean        # Remove dist/
bun run test         # Run Vitest (watch mode)
bun run test:run     # Run tests once
bun run lint         # Run ESLint
bun run lint:fix     # Fix ESLint issues
bun run typecheck    # TypeScript check (--noEmit)
bun run format       # Format with Prettier
bun run verify       # Pre-commit: typecheck + lint + test + build
```

## Stores

Zustand stores provide client-side caching. Each store is entity-scoped or user-scoped.

| Store | Scope Key | Persisted | Key Methods |
| ----- | --------- | --------- | ----------- |
| `useKeysStore` | entitySlug | No (memory) | setKeys, getKeys, addKey, updateKey, removeKey, clearKeys, clearAll |
| `useProjectsStore` | entitySlug | No (memory) | setProjects, getProjects, addProject, updateProject, removeProject, clearProjects, clearAll |
| `useEndpointsStore` | entitySlug:projectId | No (memory) | setEndpoints, getEndpoints, addEndpoint, updateEndpoint, removeEndpoint, clearEndpoints, clearEntityEndpoints, clearAll |
| `useSettingsStore` | userId | No (memory) | setSettings, getSettings, clearSettings, clearAll |
| `useAnalyticsStore` | entitySlug | No (memory) | setAnalytics, getAnalytics, clearAnalytics, clearAll |
| `useProviderModelsStore` | LlmProvider | Yes (localStorage) | setProviderModels, getProviderModels, clearProvider, clearAll, isStale |

### Store Pattern

```typescript
import { useKeysStore } from '@sudobility/shapeshyft_lib';

// Read from store (reactive)
const keys = useKeysStore(state => state.getKeys(entitySlug));

// Write to store (non-reactive, from outside React)
useKeysStore.getState().setKeys(entitySlug, newKeys);
useKeysStore.getState().addKey(entitySlug, newKey);

// Clear on logout
useKeysStore.getState().clearAll();
```

### Persistence

- **In-memory stores** (keys, projects, endpoints, settings, analytics): Cache only during session. Lost on page refresh.
- **localStorage stores** (providerModels): Survive page reloads. Provider models use 1-hour TTL via `isStale()` method.
- **Budget store** (`useBudgetTracker`): Uses localStorage internally via Zustand `persist` middleware. Key: `'shapeshyft-provider-models'`.

### Composite Cache Keys

`endpointsStore` uses `"entitySlug:projectId"` format because endpoints are nested under projects:

```typescript
// Internal helper
const cacheKey = makeCacheKey(entitySlug, projectId); // "my-org:proj-123"
```

### Cache Entry Metadata

Every cache entry includes `cachedAt` (Unix timestamp in ms) for staleness indicators.

## Manager Hooks

Manager hooks wrap `shapeshyft_client` hooks with Zustand store caching. They follow a consistent pattern:

| Hook | Wraps Client Hook | Store | Scope |
| ---- | ----------------- | ----- | ----- |
| `useKeysManager` | `useKeys` | keysStore | entitySlug |
| `useProjectsManager` | `useProjects` | projectsStore | entitySlug |
| `useEndpointsManager` | `useEndpoints` | endpointsStore | entitySlug + projectId |
| `useSettingsManager` | `useSettings` | settingsStore | userId |
| `useAnalyticsManager` | `useAnalytics` | analyticsStore | entitySlug |
| `useProviderModelsManager` | `useProviderModels` | providerModelsStore | LlmProvider |

### Manager Hook Pattern

```typescript
const result = useKeysManager({
  baseUrl,           // API base URL
  networkClient,     // NetworkClient from @sudobility/di
  entitySlug,        // null disables fetching
  token,             // FirebaseIdToken | null
  testMode?,         // Optional
  autoFetch?,        // Default true
});

// Returns:
{
  keys: LlmApiKeySafe[],    // Fresh server data preferred, cached data as fallback
  isLoading: boolean,
  error: string | null,
  isCached: boolean,         // True when showing cached data (server data empty)
  cachedAt: number | null,   // Unix timestamp of cache entry
  refresh: () => void,
  createKey: (...) => Promise<...>,
  updateKey: (...) => Promise<...>,
  deleteKey: (...) => Promise<...>,
  clearError: () => void,
}
```

### Cache Fallback Logic

Manager hooks prefer fresh server data over cached data:

```typescript
const keys = useMemo(
  () => (clientKeys.length > 0 ? clientKeys : (cachedKeys ?? [])),
  [clientKeys, cachedKeys]
);
const isCached = clientKeys.length === 0 && (cachedKeys?.length ?? 0) > 0;
```

Server data is synced to the store via `useEffect` when it arrives.

## Other Hooks

| Hook | Purpose |
| ---- | ------- |
| `useEndpointTester` | Test an endpoint with sample input, returns `TestResult` with validation |
| `useBudgetTracker` | Track spending against user-defined budgets, threshold-based alerts |
| `useProjectTemplates` | Access `ALL_TEMPLATES` for project creation UI |
| `useEndpointTemplates` | Access templates grouped by category for endpoint creation UI |

## Templates

9 pre-built project templates for common AI use cases:

| Template | Category | Endpoints |
| -------- | -------- | --------- |
| `textClassifierTemplate` | Classification | classify |
| `sentimentAnalyzerTemplate` | Analysis | analyze |
| `dataExtractorTemplate` | Extraction | extract-entities, extract-fields |
| `contentGeneratorTemplate` | Generation | generate-summary, generate-response |
| `localizationTemplate` | Translation | translate-batch, translate-single |
| `imageRecognitionTemplate` | Vision | recognize |
| `imageGenerationTemplate` | Generation | generate |
| `imageProcessingTemplate` | Vision | process |
| `audioTranscriptionTemplate` | Audio | transcribe |

### Using Templates

```typescript
import { ALL_TEMPLATES, applyTemplate } from '@sudobility/shapeshyft_lib';

// Get all templates
const templates = ALL_TEMPLATES; // ProjectTemplate[]

// Apply template to create project + endpoints
const { project, endpoints } = applyTemplate(
  textClassifierTemplate,
  'my-classifier',  // project_name
  'key-123'         // llm_key_id for endpoints
);
```

## Utilities

### Schema Validation

```typescript
import {
  validateValue,         // Validate a single value against a JSON Schema property
  validateInput,         // Validate an entire input object against a schema
  generateSampleValue,   // Generate sample value from a schema property
  generateSampleInput,   // Generate full sample input from a schema
  keyToSampleLabel,      // Convert key to human-readable label
} from '@sudobility/shapeshyft_lib';
```

**Limitations** (intentionally lightweight):
- No `allOf`, `oneOf`, `anyOf` combinators
- No `$ref` references
- No `patternProperties`, `additionalProperties` enforcement
- No `format` or regex `pattern` validation
- No `if`/`then`/`else` conditionals

## Exports

From `@sudobility/shapeshyft_lib`:

```typescript
// Stores
export { useKeysStore, useProjectsStore, useEndpointsStore,
         useSettingsStore, useAnalyticsStore, useProviderModelsStore }

// Manager Hooks
export { useKeysManager, UseKeysManagerReturn, UseKeysManagerConfig }
export { useProjectsManager, UseProjectsManagerReturn, UseProjectsManagerConfig }
export { useEndpointsManager, UseEndpointsManagerReturn, UseEndpointsManagerConfig }
export { useSettingsManager, UseSettingsManagerReturn, UseSettingsManagerConfig }
export { useAnalyticsManager, UseAnalyticsManagerReturn, UseAnalyticsManagerConfig }
export { useProviderModelsManager, UseProviderModelsManagerReturn }

// Other Hooks
export { useEndpointTester, useBudgetTracker, useProjectTemplates, useEndpointTemplates }

// Templates
export { textClassifierTemplate, sentimentAnalyzerTemplate, dataExtractorTemplate,
         contentGeneratorTemplate, localizationTemplate, imageRecognitionTemplate,
         imageGenerationTemplate, imageProcessingTemplate, audioTranscriptionTemplate,
         ALL_TEMPLATES, applyTemplate }

// Template Types
export { ProjectTemplate, EndpointTemplate, EndpointTemplateWithCategory }

// Budget Types
export { Budget, BudgetPeriod, BudgetAlert, CostBreakdownItem }

// Test Types
export { TestResult, ValidationResult }

// Utils
export { validateValue, validateInput, generateSampleValue,
         generateSampleInput, keyToSampleLabel }
```

## Task Recipes

### Adding a New Store

1. Create `src/business/stores/myStore.ts`
2. Follow the existing pattern with `create<MyStoreState>()` from Zustand
3. Include: `cache: Record<string, MyCacheEntry>`, CRUD methods, `clearAll()`
4. Add `cachedAt: Date.now()` to cache entries
5. Choose scope key (entitySlug, userId, or composite)
6. If persistence needed, wrap with Zustand `persist` middleware
7. Export from `src/business/stores/index.ts` (if it exists) and `src/business/index.ts`
8. Add tests in `stores.test.ts`

### Adding a New Manager Hook

1. Create `src/business/hooks/useMyManager.ts`
2. Define `UseMyManagerConfig` (inputs) and `UseMyManagerReturn` (outputs) interfaces
3. Wrap the corresponding client hook from `@sudobility/shapeshyft_client`
4. Add `useEffect` to sync server data to the store
5. Implement cache fallback: prefer server data, fall back to store
6. Add `isCached` and `cachedAt` to return value
7. Wrap return in `useMemo` for stable reference
8. Export from `src/business/hooks/index.ts` (if it exists) and `src/business/index.ts`

### Adding a New Template

1. Add template definition to `src/business/templates/endpoint-templates.ts`
2. Follow the `ProjectTemplate` interface (name, display_name, description, category, endpoints)
3. Each endpoint needs: endpoint_name, display_name, description, input_schema, output_schema, system_prompt, model
4. Add to `ALL_TEMPLATES` array
5. Add tests in `endpoint-templates.test.ts`

## Peer Dependencies

Required in consuming app:

- `react` >= 18.0.0
- `@tanstack/react-query` >= 5.0.0
- `@sudobility/shapeshyft_client` - API hooks
- `@sudobility/shapeshyft_types` - Type definitions
- `@sudobility/types` - Common types

## Direct Dependencies

- `zustand` v5 - State management (only production dependency)

## Architecture

```
shapeshyft_app (frontend)
    └── shapeshyft_lib (this package - stores, managers, templates)
        └── shapeshyft_client (API hooks)
            └── shapeshyft_types (types)
```

## Workspace Context

This project is part of the **ShapeShyft** multi-project workspace at the parent directory. See `../CLAUDE.md` for the full architecture, dependency graph, and build order.

## Downstream Impact

| Downstream Consumer | Relationship |
| ------------------- | ------------ |
| `shapeshyft_app` | Direct dependency - uses stores, manager hooks, and templates |

After making changes:

1. `bun run verify`
2. `npm publish`
3. In `shapeshyft_app`: `bun update @sudobility/shapeshyft_lib` -> rebuild

## Local Dev Workflow

```bash
# In this project:
bun link

# In shapeshyft_app:
bun link @sudobility/shapeshyft_lib

# If also changing shapeshyft_client, link it first:
cd ../shapeshyft_client && bun link
cd ../shapeshyft_lib && bun link @sudobility/shapeshyft_client

# Rebuild after changes:
bun run build

# When done, unlink:
bun unlink @sudobility/shapeshyft_lib && bun install
```

## Pre-Commit Checklist

```bash
bun run verify
```

This runs: `typecheck -> lint -> test -> build`

## Publishing

```bash
bun run prepublishOnly  # Clean + build
npm publish             # Publish to npm (must use npm, not bun)
```

## Gotchas

- **`publishConfig.access` is `"restricted"`** -- intentionally a private npm package.
- **Zustand stores are entity-scoped** -- all store methods take `entitySlug` or `userId` as a key. Do not cache data under the wrong scope.
- **Stores are global singletons** -- they persist across renders and unmounts. Call `clearAll()` when the user logs out or switches entities.
- **Peer dependency on `shapeshyft_client`** -- this package wraps client hooks. If you update `shapeshyft_client`, verify compatibility here.
- **endpointsStore uses composite keys** -- cache key is `"entitySlug:projectId"`, not just projectId. Use `makeCacheKey()` helper internally.
- **providerModelsStore has 1-hour TTL** -- uses `isStale()` to check cache freshness. Other stores have no auto-expiry.
- **Two stores persist to localStorage** -- providerModelsStore and budget store use Zustand's `persist` middleware. Others are in-memory only.
- **Manager hooks prefer server data over cache** -- empty server array means "loading", not "empty data". Cache is only used as fallback.
- **Schema validation is intentionally lightweight** -- no support for `$ref`, combinators, or advanced JSON Schema features.
- **`bun run test` is watch mode** -- use `bun run test:run` for single run (CI).
- **Budget periods have no auto-reset** -- `BudgetPeriod = 'daily' | 'weekly' | 'monthly'` but clients must handle period boundaries.
