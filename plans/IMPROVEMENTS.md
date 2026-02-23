# Improvement Plans for @sudobility/shapeshyft_lib

## Priority 1 - High Impact

### 1. Add Test Coverage for Manager Hooks
- The store tests in `src/business/stores/stores.test.ts` are thorough (covering CRUD, cache isolation, timestamps). However, the manager hooks (`useKeysManager`, `useProjectsManager`, `useEndpointsManager`, `useSettingsManager`, `useAnalyticsManager`) have zero test coverage.
- These hooks contain important business logic: cache synchronization between TanStack Query and Zustand stores, fallback-to-cache behavior when client data is empty, and the `isCached` / `cachedAt` metadata. Bugs here would cause stale data or missing data in the app.
- Testing requires mocking `@sudobility/shapeshyft_client` hooks and verifying that store state is correctly updated when client data changes.

### 2. Add Test Coverage for useBudgetTracker and useEndpointTester
- `useBudgetTracker` has non-trivial budget checking logic (75%/90%/100% thresholds, project-scoped vs. total budgets, projected cost calculation). None of this is tested.
- `useEndpointTester` contains JSON Schema validation logic (`validateValue`), sample input generation (`generateSampleValue`), and test execution result tracking. The validation and sample generation are pure functions that could be easily unit tested.
- The `calculateProjectedCost` function in `useBudgetTracker` makes a simplistic assumption ("current usage equals daily rate") that should be documented and potentially improved, but at minimum it should be tested.

### 3. Add JSDoc to All Exported Hooks and Store Interfaces
- The stores (`useKeysStore`, `useProjectsStore`, etc.) have JSDoc on their state interfaces but the individual method implementations lack documentation. For example, `addKey` should document what happens when the user does not exist in cache (it creates a new entry -- this is not obvious without reading the code).
- Manager hooks have config and return type interfaces documented, but the `autoFetch` behavior, cache fallback logic, and entity-scoping semantics are not explained in JSDoc.
- `useEndpointTester` exports several interfaces (`TestResult`, `ValidationResult`, `UseEndpointTesterReturn`) that would benefit from field-level documentation.

## Priority 2 - Medium Impact

### 3. Add Cache Expiration and Staleness Detection
- The Zustand stores record `cachedAt` timestamps but never use them for staleness detection. There is no TTL or expiration mechanism -- cached data persists indefinitely until explicitly cleared or overwritten.
- Consider adding a `isStale(userId, maxAgeMs)` method to each store, allowing manager hooks to decide whether to force-refresh from the server or serve from cache. This would complement TanStack Query's `staleTime` with client-side cache awareness.
- The `useBudgetStore` uses Zustand `persist` middleware for localStorage persistence, but the other stores do not. Document whether this asymmetry is intentional.

### 4. Extract JSON Schema Validation Into a Standalone Utility
- The `validateValue` and `generateSampleValue` functions in `useEndpointTester.ts` are embedded inside a React hook file but are pure functions with no React dependency. They could be extracted into `src/utils/schema-validation.ts` and exported separately.
- This would make them testable without React testing infrastructure and reusable in other contexts (e.g., form validation in the app, server-side validation in the API).
- The current validation is basic (does not handle `allOf`, `oneOf`, `anyOf`, `$ref`, `patternProperties`). Document these limitations clearly.

### 5. Add a `verify` Script for Pre-Commit Checks
- Like `shapeshyft_client`, this project lacks a `verify` script. The CLAUDE.md instructs running `bun run typecheck && bun run lint && bun run test:run && bun run build` manually.
- Adding `"verify": "bun run typecheck && bun run lint && bun run test:run && bun run build"` to `package.json` would align with the `shapeshyft_types` convention and reduce friction.

## Priority 3 - Nice to Have

### 6. Add Template Metadata for UI Display
- The `ProjectTemplate` interface has `id`, `name`, `description`, and `category` but lacks metadata useful for UI presentation: icon, difficulty level, estimated setup time, recommended provider, or tags.
- The app's `TemplatesPage` and `EndpointTemplatesPage` would benefit from richer template metadata for filtering, sorting, and visual display.
- The `requiresV2` flag is a good start for capability gating; consider expanding this to a `requirements` object listing specific capabilities needed.

### 7. Consider Adding Store Reset on Entity/User Switch
- The CLAUDE.md warns: "Stores are global singletons -- they persist across renders and unmounts. Call `reset()` or `clearX()` when the user switches entities or logs out."
- This is a footgun that could leak data between users or entities. Consider adding a `useStoreCleanup` hook that subscribes to auth state changes and clears all stores when the user changes. This would centralize the cleanup logic that currently must be handled ad-hoc by the app.

### 8. Add Endpoint Template Versioning
- Templates are defined as static constants with no versioning. If a template's schema changes (e.g., adding a new required field to `textClassifierTemplate`), existing projects created from the old template version would not know about the change.
- Consider adding a `version` field to `ProjectTemplate` and tracking which template version was used when a project was created. This would enable future features like "update project to latest template version."
