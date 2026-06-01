# ReNEW — Đặc Tả Hoàn Chỉnh: Farm Dashboard (Rebuild Specification)

> Tài liệu này mô tả **MỌI CHI TIẾT** của ứng dụng quản lý trang trại sầu riêng, để một coding agent có thể build lại hoàn chỉnh từ đầu với code tốt hơn. Đọc kỹ từng phần trước khi code.

---

## 1. Tổng Quan Sản Phẩm

### 1.1 Mục đích
PWA (Progressive Web App) mobile-first dành cho **nông dân sầu riêng Việt Nam** quản lý trang trại: theo dõi cây trồng, GPS mapping, chụp ảnh AI, quản lý chi phí đầu tư, và cộng tác nhóm.

### 1.2 Đối tượng người dùng
| Vai trò | Bối cảnh sử dụng | Thiết bị |
|---|---|---|
| **Nông dân / Công nhân** (`worker`) | Ngoài vườn, dưới nắng, tay bẩn, thường mất sóng | Điện thoại Android giá rẻ, 3G/4G yếu |
| **Chủ trại / Quản lý** (`manager`/`owner`) | Giám sát từ xa hoặc tại chòi, cần xem báo cáo | Điện thoại + tablet |
| **Super Admin** (`super_admin`) | Văn phòng, quản lý nền tảng, cấu hình hệ thống | Desktop + mobile |

### 1.3 Ngôn ngữ giao diện
Toàn bộ UI hiển thị bằng **Tiếng Việt**. Tên biến code bằng English.

### 1.4 Tech Stack khuyến nghị
| Layer | Công nghệ |
|---|---|
| Framework | **Next.js 14+** (App Router) + React 18+ |
| Styling | **TailwindCSS** — Mobile-first |
| Database | **Firebase Firestore** (NoSQL, real-time, offline) |
| Auth | **Firebase Authentication** (Email/Password) |
| Storage | **Firebase Storage** (Ảnh cây trồng) |
| Maps | **Leaflet** + **react-leaflet** + **OpenStreetMap** + **Esri Satellite** |
| Geo | **@turf/turf** (khoảng cách, point-in-polygon, diện tích) |
| PWA | Service Worker + IndexedDB (offline photo queue) |
| Virtual List | **@tanstack/react-virtual** (hiển thị 1000+ cây) |

---

## 2. Kiến Trúc Hệ Thống

### 2.1 Sơ đồ kiến trúc

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Next.js PWA)                       │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ App Pages │──│ Auth Context  │──│ Service Layer       │   │
│  │ (Router)  │  │ (React Ctx)  │  │ (farm, photo, inv) │   │
│  └──────────┘  └──────────────┘  └─────────────────────┘   │
│       │              │                     │                  │
│       ▼              ▼                     ▼                  │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │Components │  │ Auth Guard   │  │ Utility Layer       │   │
│  │ (UI)      │  │ (Route Prot.)│  │ (date, geo, photo) │   │
│  └──────────┘  └──────────────┘  └─────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │ Firebase SDK
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    FIREBASE CLOUD                            │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────┐     │
│  │ Auth       │  │ Firestore   │  │ Storage          │     │
│  │ (Users)    │  │ (Data)      │  │ (Photos)         │     │
│  └────────────┘  └─────────────┘  └──────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Cấu trúc thư mục khuyến nghị

```
app/
├── layout.tsx                   # Root layout + AuthProvider
├── page.tsx                     # Home → redirect to /map or /login
├── login/page.tsx
├── select-farm/page.tsx
├── map/page.tsx                 # Main map + On-Farm Work Mode
├── trees/page.tsx               # Tree list + detail showcase
├── zones/page.tsx               # Zone management (view)
├── money/page.tsx               # Investment tracking
├── admin/page.tsx               # Super Admin panel
├── admin-zones/page.tsx         # Zone drawing (owner/admin)
├── no-access/page.tsx
└── camera/page.tsx              # AI photo capture

components/
├── auth/
│   ├── AuthGuard.tsx            # Route protection
│   └── LoginForm.tsx
├── map/
│   ├── UnifiedMap.tsx           # Leaflet map (main)
│   ├── OnFarmWorkMode.tsx       # Field work mode (GPS + create tree)
│   ├── GPSStatusBar.tsx         # GPS accuracy display
│   ├── NearbyTreePanel.tsx      # Trees within 50m
│   └── WorkModeMap.tsx          # Map in work mode
├── tree/
│   ├── TreeList.tsx             # Virtual-scrolled tree list
│   ├── TreeCard.tsx             # Individual tree card
│   ├── FullscreenTreeShowcase.tsx # Full tree detail
│   ├── TreeCreationForm.tsx     # Create new tree
│   ├── TreeNoteSystem.tsx       # Collaborative notes
│   └── CustomFieldsSection.tsx  # Extensible fields
├── gallery/
│   ├── ImageGallery.tsx         # Photo grid + viewer
│   ├── ImageViewer.tsx          # Fullscreen zoom viewer
│   └── ImageUploader.tsx        # Upload + compress
├── investment/
│   ├── InvestmentManagement.tsx # Main container
│   ├── InvestmentList.tsx       # Expense list
│   ├── InvestmentForm.tsx       # Add/edit form
│   └── InvestmentSummary.tsx    # Charts + stats
├── navigation/
│   ├── Navigation.tsx           # Top nav + season selector
│   ├── BottomTabBar.tsx         # Mobile bottom tabs
│   └── FarmSelectorModal.tsx    # Multi-farm picker
├── shared/
│   ├── Toast.tsx                # Toast notifications (success/error/warning)
│   ├── ConfirmDialog.tsx        # Replace window.confirm()
│   ├── InputDialog.tsx          # Replace window.prompt()
│   ├── BottomSheet.tsx          # Slide-up panel
│   ├── LargeTitleHeader.tsx     # iOS-style header
│   └── ErrorBoundary.tsx
├── zone/
│   ├── ZoneManagement.tsx       # Zone list
│   └── ZoneDrawing.tsx          # Polygon editor
└── admin/
    ├── SuperAdminPanel.tsx
    ├── UserManagement.tsx
    ├── FarmManagement.tsx
    └── SystemSettings.tsx

lib/
├── firebase.ts                  # Firebase init + config
├── auth-context.tsx             # Auth + Farm selection context
├── types.ts                     # ALL TypeScript interfaces
├── date-utils.ts                # convertToDate (ONE place only!)
├── geo-utils.ts                 # Haversine, point-in-polygon, area calc
├── logger.ts                    # Production-safe logging
├── farm-service.ts              # Farm CRUD
├── tree-service.ts              # Tree CRUD
├── photo-service.ts             # Photo CRUD + offline queue
├── photo-compression.ts         # Image compression
├── investment-service.ts        # Investment CRUD
├── storage.ts                   # Firebase Storage helpers
├── offline-sync.ts              # IndexedDB + sync queue
├── gps-service.ts               # GPS tracking + burst calibration
└── admin-service.ts             # Admin-only operations
```

---

## 3. Luồng Xác Thực & Điều Hướng (Auth Flow)

### 3.1 Sơ đồ điều hướng

```
User truy cập "/"
   │
   ├── Chưa đăng nhập ──────────────────> /login
   │
   └── Đã đăng nhập
        │
        ├── Chưa có farm nào ────────────> /no-access
        │
        ├── Có 1 farm ──────────────────> Tự động chọn → /map
        │
        └── Có nhiều farm ──────────────> /select-farm → chọn → /map
```

