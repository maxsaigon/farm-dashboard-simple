# Canonical Schema Standardization Plan

## Scope

This document defines the canonical application schema inferred from the current codebase, not from older docs.
It is intended to support the next step: building a backend that runs on a homeserver and fully replaces Firebase.

The analysis was based on:

- `lib/types.ts`
- `lib/types-enhanced.ts`
- `lib/firestore.ts`
- `lib/farm-service.ts`
- `lib/photo-service.ts`
- `lib/investment-service.ts`
- `lib/optimized-auth-context.tsx`
- `lib/invitation-service.ts`
- `lib/super-admin-service.ts`
- `components/TreeNoteSystem.tsx`
- `components/OnFarmWorkMode.tsx`
- admin and zone management screens that still write legacy/global collections

## Executive Summary

The current data model is not fully standardized. The app mixes:

- a simple schema (`farmAccess`, simple auth, global collections)
- a newer multi-tenant schema (`userRoles`, `userFarmAccess`, `organizations`)
- farm-scoped subcollections (`farms/{farmId}/trees`, `farms/{farmId}/photos`, `farms/{farmId}/zones`)
- legacy top-level collections (`trees`, `photos`, `zones`)

For the homeserver backend, the schema should be normalized around:

- `users`
- `organizations`
- `farms`
- `user_roles`
- `user_farm_access`
- `trees`
- `tree_notes`
- `photos`
- `zones`
- `investments`
- `farm_invitations`
- `activity_logs`

The main standardization decisions are:

1. Use farm-scoped ownership for domain data.
2. Replace `farmAccess` with `userFarmAccess` plus `userRoles`.
3. Replace top-level `trees`, `photos`, and `zones` with farm-scoped records.
4. Unify investments as farm-scoped records, not user-owned nested records.
5. Treat tracking, business rules, notifications, and monitoring as optional phase-2 backend modules.

## Method

The canonical model below follows actual write paths in code:

- trees: `farms/{farmId}/trees`
- notes: `farms/{farmId}/trees/{treeId}/notes`
- photos: mostly `farms/{farmId}/photos`, with one legacy/global writer still using top-level `photos`
- zones: mixed between `farms/{farmId}/zones` and top-level `zones`
- farms and users: top-level
- access and roles: mixed between `farmAccess`, `userFarmAccess`, and `userRoles`
- invitations: top-level `farmInvitations`

Where the code conflicts, this document explicitly marks:

- `canonical`: should exist in the new backend
- `compatibility`: temporary input/output compatibility only
- `legacy`: migrate then remove
- `experimental`: not needed for backend v1 unless you want feature parity immediately

## Canonical Entity Map

| Entity | Current Paths In Code | Status | Backend Canonical Form |
|---|---|---|---|
| User | `users/{uid}` | canonical | `users` table |
| Organization | `organizations/{id}` | canonical but optional for v1 | `organizations` table |
| Farm | `farms/{farmId}` | canonical | `farms` table |
| Role assignment | `userRoles/{id}` | canonical | `user_roles` table |
| Farm access | `userFarmAccess/{id}` | canonical | `user_farm_access` table |
| Simple farm access | `farmAccess/{id}` | compatibility only | migrate into `user_farm_access` |
| Tree | `farms/{farmId}/trees/{treeId}` | canonical | `trees` table |
| Legacy tree | `trees/{treeId}` | legacy | migrate into `trees` |
| Tree note | `farms/{farmId}/trees/{treeId}/notes/{noteId}` | canonical | `tree_notes` table |
| Photo metadata | `farms/{farmId}/photos/{photoId}` | canonical | `photos` table |
| Legacy photo metadata | `photos/{photoId}` | legacy | migrate into `photos` |
| Zone | `farms/{farmId}/zones/{zoneId}` | canonical | `zones` table |
| Global zone | `zones/{zoneId}` | legacy | migrate into `zones` |
| Investment | mixed | inconsistent | `investments` table, farm-scoped |
| Invitation | `farmInvitations/{id}` | canonical | `farm_invitations` table |
| Activity log | `activityLogs/{id}` | canonical | `activity_logs` table |
| Audit log | `auditLogs/{id}` | compatibility / optional | merge into `activity_logs` or separate `audit_logs` |

## Canonical Core Schema

### 1. Users

Current source:

- simple auth profile writes in `users/{uid}`
- enhanced auth/admin also writes `users/{uid}`

Canonical record:

