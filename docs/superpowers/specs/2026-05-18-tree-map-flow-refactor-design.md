# Tree + Map Flow Refactor Design

## Goal

Refactor the `map` and `trees` flows to reduce regression risk in core user journeys without expanding product scope or introducing new features.

The refactor is strictly focused on stabilizing these behaviors:

- selecting a tree
- opening and closing fullscreen tree detail
- updating tree data after save
- loading and normalizing tree and zone data for the map
- preserving existing guard, routing, and UI behavior

## Scope

In scope:

- [`app/map/page.tsx`](/Volumes/Mac%20Work/React/farm-dashboard-simple/app/map/page.tsx)
- [`app/trees/page.tsx`](/Volumes/Mac%20Work/React/farm-dashboard-simple/app/trees/page.tsx)
- directly related map and tree detail components
- new shared hooks/helpers for tree detail flow and map data flow

Out of scope:

- new features
- UX redesign
- auth/admin architecture changes
- schema or Firestore contract changes
- large feature-module reorganization

## Current Problems

### 1. `app/map/page.tsx` has too many responsibilities

The file currently mixes:

- fetching trees and zones
- normalizing zone and tree relations
- URL-based zone/tree focus handling
- filter logic
- tree and zone selection state
- fullscreen detail state
- retry logic
- GPS and map view settings
- page-level rendering

This makes behavioral changes risky because one file owns too many unrelated decisions.

### 2. `map` and `trees` duplicate tree detail flow behavior

`app/map/page.tsx` and `app/trees/page.tsx` both manage:

- selected tree
- fullscreen visibility
- close/reset behavior
- post-save tree update behavior

The implementations are similar but not centralized, so fixing one flow can leave the other inconsistent.

### 3. Inline helpers are coupled to page rendering

Functions such as tree filtering, zone matching, and data normalization live inside the page component. That makes them harder to test and easier to accidentally change while editing UI.

## Chosen Approach

Use a conservative shared-flow refactor:

1. extract a shared `tree detail flow` hook for selection and fullscreen behavior
2. extract a `map data flow` hook plus pure helpers for loading/normalizing/filtering map data
3. keep page components as orchestration layers for existing UI

This is intentionally smaller than a full feature-module rewrite. The priority is reducing regression risk, not redesigning the architecture.

## Design

### A. Shared tree detail flow

Introduce a hook such as `lib/hooks/use-tree-detail-flow.ts` that owns:

- `selectedTree`
- `isFullscreenOpen`
- `selectTree(tree)`
- `closeTreeDetail()`
- `clearSelection()`
- `handleTreeUpdated(updatedTree)`

Behavior rules:

- selecting a tree opens fullscreen detail
- closing detail clears selection
- saving a tree updates the selected tree if it is still active
- page-specific code can still opt into extra side effects if needed

This hook will be used by both `map` and `trees` pages so they follow the same state transitions.

### B. Map data flow extraction

Introduce a hook such as `lib/hooks/use-map-data.ts` for:

- loading trees and zones for the current farm
- retrying failed loads
- normalizing zone/tree name and id relationships
- applying URL-driven highlight and focus state inputs

Pure helper logic should move into a utility file such as `lib/map-tree-utils.ts`, including:

- zone boundary area calculation
- zone/tree matching
- filtering trees by selected zone
- filtering trees by status

Rules:

- data shape returned to `MapPage` stays compatible with current UI
- existing fallback behavior for missing zone boundaries or alternate zone collections is preserved
- existing highlighted tree and focused zone behavior is preserved

### C. Page responsibilities after refactor

`app/map/page.tsx` should keep:

- auth guard wrapping
- map-specific UI state that is not shared with `trees` flow
- rendering header, controls, map, sidebar, bottom sheet, and work mode

`app/trees/page.tsx` should keep:

- auth guard wrapping
- page layout and header
- rendering list and fullscreen detail

Neither page should continue to own duplicated tree-detail transition logic.

### D. Component boundary expectations

`TreeShowcase` and `FullscreenTreeShowcase` should remain presentation-first components. They should receive clearer callback/state inputs from the page or shared flow and should not become the source of orchestration behavior.

No component contract should be widened unless required by the refactor.

## Testing Strategy

Test priority is behavior preservation, not new coverage volume.

### Unit or logic-level coverage

Add focused tests for extracted logic where practical:

- tree detail flow state transitions
- map data normalization helpers
- zone/tree matching helpers
- filtered tree derivation helpers

### Verification

Run the strongest practical verification already supported by the repo:

- TypeScript validation
- lint if configured and working
- targeted test runs for any new test files

If the repo does not already provide clean unit-test infrastructure for React hooks, avoid introducing broad new test scaffolding as part of this refactor.

## Success Criteria

The refactor is successful when all of the following are true:

- `app/map/page.tsx` is materially smaller and easier to reason about
- `app/trees/page.tsx` no longer carries its own duplicated tree detail flow logic
- shared logic for tree detail transitions exists in one clear place
- shared logic for map data loading/normalization exists in one clear place
- current user-facing behavior remains effectively unchanged
- no speculative feature work is introduced

## Risks and Controls

### Risk: subtle change in selection or close behavior

Control:

- centralize state transitions in one hook
- verify selection, close, and post-save behavior explicitly

### Risk: zone/tree matching changes break map focus results

Control:

- move matching logic into pure helpers
- preserve current matching order and fallback behavior

### Risk: refactor grows into unrelated cleanup

Control:

- limit edits to `map`, `trees`, and direct supporting logic only
- avoid broad renaming or file moves unless they directly support the chosen design
