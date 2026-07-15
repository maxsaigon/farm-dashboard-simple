# Current Codebase State

> Status: Current
> Baseline: package `0.1.0`, Git commit `7890775` with local documentation changes
> Last reviewed: 2026-07-15

## Release Identity

The application exposes its package version and build Git SHA in Admin settings. The reviewed source snapshot is:

`farm-dashboard-simple@0.1.0 (78907758cab4; local changes present)`

There are no Git release tags. ReNEW V2, PocketBase, and the homeserver backend are not active runtime versions.

## Runtime Stack

- Next.js 14.2.35 App Router
- React 18.3.1 and TypeScript 5.9.2
- Firebase Authentication, Cloud Firestore, and Firebase Storage
- MapLibre GL 5.24.0, react-map-gl 8.1.1, Mapbox Draw, and Turf
- Tailwind CSS 3.4.17
- PWA manifest, service worker, Firestore local persistence, and a partial IndexedDB photo queue

PocketBase is present as a dependency and migration experiment, but no active page or component uses it for runtime data.

## Readiness

The application is a feature-rich internal beta or pre-production MVP. Build, unit tests, Firestore Rules emulator tests, and authenticated mobile Playwright tests pass. Production builds still skip lint enforcement, legacy data migration is incomplete, and operational deployment/monitoring are not configured.

The application must not be classified as production-ready until the authorization and data consistency issues below are resolved.

## Implemented Core

- Firebase email/password sign-in and optimized auth state caching
- Farm selection and basic owner/manager/viewer roles
- Farm-scoped tree CRUD, tree details, seasonal statistics, notes, and preset custom fields
- MapLibre map, tree and zone display, foreground GPS, and on-farm work mode
- Farm-scoped zone writes with read-only legacy compatibility reads
- Farm-scoped investment CRUD and CSV export
- Tree gallery upload to Firebase Storage
- Season selection and client-side legacy season migration
- Mobile shell, bottom navigation, offline indicator, and PWA registration
- Least-privilege Firestore Rules and farm-scoped Storage Rules
- Canonical deterministic `userFarmAccess/{userId}_{farmId}` memberships
- Standalone camera upload with IndexedDB queue fallback
- Package version and build Git SHA in Admin settings

## Partial Or Incomplete

- AI analysis has data fields and UI language but no active model or API pipeline.
- Photo offline synchronization runs in the foreground application; service-worker background upload is intentionally not implemented.
- Browser background GPS cannot provide reliable tracking while iOS suspends or closes the PWA.
- Admin metrics now identify Firestore-backed values and unavailable operations, but Firebase Auth account lifecycle and settings enforcement remain incomplete.
- PocketBase, WebSocket homeserver, and organization-level enhanced auth are not active runtime systems.
- ReNEW V2 files are static design references, not the current React UI.

## Release Blockers

1. Persisted top-level photos, zones, trees, and `farmAccess` records still need a verified one-time migration and cleanup; runtime writes are canonical and legacy paths are read-only.
2. System-admin custom claims require a trusted Admin SDK provisioning/revocation process outside the browser.
3. Admin user creation/deletion still does not implement the complete Firebase Authentication lifecycle.
4. Admin settings are stored but notification, password-policy, maintenance, and backup services do not enforce them.
5. AI, reliable iOS background GPS, hosting/CI, monitoring, backup/restore, and production rollout procedures remain incomplete.
6. Storage Rules are configured but need a dedicated emulator test matrix comparable to Firestore Rules tests.
7. `npm audit --omit=dev` reports 10 remaining advisories (1 high, 9 moderate) in Next.js/Firebase Admin transitive trees; available fixes require planned breaking upgrades rather than `--force` in this release-hardening pass.

## Verification Snapshot

Verified on 2026-07-15:

| Check | Result |
|---|---|
| `npm run build` | Pass; 16 App Router pages generated |
| `npx tsc --noEmit` | Pass |
| `npm run lint` | Completes with many warnings |
| `npm test` | Pass; 5 authorization unit tests |
| `npm run test:rules:emulator` | Pass; 8 Firestore authorization tests |
| `npm run test:e2e:emulator` | Pass; 3 authenticated mobile setup/critical-path tests |

## Documentation Map

- Active architecture: [`architecture/ARCHITECTURE.md`](./architecture/ARCHITECTURE.md)
- Current and target data model: [`schema/CANONICAL_SCHEMA.md`](./schema/CANONICAL_SCHEMA.md)
- Documentation rules: [`DOCUMENTATION_POLICY.md`](./DOCUMENTATION_POLICY.md)
- Firebase deployment caveats: [`deployment/DEPLOYMENT_GUIDE.md`](./deployment/DEPLOYMENT_GUIDE.md)
- Historical migration records: [`migration/`](./migration/)
- Static design references: [`Design/`](./Design/)