### 3.2 Auth Context phải cung cấp

```typescript
interface AuthContextValue {
  // Auth state
  user: User | null
  loading: boolean

  // Auth actions
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>

  // Farm state
  farms: Farm[]                    // Farms user has access to
  currentFarm: Farm | null         // Currently selected farm
  setCurrentFarm(farm: Farm): void

  // Season state
  selectedSeasonYear: number       // Current viewing season (e.g. 2026)
  setSelectedSeasonYear(year: number): void
  startNewSeason(year: number): Promise<void>

  // Permission helpers
  isAdmin(): boolean
  hasPermission(permission: string): boolean
}
```

### 3.3 Caching chiến lược
- Lưu `currentFarm_{uid}` vào **localStorage** khi user chọn farm
- Khi reload: đọc từ localStorage trước → validate với Firestore → fallback nếu invalid
- Mục tiêu: **< 1s** từ refresh đến hiển thị map (với cache hit)

### 3.4 Admin check
- **KHÔNG hard-code UID** trong code
- Dùng **Firebase Custom Claims**: `request.auth.token.admin === true`
- Hoặc check `adminConfig` collection trong Firestore

---

## 4. Database Schema (Firestore)

### 4.1 Collection hierarchy

```
/users/{userId}
/farms/{farmId}
/farms/{farmId}/trees/{treeId}
/farms/{farmId}/trees/{treeId}/notes/{noteId}
/farms/{farmId}/photos/{photoId}
/farms/{farmId}/zones/{zoneId}
/farms/{farmId}/investments/{investmentId}
/farmAccess/{accessId}           // userId_farmId pattern
/adminConfig/main
```

### 4.2 Schema: User (`/users/{userId}`)

```typescript
interface User {
  uid: string               // Firebase Auth UID
  email: string
  displayName: string
  phoneNumber?: string
  accountStatus: 'active' | 'suspended' | 'pending_verification'
  isEmailVerified: boolean
  lastLoginAt?: Date
  loginCount: number
  language: string           // 'vi-VN'
  timezone: string           // 'Asia/Ho_Chi_Minh'
  createdAt: Date
  updatedAt: Date
}
```

### 4.3 Schema: Farm (`/farms/{farmId}`)

```typescript
interface Farm {
  id: string
  name: string               // "Trang trại Bảo Lộc"
  ownerName: string
  totalArea?: number         // Hecta
  centerLatitude: number     // Tâm bản đồ
  centerLongitude: number
  boundaryCoordinates?: string // JSON string of polygon coordinates
  seasons: number[]          // [2024, 2025, 2026] — danh sách niên vụ
  currentSeasonYear: number  // Niên vụ hiện hành
  isActive: boolean
  createdDate: Date
}
```

### 4.4 Schema: Tree (`/farms/{farmId}/trees/{treeId}`) ⭐ QUAN TRỌNG NHẤT

```typescript
interface Tree {
  id: string
  farmId: string
  name: string               // "Ri6-001" hoặc "Monthong Khu A Hàng 3"
  qrCode?: string            // QR code dán trên thân cây
  variety: string            // "Ri6" | "Monthong" | "Musang King" | "Chuồng Bò" | ...

  // GPS
  latitude: number
  longitude: number
  gpsAccuracy?: number       // Sai số GPS (mét)

  // Zone assignment
  zoneCode?: string          // "KHU_A"
  zoneName?: string          // "Khu A"

  // Health & Status
  healthStatus: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  treeStatus: 'young' | 'mature' | 'old'
  needsAttention: boolean

  // Fruit counting
  manualFruitCount: number   // Đếm bằng tay vụ hiện tại
  aiFruitCount: number       // AI đếm từ ảnh
  lastCountDate?: Date

  // Physical measurements
  treeHeight?: number        // Mét
  trunkDiameter?: number     // cm

  // Care tracking
  plantingDate?: Date
  fertilizedDate?: Date      // Ngày bón phân gần nhất
  prunedDate?: Date          // Ngày tỉa cành gần nhất

  // Notes
  notes?: string
  healthNotes?: string
  diseaseNotes?: string

  // AI
  lastAIAnalysisDate?: Date
  aiAccuracy?: number

  // Custom extensible fields
  customFields?: {
    treeId: string
    fields: Array<{
      fieldId: string
      value: string | number | boolean | Date
      updatedAt: Date
    }>
    lastUpdated: Date
  }

  // Season-specific data — LƯU LỊCH SỬ THEO TỪNG NĂM
  seasonalStats?: {
    [seasonYear: number]: {
      manualFruitCount: number
      aiFruitCount: number
      healthStatus: string
      notes?: string
      updatedAt: Date
    }
  }

  // Sync
  needsSync?: boolean
  lastSyncDate?: Date
  createdAt: Date
  updatedAt: Date
}
```

### 4.5 Schema: Photo (`/farms/{farmId}/photos/{photoId}`)

```typescript
interface Photo {
  id: string
  treeId: string
  farmId: string
  filename: string
  photoType: 'general' | 'health' | 'fruit_count'
  seasonYear: number          // Gán niên vụ khi chụp

  // Location
  latitude?: number
  longitude?: number

  // Storage paths
  localPath: string           // Firebase Storage download URL
  compressedPath?: string     // Path to compressed version
  thumbnailPath?: string      // Path to thumbnail
  originalPath?: string

  // Processing status
  uploadedToServer: boolean
  serverProcessed: boolean
  needsAIAnalysis: boolean

  // AI results
  manualFruitCount?: number
  userNotes?: string

  timestamp: Date
  uploadDate?: Date
  localStorageDate?: Date     // When saved to IndexedDB (offline)
  totalLocalSize?: number
}
```

**Firebase Storage structure:**
```
farms/{farmId}/trees/{treeId}/photos/{photoId}/
├── compressed.jpg            ← Main display (500KB)
├── thumbnail.jpg             ← Gallery grid (50KB)
└── ai_ready.jpg              ← For AI analysis (1.5MB)
```

### 4.6 Schema: Zone (`/farms/{farmId}/zones/{zoneId}`)

```typescript
interface FarmZone {
  id: string
  farmId: string
  name: string               // "Khu A"
  code: string               // "KHU_A"
  description?: string
  color: string              // Hex color "#3b82f6" for map polygon
  area: number               // Hecta
  treeCount: number
  isActive: boolean
  boundaries: Array<{        // Polygon coordinates
    latitude: number
    longitude: number
  }>
  notes?: string
  createdAt: Date
  updatedAt: Date
}
```

### 4.7 Schema: Investment (`/farms/{farmId}/investments/{investmentId}`)

```typescript
interface Investment {
  id: string
  farmId: string
  amount: number              // VNĐ
  category: 'Phân bón' | 'Thuốc BVTV' | 'Công cụ' | 'Lao động' | 'Khác'
  subcategory?: string        // "NPK 16-16-8"
  date: Date                  // Ngày chi trả
  notes?: string
  quantity?: number
  unit?: string               // "Bao" | "Kg" | "Lít" | "Ngày công"
  pricePerUnit?: number
  treeCount?: number          // Số cây áp dụng
  images?: string[]           // URLs ảnh hóa đơn
  isRecurring: boolean
  recurringPeriod?: string    // "Hàng tháng" | "Hàng năm"
  createdBy: string           // User UID
  createdAt: Date
  updatedAt: Date
}
```