```ts
type User = {
  id: string
  email: string | null
  display_name: string | null
  phone_number?: string | null
  photo_url?: string | null
  language: string
  timezone: string
  email_verified: boolean
  phone_verified?: boolean
  account_status: 'active' | 'suspended' | 'pending_verification'
  login_count?: number
  last_login_at?: Date | null
  created_at: Date
  updated_at?: Date | null
  preferences?: Record<string, unknown>
}
```

Observed fields across code:

- `uid`
- `email`
- `displayName`
- `phoneNumber`
- `photoURL`
- `createdAt`
- `updatedAt`
- `lastLoginAt`
- `preferredLanguage`
- `language`
- `timezone`
- `emailVerified`
- `isEmailVerified`
- `isPhoneVerified`
- `accountStatus`
- `loginCount`
- `currentFarmId`
- `roles`
- `isActive`

Standardization decision:

- Canonical backend field names should be snake_case.
- Keep one profile row per auth user.
- Remove duplicated semantics:
  - `preferredLanguage` and `language` collapse to `language`
  - `emailVerified` and `isEmailVerified` collapse to `email_verified`
  - `isActive` becomes part of `account_status`

### 2. Organizations

Current source:

- `lib/types-enhanced.ts`
- `lib/super-admin-service.ts`
- admin organization UI

Canonical record:

```ts
type Organization = {
  id: string
  name: string
  display_name?: string | null
  subscription_type: 'free' | 'pro' | 'enterprise'
  subscription_status: 'active' | 'suspended' | 'cancelled'
  max_farms: number
  max_users_per_farm: number
  max_users_total: number
  is_active: boolean
  settings: Record<string, unknown>
  billing_info?: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
}
```

Decision:

- Keep `organizations` in the canonical schema even if backend v1 initially runs single-tenant.
- If you want a smaller first backend, you can make `organization_id` nullable on farms and users.

### 3. Farms

Current source:

- `farms/{farmId}`
- created by auth context, farm service, admin service, super admin service

Canonical record:

```ts
type Farm = {
  id: string
  organization_id?: string | null
  name: string
  owner_name?: string | null
  farm_type?: 'personal' | 'commercial' | 'cooperative' | 'research' | null
  status?: 'active' | 'inactive' | 'archived' | null
  total_area?: number | null
  center_latitude?: number | null
  center_longitude?: number | null
  boundary_coordinates?: string | null
  is_active?: boolean
  settings?: Record<string, unknown>
  contacts?: Record<string, unknown>[]
  certifications?: Record<string, unknown>[]
  metadata?: Record<string, unknown>
  created_at: Date
  updated_at?: Date | null
}
```

Observed field variants:

- `createdDate`
- `updatedAt`
- `isActive`
- `status`
- `farmType`
- `organizationId`

Decision:

- Keep one farm row only.
- Do not encode ownership directly on farm except maybe `owner_name` for display.
- Real authorization should come from `user_roles` and `user_farm_access`.

### 4. User Roles

Current source:

- `userRoles/{id}`
- enhanced auth, invitations, farm assignment, super admin

Canonical record:

```ts
type UserRole = {
  id: string
  user_id: string
  role_type: 'super_admin' | 'organization_admin' | 'organization_member' | 'farm_owner' | 'farm_manager' | 'farm_viewer' | 'seasonal_worker' | 'api_user'
  scope_type: 'system' | 'organization' | 'farm'
  scope_id?: string | null
  permissions: string[]
  granted_by: string
  granted_at: Date
  expires_at?: Date | null
  is_active: boolean
  revoked_at?: Date | null
  revoked_by_user_id?: string | null
  metadata?: Record<string, unknown>
}
```

Decision:

- `user_roles` is the canonical authorization model.
- Backend should enforce permissions from this table.
- `user_farm_access` remains as a denormalized convenience table for simple farm membership queries.

### 5. User Farm Access

Current source:

- `userFarmAccess/{id}`
- also older `farmAccess/{id}`

Canonical record:

```ts
type UserFarmAccess = {
  id: string
  user_id: string
  farm_id: string
  role: 'owner' | 'manager' | 'viewer'
  permissions: string[]
  is_active: boolean
  granted_by?: string | null
  invitation_id?: string | null
  created_at: Date
  updated_at: Date
  revoked_at?: Date | null
}
```

Decision:

- Canonical collection/table is `user_farm_access`.
- `farmAccess` is legacy simple-auth compatibility and must be migrated away.

### 6. Trees

Current source:

- canonical writes and reads are farm-scoped: `farms/{farmId}/trees/{treeId}`
- some legacy services still read top-level `trees`

