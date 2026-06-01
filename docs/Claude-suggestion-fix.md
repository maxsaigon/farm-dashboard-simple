# 🛠️ Implementation Plan — Nâng Cấp Toàn Diện Codebase

## Tổng quan

Fix toàn bộ 17 vấn đề đã phát hiện trong [codebase analysis](file:///Users/daibui/.gemini/antigravity-ide/brain/1eddfe36-ff9d-498c-8364-cefb05c9c43d/codebase_analysis.md), chia thành 4 phase theo mức độ ưu tiên. Mỗi phase có thể deploy riêng biệt.

**Ước lượng tổng**: ~3-4 ngày thực thi

---

## Phase 1 — Bảo Mật & DevOps (ước lượng: 2-3 giờ)

> [!CAUTION]
> Phase này cần làm trước tiên — Firestore rules hiện tại đang mở toang.

---

### 1.1 Fix Firestore Rules — Xóa catch-all, hardening

#### [MODIFY] [firestore.rules](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/firestore.rules)

**Thay đổi**:
- **Xóa** rule catch-all ở L103-106 (`match /{document=**}`)
- **Cập nhật** farms rule: chỉ cho phép users có `farmAccess` record truy cập farm tương ứng
- **Thêm** helper function `hasFarmAccess(farmId)` kiểm tra qua `farmAccess` collection
- **Giữ nguyên** admin check cho `isOwner()` — tạm dùng, Phase 1.2 sẽ chuyển sang Custom Claims
- **Thêm** rule cho `photos` root collection (nếu tồn tại)

```diff
// Xóa hoàn toàn:
-    // Allow all other collections for authenticated users (temporary)
-    match /{document=**} {
-      allow read, write, create, delete: if isAuthenticated() || isOwner();
-    }

// Thêm helper:
+    function hasFarmAccess(farmId) {
+      return isAuthenticated() && 
+        exists(/databases/$(database)/documents/farmAccess/$(request.auth.uid + '_' + farmId));
+    }
```

> [!IMPORTANT]
> Cần verify rằng `farmAccess` document IDs follow pattern `userId_farmId` hoặc dùng query-based check. Sẽ kiểm tra Firestore data structure thực tế trước khi implement.

---

### 1.2 Bật ESLint trong build

#### [MODIFY] [next.config.mjs](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/next.config.mjs)

```diff
  eslint: {
-    ignoreDuringBuilds: true,
+    ignoreDuringBuilds: false,
  },
```

> [!NOTE]
> Sẽ chạy `npm run lint` trước để kiểm tra số lượng errors. ESLint config hiện tại đã set `warn` cho hầu hết rules nên build sẽ không fail ngay, nhưng cần verify.

---

### 1.3 Cleanup .gitignore & file rác

#### [MODIFY] [.gitignore](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/.gitignore)

Thêm:
```
Trash/
*.swp
*.swo
.DS_Store
manual-testing/
playwright-report/
```

#### [DELETE] `components/.InvestmentManagement.tsx.swp`

#### [DELETE] `Trash/` — toàn bộ thư mục (đã có archive/ trong gitignore)

---

## Phase 2 — Code Quality & Cleanup (ước lượng: 4-5 giờ)

---

### 2.1 Tạo `date-utils.ts` — Consolidate `convertToDate`

#### [NEW] [lib/date-utils.ts](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/date-utils.ts)

Tạo 1 file duy nhất export hàm `convertToDate` + `convertToTimestamp`:

```typescript
import { Timestamp } from 'firebase/firestore'

/**
 * Convert various date formats (Firestore Timestamp, Unix seconds, ISO string, 
 * {seconds, nanoseconds} objects) to JavaScript Date.
 */
export function convertToDate(dateValue: unknown): Date | null {
  if (!dateValue) return null
  if (dateValue instanceof Date) return dateValue
  if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue && 
      typeof (dateValue as Timestamp).toDate === 'function') {
    try { return (dateValue as Timestamp).toDate() } catch { return null }
  }
  if (typeof dateValue === 'number') return new Date(dateValue * 1000)
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  if (dateValue && typeof dateValue === 'object' && 'seconds' in dateValue) {
    const obj = dateValue as { seconds?: number; nanoseconds?: number }
    return new Date((obj.seconds || 0) * 1000 + (obj.nanoseconds || 0) / 1_000_000)
  }
  return null
}
```

#### [MODIFY] Xóa `convertToDate` trùng lặp khỏi 5 files:

| File | Dòng cần xóa | Thay bằng |
|---|---|---|
| [firestore.ts](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/firestore.ts) | L22-60 | `import { convertToDate } from './date-utils'` |
| [optimized-auth-context.tsx](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/optimized-auth-context.tsx) | L27-45 | `import { convertToDate } from './date-utils'` |
| [farm-service.ts](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/farm-service.ts) | L19-~60 | `import { convertToDate } from './date-utils'` |
| [admin-service.ts](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/admin-service.ts) | L44-81 | `import { convertToDate } from './date-utils'` (chuyển từ private static thành import) |
| [data-reconciliation-service.ts](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/data-reconciliation-service.ts) | L274-~300 | `import { convertToDate } from './date-utils'` (chuyển từ private static) |

Cũng cần kiểm tra và cập nhật các `toDate()` helpers trong:
- [investment-service.ts](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/investment-service.ts) L6 (`function toDate`)
- [photo-service.ts](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/photo-service.ts) L14 (`safeToDate`)

---

### 2.2 Xóa Legacy Auth Files

#### [DELETE] [lib/auth-context.tsx](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/auth-context.tsx)
- Không có import nào từ active code (verified: 0 imports)
- Legacy `AuthProvider` + `useAuth` — đã replaced bởi `optimized-auth-context.tsx`

#### [DELETE] [lib/auth.ts](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/auth.ts)
- Imports chỉ từ Trash files (verified: chỉ `Trash/storage/` dùng)
- Legacy auth helpers — đã replaced bởi `optimized-auth-context.tsx`

---

### 2.3 Xử lý `types-enhanced.ts`

> [!IMPORTANT]
> Không thể xóa hoàn toàn vì có 2 files active đang import:
> - [admin-service.ts](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/admin-service.ts#L16) — import `EnhancedUser`, `EnhancedFarm`
> - [components/admin/UserManagementMobile.tsx](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/components/admin/UserManagementMobile.tsx#L10) — import `EnhancedUser`, `UserRole`

#### [MODIFY] [lib/types-enhanced.ts](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/types-enhanced.ts)

**Giữ lại**: `EnhancedUser`, `UserRole`, `RoleType`, `Permission`, `ROLE_PERMISSIONS` (đang dùng)

**Xóa**: Toàn bộ interfaces không sử dụng (~300 dòng):
- `Organization`, `OrganizationSettings`, `BillingInfo`, `Address`, `OrganizationFeature`
- `UserPreferences`, `NotificationSettings`, `DashboardSettings`, `PrivacySettings`
- `EnhancedFarm`, `FarmSettings`, `FarmContact`, `Certification`
- `FarmInvitation`, `InvitationStatus`
- `ActivityLog`, `AccessLog`, `GeoLocation`
- `APIKey`, `APIRestrictions`
- `SystemConfig`, `SystemFeature`, `MaintenanceInfo`, `SystemLimits`, `SecurityConfig`
- `MigrationJob`
- `PERMISSION_GROUPS`

**Cập nhật** `admin-service.ts` để không import `EnhancedFarm` (không thực sự cần thiết, dùng `Farm` từ types.ts thay thế).

---

### 2.4 Tách Season Migration ra khỏi Auth Context

#### [NEW] [lib/season-migration-service.ts](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/season-migration-service.ts)

Di chuyển toàn bộ `runSeasonMigration` logic (L411-582) từ `optimized-auth-context.tsx` sang file riêng:

```typescript
export class SeasonMigrationService {
  private static MIGRATION_FLAG_KEY = 'farmDashboard_seasonMigrated'

  /** Check if migration already ran for this farm */
  static hasAlreadyMigrated(farmId: string): boolean {
    const flags = JSON.parse(localStorage.getItem(this.MIGRATION_FLAG_KEY) || '{}')
    return !!flags[farmId]
  }

  /** Mark farm as migrated */
  static markAsMigrated(farmId: string): void {
    const flags = JSON.parse(localStorage.getItem(this.MIGRATION_FLAG_KEY) || '{}')
    flags[farmId] = Date.now()
    localStorage.setItem(this.MIGRATION_FLAG_KEY, JSON.stringify(flags))
  }

  /** Run migration only if not already done */
  static async migrateIfNeeded(farm: SimpleFarm): Promise<MigrationResult> {
    if (this.hasAlreadyMigrated(farm.id)) return { skipped: true }
    // ... existing migration logic ...
    this.markAsMigrated(farm.id)
    return { farmUpdated, treesMigrated, photosMigrated }
  }
}
```

#### [MODIFY] [lib/optimized-auth-context.tsx](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/optimized-auth-context.tsx)

- **Xóa** useEffect ở L411-582 (season migration)
- **Thêm** import + đơn giản hóa call: `SeasonMigrationService.migrateIfNeeded(currentFarm)`
- Chỉ chạy khi `hasAlreadyMigrated()` returns false

---

### 2.5 Console.log Cleanup — Chuyển sang Logger

#### [MODIFY] Nhiều files — thay `console.log` bằng `logger` từ [lib/logger.ts](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/logger.ts)

Files cần cập nhật (ưu tiên):

| File | Số console.log | Hành động |
|---|---|---|
| [optimized-auth-context.tsx](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/optimized-auth-context.tsx) | ~30 | `import logger` → `logger.debug(...)` |
| [storage.ts](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/storage.ts) | ~20 | `logger.debug(...)` cho image lookup |
| [firebase.ts](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/firebase.ts) | 4 | `logger.info(...)` cho init |
| [OnFarmWorkMode.tsx](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/components/OnFarmWorkMode.tsx) | ~15 | `logger.debug(...)` |
| [app/page.tsx](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/app/page.tsx) | 10 | `logger.debug(...)` |
| Các files khác | ~30 | Batch replace |

#### [MODIFY] [app/page.tsx](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/app/page.tsx)

Xóa debug info visible cho user:
```diff
-        <p className="text-xs text-gray-400 mt-2">
-          Loading: {loading ? 'true' : 'false'} | User: {user ? '✓' : '✗'} | Farms: {farms.length} | Current: {currentFarm ? '✓' : '✗'}
-        </p>
```

---

### 2.6 Fix package.json

#### [MODIFY] [package.json](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/package.json)

```diff
  "dependencies": {
-    "playwright": "^1.54.2",
     ...
  },
  "devDependencies": {
+    "playwright": "^1.54.2",
     ...
  }
```

---

## Phase 3 — Kiến Trúc & UX (ước lượng: 8-12 giờ)

---

### 3.1 Tách OnFarmWorkMode.tsx (1,478 LOC → 6 files)

#### [NEW] `components/on-farm/` directory

| File mới | Chức năng | LOC ước lượng |
|---|---|---|
| `components/on-farm/OnFarmWorkMode.tsx` | **Main orchestrator** — state + layout | ~200 |
| `components/on-farm/GPSStatusBar.tsx` | GPS status display + accuracy | ~80 |
| `components/on-farm/NearbyTreePanel.tsx` | Nearby tree list + distance | ~150 |
| `components/on-farm/TreeCreationForm.tsx` | Form tạo cây mới + photo capture | ~250 |
| `components/on-farm/AmbiguityResolver.tsx` | Resolver khi click vào trees overlapping | ~100 |
| `components/on-farm/WorkModeMap.tsx` | MapContainer + markers + tracking path | ~300 |
| `components/on-farm/CalibrationOverlay.tsx` | GPS burst calibration UI | ~80 |

**Cách tách**: Giữ state chính ở `OnFarmWorkMode.tsx`, pass down qua props. Mỗi sub-component nhận props cần thiết, không phụ thuộc trực tiếp vào auth context.

---

### 3.2 Tách InvestmentManagement.tsx (1,401 LOC → 4 files)

#### [NEW] `components/investment/` directory

| File mới | Chức năng |
|---|---|
| `components/investment/InvestmentManagement.tsx` | Orchestrator + state |
| `components/investment/InvestmentList.tsx` | Danh sách chi tiêu |
| `components/investment/InvestmentForm.tsx` | Form thêm/sửa chi tiêu |
| `components/investment/InvestmentSummary.tsx` | Charts + thống kê |

---

### 3.3 Tách ImageGallery.tsx (1,335 LOC → 3 files)

#### [NEW] `components/gallery/` directory

| File mới | Chức năng |
|---|---|
| `components/gallery/ImageGallery.tsx` | Orchestrator + grid |
| `components/gallery/ImageViewer.tsx` | Fullscreen viewer + zoom |
| `components/gallery/ImageUploader.tsx` | Upload + compression |

---

### 3.4 Tách FullscreenTreeShowcase.tsx (1,119 LOC → 3 files)

#### [NEW] `components/tree/` directory (cùng folder với TreeDetail, TreeList...)

| File mới | Chức năng |
|---|---|
| `components/tree/FullscreenTreeShowcase.tsx` | Layout + orchestrator |
| `components/tree/TreeStatsPanel.tsx` | Stats display |
| `components/tree/TreePhotoCarousel.tsx` | Photo section |

---

### 3.5 Thay `alert()`/`prompt()`/`confirm()` bằng Toast & Modal

Tổng cộng **38 chỗ** cần thay across 11 files.

#### [MODIFY] [components/Toast.tsx](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/components/Toast.tsx)

Nâng cấp Toast component hiện có để support:
- `success`, `error`, `warning`, `info` variants
- Auto-dismiss timer
- Export `useToast()` hook hoặc `toast()` imperative API

#### [NEW] `components/shared/ConfirmDialog.tsx`

Modal thay thế `window.confirm()`:
```typescript
interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}
```

#### [NEW] `components/shared/InputDialog.tsx`

Modal thay thế `prompt()`:
```typescript
interface InputDialogProps {
  isOpen: boolean
  title: string
  placeholder?: string
  initialValue?: string
  inputType?: 'text' | 'number'
  onSubmit: (value: string) => void
  onCancel: () => void
}
```

**Files cần cập nhật** (ưu tiên theo số lượng `alert` calls):

| File | alert | confirm | prompt |
|---|---|---|---|
| [OnFarmWorkMode.tsx](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/components/OnFarmWorkMode.tsx) | 9 | 2 | 0 |
| [Navigation.tsx](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/components/Navigation.tsx) | 4 | 0 | 2 |
| [admin/UserManagementMobile.tsx](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/components/admin/UserManagementMobile.tsx) | 4 | 1 | 0 |
| [InvestmentManagement.tsx](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/components/InvestmentManagement.tsx) | 3 | 0 | 0 |
| [admin/SuperAdminPanel.tsx](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/components/admin/SuperAdminPanel.tsx) | 4 | 0 | 0 |
| [admin/SystemSettingsMobile.tsx](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/components/admin/SystemSettingsMobile.tsx) | 2 | 0 | 0 |
| Khác (TreeDetail, TreeManagement, etc.) | 5 | 1 | 0 |

---

### 3.6 Fix `any` types — Proper typing

#### [MODIFY] [components/Navigation.tsx](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/components/Navigation.tsx)

```diff
+ interface NavigationItem {
+   name: string
+   description: string
+   href: string
+   icon: React.ComponentType<{ className?: string }>
+   emoji: string
+ }

- const navigation = [
+ const navigation: NavigationItem[] = [
    { name: 'Bản Đồ', description: '...', ... }
  ]

// Xóa as any casts ở L304, L308
- <span>{(item as any).emoji}</span>
+ <span>{item.emoji}</span>
```

#### [MODIFY] [lib/investment-service.ts](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/investment-service.ts)

Thay `const payload: any = {...}` bằng proper `InvestmentData` interface.

#### [MODIFY] [lib/websocket-service.ts](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/websocket-service.ts)

Thay `data: any` trong `RealTimeEvent` bằng union type discriminated by `type` field.

#### [MODIFY] [lib/optimized-auth-context.tsx](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/optimized-auth-context.tsx)

- `organizations: any[]` → `organizations: never[]` (compatibility placeholder)
- `(f: any)` in `.find()` calls → proper `SimpleFarm` type
- `photoDocs: any[]` → proper Firestore `QueryDocumentSnapshot[]`

---

### 3.7 Fix `treeStatus` mixed language union

#### [MODIFY] [lib/types.ts](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/types.ts)

```diff
- treeStatus?: 'Young Tree' | 'Mature' | 'Old' | 'Cây Non' | 'Cây Trưởng Thành' | 'Cây Già'
+ treeStatus?: TreeStatus

+ export type TreeStatus = 'young' | 'mature' | 'old'
+ export const TREE_STATUS_LABELS: Record<TreeStatus, string> = {
+   young: 'Cây Non',
+   mature: 'Cây Trưởng Thành',
+   old: 'Cây Già'
+ }
```

> [!WARNING]
> Cần migration cho Firestore data đang chứa giá trị cũ ('Cây Non', 'Young Tree'...). Sẽ thêm backward-compatible mapping function.

---

### 3.8 Leaflet Icons — Bundle locally

#### Copy Leaflet icon files vào `public/images/leaflet/`

```
public/images/leaflet/
├── marker-icon.png
├── marker-icon-2x.png
└── marker-shadow.png
```

#### [MODIFY] OnFarmWorkMode.tsx + UnifiedMap.tsx

```diff
- iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
- iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
- shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
+ iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
+ iconUrl: '/images/leaflet/marker-icon.png',
+ shadowUrl: '/images/leaflet/marker-shadow.png',
```

---

## Phase 4 — Testing (ước lượng: 4-6 giờ)

---

### 4.1 Unit tests cho core utilities

#### [NEW] `__tests__/date-utils.test.ts`

Test tất cả edge cases của `convertToDate`:
- Firestore Timestamp
- Unix seconds (number)
- ISO string
- `{seconds, nanoseconds}` objects
- null/undefined
- Invalid values

#### [NEW] `__tests__/auth-permissions.test.ts`

Test `hasPermission`, `getUserRole`, `canAccessFarm`, `isAdmin` logic.

#### [NEW] `__tests__/firestore-crud.test.ts`

Mock Firestore, test `createTree`, `updateTree`, `deleteTree` with proper access control.

---

### 4.2 Component tests

#### [NEW] `__tests__/components/Toast.test.tsx`

Test Toast rendering, auto-dismiss, variants.

#### [NEW] `__tests__/components/ConfirmDialog.test.tsx`

Test confirm/cancel callbacks.

---

## User Review Required

> [!IMPORTANT]
> **Firestore Rules Change (Phase 1.1)**: Thay đổi rules sẽ ảnh hưởng ngay lập tức đến production. Cần:
> 1. Verify `farmAccess` document ID pattern trong Firestore Console
> 2. Test rules bằng Firestore Emulator trước khi deploy
> 3. Deploy rules riêng biệt trước khi deploy code changes

> [!WARNING]
> **`treeStatus` Migration (Phase 3.7)**: Đổi union type sẽ break existing data. Có 2 approach:
> - **A) Backward-compatible**: Giữ cả old values trong union, dùng mapping function (an toàn hơn)
> - **B) Clean migration**: Chạy script update Firestore data, rồi đổi type (sạch hơn nhưng riskier)
> 
> Bạn chọn approach nào?

## Open Questions

1. **Folder restructure (Phase 3)**: Bạn có muốn tôi chỉ tách code trong file mới mà **giữ nguyên path import cũ** (re-export), hay đổi hoàn toàn path import?

2. **WebSocket service**: File [websocket-service.ts](file:///Volumes/Mac%20Work/React/farm-dashboard-simple/lib/websocket-service.ts) có dùng `React` import ở cuối file (L261) và có bug (sẽ fail ở server). Có nên xóa file này nếu không dùng WebSocket?

3. **`types-enhanced.ts`**: Nên giữ file riêng hay merge các types còn dùng (`EnhancedUser`, `UserRole`, etc.) vào `types.ts`?

---

## Verification Plan

### Automated Tests
```bash
# Sau mỗi phase:
npm run lint              # ESLint pass
npx tsc --noEmit          # TypeScript compile pass
npm run build             # Next.js build success
npm test                  # Unit tests pass (Phase 4+)
```

### Manual Verification
- **Phase 1**: Deploy Firestore rules to emulator → test login + farm access
- **Phase 2**: Verify auth flow vẫn work sau khi xóa legacy files
- **Phase 3**: Test trên mobile browser: tạo cây, chụp ảnh, GPS tracking, xem gallery
- **Phase 4**: Run test suite, check coverage report

### Regression Testing
- Login flow (email/password)
- Farm selection (single farm auto-select, multi-farm selector)
- Map page load + tree markers
- Tree CRUD (create, view detail, update, delete)
- On-Farm Work Mode (GPS, create tree, capture photo)
- Investment tracking (add, list, chart)
- Admin panel (user management, farm management)