### 4.8 Schema: Tree Note (`/farms/{farmId}/trees/{treeId}/notes/{noteId}`)

```typescript
interface TreeNote {
  id: string
  content: string
  author: {
    uid: string
    name: string
    email: string
  }
  type: 'info' | 'warning' | 'success' | 'urgent'
  mentions?: string[]         // @mentioned usernames
  timestamp: Date
  isEdited?: boolean
  editedAt?: Date
}
```

### 4.9 Schema: Farm Access (`/farmAccess/{userId}_{farmId}`)

```typescript
interface FarmAccess {
  id: string                   // `${userId}_${farmId}`
  userId: string
  farmId: string
  role: 'owner' | 'manager' | 'worker' | 'viewer'
  permissions: string[]        // ['read', 'write', 'delete', 'manage_users', ...]
  createdAt: Date
  updatedAt: Date
}
```

### 4.10 Firestore Security Rules (QUAN TRỌNG!)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isAdmin() {
      return isAuthenticated() && request.auth.token.admin == true;
    }

    function hasFarmAccess(farmId) {
      return isAuthenticated() &&
        exists(/databases/$(database)/documents/farmAccess/$(request.auth.uid + '_' + farmId));
    }

    // Users — only own profile
    match /users/{userId} {
      allow read, write: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow create: if isAuthenticated();
    }

    // Farms — only users with farmAccess
    match /farms/{farmId} {
      allow read: if hasFarmAccess(farmId) || isAdmin();
      allow write: if hasFarmAccess(farmId) || isAdmin();

      // All subcollections (trees, photos, zones, investments, notes)
      match /{document=**} {
        allow read: if hasFarmAccess(farmId) || isAdmin();
        allow write: if hasFarmAccess(farmId) || isAdmin();
      }
    }

    // Farm access records
    match /farmAccess/{accessId} {
      allow read: if isAuthenticated() &&
        (request.auth.uid == resource.data.userId || isAdmin());
      allow write: if isAdmin();
    }

    // Admin config
    match /adminConfig/{document=**} {
      allow read, write: if isAdmin();
    }

    // ⚠️ KHÔNG CÓ catch-all rule! Mặc định deny tất cả.
  }
}
```

---

## 5. Các Trang & Chức Năng Chi Tiết

### 5.1 `/login` — Đăng Nhập

**Chức năng:**
- Form nhập Email + Mật khẩu
- Gọi Firebase Auth `signInWithEmailAndPassword`
- Sau đăng nhập: redirect theo logic ở mục 3.1
- Hiển thị lỗi rõ ràng (sai mật khẩu, tài khoản bị khóa...)

**UX quan trọng:**
- Font lớn, nút đăng nhập to rõ (nông dân lớn tuổi)
- Hỗ trợ show/hide password

---

### 5.2 `/select-farm` — Chọn Nông Trại

**Chức năng:**
- Hiển thị danh sách farms user có quyền truy cập
- Click vào farm card → highlight (viền xanh)
- Nút "Vào Nông Trại" → lưu `currentFarm` vào context + localStorage → redirect `/map`
- Nút "Tạo Nông Trại Mới" → modal nhập tên + diện tích → `FarmService.createFarm()`

**Logic đặc biệt:**
- Nếu user chỉ có 1 farm → **tự động chọn**, bỏ qua trang này
- Hiển thị vai trò user trên mỗi farm card (Owner, Manager, Worker, Viewer)

---

### 5.3 `/map` — Bản Đồ Trang Trại ⭐ TRANG CHÍNH

**Chức năng cốt lõi:**
1. **Bản đồ Leaflet fullscreen** với cây trồng (circle markers) và khu vực (polygon overlays)
2. **3 chế độ bản đồ:**
   - 🤖 **Tự động** (mặc định): Zoom 1-18 → Hybrid (vệ tinh Esri + nhãn OSM), Zoom 19+ → Street map
   - 🗺️ **Bản đồ**: OpenStreetMap thuần
   - 🌍 **Hybrid**: Vệ tinh + nhãn (OSM opacity 40%)
3. **Toggle hiển thị**: Bật/tắt Tree markers, Zone polygons
4. **Click tree marker** → mở `FullscreenTreeShowcase`
5. **Click zone polygon** → BottomSheet hiển thị zone info
6. **Nút "Làm việc"** → kích hoạt On-Farm Work Mode (xem 5.3.1)

**Layer rendering:**
```
Satellite Layer (Esri) ──── opacity 1.0 khi hybrid/auto
OSM Layer              ──── opacity 0.4 khi hybrid, 1.0 khi street
Zone Polygons          ──── color từ zone.color, fill opacity 0.2
Tree Circle Markers    ──── color theo healthStatus:
                            Excellent/Good = green
                            Fair = orange
                            Poor = red
                            needsAttention = yellow pulse
User Location Marker   ──── blue pulsing dot + accuracy circle
```

#### 5.3.1 On-Farm Work Mode — Chế độ đi vườn thực địa ⭐

**Mô tả:** Chế độ fullscreen dành cho nông dân dùng ngoài thực địa. Tối ưu cho thao tác nhanh, GPS tracking, và tạo cây mới.

**Layout:**
```
┌─────────────────────────────────────┐
│  [GPS Status Bar]        [✕ Close]  │
│                                      │
│                                      │
│         FULLSCREEN MAP               │
│    (auto-center theo vị trí user)    │
│    • User marker (blue dot + pulse) │
│    • Accuracy circle (green/orange/red)│
│    • Breadcrumb trail (đường đi)    │
│    • Nearby tree markers            │
│                                      │
├─────────────────────────────────────┤
│  🗺️ Cây gần bạn (max 5)            │
│  ┌───────────────────────────────┐  │
│  │ 🌳 Cây Ri6-001        8.5m   │  │
│  │    Ri6 • Khu A               │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ 🌳 Cây Monthong B02   15.2m  │  │
│  └───────────────────────────────┘  │
│                                      │
│  [📷 Chụp ảnh]  [➕ Tạo cây mới]   │
└─────────────────────────────────────┘
```

**GPS Features:**
- **GPS tracking**: `navigator.geolocation.watchPosition()` với `enableHighAccuracy: true`
- **Update interval**: mỗi 3m di chuyển
- **Breadcrumb trail**: Lưu 50 điểm gần nhất, vẽ polyline trên map
- **Accuracy circle**: Vòng tròn xung quanh user marker
  - 🟢 Xanh: < 5m (GPS tốt)
  - 🟠 Cam: 5-15m (trung bình)
  - 🔴 Đỏ: > 15m (sóng yếu)

**GPS Burst Calibration — thuật toán chống GPS bounce:**
```
1. Thu thập 4 mẫu GPS liên tiếp (interval = 500ms, tổng 2 giây)
2. Lọc bỏ mẫu có accuracy > 15m
3. Nếu tất cả mẫu yếu → cảnh báo "Ra vùng trống"
4. Tính trung bình cộng tọa độ các mẫu tốt → kết quả cuối cùng
```
→ Tăng độ chính xác ~2x so với single reading

**Nearby Tree Detection:**
- Bán kính: **50 mét**
- Dùng `@turf/distance` để tính khoảng cách
- Hiển thị max **5 cây** gần nhất, sort theo distance tăng dần
- Màu khoảng cách: 🔴 < 10m, 🟠 10-20m, 🟢 > 20m

**Tạo cây mới workflow:**
```
1. User nhấn "Tạo cây mới tại đây"
2. Chạy GPS Burst Calibration → lấy tọa độ chính xác
3. Auto-detect zone gần nhất bằng point-in-polygon (Turf.js)
4. Hiển thị form:
   - Tên cây (tùy chọn, auto-generate: "{variety} {date}")
   - Giống cây (bắt buộc): grid chọn nhanh [Ri6, Monthong, Musang King, ...]
   - Khu vực (auto-filled từ GPS)
   - [📷 Chụp ảnh] — mở camera, chụp, lưu vào capturedPhotos[]