Canonical record:

```ts
type Tree = {
  id: string
  farm_id: string
  name?: string | null
  qr_code?: string | null
  variety?: string | null
  zone_code?: string | null
  zone_name?: string | null
  tree_status?: string | null
  health_status?: 'Excellent' | 'Good' | 'Fair' | 'Poor' | null
  notes?: string | null
  health_notes?: string | null
  disease_notes?: string | null
  latitude: number
  longitude: number
  gps_accuracy?: number | null
  planting_date?: Date | null
  manual_fruit_count: number
  ai_fruit_count: number
  ai_accuracy?: number | null
  last_count_date?: Date | null
  last_ai_analysis_date?: Date | null
  tree_height?: number | null
  trunk_diameter?: number | null
  fertilized_date?: Date | null
  pruned_date?: Date | null
  needs_attention: boolean
  needs_sync?: boolean
  last_sync_date?: Date | null
  custom_fields?: {
    tree_id: string
    fields: {
      field_id: string
      value: string | number | boolean | Date
      updated_at: Date
      updated_by?: string | null
    }[]
    last_updated: Date
  } | null
  created_at: Date
  updated_at: Date
}
```

Decision:

- Backend canonical tree storage is one farm-scoped table.
- `zone_name` should be treated as derived/cache. The canonical relationship is `zone_code` or later `zone_id`.
- Long term, prefer adding `zone_id` instead of relying on free-text `zoneCode`.

### 7. Tree Notes

Current source:

- `farms/{farmId}/trees/{treeId}/notes/{noteId}`

Canonical record:

```ts
type TreeNote = {
  id: string
  farm_id: string
  tree_id: string
  author_user_id: string
  author_name: string
  author_email: string
  content: string
  type: 'info' | 'warning' | 'success' | 'urgent'
  mentions?: string[]
  attachments?: {
    type: 'image' | 'document'
    url: string
    name: string
  }[]
  is_edited: boolean
  edited_at?: Date | null
  created_at: Date
}
```

Decision:

- On backend, flatten this into a `tree_notes` table with `(farm_id, tree_id)` foreign keys.
- Do not keep notes as nested documents in the new backend model.

### 8. Photos

Current source:

- canonical-ish path: `farms/{farmId}/photos/{photoId}`
- legacy/global path still used in `ImageGallery`: `photos/{photoId}`
- storage objects live under `farms/{farmId}/trees/{treeId}/photos/{photoId-or-timestamp}/...`

Canonical metadata record:

```ts
type Photo = {
  id: string
  farm_id: string
  tree_id?: string | null
  filename?: string | null
  photo_type?: 'general' | 'health' | 'fruit_count' | null
  user_notes?: string | null
  latitude?: number | null
  longitude?: number | null
  altitude?: number | null
  timestamp: Date
  upload_date?: Date | null
  local_path?: string | null
  original_path?: string | null
  compressed_path?: string | null
  thumbnail_path?: string | null
  ai_ready_path?: string | null
  local_storage_date?: Date | null
  total_local_size?: number | null
  uploaded_to_server?: boolean
  server_processed?: boolean
  needs_ai_analysis?: boolean
  manual_fruit_count?: number | null
  farm_name?: string | null
  created_at?: Date | null
}
```

Decision:

- Use one `photos` table scoped by `farm_id`.
- Store binaries in object storage, not in DB.
- Keep path columns only as references to object keys.
- Eliminate top-level Firestore `photos` collection after migration.

Storage canonicalization:

- object bucket key: `farms/{farm_id}/trees/{tree_id}/photos/{photo_id}/{variant}.{ext}`
- variants: `original`, `compressed`, `thumbnail`, `ai_ready`

### 9. Zones

Current source is inconsistent:

- canonical-ish path: `farms/{farmId}/zones/{zoneId}`
- legacy/global path: `zones/{zoneId}`
- shape differs between components

Observed field variants:

- `name`
- `code`
- `farmId`
- `boundaries`
- `boundary`
- `treeCount`
- `area`
- `isActive`
- `notes`
- `lastInspectionDate`
- `needsAttention`
- `colorData`
- `version`
- `updatedAt`

Canonical record:

```ts
type Zone = {
  id: string
  farm_id: string
  name: string
  code?: string | null
  boundaries: {
    latitude: number
    longitude: number
  }[]
  tree_count?: number
  area?: number | null
  is_active: boolean
  notes?: string | null
  color?: string | null
  color_data?: {
    red: number
    green: number
    blue: number
    alpha: number
  } | null
  last_inspection_date?: Date | null
  needs_attention?: boolean
  version?: number | null
  created_at?: Date | null
  updated_at?: Date | null
}
```

