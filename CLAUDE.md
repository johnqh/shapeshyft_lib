# ShapeShyft Lib

Business logic library for ShapeShyft with Zustand stores and endpoint templates.

**npm**: `@sudobility/shapeshyft_lib`

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Bun
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