5. Confirm → createTree() trong Firestore
6. Upload photos (nén 500KB) → Firebase Storage
7. Nếu OFFLINE: lưu ảnh vào IndexedDB, sync khi có wifi
8. Thông báo thành công (Toast, KHÔNG dùng alert())
```

**Camera integration:**
```typescript
// Mở camera sau (facingMode: 'environment')
navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'environment', width: 1920, height: 1080 }
})
// Capture → canvas.toBlob() → blob URL → preview
// Nén trước khi upload: compressImageSmart(file, 'general') → 500KB target
```

---

### 5.4 `/trees` — Danh Sách & Chi Tiết Cây Trồng

**TreeList:**
- **Virtual scrolling** với `@tanstack/react-virtual` (hiển thị mượt 1000+ cây)
- **Pull-to-refresh**: vuốt xuống để reload
- **Tìm kiếm**: theo tên, QR code
- **Lọc**: theo sức khỏe (Khỏe, Cần chú ý, Yếu), giống cây, khu vực
- **Sắp xếp**: theo tên, ngày tạo, khoảng cách (nếu có GPS)

**FullscreenTreeShowcase (Chi tiết cây):**

```
┌───────────────────────────────────┐
│ ← [Tên cây]            [Sửa][Xóa]│
├───────────────────────────────────┤
│ ┌─────────────────────────────┐   │
│ │     IMAGE GALLERY            │   │
│ │  (Grid ảnh + fullscreen zoom)│   │
│ │  Tab filter: Tất cả | 2026 | 2025│
│ └─────────────────────────────┘   │
│                                    │
│ 📝 Ghi chú nhóm [5] [+]          │ ← TreeNoteSystem
│    (Timeline notes, @mentions)     │
│                                    │
│ 🌿 Tình trạng mùa vụ 2026        │
│    Trái đếm: 45 (thủ công) | 42 (AI)│
│    Sức khỏe: Tốt                  │
│                                    │
│ 📊 Thông tin cây                  │
│    Giống: Ri6                     │
│    Khu vực: Khu A                 │
│    Ngày trồng: 15/03/2020        │
│    Chiều cao: 5.2m               │
│    Đường kính: 35cm              │
│    GPS: 12.965, 108.107 (±3m)    │
│                                    │
│ 🌱 Chăm sóc                      │
│    Bón phân: 20/01/2026          │
│    Tỉa cành: 05/11/2025         │
│                                    │
│ 📋 Custom Fields                  │ ← Extensible fields
│    Cần tỉa cành: Có             │
│    Ghi chú tưới nước: ...        │
└───────────────────────────────────┘
```

**Chỉnh sửa cây — business rules:**
- **Cập nhật số trái**: Lưu vào `seasonalStats[selectedSeasonYear].manualFruitCount`
- **Cờ "Cần chú ý"**: Toggle `needsAttention` → hiển thị icon cảnh báo cam
- **Cập nhật GPS thủ công — Coordinates Guard:**
  ```
  Tính khoảng cách (Haversine) giữa tọa độ cũ và mới:
    < 5m  → Cho phép lưu tự động
    5-30m → Dialog xác nhận: "Tọa độ mới lệch X mét. Xác nhận?"
    > 30m → CHẶN: "Không thể dịch chuyển > 30m" (trừ super_admin)
  ```

---

### 5.5 `/zones` — Quản Lý Khu Vực

**View mode (tất cả users):**
- Danh sách zones: tên, mã, diện tích (ha), số cây, trạng thái
- Nút "Xem vị trí" → chuyển sang `/map` và highlight zone

**Edit mode (`/admin-zones`, chỉ owner/admin):**
- Vẽ polygon trên bản đồ bằng cách click các đỉnh
- **Tính diện tích real-time:**
  ```
  1. Chuyển tọa độ GPS → hệ phẳng UTM (gần đúng):
     x = (lng × π/180) × R × cos(lat_center)
     y = (lat × π/180) × R
  2. Công thức Shoelace:
     Area = |Σ(x_i × y_{i+1} - x_{i+1} × y_i)| / 2
  3. Chuyển sang Hecta: / 10000
  ```
- **Auto-assign zone cho cây**: Khi tạo cây mới, chạy **ray-casting** (point-in-polygon) để tự động gán `zoneCode`

---

### 5.6 `/money` — Quản Lý Đầu Tư & Chi Phí

**2 chế độ xem:**
- **📋 Danh sách**: Các khoản chi theo thời gian, lọc theo category
- **📊 Thống kê**: Biểu đồ tổng chi phí, breakdown theo category, trend 12 tháng

**Categories:** Phân bón, Thuốc BVTV, Công cụ, Lao động, Khác

**Form nhập chi phí:**
```
┌────────────────────────────────┐
│ Số tiền: [___________] VNĐ    │
│ Danh mục: [Phân bón ▼]        │
│ Chi tiết: [NPK 16-16-8]       │
│ Ngày: [dd/mm/yyyy]            │
│ Số lượng: [10] Đơn vị: [Bao]  │
│ Đơn giá: [250,000]            │
│ 📷 Ảnh hóa đơn: [Chọn ảnh]   │
│ Ghi chú: [___________]        │
│          [Hủy]  [Lưu]         │
└────────────────────────────────┘
```

**So sánh mùa vụ:**
- Tổng chi phí mùa này vs mùa trước
- % tăng/giảm kèm biểu đồ xu hướng tháng
- Đọc investments theo `date` thuộc year nào → gom vào season tương ứng

---

### 5.7 `/admin` — Super Admin Panel

**Tabs:**
1. **Dashboard**: Thống kê tổng hệ thống (users, farms, trees, photos)
2. **Thành viên**: CRUD users, gán farm, phân quyền
3. **Nông trại**: CRUD farms, gán owner
4. **Quyền hạn**: Ma trận phân quyền (Owner/Manager/Worker/Viewer × permissions)
5. **Hệ thống**: Cache management, Firestore sync status, system config

---

### 5.8 `/camera` — Chụp Ảnh AI

**Workflow:**
1. Mở camera (rear facing)
2. Chụp ảnh → hiển thị preview
3. Chọn cây liên kết (từ danh sách hoặc auto-detect nearby)
4. Chọn loại ảnh: general / health / fruit_count
5. Upload → nén → Firebase Storage
6. (Future) Gửi đến AI service → đếm trái / phát hiện bệnh

---

## 6. Hệ Thống Niên Vụ (Season Management) ⭐

### 6.1 Concept
Sầu riêng thu hoạch theo mùa vụ hàng năm. Mỗi farm có danh sách seasons (e.g., [2024, 2025, 2026]). User chọn niên vụ hiện hành qua dropdown ở Navigation. Khi chuyển niên vụ, toàn bộ dữ liệu hiển thị thay đổi theo.

### 6.2 Kích hoạt niên vụ mới (thủ công, KHÔNG tự động theo lịch)
```
1. Owner/Manager chọn "➕ Niên vụ mới..." trong dropdown
2. Nhập năm (e.g., 2026) → validate: 2000 < year < 2100
3. Hệ thống:
   a. Thêm 2026 vào farm.seasons[]
   b. Set farm.currentSeasonYear = 2026
   c. Set context selectedSeasonYear = 2026