Decision:

- Canonical backend uses farm-scoped zones only.
- Use `boundaries` as the standard polygon field.
- Migrate `boundary` into `boundaries`.
- If the backend uses PostgreSQL/PostGIS, represent the polygon as geometry and optionally also keep serialized coordinates.

### 10. Investments

Current source is inconsistent:

- nested path in `lib/investment-service.ts`:
  - `users/{uid}/farms/{farmId}/investments/{investmentId}`
  - legacy `users/{uid}/investments/{investmentId}`
- other components also read `farms/{farmId}/investments`

This is the biggest unresolved schema conflict in the current app.

Canonical record:

```ts
type Investment = {
  id: string
  farm_id: string
  created_by_user_id?: string | null
  amount: number
  category: string
  subcategory?: string | null
  date: Date
  notes?: string | null
  quantity?: number | null
  unit?: string | null
  price_per_unit?: number | null
  tree_count?: number | null
  is_recurring?: boolean
  recurring_period?: string | null
  images?: string[]
  created_at?: Date | null
  updated_at?: Date | null
}
```

Decision:

- Canonical backend must use farm-scoped investments.
- User ownership should be recorded as `created_by_user_id`, not in the path.
- Migrate all nested user investment records into one `investments` table keyed by `farm_id`.

### 11. Farm Invitations

Current source:

- `farmInvitations/{id}`
- both simple and enhanced invitation flows exist

Canonical record:

```ts
type FarmInvitation = {
  id: string
  farm_id: string
  organization_id?: string | null
  inviter_user_id: string
  invitee_email: string
  invitee_name?: string | null
  proposed_role: string
  proposed_permissions: string[]
  invitation_code: string
  message?: string | null
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled' | 'resent'
  sent_at: Date
  responded_at?: Date | null
  expires_at: Date
  accepted_by_user_id?: string | null
  declined_by_user_id?: string | null
  cancelled_by_user_id?: string | null
  decline_reason?: string | null
  metadata?: Record<string, unknown>
}
```

Decision:

- Use the enhanced invitation model as canonical.
- Legacy simple invitation fields like `email`, `role`, `invitedBy`, `createdAt` should be mapped into the canonical shape.

### 12. Activity Logs

Current source:

- `activityLogs`
- `auditLogs`
- service-specific logging in invitations/admin/audit

Canonical record:

```ts
type ActivityLog = {
  id: string
  user_id: string
  organization_id?: string | null
  farm_id?: string | null
  action: string
  resource: string
  resource_id?: string | null
  details: Record<string, unknown>
  status: 'success' | 'failure'
  severity?: 'low' | 'medium' | 'high' | 'critical' | null
  category?: 'authentication' | 'data_modification' | 'system_access' | 'configuration' | null
  ip_address?: string | null
  user_agent?: string | null
  error_message?: string | null
  created_at: Date
}
```

Decision:

- For backend v1, one log table is enough.
- `activity_logs` should absorb `activityLogs` and `auditLogs`.
- If compliance reporting becomes important later, add a dedicated `audit_logs` view or table fed from the same event stream.

## Compatibility, Legacy, and Experimental Schema

### Compatibility Only

These should exist only during migration or temporary API compatibility:

- `farmAccess`
- top-level `photos`
- top-level `zones`
- simple invitation payload shape

### Legacy To Migrate Then Remove

- `trees`
- `photos`
- `zones`
- `users/{uid}/investments`
- `users/{uid}/farms/{farmId}/investments`

### Experimental Or Phase-2

These exist in code but should not block backend v1:

- `trackingSessions`
- `geofenceEvents`
- `locationUpdates`
- `businessRules`
- `ruleTemplates`
- `ruleExecutions`
- `ruleLogs`
- `tasks`
- `notifications`
- `systemMetrics`
- `systemAlerts`
- `complianceRules`
- `bulkOperations`
- `bulkOperationTemplates`
- `system` / `systemConfig`
- `members` subcollection under farms
- `seasons`

Recommendation:

- Exclude these from the first homeserver backend unless you explicitly need them.
- Model them after the core migration is stable.

## Relationship Model

Canonical relationships:

