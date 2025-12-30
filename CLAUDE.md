# ShapeShyft Lib

Business logic library for ShapeShyft with Zustand stores.

**npm**: `@sudobility/shapeshyft_lib`

## Tech Stack

- **Language**: TypeScript
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
│   │   ├── keysStore.ts      # LLM API keys state
│   │   ├── projectsStore.ts  # Projects state
│   │   ├── endpointsStore.ts # Endpoints state
│   │   ├── settingsStore.ts  # User settings state
│   │   └── analyticsStore.ts # Analytics state
│   ├── hooks/            # Business hooks
│   ├── templates/        # Endpoint templates
│   └── utils/            # Business utilities
├── types/                # Type definitions
└── utils/                # General utilities
```

## Commands

```bash
bun run build        # Build to dist/
bun run build:watch  # Watch mode build
bun run clean        # Remove dist/
bun run test         # Run Vitest
bun run test:run     # Run tests once
bun run lint         # Run ESLint
bun run typecheck    # TypeScript check
bun run format       # Format with Prettier
```

## Stores

Zustand stores manage client-side state:

| Store | Purpose |
|-------|---------|
| `keysStore` | LLM API key selection/state |
| `projectsStore` | Current project state |
| `endpointsStore` | Endpoint configuration state |
| `settingsStore` | User preferences |
| `analyticsStore` | Analytics data state |

## Usage

```typescript
import { useKeysStore, useProjectsStore } from '@sudobility/shapeshyft_lib';

// In a React component
const selectedKey = useKeysStore(state => state.selectedKey);
const currentProject = useProjectsStore(state => state.currentProject);
```

## Peer Dependencies

Required in consuming app:
- `@sudobility/shapeshyft_client`
- `@sudobility/shapeshyft_types`
- `@sudobility/types`
- `@tanstack/react-query` >= 5.0.0
- `react` >= 18.0.0

## Direct Dependencies

- `zustand` v5 - State management

## Publishing

```bash
bun run prepublishOnly  # Clean + build
npm publish             # Publish to npm (restricted)
```

## Architecture

This library sits between the client (API hooks) and the app (UI):

```
shapeshyft_app
    └── shapeshyft_lib (stores, business logic)
        └── shapeshyft_client (API hooks)
            └── shapeshyft_types (types)
```