4. Dữ liệu hiển thị tự động reset cho mùa mới:
   - Tree: seasonalStats[2026] = { manualFruitCount: 0, aiFruitCount: 0, healthStatus: 'Good' }
   - Photos: chỉ hiện ảnh có seasonYear === 2026
   - Investments: lọc theo year
```

### 6.3 Xem lại lịch sử
User chọn năm cũ (2025) trong dropdown → toàn bộ dashboard/map/trees/photos hiển thị data của 2025. Dữ liệu cũ **KHÔNG BAO GIỜ bị ghi đè**.

### 6.4 Photo season tagging
- Khi chụp ảnh: tự động gán `photo.seasonYear = selectedSeasonYear`
- Gallery: hiển thị badge "Mùa 2026" (xanh) vs "Mùa 2025" (xám)
- Filter tabs: Tất cả | Mùa 2026 | Mùa 2025

---

## 7. Offline & Sync Architecture

### 7.1 Firestore Offline
- Dùng `persistentLocalCache` + `persistentMultipleTabManager`
- Firestore tự cache data locally → app hoạt động khi offline
- Mutations queued → sync khi online

### 7.2 Offline Photo Queue (IndexedDB)
```
1. User chụp ảnh khi OFFLINE
2. Blob ảnh → nén (compressImageSmart) → lưu vào IndexedDB ('offline-photos-db')
3. Khi online:
   a. Service Worker detect 'online' event
   b. Đọc pending photos từ IndexedDB
   c. Upload lên Firebase Storage
   d. Tạo photo document trong Firestore
   e. Xóa khỏi IndexedDB
   f. Thông báo: "Đã đồng bộ X ảnh"
```

### 7.3 Photo Compression Settings

| Photo Type | Max Resolution | Quality | Target Size |
|---|---|---|---|
| `general` | 1280×720 | 75% | 500KB |
| `health` | 1920×1080 | 85% | 1MB |
| `fruit_count` | 2048×1536 | 90% | 1.5MB |

Thuật toán: Canvas API → iteratively reduce quality (step -0.1) cho đến khi ≤ target size hoặc quality ≤ 0.1.

---

## 8. Thuật Toán & Công Thức

### 8.1 Haversine Distance (tính khoảng cách 2 điểm GPS)
```
d = 2R × arcsin(√(sin²(Δφ/2) + cos(φ₁)×cos(φ₂)×sin²(Δλ/2)))
R = 6371000 mét
```
Dùng cho: Coordinates Guard, nearby tree detection, distance display.

### 8.2 Point-in-Polygon (Ray Casting)
Kiểm tra tọa độ cây có nằm trong polygon zone không. Dùng `@turf/boolean-point-in-polygon`.

### 8.3 Polygon Area (Shoelace + UTM projection)
```
x_i = (lng_i × π/180) × R × cos(lat_center)
y_i = (lat_i × π/180) × R
Area = |Σ(x_i × y_{i+1} - x_{i+1} × y_i)| / 2 / 10000  (ha)
```

### 8.4 GPS Burst Calibration
```
samples = 4, interval = 500ms
filtered = samples.filter(s => s.accuracy <= 15m)
result = {
  lat: mean(filtered.map(s => s.lat)),
  lng: mean(filtered.map(s => s.lng)),
  accuracy: min(filtered.map(s => s.accuracy))
}
```

---

## 9. UX Constraints (QUAN TRỌNG!)

### 9.1 Thiết kế cho nông dân
- **Nút lớn**: min 48×48px touch target
- **Font lớn**: base 16px, headings 20-24px
- **Ít gõ bàn phím**: dùng dropdown, chip selector, +/- buttons cho số lượng
- **Tương phản cao**: text đen trên nền sáng, dùng ngoài trời nắng
- **Một tay**: tất cả controls quan trọng ở nửa dưới màn hình

### 9.2 Không dùng `alert()`, `prompt()`, `window.confirm()`
→ Thay bằng **Toast**, **ConfirmDialog**, **InputDialog** components. Lý do: block main thread, không hoạt động đúng trên PWA/iOS.

### 9.3 Bottom Navigation
- z-index phải thấp hơn modal/bottomsheet
- Không được che nút "Chụp ảnh" hoặc floating action buttons

### 9.4 GPS Accuracy Visualization
- Hiển thị accuracy circle quanh user marker trên map
- Color code: 🟢 < 5m, 🟠 5-15m, 🔴 > 15m
- Hiển thị text: "GPS: ±8m" ở status bar

### 9.5 Ngôn ngữ
- UI hoàn toàn tiếng Việt
- Vietnamese number format: `1.250.000 ₫` (dấu chấm phân cách nghìn)
- Date format: `dd/mm/yyyy` hoặc `toLocaleDateString('vi-VN')`

### 9.6 Tông màu
- Primary: Xanh lá organic (Emerald/Teal, KHÔNG dùng #00ff00)
- Accent: Tông đất nhẹ (Slate, Amber cho harvest)
- Bo tròn lớn: `rounded-2xl`, `rounded-3xl`
- Đổ bóng mờ nhẹ cho chiều sâu

---

## 10. Logging & Error Handling

### 10.1 Logger
```typescript
// Dùng logger thay cho console.log EVERYWHERE
import logger from '@/lib/logger'
logger.debug('Đang tải trees...')   // Ẩn trong production
logger.info('Đã tải 150 cây')       // Ẩn trong production
logger.warn('GPS accuracy thấp')    // Luôn hiện
logger.error('Firestore error', e)  // Luôn hiện
```

### 10.2 Error boundaries
- Wrap mỗi page trong ErrorBoundary component
- Hiển thị fallback UI thân thiện thay vì crash

### 10.3 Network resilience
- Wrap Firestore calls trong `withTimeout(10s)` + `withRetry(3 attempts)`
- Hiển thị trạng thái offline/online cho user

---

## 11. Performance Targets

| Metric | Target |
|---|---|
| First Contentful Paint | < 1.5s |
| Auth + Farm load (cached) | < 1s |
| Map render (500 trees) | < 2s |
| Tree creation | < 2s |
| Photo compression | < 1s/photo |
| Photo upload (4G) | < 3s/photo |
| Tree list scroll (1000 items) | 60fps |

---

## 12. PWA Requirements

- `manifest.json`: name, icons, theme_color, background_color, start_url
- Service Worker: cache app shell + Leaflet tiles + Leaflet icons
- **Leaflet icons must be bundled locally** (NOT from CDN) để Service Worker cache được
- IndexedDB: offline photo queue
- `display: standalone` cho fullscreen mobile experience

---

## 13. Testing Strategy

### 13.1 Unit tests (Jest/Vitest)
- `date-utils.ts` — convertToDate edge cases
- `geo-utils.ts` — Haversine, point-in-polygon
- `photo-compression.ts` — compression settings
- Auth permission helpers

### 13.2 Component tests (React Testing Library)
- Toast, ConfirmDialog, InputDialog
- AuthGuard redirect behavior

### 13.3 E2E tests (Playwright)
- Login flow
- Farm selection
- Map page load
- Tree CRUD
- On-Farm Work Mode
- Investment tracking

---

## 14. Environment Variables

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# App
NEXT_PUBLIC_SITE_URL=https://farm-manager.vercel.app
NEXT_PUBLIC_ENABLE_LOGS=false          # Enable debug logs in production

# ⚠️ KHÔNG có NEXT_PUBLIC_ADMIN_UID hay NEXT_PUBLIC_ADMIN_EMAIL!
# Admin check phải qua Firebase Custom Claims.
```

