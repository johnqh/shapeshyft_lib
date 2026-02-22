# ShapeShyft Lib

Business logic library for ShapeShyft with Zustand stores and endpoint templates.

**npm**: `@sudobility/shapeshyft_lib`

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Bun
- **Package Manager**: Bun (do not use npm/yarn/pnpm for installing dependencies)
- **State**: Zustand v5
- **Build**: TypeScript compiler (tsc)
- **Test**: Vitest

## Project Structure

```
src/
├── index.ts              # Public exports
├── index.test.ts         # Integration tests
├── business/             # Business logic
│   ├── index.ts          # Business exports
│   ├── stores/           # Zustand stores
│   │   ├── keysStore.ts      # LLM API keys cache
│   │   ├── projectsStore.ts  # Projects cache
│   │   ├── endpointsStore.ts # Endpoints cache
│   │   ├── settingsStore.ts  # User settings cache
│   │   ├── analyticsStore.ts # Analytics cache
│   │   └── stores.test.ts    # Store tests
│   ├── hooks/            # Business hooks
│   │   ├── useKeysManager.ts
│   │   ├── useProjectsManager.ts
│   │   ├── useEndpointsManager.ts
│   │   ├── useSettingsManager.ts
│   │   ├── useAnalyticsManager.ts
│   │   ├── useBudgetTracker.ts
│   │   ├── useProjectTemplates.ts
│   │   └── useEndpointTester.ts
│   └── templates/        # Endpoint templates
│       ├── endpoint-templates.ts
│       └── endpoint-templates.test.ts
├── types/                # Type definitions
└── utils/                # General utilities
```

## Commands

```bash
bun run build        # Build to dist/
bun run build:watch  # Watch mode build
bun run clean        # Remove dist/
bun run test         # Run Vitest (watch mode)
bun run test:run     # Run tests once
bun run lint         # Run ESLint
bun run typecheck    # TypeScript check
bun run format       # Format with Prettier
```

## Stores

Zustand stores provide client-side caching:

| Store | Purpose | Key Methods |
|-------|---------|-------------|
| `useKeysStore` | LLM API keys cache | setKeys, getKeys, addKey, updateKey, removeKey |
| `useProjectsStore` | Projects cache | setProjects, getProjects, addProject, updateProject |
| `useEndpointsStore` | Endpoints cache | setEndpoints, getEndpoints, addEndpoint, updateEndpoint |
| `useSettingsStore` | User settings cache | setSettings, getSettings, clearSettings |
| `useAnalyticsStore` | Analytics cache | setAnalytics, getAnalytics, clearAnalytics |

### Store Usage
```typescript
import { useKeysStore, useProjectsStore } from '@sudobility/shapeshyft_lib';

// Get store state
const keys = useKeysStore(state => state.getKeys(userId));

// Update store
useKeysStore.getState().setKeys(userId, newKeys);
useKeysStore.getState().addKey(userId, newKey);
```

## Endpoint Templates

Pre-built templates for common use cases:

| Template | Category | Endpoints |
|----------|----------|-----------|
| `textClassifierTemplate` | Classification | classify |
| `sentimentAnalyzerTemplate` | Analysis | analyze |
| `dataExtractorTemplate` | Extraction | extract-entities, extract-fields |
| `contentGeneratorTemplate` | Generation | generate-summary, generate-response |
| `localizationTemplate` | Translation | translate-batch, translate-single |

### Using Templates
```typescript
import { ALL_TEMPLATES, applyTemplate } from '@sudobility/shapeshyft_lib';

// Get all templates
const templates = ALL_TEMPLATES;

// Apply template to create project + endpoints
const { project, endpoints } = applyTemplate(
  textClassifierTemplate,
  'my-classifier',  // project_name
  'key-123'         // llm_key_id for endpoints
);
```

## Peer Dependencies

Required in consuming app:
- `react` >= 18.0.0
- `@sudobility/shapeshyft_client` - API hooks
- `@sudobility/shapeshyft_types` - Type definitions
- `@sudobility/types` - Common types

## Direct Dependencies

- `zustand` v5 - State management

## Publishing

```bash
bun run prepublishOnly  # Clean + build
npm publish             # Publish to npm
```

## Architecture

This library sits between the client (API hooks) and the app (UI):

```
shapeshyft_app (frontend)
    └── shapeshyft_lib (this package - stores, templates)
        └── shapeshyft_client (API hooks)
            └── shapeshyft_types (types)
```

## Testing

Uses Vitest:

```bash
bun run test         # Watch mode
bun run test:run     # Single run
```

Test coverage:
- Store CRUD operations
- Cache isolation between stores
- Template structure validation
- Template application

## Workspace Context

This project is part of the **ShapeShyft** multi-project workspace at the parent directory. See `../CLAUDE.md` for the full architecture, dependency graph, and build order.

## Downstream Impact

| Downstream Consumer | Relationship |
|---------------------|-------------|
| `shapeshyft_app` | Direct dependency - uses stores, manager hooks, and templates |

After making changes:
1. Run checks (no `verify` script - see below)
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

No `verify` script. Run checks manually:

```bash
bun run typecheck && bun run lint && bun run test:run && bun run build
```

Note: `bun run test` starts watch mode. Use `bun run test:run` for single run.

## Gotchas

- **`publishConfig.access` is `"restricted"`** -- intentionally a private npm package.
- **Zustand stores are entity-scoped** -- all store methods take `entitySlug` or `userId` as a key. Do not cache data under the wrong scope.
- **Stores are global singletons** -- they persist across renders and unmounts. Call `reset()` or `clearX()` when the user switches entities or logs out.
- **Peer dependency on `shapeshyft_client`** -- this package wraps client hooks. If you update `shapeshyft_client`, verify compatibility here.
