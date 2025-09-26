# Farm-Linked Investments: Design, Data Model, Sync, and Usage

Last updated: 2025-09-17

## Summary
This document describes the new investment architecture that scopes all investment data to an Active Farm. It includes:
- Core Data model changes
- Migration of legacy records
- Firebase data layout and sync behavior
- Service/manager responsibilities
- UI wiring and usage patterns
- Testing and rollout steps
- Planned follow-ups (service/repository refactor, budgets, zone tagging, recurring engine)

## Goals
- Ensure investments are always scoped to the currently active farm.
- Make filtering and stats simple and correct for multi-farm users.
- Improve Firebase data layout to nest investments under users/{uid}/farms/{farmId}.
- Provide a backward-compatible migration path from legacy flat Firebase paths.

## Data Model
### Core Data entities
- Investment (updated)
  - id: UUID (existing)
  - amount: Double (existing)
  - category: String (existing)
  - subcategory: String? (existing)
  - date: Date (existing)
  - notes: String? (existing)
  - quantity: Double (existing)
  - unit: String? (existing)
  - pricePerUnit: Double (existing)
  - treeCount: Int32 (existing)
  - isRecurring: Bool (existing)
  - recurringPeriod: String? (existing)
  - farmId: String? (new)

- FertilizerCalculation (updated)
  - id: UUID (existing)
  - fertilizerType: String (existing)
  - amountPerTree: Double (existing)
  - unit: String (existing)
  - treeStatus: String? (existing)
  - season: String? (existing)
  - createdDate: Date (existing)
  - isActive: Bool (existing)
  - farmId: String? (new)

Notes:
- These are lightweight Core Data migrations (optional attributes), safe for production updates.

### Active farm migration (Core Data)
File: `FarmManager/Core/Stores/ActiveFarmStore.swift`
- `migrateUnscopedRecordsToActiveFarm(context:)` now also assigns `farmId` where missing for:
  - Investment
  - FertilizerCalculation
- Existing migrations for Tree, Photo, ManualEntry remain unchanged.

## Firebase Data Layout
### New path
- `users/{uid}/farms/{farmId}/investments/{investmentId}`

### Document shape for an investment
- id: string (UUID)
- amount: number
- category: string
- subcategory: string (optional)
- date: Timestamp (preferred) or Date
- notes: string (optional)
- quantity: number
- unit: string (optional)
- pricePerUnit: number
- treeCount: number
- isRecurring: boolean
- recurringPeriod: string (optional)
- userId: string (uid)
- farmId: string (active farm id)
- createdAt: serverTimestamp
- updatedAt: serverTimestamp

### Legacy migration (one-way copy)
- On download, the app attempts to migrate any legacy docs from `users/{uid}/investments` to the new nested path.
- If `farmId` missing on legacy docs, we set it to the active farm at migration time.
- New writes only go to the nested path.

## Manager Responsibilities
### InvestmentManager (current)
- Observes `ActiveFarmStore.shared.$activeFarmId` and refetches on farm change (Combine).
- Persists investments with `farmId` in Core Data.
- Fetches and stats are computed from the in-memory list (which is already filtered by `farmId`).
- Firebase sync:
  - Sync one: `syncInvestmentToFirebase(_:)` writes nested path and includes `farmId` in the payload.
  - Sync all: loops over filtered investments.
  - Download: reads nested path for the active farm, then updates local Core Data entries.
  - Legacy migration: reads legacy flat path and copies to nested path.

### Future refactor (planned)
- Introduce `InvestmentRepository` protocol (CoreData-backed) and `InvestmentService` (ObservableObject) to decouple UI/business logic from storage and sync.
- This will make testing easier and allow more complex querying with clean APIs.

## UI Wiring (what changed functionally)
- All existing views continue to use `InvestmentManager.shared`.
- Because `InvestmentManager` filters by `farmId`, all lists, charts, and stats are now farm-scoped automatically.
- `FirebaseSyncView` shows the active farm name next to the item count.

## Usage Examples
### Create an expense (scoped to active farm)
```swift
let inv = InvestmentManager.shared.addInvestment(
  amount: 250_000,
  category: "Phân Bón",
  subcategory: "NPK",
  date: Date(),
  notes: "Đợt 1",
  quantity: 10,
  unit: "kg",
  pricePerUnit: 25_000,
  treeCount: 50,
  isRecurring: false,
  recurringPeriod: nil
)
```

### Fetch and compute stats (already scoped)
```swift
let now = Date()
let startOfMonth = Calendar.current.date(from: Calendar.current.dateComponents([.year, .month], from: now))!
let endOfMonth = Calendar.current.date(byAdding: .month, value: 1, to: startOfMonth)!

let total = InvestmentManager.shared.getTotalExpense(from: startOfMonth, to: endOfMonth)
let categoryBreakdown = InvestmentManager.shared.getCategoryExpenses(from: startOfMonth, to: endOfMonth)
let monthly = InvestmentManager.shared.getMonthlyExpenses(from: startOfMonth, to: endOfMonth)
```

## Testing & Verification
1. Core Data migration
   - Start with an install that has investments without `farmId`.
   - Launch app; ensure `ActiveFarmStore.bootstrap` runs and `migrateUnscopedRecordsToActiveFarm` assigns `farmId`.
   - Verify fetch results only include the active farm’s investments.

2. Firebase nested writes
   - Add a new expense; verify a doc under `users/{uid}/farms/{farmId}/investments/{id}` with `farmId` present.

3. Legacy migration
   - If legacy docs exist under `users/{uid}/investments`, open the download screen.
   - The app will copy legacy docs to the nested path and set `farmId` if missing.

4. Farm switching
   - Create two farms and switch between them; ensure the list and stats reflect only the active farm.

5. Statistics
   - Validate category, monthly, and daily aggregations match expectations within the selected date range.

## Rollout Considerations
- The Core Data changes are additive and safe.
- Legacy Firebase migration is one-way copy; no destructive operations.
- If the organization uses custom rules, ensure Reads/Writes are allowed for the nested path and that `farmId` in doc matches the path.

## Security Rule Suggestions (Firebase)
- Restrict access to `users/{uid}/farms/{farmId}/investments` to the authenticated `uid` only.
- Optional assertion: stored `farmId` must equal the `{farmId}` in the path.

## Follow-up (Backlog / TODO)
- Extract `InvestmentService` + `InvestmentRepository` to decouple storage, sync, and UI.
- Zone-level tagging (`zoneId` on Investment) for zone-based reporting.
- Recurring expense engine that materializes scheduled expenses.
- Budget support (per farm, per category, per period) and alerts when thresholds are exceeded.
- Clean up unrelated warnings (Swift 6 sendability, deprecated APIs).

## File Index (Key Touchpoints)
- Core Data model: `FarmManager/FarmManager.xcdatamodeld` (Investment, FertilizerCalculation added `farmId`).
- Migration: `FarmManager/Core/Stores/ActiveFarmStore.swift` (migrates farmId on Investment and FertilizerCalculation).
- Manager: `FarmManager/Managers/InvestmentManager.swift` (farm-scoped CRUD, stats, and Firebase sync).
- UI examples: `FarmManager/Views/Investment/*` (no API changes required; benefits are automatic).