---

## 15. Checklist Trước Khi Ship

- [ ] Firestore rules: KHÔNG CÓ catch-all `match /{document=**}`
- [ ] Admin check: qua Custom Claims, KHÔNG hard-code UID
- [ ] ESLint: KHÔNG `ignoreDuringBuilds: true`
- [ ] TypeScript: KHÔNG `any` type (dùng proper interfaces)
- [ ] Logging: dùng `logger`, KHÔNG `console.log` trực tiếp
- [ ] UI feedback: Toast/Dialog, KHÔNG `alert()`/`prompt()`
- [ ] `convertToDate`: chỉ 1 implementation duy nhất trong `date-utils.ts`
- [ ] Leaflet icons: bundled trong `/public/`, không CDN
- [ ] `playwright` trong `devDependencies`, KHÔNG `dependencies`
- [ ] Không có files rác (.swp, Trash/, archive/)
- [ ] Mỗi component ≤ 300 LOC (tách nếu lớn hơn)
- [ ] Responsive: test trên iPhone SE (320px width)
- [ ] Offline: test tạo cây + chụp ảnh khi airplane mode

---

## Appendix A — FullscreenTreeShowcase: Đặc Tả Chi Tiết Trang Quan Trọng Nhất ⭐⭐⭐

> Đây là trang **được sử dụng nhiều nhất** trên app. Nông dân mở trang này hàng chục lần/ngày khi đi kiểm tra vườn: xem ảnh, đếm trái, ghi chú, cập nhật GPS. Thiết kế cần hoàn hảo cho **một tay thao tác, ngoài trời nắng, thiết bị Android giá rẻ**.

### A.1 Tổng Quan

| Thuộc tính | Giá trị |
|---|---|
| **Component hiện tại** | `FullscreenTreeShowcase.tsx` — 1,120 LOC (cần tách) |
| **Cách mở** | Click tree marker trên map, click tree card trong list |
| **Hiển thị** | Fullscreen overlay (`fixed inset-0 z-[50000]`) |
| **Đóng** | Nút X góc trái, phím Escape |
| **Props** | `tree: Tree`, `isOpen: boolean`, `onClose()`, `onSaved(tree)` |
| **Data sources** | Auth Context, Firestore (trees, photos, notes, seasons, investments, auditLogs), Firebase Storage |

### A.2 Component Hierarchy (Phiên bản mới đề xuất)

```
FullscreenTreeShowcase/
├── TreeShowcaseHeader.tsx          ← Fixed top bar
│   ├── Close button (←)
│   ├── Tree name + zone
│   ├── "Xem vị trí" button (→ /map?highlightTree={id})
│   └── "Chia sẻ" button
│
├── ImageGallerySection.tsx         ← Photo management (tách từ ImageGallery.tsx 1,336 LOC)
│   ├── PhotoGrid.tsx               ← Grid thumbnail layout
│   ├── PhotoViewer.tsx             ← Fullscreen zoom/pan (pinch-to-zoom, swipe)
│   ├── PhotoUploader.tsx           ← Camera + gallery + compression
│   ├── SeasonFilterTabs.tsx        ← "Tất cả | 2026 | 2025"
│   └── PhotoDeleteConfirm.tsx      ← Delete confirmation dialog
│
├── TreeNoteSystem.tsx              ← Collaborative notes (363 LOC — OK size)
│   ├── NoteInput (text area + type selector + submit)
│   └── NoteTimeline (real-time Firestore listener)
│
├── DurianSeasonCard.tsx            ← Season lifecycle status
│
├── FruitCountCard.tsx              ← Số lượng trái + nút Lưu ⭐ CỐT LÕI
│
├── TreeInfoCard.tsx                ← Thông tin cây (variety, health, zone, dates)
│   ├── GPSEditor.tsx               ← Inline GPS editing + Coordinates Guard
│   ├── TreeStatusEditor.tsx        ← Tree status picker (Non/Trưởng thành/Già)
│   └── NeedsAttentionToggle.tsx    ← Toggle "Cần chú ý"
│
├── SeasonInvestmentCard.tsx        ← So sánh chi phí mùa vụ
│
├── TreeTimeline.tsx                ← Activity/audit log (384 LOC — OK size)
│
└── ShareTreeModal.tsx              ← Share via link/QR (305 LOC — OK size)
```

### A.3 Layout & Scroll Structure

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (FIXED top, backdrop-blur, border-bottom)            │
│ ← [Tên cây / Zone]                    [📍 Vị trí] [📤 Chia sẻ] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ╔═══════════════════════════════════════════════════════╗   │
│  ║  📸 IMAGE GALLERY                                     ║   │
│  ║  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                    ║   │
│  ║  │     │ │     │ │     │ │     │   (grid 2-3 cols)   ║   │
│  ║  └─────┘ └─────┘ └─────┘ └─────┘                    ║   │
│  ║  [📷 Chụp ảnh]  [➕ Thêm ảnh]                        ║   │
│  ║  Tab: [Tất cả] [Mùa 2026🟢] [Mùa 2025⚪]           ║   │
│  ╚═══════════════════════════════════════════════════════╝   │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │  ← SCROLLABLE
│  │ 📝 GHI CHÚ NHÓM                              [5] [+] │   │
│  │    Timeline: avatar + note + type badge + time        │   │
│  │    Input: [textarea] + type selector + submit          │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 🌿 TRẠNG THÁI MÙA VỤ                                │   │
│  │    Icon + phase name + description                     │   │
│  │    Mùa trước (2025): 120 trái                         │   │
│  │    Mùa hiện tại (2026): 45 trái                       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 🥭 SỐ LƯỢNG TRÁI                          ⭐ CỐT LÕI │   │
│  │    ┌────────────────────────────────────────────────┐  │   │
│  │    │            [    45    ]                         │  │   │  ← font 3xl, center
│  │    │         45 trái (niên vụ 2026)                 │  │   │
│  │    └────────────────────────────────────────────────┘  │   │
│  │    [ ✅ Lưu số lượng ]                  (full width)  │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 📊 THÔNG TIN CÂY                                     │   │
│  │    Giống cây: Ri6           Tình trạng: Tốt           │   │
│  │    Khu vực: Khu A           Sức khỏe: [ghi chú]       │   │
│  │    GPS: 12.965, 108.107     [✏️ Sửa GPS]              │   │
│  │    Trạng thái: 🌱 Cây Non  [Sửa]                     │   │
│  │    ──────────────────────────────────────              │   │
│  │    Cần chú ý: Không         [Đánh dấu]               │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 💰 CHI PHÍ ĐẦU TƯ THEO MÙA                          │   │
│  │    Mùa trước (2025): 15.500.000 VNĐ  (23 khoản)      │   │
│  │    Mùa này (2026): 8.200.000 VNĐ     (12 khoản)      │   │
│  │    So với mùa trước: -7.300.000 VNĐ  (-47.1%)        │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 🕐 LỊCH SỬ THAY ĐỔI                                 │   │
│  │    ● Bạn • 2p trước: Số lượng trái 40 → 45           │   │
│  │    │                                                   │   │
│  │    ● Minh • 1h trước: Thêm ảnh sức khỏe              │   │
│  │    │                                                   │   │
│  │    ● Admin • 3 ngày: GPS 12.965 → 12.966             │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  (padding bottom 24px for safe area)                         │
└─────────────────────────────────────────────────────────────┘
```

### A.4 State Management

```typescript
// Main component state
interface TreeShowcaseState {
  // Fruit counting
  count: number                    // Current fruit count input
  saving: boolean                  // Save in progress

