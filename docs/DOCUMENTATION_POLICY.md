# Documentation Policy

> Status: Current
> Baseline: package `0.1.0`, Git commit `7890775` with local documentation changes
> Last reviewed: 2026-07-15

## Purpose

The documentation describes the code that exists in this repository. It must not present a mockup, proposal, historical completion report, or planned migration as an implemented runtime feature.

## Status Labels

Every maintained Markdown document should identify one of these statuses near its title:

| Status | Meaning |
|---|---|
| `Current` | Matches the active runtime and is a primary reference. |
| `Partial` | Some described behavior exists, but important parts are incomplete or inconsistent. |
| `Historical` | Records earlier work and must not be used as the current specification. |
| `Proposal` | Describes a possible future change that is not active in runtime. |
| `Design-only` | Static UX/UI reference, not proof of React implementation. |
| `Deprecated` | Kept temporarily for context; the described approach should not receive new implementation. |

## Sources Of Truth

Use these documents in this order:

1. [`CURRENT_STATE.md`](./CURRENT_STATE.md) for release identity, readiness, and known gaps.
2. [`architecture/ARCHITECTURE.md`](./architecture/ARCHITECTURE.md) for the active Firebase/Next.js runtime.
3. [`schema/CANONICAL_SCHEMA.md`](./schema/CANONICAL_SCHEMA.md) for current schema conflicts and the target canonical model.
4. Source code and deployed Firebase configuration when documentation and implementation disagree.

Historical reports, design mockups, and proposals are never sources of truth for current behavior.

## Versioning

The package version comes from `package.json`. Build configuration embeds package version and Git SHA, and Admin Settings displays the running artifact identity. Service-worker cache names and GPS metadata are not releases. Local dirty builds identify `HEAD` but cannot encode all uncommitted content; releases should build from clean immutable CI source.

## Update Rules

- Use repository-relative links. Do not add `file://` links or machine-specific absolute paths.
- Separate verified behavior from intended behavior.
- Mark security and data-integrity limitations explicitly.
- Do not use `production-ready`, `100% complete`, or similar claims without reproducible tests and deployment evidence.
- Keep migration reports as historical records; add a current-status notice instead of rewriting their historical chronology.
- Treat files under `Design/` as visual references unless an active React route/component is cited.
- Do not include credentials, service-account values, passwords, or real user identifiers.

## Review Checklist

- Runtime backend and dependency versions match `package.json` and the lockfile.
- Routes exist under `app/`.
- A feature marked implemented has an active route or active component integration.
- Firestore paths match actual reads and writes.
- Authorization claims match `firestore.rules`, not only client-side guards.
- Test claims match runnable scripts and current test artifacts.
- Links resolve from the document location.
- Admin figures identify their source and never present defaults or placeholders as measured data.
- Stored settings are not described as enforced behavior without an active consumer.
- Documentation baseline is distinguished from embedded deployed-build identity.