- one `organization` has many `farms`
- one `user` has many `user_roles`
- one `user` has many `user_farm_access` rows
- one `farm` has many `trees`
- one `farm` has many `zones`
- one `farm` has many `photos`
- one `farm` has many `investments`
- one `tree` has many `tree_notes`
- one `tree` can have many `photos`
- one `farm_invitation` can produce one `user_farm_access` row and one or more `user_roles`

Recommended backend foreign keys:

- `farms.organization_id -> organizations.id`
- `user_roles.user_id -> users.id`
- `user_roles.scope_id -> organizations.id | farms.id`
- `user_farm_access.user_id -> users.id`
- `user_farm_access.farm_id -> farms.id`
- `trees.farm_id -> farms.id`
- `tree_notes.tree_id -> trees.id`
- `tree_notes.farm_id -> farms.id`
- `photos.farm_id -> farms.id`
- `photos.tree_id -> trees.id`
- `zones.farm_id -> farms.id`
- `investments.farm_id -> farms.id`
- `farm_invitations.farm_id -> farms.id`

## Standardization Decisions That Affect Backend Design

### Access control

Current app has three overlapping models:

- email/uid hardcoded admin checks
- simple `farmAccess`
- enhanced `userRoles` plus `userFarmAccess`

Backend decision:

- canonical authorization uses `user_roles`
- `user_farm_access` is a fast membership projection
- no backend logic should depend on hardcoded admin uid/email

### Tree-to-zone association

Current app uses `zoneCode` and derives `zoneName`.

Backend decision:

- short term: keep `zone_code`
- preferred future shape: add nullable `zone_id`

### Photos

Current metadata and binary storage are coupled to Firebase Storage path strings.

Backend decision:

- metadata in DB
- binary objects in MinIO or other S3-compatible storage
- store bucket key or object key, not provider URL

### Investments

Current user-scoped path is not a good fit for shared farm accounting.

Backend decision:

- one farm-scoped `investments` table
- every record optionally references `created_by_user_id`

## Migration Plan For Schema Standardization

### Phase 1: Freeze and inventory

1. Freeze creation of new legacy shapes.
2. Stop adding new code that writes `farmAccess`, top-level `photos`, top-level `zones`, or nested user investment paths.
3. Add repository/service abstraction so new code stops touching provider SDK directly.

### Phase 2: Canonical schema adoption in app code

1. Make farm-scoped trees, zones, photos, and investments the only active write path.
2. Route all authorization through `userRoles` and `userFarmAccess`.
3. Replace direct Firebase assumptions in services with backend-facing domain methods.

### Phase 3: Data migration

1. Migrate `farmAccess -> userFarmAccess`.
2. Migrate `trees -> farms/{farmId}/trees` or directly into backend `trees`.
3. Migrate `photos -> farm-scoped photos`.
4. Migrate `zones -> farm-scoped zones`.
5. Migrate all investments into farm-scoped records.
6. Normalize users, roles, invitations, and logs.

### Phase 4: Remove compatibility schema

1. Remove reads from `farmAccess`.
2. Remove reads from global `photos` and `zones`.
3. Remove legacy investment readers.
4. Remove migration-specific fallback logic in services.

## Recommended Backend Tables For Homeserver

Minimum v1 backend tables:

- `users`
- `organizations`
- `farms`
- `user_roles`
- `user_farm_access`
- `trees`
- `tree_notes`
- `photos`
- `zones`
- `investments`
- `farm_invitations`
- `activity_logs`

Recommended storage:

- relational DB: PostgreSQL
- object storage: MinIO

Recommended v1 exclusions:

- GPS tracking sessions
- geofence event streams
- business rules engine
- notifications/tasks automation
- system metrics and compliance

## Immediate Code Tasks Before Backend Build

These are the concrete refactors implied by the current schema analysis:

1. Replace all new writes to `farmAccess` with `userFarmAccess`.
2. Replace all new writes to top-level `photos` with farm-scoped photo metadata.
3. Replace all new writes to top-level `zones` with `farms/{farmId}/zones`.
4. Standardize investments under farm scope.
5. Remove hardcoded admin identity checks and move to role-based checks.
6. Introduce one internal domain schema module shared by frontend and backend contracts.

## Final Canonical Position

If the goal is a backend on a homeserver with no Firebase dependency, the current app should be treated as having:

- one strong canonical domain core: `users`, `farms`, `trees`, `photos`, `zones`, `roles`, `access`, `invitations`
- one mixed compatibility layer from previous auth/data migrations
- one optional phase-2 platform layer for monitoring, tracking, automation, and advanced admin features

Backend work should start from the canonical core above and not attempt to preserve every legacy path as first-class schema.