  // Season data
  lastSeason: {                    // From /farms/{farmId}/seasons collection
    name?: string
    perTreeCount: number
    endDate?: Date
  } | null
  seasonLoading: boolean

  // Tree status editing
  needsAttention: boolean
  treeStatus: 'young' | 'mature' | 'old'
  editingStatus: boolean

  // GPS editing
  editingGPS: boolean
  updatingGPS: boolean
  newLatitude: string
  newLongitude: string
  gpsError: string
  confirmLargeDistance: boolean     // Checkbox for 5-30m distance

  // Modals
  showShareModal: boolean
}
```

**Khởi tạo count theo season:**
```typescript
// Khi tree hoặc selectedSeasonYear thay đổi:
const seasonal = tree.seasonalStats?.[selectedSeasonYear]
const count = seasonal !== undefined
  ? seasonal.manualFruitCount
  : (selectedSeasonYear === currentYear ? tree.manualFruitCount : 0)
```
→ Nghĩa là: mỗi niên vụ có count riêng. Nếu chưa có data cho season đó, bắt đầu từ 0.

### A.5 Data Flow Chi Tiết

#### A.5.1 Lưu số trái (handleSave)

```
User nhập count → nhấn "Lưu số lượng"
     │
     ▼
1. Validate: user logged in? farm selected? tree exists?
     │
     ▼
2. Build seasonalStats update:
   {
     ...tree.seasonalStats,
     [selectedSeasonYear]: {
       manualFruitCount: count,
       aiFruitCount: existing || 0,
       healthStatus: existing || tree.healthStatus,
       notes: existing || '',
       updatedAt: new Date()
     }
   }
     │
     ▼
3. Nếu selectedSeasonYear === farm.currentSeasonYear:
   → CŨNG sync tree.manualFruitCount (root field)
     │
     ▼
4. updateTree(farmId, treeId, userId, updates)
   → Firestore write + AuditLog tự động
     │
     ▼
5. onSaved({...tree, ...updates}) → parent component cập nhật local state
     │
     ▼
6. Toast: "Số lượng trái đã được cập nhật" ✅
```

#### A.5.2 Toggle "Cần chú ý"
```typescript
await updateTree(farmId, treeId, userId, { needsAttention: !current })
// → Toast thành công
// → Hiển thị icon cảnh báo cam trên tree card + map marker
```

#### A.5.3 Cập nhật treeStatus
```typescript
// UI: 3 nút grid: [🌱 Cây Non] [🌳 Trưởng Thành] [🌲 Cây Già]
// Chọn → xác nhận → updateTree(farmId, treeId, userId, { treeStatus })
```

#### A.5.4 GPS Editing — Coordinates Guard

```
User nhấn "Sửa GPS"
     │
     ▼
Hiển thị form inline: [Vĩ độ] [Kinh độ] + [Lấy vị trí hiện tại]
     │
     ├── "Lấy vị trí hiện tại" → iosOptimizedGPS.getCurrentPosition()
     │   → Điền tọa độ mới vào form
     │
     ▼
User nhấn "Lưu GPS"
     │
     ▼
1. Validate tọa độ: -90 ≤ lat ≤ 90, -180 ≤ lon ≤ 180
     │
     ▼
2. Tính khoảng cách Haversine với tọa độ cũ:
     │
     ├── distance < 5m  → ✅ Lưu ngay
     │
     ├── 5m ≤ distance ≤ 30m →
     │   ⚠️ Hiển thị cảnh báo + checkbox:
     │   "Vị trí mới lệch X mét. Tôi xác nhận vị trí này chính xác."
     │   → User tick checkbox → Cho phép lưu
     │
     └── distance > 30m →
         🚫 CHẶN HOÀN TOÀN:
         "Không cho phép thay đổi > 30m để bảo toàn vị trí cây."
         (Trừ super_admin)
     │
     ▼
3. updateTree(farmId, treeId, userId, { latitude, longitude, gpsAccuracy: 0 })
     │
     ▼
4. Toast: "Tọa độ GPS đã được cập nhật" ✅
```

### A.6 Sub-Component Specs

#### A.6.1 ImageGallery (Tách thành 5 files)

**Chức năng chính:**
- Load ảnh từ 2 nguồn: **Firestore photos collection** (chính) + **Firebase Storage pattern matching** (legacy fallback)
- Hiển thị grid ảnh 2-3 cột responsive
- Click ảnh → fullscreen viewer với **pinch-to-zoom** (mobile) + **mouse wheel zoom** (desktop) + **drag pan**
- Double-tap → toggle zoom 1x ↔ 2.5x
- Swipe left/right → next/prev ảnh
- Swipe down → đóng viewer
- Arrow keys → next/prev (desktop)

**Upload ảnh:**
1. Nút "Chụp ảnh" → `<input capture="environment" accept="image/*">`
2. Nút "Thêm ảnh" → `<input accept="image/*">` (từ thư viện)
3. Chọn file → hiện modal chọn photo type: general / health / fruit_count
4. Nén bằng `compressImageSmart(file, photoType)`
5. Upload → Firebase Storage path: `farms/{farmId}/trees/{treeId}/photos/{timestamp}/{filename}`
6. Tạo photo document trong Firestore
7. Log audit event: `PHOTO_UPLOADED`
8. Refresh gallery + hiện badge "✨ Mới"

**Season filter:**
- Tabs: "Tất cả" | "Mùa 2026" (xanh) | "Mùa 2025" (xám)
- Lọc theo `photo.seasonYear` hoặc `photo.timestamp.getFullYear()`

**Xóa ảnh:** (Chỉ owner/manager có quyền)
1. Nút 🗑️ trên photo → Confirm dialog
2. Xóa Firestore doc → xóa Storage file → refresh gallery

**Cache:**
- Storage images cache bằng `Map<string, images>` trong memory
- Cache key: `${treeId}-${qrCode}-${farmId}`

#### A.6.2 TreeNoteSystem

**Chức năng:**
- Real-time notes: Firestore `onSnapshot` listener
- 4 loại note: 📘 Info, ⚠️ Warning, ✅ Success, 🚨 Urgent
- @Mentions: nhập `@username` → highlight + (future) notification
- Timeline hiển thị: avatar + tên + relative time + note content + type badge
- Max 50 notes hiển thị

**Firestore path:** `/farms/{farmId}/trees/{treeId}/notes/{noteId}`

**Schema:**
```typescript
{
  content: string
  author: { uid, name, email }
  type: 'info' | 'warning' | 'success' | 'urgent'
  mentions?: string[]
  timestamp: serverTimestamp()
}
```

#### A.6.3 DurianSeasonStatus

**Logic phân phase dựa trên `monthsSinceHarvest`:**

| Months since harvest | Phase | Icon | UI color |
|---|---|---|---|
| < 0 (still in season) | `current_season` | 🥭 | orange |
| 0-3 | `post_harvest` | ✂️ | blue |
| 3-9 | `growing` | 🌿 | green |
| 9-12 | `flowering` | 🌸 | purple |
| 12+ | `new_season` | 🥭 | orange |
| No data | `new_tree` | 🌱 | gray |

**Data source:** Query `/farms/{farmId}/seasons`, `orderBy('endDate', 'desc'), limit(1)` → lấy `perTreeBreakdown[treeId]` để có fruit count mùa trước.

#### A.6.4 SeasonInvestmentCard

**Chức năng:** So sánh chi phí đầu tư giữa mùa hiện tại và mùa trước.

**Data query:**
```typescript
// Mùa hiện tại:
query(investmentsRef, 
  where('date', '>=', new Date(`${year}-01-01`)),
  where('date', '<=', new Date(`${year}-12-31`))
)
// Mùa trước: tương tự cho year-1
```

**Hiển thị:**
```
┌──────────────┬──────────────┐
│ Mùa trước    │ Mùa này      │
│ (2025)       │ (2026)       │
│ 15.5M VNĐ   │ 8.2M VNĐ    │
│ 23 khoản    │ 12 khoản    │
└──────────────┴──────────────┘
So với mùa trước: -7.3M VNĐ (-47.1%) 🟢
```

- Tăng chi phí → badge **đỏ** + dấu +
- Giảm chi phí → badge **xanh** + dấu -

#### A.6.5 TreeTimeline (Activity Log)

**Chức năng:** Hiển thị lịch sử thay đổi (audit log) của cây.

**Data source:** `/auditLogs` collection, `where('resourceId', '==', treeId)`, `orderBy('timestamp', 'desc')`, `limit(20)`

**Hiển thị:** Timeline dọc với icon + tên user + relative time + action + old→new values

**Action types + icons:**
| Action | Icon | Color | Description (VN) |
|---|---|---|---|
| GPS update | 📍 | blue | "Cập nhật vị trí" |
| Photo upload | 📸 | purple | "Thêm ảnh {type}" |
| Fruit count | 📊 | green | "Số lượng trái: 40 → 45" |
| Needs attention | ⚠️ | orange | "Cần chú ý: Không → Có" |
| Status change | ✅ | indigo | "Trạng thái: Cây Non → Trưởng Thành" |
| General update | ✏️ | gray | Field name + old → new |

**User name resolution:** Load from `/users/{userId}` collection, cache in-memory Map.

#### A.6.6 ShareTreeModal

**Chức năng:**
- Generate shareable link/text cho cây
- Bao gồm: tên cây, giống, khu vực, số trái, GPS coordinates
- Copy to clipboard hoặc share via native Share API
- (Optional) Generate QR code linking to tree

### A.7 UX Recommendations cho Rebuild

#### A.7.1 Tối ưu cho nông dân

1. **Fruit count là ưu tiên #1**: Nút Lưu phải luôn visible (sticky bottom hoặc prominent position). Nông dân đi kiểm tra 50-200 cây/ngày, mỗi cây cần nhập số trái nhanh nhất có thể.

2. **Nút +/- thay vì input number**: Thay input gõ bàn phím bằng nút ➕/➖ lớn (48x48px) để tăng/giảm count. Vẫn cho phép tap vào number để gõ trực tiếp.

3. **Swipe navigation giữa các cây**: Cho phép swipe trái/phải để chuyển sang cây tiếp theo/trước đó trong danh sách, thay vì phải đóng → mở lại.

4. **Skeleton loading**: Mỗi section có skeleton riêng, load độc lập. Không block toàn bộ page vì 1 section chậm.

5. **Optimistic UI**: Khi nhấn "Lưu", update UI ngay → sync Firestore background → rollback nếu lỗi.

#### A.7.2 Performance

1. **Lazy load sections**: ImageGallery, TreeTimeline, SeasonInvestmentCard chỉ load khi scroll đến (Intersection Observer).

2. **Image lazy loading**: Grid thumbnails dùng `loading="lazy"` + placeholder blur.

3. **Debounce save**: Nếu user nhập count liên tục, debounce 500ms trước khi enable nút Lưu.

4. **Photo cache**: Cache Storage images trong memory Map, clear khi tree changes.

5. **Memoize calculations**: `useMemo` cho filtered images, available seasons, display images.

#### A.7.3 Kiến trúc code

1. **Tách component**: Max **200-300 LOC** mỗi file. Component hiện tại 1,120 LOC → tách thành 8-10 files.

2. **Custom hooks**: Extract logic vào hooks:
   - `useTreeFruitCount(tree, seasonYear)` → { count, setCount, save, saving }
   - `useTreeGPS(tree)` → { editingGPS, coordinates, validate, save }
   - `useDurianSeason(farmId, treeId)` → { lastSeason, seasonStatus, loading }
   - `useSeasonInvestment(farmId, seasonYear)` → { current, last, comparison }

3. **Không trộn concerns**: Component chỉ render UI. Logic business nằm trong hooks/services.

4. **Error boundaries**: Wrap mỗi card trong ErrorBoundary riêng → 1 card crash không ảnh hưởng toàn trang.

### A.8 Vấn Đề Cần Fix Trong Bản Mới

| # | Vấn đề hiện tại | Giải pháp |
|---|---|---|
| 1 | `treeStatus` dùng mixed language: `'Young Tree'` + `'Cây Non'` | Dùng enum `'young' | 'mature' | 'old'` + `LABELS` map |
| 2 | Hardcode farmId fallback: `'F210C3FC-...'` trong ImageGallery | Luôn lấy từ `tree.farmId` hoặc `currentFarm.id` |
| 3 | ~60 `console.log` trong ImageGallery | Dùng `logger.debug()` |
| 4 | `data as any` khi parse season perTreeBreakdown | Proper typing với interface |
| 5 | GPS edit dùng `alert()` cho validation | Dùng inline error message (đã fix) |
| 6 | `SeasonInvestmentCard` query Firestore trực tiếp trong component | Chuyển sang service layer hoặc custom hook |
| 7 | Photo upload viết trực tiếp Firestore trong component (L552-670) | Chuyển sang `PhotoService.uploadForTree()` |
| 8 | `convertToDate` logic lặp trong `getDurianSeasonStatus` | Import từ `date-utils.ts` |
| 9 | `handleSave` check permissions nhưng không dùng kết quả (L472-485) | Xóa dead code hoặc dùng để block save |
| 10 | Không có loading skeleton cho TreeNoteSystem + TreeTimeline | Thêm skeleton states |

---

*Tài liệu này tổng hợp từ phân tích codebase hiện tại + toàn bộ docs dự án. Phiên bản: 2026-05-26.*
