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
| Database | **PocketBase** (SQLite, relational, real-time sync, self-hosted) |
| Auth | **PocketBase Authentication** (Built-in users auth, Email/Password) |
| Storage | **PocketBase File Storage** (Tự động lưu theo record file fields, Local/S3-compatible) |
| Maps | **MapLibre GL JS** + **react-map-gl** + **OpenStreetMap** + **Esri Satellite** |
| Geo | **@turf/turf** (khoảng cách, point-in-polygon, diện tích) |
| PWA | Service Worker + IndexedDB (Offline Read Cache & Mutation Queue) |
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
                          │ PocketBase SDK (SSE / HTTP)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    POCKETBASE BACKEND (Self-hosted)          │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────┐     │
│  │ Auth       │  │ Collections │  │ Local/S3 Storage │     │
│  │ (users)    │  │ (DB tables) │  │ (File Fields)    │     │
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
│   ├── UnifiedMap.tsx           # MapLibre GL JS map (main)
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
│   ├── ImageGallery.tsx         # Photo grid container (manages uploads & filters)
│   ├── DeleteConfirmModal.tsx   # Modal for photo deletion confirmation
│   ├── PhotoTypeModal.tsx       # Selection modal for photo types (general/health/fruit_count)
│   └── PhotoViewerModal.tsx     # Fullscreen Zoom/Pan Image Viewer (uses Portal)
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
├── pocketbase.ts                # PocketBase client SDK init + config
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
├── storage-utils.ts             # PocketBase File URL/upload helpers
├── offline-sync.ts              # IndexedDB cache + write queue
├── gps-service.ts               # GPS tracking + burst calibration
├── admin-service.ts             # Admin-only operations
├── normalization.ts             # Chuẩn hoá giống cây & tên khu vực
├── modal-z-index.ts             # Hệ thống quản lý z-index modal phân tầng
├── photo-utils.ts               # Trích xuất timestamp và định dạng ngày chụp
└── hooks/
    └── use-image-zoom-pan.ts    # Hook xử lý cử chỉ zoom/pan hình ảnh
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
- Check trường `role === 'super_admin'` trên auth record `users` của PocketBase.
- Hoặc check bảng `user_roles` để xác định quyền hạn cụ thể (ví dụ: `role_type === 'super_admin'`).

---

## 4. Database Schema (PocketBase Relational)

### 4.1 Collection hierarchy (Flat Relational Model)
PocketBase không có subcollection lồng nhau như Firestore. Dữ liệu được lưu trữ dưới dạng các collection phẳng (flat tables) và liên kết với nhau bằng các trường `relation` (Foreign Keys). Tất cả các collection đều sử dụng định dạng ID 15 ký tự chữ-số ngẫu nhiên của PocketBase.

```
users (Auth collection)
  ▲
  │ (relation: user)
user_farm_access ──(relation: farm)──► farms (farms0000000000)
                                        ▲      ▲
                      (relation: farm)  │      │ (relation: farm)
                                      trees  zones
                                        ▲
                      (relation: tree)  │
                     ┌──────────────────┴──────────────────┐
                     │                                     │
                tree_notes                              photos
```

### 4.2 Schema: User (Auth Collection: `users`)

```typescript
interface User {
  id: string                 // PocketBase Auth UID (15 chars)
  username: string           // Tên đăng nhập
  email: string              // Email đăng ký (unique)
  verified: boolean          // Đã xác thực email
  display_name?: string      // Tên hiển thị
  phone_number?: string      // Số điện thoại
  role: 'user' | 'super_admin' // Vai trò hệ thống
  account_status: 'active' | 'suspended' | 'pending_verification'
  login_count: number        // Số lần đăng nhập
  last_login_at?: Date       // Lần đăng nhập cuối
  language: string           // 'vi-VN'
  timezone: string           // 'Asia/Ho_Chi_Minh'
  preferences?: any          // JSON cài đặt cá nhân
  created: Date              // Ngày tạo tài khoản
  updated: Date              // Ngày cập nhật tài khoản
}
```

### 4.3 Schema: Farm (Base Collection ID: `farms0000000000`, Name: `farms`)

```typescript
interface Farm {
  id: string                 // PocketBase ID (15 chars)
  name: string               // "Trang trại Bảo Lộc"
  owner_name?: string        // Tên chủ sở hữu
  farm_type?: 'personal' | 'commercial' | 'cooperative' // Phân loại
  status?: 'active' | 'inactive' | 'archived' // Trạng thái
  total_area?: number        // Diện tích (Hecta)
  center_latitude?: number   // Tâm bản đồ
  center_longitude?: number
  boundary_coordinates?: any  // JSON array tọa độ đa giác ranh giới
  seasons: number[]          // [2024, 2025, 2026] — Danh sách niên vụ
  current_season_year: number // Niên vụ hiện hành
  is_active: boolean         // Trạng thái hoạt động
  created: Date
  updated: Date
}
```

### 4.4 Schema: Tree (Base Collection ID: `trees0000000000`, Name: `trees`) ⭐ QUAN TRỌNG NHẤT

```typescript
interface Tree {
  id: string                 // PocketBase ID (15 chars)
  farm: string               // Relation đến 'farms' (maxSelect: 1, cascade delete)
  name: string               // "Ri6-001" hoặc "Monthong Khu A Hàng 3"
  qr_code?: string           // QR code dán trên thân cây
  variety?: string           // "Ri6" | "Monthong" | "Musang King"
  zone_code?: string         // "KHU_A"
  tree_status?: 'young' | 'mature' | 'old' // Tuổi sinh trưởng
  health_status?: 'Excellent' | 'Good' | 'Fair' | 'Poor' // Trạng thái sức khỏe
  notes?: string
  health_notes?: string
  disease_notes?: string

  // GPS
  latitude: number
  longitude: number
  gps_accuracy?: number      // Sai số GPS (mét)

  // Fruit counting
  manual_fruit_count: number // Đếm bằng tay vụ hiện tại
  ai_fruit_count: number     // AI đếm từ ảnh vụ hiện tại
  ai_accuracy?: number       // Độ tin cậy AI
  last_count_date?: Date
  last_ai_analysis_date?: Date

  // Physical measurements
  tree_height?: number       // Chiều cao (mét)
  trunk_diameter?: number    // Đường kính thân (cm)

  // Care tracking
  planting_date?: Date
  fertilized_date?: Date     // Ngày bón phân gần nhất
  pruned_date?: Date         // Ngày tỉa cành gần nhất
  needs_attention: boolean   // Cần chú ý gấp

  // Season-specific data — LƯU LỊCH SỬ THEO TỪNG NĂM (Dạng JSON)
  seasonal_stats?: {
    [seasonYear: number]: {
      manualFruitCount: number
      aiFruitCount: number
      healthStatus: string
      notes?: string
      updatedAt: string
    }
  }
  custom_fields?: any        // Custom extensible fields dạng JSON
  created: Date
  updated: Date
}
```

### 4.5 Schema: Photo (Base Collection ID: `photos000000000`, Name: `photos`)

```typescript
interface Photo {
  id: string                 // PocketBase ID (15 chars)
  farm: string               // Relation đến 'farms' (maxSelect: 1, cascade delete)
  tree: string               // Relation đến 'trees' (maxSelect: 1, cascade delete)
  image_file: string         // Tên file ảnh (được upload và quản lý qua PocketBase file field)
  photo_type?: 'general' | 'health' | 'fruit_count'
  user_notes?: string
  season_year: number        // Niên vụ lúc chụp ảnh

  // Location
  latitude?: number
  longitude?: number
  altitude?: number

  // Image variants (Local/Cache path references)
  original_path?: string
  compressed_path?: string
  thumbnail_path?: string
  ai_ready_path?: string

  // Processing status
  uploaded_to_server: boolean
  server_processed: boolean
  needs_ai_analysis: boolean
  manual_fruit_count?: number
  total_local_size?: number

  timestamp: Date            // Thời điểm chụp thực tế
  created: Date
  updated: Date
}
```

**PocketBase Storage File URL structure:**
Ảnh được lưu trữ trực tiếp trên PocketBase server (Local hoặc S3-compatible). Client lấy URL của ảnh bằng API:
`pb.files.getUrl(photoRecord, photoRecord.image_file, { thumb: '100x100' })`
Đường dẫn vật lý trên server:
`pb_data/storage/{collectionId}/{recordId}/{fileName}`

### 4.6 Schema: Zone (Base Collection ID: `zones0000000000`, Name: `zones`)

```typescript
interface FarmZone {
  id: string                 // PocketBase ID (15 chars)
  farm: string               // Relation đến 'farms' (maxSelect: 1, cascade delete)
  name: string               // "Khu A"
  code: string               // "KHU_A"
  description?: string
  color?: string             // Mã màu Hex hiển thị ranh giới (ví dụ: "#3b82f6")
  color_data?: any           // JSON lưu trữ chi tiết màu RGBA
  area?: number              // Diện tích (Hecta)
  tree_count?: number        // Số lượng cây trong vùng
  is_active: boolean
  boundaries: Array<{        // Danh sách tọa độ đỉnh đa giác ranh giới
    latitude: number
    longitude: number
  }>
  notes?: string
  last_inspection_date?: Date
  needs_attention?: boolean
  created: Date
  updated: Date
}
```

### 4.7 Schema: Investment (Base Collection ID: `investm00000000`, Name: `investments`)

```typescript
interface Investment {
  id: string                 // PocketBase ID (15 chars)
  farm: string               // Relation đến 'farms' (maxSelect: 1, cascade delete)
  created_by_user?: string   // Relation đến auth 'users'
  amount: number             // Số tiền chi (VNĐ)
  category: string           // "Phân bón" | "Thuốc BVTV" | "Lao động" ...
  subcategory?: string       // Chi tiết: "NPK 16-16-8"
  date: Date                 // Ngày chi
  notes?: string
  quantity?: number          // Số lượng
  unit?: string              // "Bao" | "Kg" | "Lít" | "Ngày công" ...
  price_per_unit?: number    // Đơn giá
  tree_count?: number        // Số cây áp dụng
  is_recurring: boolean      // Lặp lại định kỳ
  recurring_period?: string  // "Hàng tháng" | "Hàng năm"
  images?: string[]          // Mảng file ảnh hóa đơn đính kèm (PocketBase file field, maxSelect: 10)
  created: Date
  updated: Date
}
```

### 4.8 Schema: Tree Note (Base Collection ID: `treenotes00000`, Name: `tree_notes`)

```typescript
interface TreeNote {
  id: string                 // PocketBase ID (15 chars)
  farm: string               // Relation đến 'farms' (cascade delete)
  tree: string               // Relation đến 'trees' (cascade delete)
  author?: string            // Relation đến auth 'users'
  author_name: string        // Snapshot tên tác giả lúc viết
  author_email: string       // Snapshot email tác giả lúc viết
  content: string            // Nội dung ghi chú
  type: 'info' | 'warning' | 'success' | 'urgent'
  mentions?: string[]        // Danh sách user ID được tag tên
  is_edited: boolean         // Đã sửa đổi
  edited_at?: Date
  created: Date              // Thời điểm tạo (PocketBase system auto field)
  updated: Date
}
```

### 4.9 Schema: User Farm Access (Base Collection ID: `userfar00000000`, Name: `user_farm_access`)

```typescript
interface UserFarmAccess {
  id: string                 // PocketBase ID (15 chars)
  user: string               // Relation đến auth 'users' (cascade delete)
  farm: string               // Relation đến 'farms' (cascade delete)
  role: 'owner' | 'manager' | 'worker' | 'viewer'
  permissions: string[]      // Danh sách quyền chi tiết ['read', 'write', 'delete', ...]
  is_active: boolean         // Đang hoạt động
  created: Date
  updated: Date
}
```

### 4.10 PocketBase API Rules (Phân quyền bảo mật)
Phân quyền truy cập dữ liệu trong PocketBase được cấu hình qua **API Rules** (Filter Expressions) của từng Collection:

#### 1. Collection `users`
*   **List / View Rule**: `@request.auth.id != "" && (@request.auth.id == id || @request.auth.role == "super_admin")`
*   **Create Rule**: Cho phép đăng ký công khai
*   **Update Rule**: `@request.auth.id != "" && (@request.auth.id == id || @request.auth.role == "super_admin")`
*   **Delete Rule**: `@request.auth.role == "super_admin"`

#### 2. Collection `farms`
*   **List / View Rule**: `@request.auth.id != "" && (@request.auth.role == "super_admin" || @collection.user_farm_access.user ?= @request.auth.id && @collection.user_farm_access.farm ?= id && @collection.user_farm_access.is_active = true)`
*   **Create Rule**: `@request.auth.id != ""` (Bất kỳ user đã đăng nhập đều có thể tạo nông trại mới)
*   **Update / Delete Rule**: Chỉ Owner hoặc Super Admin được sửa/xóa nông trại:
    `@request.auth.id != "" && (@request.auth.role == "super_admin" || @collection.user_farm_access.user ?= @request.auth.id && @collection.user_farm_access.farm ?= id && @collection.user_farm_access.role = "owner" && @collection.user_farm_access.is_active = true)`

#### 3. Các Collection dữ liệu trang trại (`trees`, `zones`, `tree_notes`, `photos`, `investments`)
*   **List / View Rule**: `@request.auth.id != "" && (@request.auth.role == "super_admin" || @collection.user_farm_access.user ?= @request.auth.id && @collection.user_farm_access.farm ?= farm && @collection.user_farm_access.is_active = true)`
*   **Create Rule / Update Rule**: Cho phép nếu không phải role viewer:
    `@request.auth.id != "" && (@request.auth.role == "super_admin" || @collection.user_farm_access.user ?= @request.auth.id && @collection.user_farm_access.farm ?= farm && @collection.user_farm_access.is_active = true && @collection.user_farm_access.role != "viewer")`
*   **Delete Rule**: Chỉ Owner, Manager hoặc Super Admin:
    `@request.auth.id != "" && (@request.auth.role == "super_admin" || @collection.user_farm_access.user ?= @request.auth.id && @collection.user_farm_access.farm ?= farm && @collection.user_farm_access.is_active = true && (@collection.user_farm_access.role == "owner" || @collection.user_farm_access.role == "manager"))`

#### 4. Collection `user_farm_access`
*   **List / View Rule**: `@request.auth.id != "" && (@request.auth.role == "super_admin" || @collection.user_farm_access.user ?= @request.auth.id && @collection.user_farm_access.farm ?= farm)`
*   **Create / Update / Delete Rule**: Chỉ Owner hoặc Super Admin được quản lý thành viên:
    `@request.auth.id != "" && (@request.auth.role == "super_admin" || @collection.user_farm_access.user ?= @request.auth.id && @collection.user_farm_access.farm ?= farm && @collection.user_farm_access.role == "owner")`

### 4.11 Chuẩn hóa Dữ liệu (Data Normalization)
Để duy trì tính nhất quán của dữ liệu khi lưu trữ vào database và tránh các lỗi hiển thị hoặc thống kê do người dùng nhập tay sai định dạng (ví dụ: gõ hoa thường tùy tiện hoặc gõ sai tên giống cây), hệ thống áp dụng các quy chuẩn chuẩn hóa dữ liệu tại client (`lib/normalization.ts`) trước khi gửi lên server:

#### 1. Chuẩn hóa Giống Cây (`normalizeVariety`)
Áp dụng cho trường `variety` của cây sầu riêng. Hàm sẽ làm sạch khoảng trắng thừa và ánh xạ các tên gọi phổ biến về các giống cây chuẩn:
*   `ri6`, `ri 6`, `ri-6` -> **`Ri6`**
*   `monthong`, `mon thong`, `dona`, `đô na` -> **`Monthong`**
*   `musang king`, `musang`, `msk` -> **`Musang King`**
*   `black thorn`, `gai den`, `gai đen` -> **`Black Thorn`**
*   Các giống cây khác: Tự động chuyển đổi sang dạng viết hoa chữ cái đầu của mỗi từ (Title Case).

#### 2. Chuẩn hóa Tên Khu Vực (`normalizeZone`)
Áp dụng cho tên phân khu. Khi nông dân nhập tên phân khu hoặc hệ thống tự động phát hiện, hàm chuẩn hóa sẽ tự động loại bỏ các tiền tố trùng lặp "Khu" do gõ nhầm để đảm bảo tên luôn có định dạng nhất quán `Khu {Tên}`:
*   `Khu A` -> **`Khu A`**
*   `A` -> **`Khu A`**
*   `Khu Khu A` -> **`Khu A`** (loại bỏ tiền tố thừa bằng cách kiểm tra nếu chuỗi bắt đầu bằng chữ "khu" thì cắt bỏ và chuẩn hóa lại thành "Khu " + phần còn lại).

---

## 5. Các Trang & Chức Năng Chi Tiết

### 5.1 `/login` — Đăng Nhập

**Chức năng:**
- Form nhập Email + Mật khẩu
- Gọi PocketBase Auth: `pb.collection('users').authWithPassword(email, password)`
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
- Nút "Tạo Nông Trại Mới" → modal nhập tên + diện tích → `FarmService.createFarm()` (gọi API tạo record trong collection `farms` của PocketBase)

**Logic đặc biệt:**
- Nếu user chỉ có 1 farm → **tự động chọn**, bỏ qua trang này
- Hiển thị vai trò user trên mỗi farm card (Owner, Manager, Worker, Viewer)

---

### 5.3 `/map` — Bản Đồ Trang Trại ⭐ TRANG CHÍNH

**Chức năng cốt lõi:**
1. **Bản đồ MapLibre GL JS vector/raster fullscreen** với các lớp cây trồng (DOM-based Interactive Marker) và khu vực (Polygon fill/outline layers).
2. **3 chế độ hiển thị nền (Map Layers):**
   - 🤖 **Tự động (Auto)** (mặc định): 
     *   `Zoom < 19`: Hiển thị lớp **Hybrid** (Vệ tinh Esri World Imagery tích hợp đè nhãn OpenStreetMap ở opacity 40%).
     *   `Zoom >= 19`: Tự động chuyển đổi sang lớp **Street Map** (OpenStreetMap) thuần túy để worker nhìn rõ đường đi và không bị nhòe hình ảnh vệ tinh khi phóng quá lớn.
   - 🗺️ **Bản đồ (Street)**: Chỉ hiển thị OpenStreetMap thuần.
   - 🌍 **Hybrid**: Cố định vệ tinh Esri + nhãn OSM (opacity 40%).
3. **Bộ lọc hiển thị (Toggle filters)**: Bật/tắt nhanh Tree markers, Zone polygons.
4. **Tương tác Marker Cây trồng**: Click/Tap vào marker cây trồng mở `FullscreenTreeShowcase`.
5. **Tương tác Phân khu**: Click/Tap vào polygon khu vực mở Popup/BottomSheet hiển thị thông tin tóm tắt khu vực (Tên, mã, số cây, diện tích, trạng thái).
6. **Nút "Làm việc" (Work Mode)**: Kích hoạt chế độ đi vườn On-Farm Work Mode (Xem mục 5.3.1).

**Chi tiết kỹ thuật & Giải thuật Bản đồ:**

*   **Trình nghe sự kiện bản địa Marker (`InteractiveMarker`)**: 
    Do MapLibre GL JS có cơ chế nuốt các sự kiện click trên mobile khi kéo thả bản đồ, các Marker cây trồng phải được thiết kế dưới dạng React component render thẻ DOM HTML thuần, gắn trình nghe sự kiện bằng JavaScript bản địa (`addEventListener` cho cả `click` và `touchstart`).
    Hàm xử lý bắt buộc gọi `e.stopPropagation()` và `e.preventDefault()`. Đồng thời, phải chặn bọt sự kiện pointer bằng cách lắng nghe và chặn lan truyền (`stopPropagation`) các sự kiện `pointerdown` và `mousedown` ngay trên marker để không kích hoạt cử chỉ kéo/di chuyển của bản đồ chính.
*   **Chặn Click theo Zoom**:
    Marker chỉ cho phép click (`isClickable = isZoomedIn`) khi bản đồ có `zoom >= 18`. Ở mức zoom nhỏ hơn, marker chuyển sang trạng thái bán trong suốt (opacity 0.75) và không phản hồi sự kiện click để tránh mở nhầm cây khi người dùng đang thao tác kéo/thu phóng bản đồ rộng.
*   **Định vị thông minh (Center on User)**:
    Nút định vị (Locate Me) khi tap sẽ kiểm tra quyền GPS:
    - Nếu có vị trí: `easeTo` di chuyển bản đồ đến tọa độ user với `zoom: 19`, đồng thời kích hoạt phản hồi rung xúc giác (**Haptic Feedback**) thông qua API rung của thiết bị (`navigator.vibrate([50])`).
    - Nếu chưa bật GPS: Tự động kích hoạt dịch vụ theo dõi vị trí.
*   **Phân tích lân cận Proximity Detection (Turf.js)**:
    Khi GPS hoạt động, chạy một bộ lắng nghe khoảng cách Turf.js thời gian thực:
    - Tính khoảng cách từ user đến các cây trồng bằng `@turf/distance` (hệ mét).
    - Tính xem user có nằm trong đa giác (Polygon) nào không bằng `@turf/boolean-point-in-polygon`. Nếu nằm ngoài, tính khoảng cách đến tâm khu vực (Centroid) bằng `@turf/centroid`.
    - Hiển thị bảng nổi **"Vật thể gần đây"** ở góc dưới bản đồ, liệt kê tối đa 3 cây và 3 vùng lân cận nằm trong bán kính khoảng cách tùy cấu hình (mặc định 30m), xếp theo khoảng cách tăng dần.
*   **Các lớp phủ đồ họa (Overlay Layers)**:
    - **Lớp vết di chuyển (Breadcrumb trail)**: Vẽ đường nét đứt màu đỏ (`line-color: '#ef4444'`, `line-width: 3`, `line-opacity: 0.7`, `line-dasharray: [2, 4]`) nối 20 điểm vị trí GPS gần nhất của user.
    - **Vòng tròn sai số GPS (Accuracy circle)**: Vẽ vòng tròn Turf bao quanh user với bán kính bằng sai số GPS (`accuracy`) thực tế, tô màu đỏ nhạt với fill opacity 0.1.
    - **Vòng tròn bán kính lân cận (Proximity circle)**: Vẽ vòng tròn Turf nét đứt màu xanh lá cây bao quanh user với bán kính 30m, fill opacity 0.05.

**Layer rendering order (Thứ tự đè lớp):**
```
Satellite Layer (Esri) ──── Đáy bản đồ (hybrid/auto khi zoom < 19)
OSM Layer              ──── Đè trên Satellite (opacity 0.4 khi hybrid, 1.0 khi street)
Zone Polygons          ──── Lớp Fill (opacity 0.2), Lớp Outline nét liền (width 2)
User Path (Breadcrumb) ──── Lớp Line nét đứt đỏ (dasharray [2,4])
Accuracy & Proximity   ──── Lớp Fill vòng tròn Turf nhạt dưới chân user
User Location Marker   ──── Blue pulsing dot (radial gradient, animation pulse-blue)
Tree Circle Markers    ──── Đè trên cùng, màu theo trạng thái:
                            • Mùa hiện tại: Xanh lá cây đậm (#147237)
                            • Cây non: Vàng cam (#eab308)
                            • Cần chú ý gấp: Màu tím đỏ đậm (#b40ca1)
                            • Đang chọn (Selected): Đỏ (#ef4444) kèm ping animation
```

#### 5.3.1 On-Farm Work Mode — Chế độ đi vườn thực địa ⭐

**Mô tả:** Chế độ bản đồ fullscreen dành cho nông dân dùng ngoài thực địa. Tối ưu cho thao tác một tay nhanh chóng, chống lỗi nảy GPS (GPS bounce), tự động hóa nhận diện khu vực và liên kết chụp ảnh AI.

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

**Chi tiết tính năng đặc thù đi vườn:**

*   **Duy trì sáng màn hình (Screen Wake Lock)**: 
    Khi vào On-Farm Work Mode, hệ thống tự động gọi API `navigator.wakeLock.request('screen')` để giữ cho màn hình điện thoại luôn bật sáng, ngăn thiết bị tự khóa màn hình khi worker đang di chuyển giữa các hàng cây dưới trời nắng. Tự động giải phóng (release) wake lock khi đóng chế độ hoặc khi ứng dụng bị ẩn xuống background.
*   **Tối ưu không gian hiển thị (Hiding Navigation)**:
    Khi On-Farm Work Mode kích hoạt, component tự động thêm class `work-mode-active` vào thẻ `body` để ẩn toàn bộ thanh điều hướng BottomTabBar và các Navigation bar bằng CSS. Thao tác này giúp giải phóng 100% diện tích màn hình điện thoại cho bản đồ thực địa. Class này sẽ được gỡ bỏ khi đóng chế độ.
*   **Giải quyết đè Marker (Ambiguity Resolver)**:
    Do các cây sầu riêng có thể trồng rất sát nhau, trên màn hình mobile nhỏ các marker có thể đè khít lên nhau gây khó khăn khi tap chọn.
    - Giải thuật: Khi tap vào một marker cây trồng, hệ thống tính khoảng cách từ cây đó tới tất cả các cây xung quanh trong bán kính **4 mét** (sử dụng Turf.js).
    - Nếu phát hiện có từ 2 cây trở lên trong bán kính này, thay vì mở thẳng trang chi tiết, hệ thống sẽ hiển thị một Modal danh sách các cây trùng để người dùng chọn chính xác cây muốn xem.
*   **GPS Burst Calibration (Thuật toán chống GPS bounce)**:
    Khi người dùng nhấn "Tạo cây mới tại đây" hoặc "Sửa GPS", hệ thống chạy cơ chế hiệu chuẩn chùm (Burst Calibration) thay vì lấy tọa độ đơn lẻ:
    1. Thu thập liên tiếp 4 mẫu GPS (mỗi mẫu cách nhau 500ms, tổng thời gian thu thập là 2 giây).
    2. Lọc bỏ toàn bộ các mẫu có sai số (`accuracy`) > 15m.
    3. Nếu tất cả các mẫu đều yếu (> 15m), phát cảnh báo nông dân nên ra vùng trống thông thoáng để lấy sóng tốt hơn.
    4. Tính trung bình cộng tọa độ (Latitude, Longitude) của các mẫu tốt còn lại để làm tọa độ cây. Sai số lưu trữ là sai số nhỏ nhất trong các mẫu tốt đó.
*   **Cảnh báo chất lượng sóng GPS khi tạo cây**:
    Nếu sau khi hiệu chuẩn, độ chính xác GPS cuối cùng vẫn > 15m, hệ thống bắt buộc hiển thị Dialog cảnh báo: *"⚠️ Cảnh báo: Độ chính xác GPS hiện tại khá kém (±X mét). Tọa độ lưu lại có thể bị lệch nhiều so với thực tế. Bạn có muốn tiếp tục tạo cây tại vị trí này không?"*. Nông dân phải nhấn xác nhận mới cho phép lưu.
*   **Coordinates Guard (Bộ canh gác tọa độ sửa đổi)**:
    Để tránh việc vô tình thay đổi GPS của cây sang vị trí hoàn toàn khác làm rối loạn bản đồ vườn, khi sửa GPS thủ công (hoặc lấy GPS hiện tại để cập nhật), hệ thống tính khoảng cách Haversine giữa tọa độ cũ và tọa độ mới đề xuất:
    - `Khoảng cách < 5m`: Cho phép lưu tự động ngay lập tức.
    - `Khoảng cách từ 5m đến 30m`: Hiển thị cảnh báo lệch kèm hộp kiểm (checkbox): *"Vị trí mới cách vị trí cũ X mét. Tôi xác nhận vị trí này chính xác."* Người dùng phải tick chọn checkbox này mới bấm được nút Lưu.
    - `Khoảng cách > 30m`: Khóa tính năng Lưu và hiển thị thông báo chặn: *"Không cho phép thay đổi tọa độ vượt quá 30m để bảo toàn vị trí cây."* (Quy tắc này chỉ được vượt qua bởi tài khoản có quyền `super_admin`).

**Tạo cây mới workflow:**
```
1. User nhấn "➕ Tạo cây mới"
2. Chạy GPS Burst Calibration → lấy tọa độ hiệu chuẩn chuẩn xác
3. Tự động phát hiện Khu vực (Zone) bằng thuật toán Point-in-polygon (Turf.js) đối chiếu tọa độ hiệu chuẩn với ranh giới các zone
   - Nếu user nằm ngoài các zone vẽ sẵn, tìm zone có tâm (centroid) gần nhất và tự động điền vào form gợi ý
4. Hiển thị form tạo cây:
   - Tên cây (tự động điền theo định dạng: "{Giống cây} {Ngày tạo}")
   - Giống cây (bắt buộc): Grid chọn nhanh [Ri6, Monthong, Musang King, Black Thorn]
   - Khu vực (đã điền sẵn từ bước 3, cho phép chọn lại)
   - [📷 Chụp ảnh] — mở camera trực tiếp
5. Người dùng chụp ảnh hoặc tải ảnh lên -> nén ảnh về target 500KB bằng Canvas API
6. Nhấn Confirm -> tạo record `trees` và `photos` trong PocketBase
7. Nếu OFFLINE: Lưu toàn bộ thông tin cây + file Blob ảnh đã nén vào Mutation Queue và Photo Queue của IndexedDB. UI sẽ hiển thị Toast thành công dạng Offline. Khi có mạng trở lại (qua Wifi), Service Worker sẽ tự động đồng bộ hóa FIFO lên server.
```

**Camera integration:**
```typescript
// Mở camera sau của thiết bị di động
navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
})
// Capture ảnh từ video feed bằng Canvas -> chuyển thành Blob -> preview cục bộ
// Nén trước khi lưu/upload: compressImageSmart(file, 'general') -> Target size 500KB
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
- Danh sách zones hiển thị: tên, mã, diện tích (ha), số cây hiện tại thuộc vùng, sức khỏe trung bình của vùng, ngày kiểm tra gần nhất.
- Nút "Xem vị trí" → chuyển sang `/map` tập trung (focus) vào tọa độ trung tâm của zone và highlight ranh giới zone.
- Cảnh báo "Cần kiểm định" (Needs attention): Tự động hiển thị nếu đã quá 14 ngày chưa có đợt kiểm tra nào (`lastInspectionDate` cũ hơn 14 ngày trước) hoặc sức khỏe trung bình của vùng dưới 7.0/10.

**Edit mode (`/admin-zones` hoặc qua Modal quản lý, chỉ owner/admin):**
- Cho phép tạo vùng mới hoặc chỉnh sửa ranh giới bằng cách vẽ Polygon trực tiếp trên bản đồ MapLibre (sử dụng thư viện `MapboxDraw`).
- **Tính diện tích thời gian thực (Shoelace + Latitude Centroid Scale)**: Khi vẽ hoặc chỉnh sửa các đỉnh tọa độ, hệ thống tự động tính diện tích thực tế của đa giác (Xem giải thuật ở mục 8.3).
- **Sửa đổi ranh giới**: Cho phép thêm, dịch chuyển hoặc xóa các đỉnh (vertex) của đa giác.
- **Xóa khu vực**: Chỉ Owner hoặc Super Admin được quyền xóa. Khi xóa zone, hệ thống sẽ xóa các ranh giới bản đồ nhưng giữ nguyên cây (cây sẽ chuyển sang trạng thái "Chưa có khu vực" để xử lý sau).
- **Auto-assign zone cho cây (Ray Casting)**: 
  Khi tạo cây mới ngoài vườn (On-Farm Work Mode) hoặc khi cập nhật GPS cho cây, hệ thống tự động chạy giải thuật Ray Casting (`@turf/boolean-point-in-polygon`) để kiểm tra tọa độ GPS của cây nằm trong đa giác của Zone nào. Nếu khớp, tự động gán `zoneId`, `zoneCode` và `zoneName` cho cây trồng đó mà không cần người dùng nhập thủ công.

**Giải quyết sai biệt đơn vị diện tích (Sqm vs Hectare)**:
Để giải quyết triệt để lỗi sai lệch hiển thị đơn vị diện tích (mét vuông vs hecta):
- Nếu zone có ranh giới tọa độ đỉnh vẽ trên bản đồ: Hệ thống bắt buộc tính trực tiếp diện tích từ tọa độ bằng công thức toán học và hiển thị đơn vị `ha` (độ chính xác 1 chữ số thập phân).
- Nếu zone không có tọa độ đỉnh (legacy data hoặc nhập thủ công): Đọc trường dữ liệu `area` từ database. Áp dụng logic kiểm tra thông minh: Nếu `area > 100` (được hiểu là hệ thống cũ đang lưu dưới đơn vị mét vuông $m^2$), tự động chia cho `10000` để hiển thị sang Hecta (`ha`). Ngược lại, nếu `area <= 100`, giữ nguyên giá trị vì đó là đơn vị hecta sẵn có.

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
5. **Hệ thống**: Cache management, PocketBase sync status, system config

---

### 5.8 `/camera` — Chụp Ảnh AI

**Workflow:**
1. Mở camera (rear facing)
2. Chụp ảnh → hiển thị preview
3. Chọn cây liên kết (từ danh sách hoặc auto-detect nearby)
4. Chọn loại ảnh: general / health / fruit_count
5. Upload → nén → PocketBase `photos` collection (dưới dạng multipart file field)
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

### 7.1 PocketBase Client Offline Strategy (IndexedDB Cache + Mutation Queue)
PocketBase không hỗ trợ tự động lưu cache cục bộ và hàng đợi ghi ngoại tuyến như Firestore SDK. Vì vậy, ứng dụng PWA sử dụng kiến trúc đồng bộ tự chế bằng IndexedDB (qua thư viện như `Dexie.js` hoặc custom wrapper):

1.  **Read Cache (Bộ nhớ đệm đọc)**:
    *   Mỗi khi fetch dữ liệu từ PocketBase (Farms, Trees, Zones, Investments), lưu bản sao dữ liệu vào IndexedDB cục bộ.
    *   Khi offline hoặc mạng yếu, ứng dụng đọc trực tiếp từ IndexedDB để đảm bảo tốc độ phản hồi cực nhanh (< 100ms).
    *   Khi online, app kéo dữ liệu mới nhất từ PocketBase, cập nhật lại IndexedDB và cập nhật trạng thái UI.

2.  **Write Mutation Queue (Hàng đợi ghi)**:
    *   Khi người dùng thực hiện cập nhật (ví dụ: đổi trạng thái cây, sửa GPS, đếm trái) khi ngoại tuyến:
        a. Cập nhật ngay vào IndexedDB cục bộ (Optimistic UI).
        b. Đóng gói dữ liệu thay đổi dưới dạng một "Mutation Job" (bao gồm: tên collection, record ID, dữ liệu updates, timestamp).
        c. Thêm Job này vào bảng `offline_mutations_queue` trong IndexedDB.
    *   Khi phát hiện mạng trực tuyến trở lại (qua sự kiện `online` của trình duyệt hoặc polling định kỳ):
        a. Khởi động Service Worker hoặc Sync Worker.
        b. Đọc lần lượt các Job trong `offline_mutations_queue` theo trình tự thời gian (FIFO).
        c. Thực hiện gọi API PocketBase để lưu dữ liệu lên server.
        d. Nếu thành công, xóa Job khỏi IndexedDB. Nếu thất bại (trừ lỗi xác thực), giữ lại trong hàng đợi để thử lại sau.

### 7.2 Offline Photo Queue (IndexedDB)
Đối với việc chụp ảnh thực địa khi offline:
```
1. User chụp ảnh lúc ngoại tuyến (Airplane mode hoặc mất sóng trong vườn).
2. Ảnh Blob → nén (compressImageSmart) → lưu vào IndexedDB ('offline_photos_queue') cùng với metadata (treeId, farmId, latitude, longitude, timestamp, photoType, seasonYear).
3. Cập nhật UI tạm thời hiển thị ảnh từ blob URL cục bộ.
4. Khi khôi phục kết nối:
   a. Service Worker/Sync Manager nhận diện trạng thái online.
   b. Đọc các ảnh đang chờ từ IndexedDB 'offline_photos_queue'.
   c. Khởi tạo FormData, đính kèm ảnh nén và các trường metadata.
   d. Gửi request POST tạo record trong collection `photos` của PocketBase.
   e. Nhận kết quả thành công → xóa ảnh tương ứng khỏi IndexedDB.
   f. Phát Toast thông báo: "Đã đồng bộ thành công X hình ảnh lên hệ thống".
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

### 8.3 Polygon Area (Shoelace + UTM/Equirectangular projection)
Công thức tính diện tích phẳng từ tọa độ GPS đa giác ranh giới khu vực:
1. Tính vĩ độ trung bình (Centroid Latitude) để xác định tỷ lệ co giãn kinh độ theo xích đạo:
   $$\varphi_0 = \frac{1}{N}\sum_{i=1}^{N} \text{latitude}_i$$
   $$\text{lat0Rad} = \varphi_0 \times \frac{\pi}{180}$$
2. Chuyển đổi các đỉnh tọa độ GPS $(\text{lat}_i, \text{lng}_i)$ sang tọa độ phẳng $(x_i, y_i)$ tính bằng mét (Equirectangular approximation):
   $$x_i = (\text{lng}_i \times \frac{\pi}{180}) \times R \times \cos(\text{lat0Rad})$$
   $$y_i = (\text{lat}_i \times \frac{\pi}{180}) \times R$$
   Với $R = 6,371,000\text{ m}$ (Bán kính Trái Đất).
3. Áp dụng công thức Shoelace để tính diện tích bề mặt đa giác khép kín:
   $$\text{Area (mét vuông)} = \frac{1}{2} \left| \sum_{i=1}^{N} (x_i y_{i+1} - x_{i+1} y_i) \right|$$
   *(Lưu ý: đỉnh cuối cùng $N+1$ trùng với đỉnh đầu tiên $1$ để khép kín đa giác).*
4. Quy đổi sang Hectare:
   $$\text{Area (ha)} = \frac{\text{Area (mét vuông)}}{10000}$$

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

### 8.5 Bộ canh gác tọa độ sửa đổi (Coordinates Guard)
Giải thuật kiểm soát khoảng cách khi di dời cây trồng tránh nhầm lẫn vị trí:
1. Khi có tọa độ mới đề xuất $(\text{lat}_2, \text{lng}_2)$ cho cây có tọa độ cũ $(\text{lat}_1, \text{lng}_1)$, tính khoảng cách Haversine $d$:
   $$d = 2R \times \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\varphi}{2}\right) + \cos(\varphi_1)\cos(\varphi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
2. Phân loại kiểm tra:
   - Nếu $d < 5\text{m}$: Tự động cho phép lưu không cần cảnh báo.
   - Nếu $5\text{m} \le d \le 30\text{m}$: Yêu cầu hiển thị cảnh báo lệch mét kèm hộp kiểm (checkbox) xác nhận vị trí chính xác của người dùng trước khi cho phép lưu.
   - Nếu $d > 30\text{m}$: Chặn hoàn toàn thao tác lưu (chỉ tài khoản `super_admin` mới được quyền ghi đè).

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
- **Service Worker (`public/sw.js`)**:
  *   Thực hiện cache các tài nguyên tĩnh (App Shell) và các mảnh bản đồ vector/raster MapLibre.
  *   **Quy tắc ngoại lệ (Bắt buộc)**: Service Worker phải bỏ qua (không can thiệp hoặc lưu cache) các yêu cầu mạng hướng tới:
      - Các API của Firestore/Firebase (`googleapis.com`, `firebase`)
      - Google Secure Token (`securetoken`)
      - Google Analytics (`google-analytics`, `analytics.google`)
      Điều này nhằm tránh việc làm gián đoạn hoặc lỗi đồng bộ hóa dữ liệu trực tuyến/real-time của Firebase/Firestore.
  *   **Ngoại lệ của ngoại lệ**: Cho phép Service Worker lưu cache các yêu cầu GET hình ảnh lấy từ Firebase Storage để hiển thị được hình ảnh ngoại tuyến khi người dùng mở album ảnh lúc mất mạng.
- **IndexedDB**: Offline photo queue và Mutation queue.
- `display: standalone` cho trải nghiệm ứng dụng di động độc lập (fullscreen mobile experience).

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
# PocketBase Connection
NEXT_PUBLIC_POCKETBASE_URL=https://farmbackend.buonme.com

# PocketBase Admin/Migration (Only for scripts, do not expose to client!)
POCKETBASE_ADMIN_EMAIL=admin@buonme.com
POCKETBASE_ADMIN_PASSWORD=

# App
NEXT_PUBLIC_SITE_URL=https://farm-manager.vercel.app
NEXT_PUBLIC_ENABLE_LOGS=false          # Enable debug logs in production

# ⚠️ KHÔNG được dùng credential admin trực tiếp trên Client.
# Admin check trên Client dựa vào roles / user_roles của record người dùng.
```

---

## 15. Checklist Trước Khi Ship

- [ ] PocketBase API rules: cấu hình phân quyền chi tiết cho tất cả các collection (ngăn chặn truy cập công khai trái phép)
- [ ] Admin check: kiểm tra qua role field hoặc bảng `user_roles`, KHÔNG hard-code UID
- [ ] ESLint: KHÔNG `ignoreDuringBuilds: true`
- [ ] TypeScript: KHÔNG `any` type (dùng proper interfaces)
- [ ] Logging: dùng `logger`, KHÔNG `console.log` trực tiếp
- [ ] UI feedback: Toast/Dialog, KHÔNG `alert()`/`prompt()`
- [ ] `convertToDate`: chỉ 1 implementation duy nhất trong `date-utils.ts`
- [ ] MapLibre CSS/Icons: nạp cục bộ hoặc import trực tiếp, không CDN ngoài PWA cache
- [ ] `playwright` trong `devDependencies`, KHÔNG `dependencies`
- [ ] Không có files rác (.swp, Trash/, archive/)
- [ ] Mỗi component ≤ 300 LOC (tách nếu lớn hơn)
- [ ] Responsive: test trên iPhone SE (320px width)
- [ ] Offline: test lưu ngoại tuyến tạo cây + chụp ảnh khi airplane mode

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
| **Data sources** | Auth Context, PocketBase collections (users, farms, trees, zones, tree_notes, investments, photos, activity_logs) |

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
│   └── NoteTimeline (real-time PocketBase SSE listener)
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
  lastSeason: {                    // Đọc từ trường JSON seasons trong collection farms hoặc từ record farm hiện tại
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
   → PocketBase write + ActivityLog tự động
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

#### A.6.1 ImageGallery (Tách thành 5 files & Quản lý Modal Stack)

**Cấu trúc Modular mới:**
Để giảm tải dung lượng code (giảm từ 1,336 LOC xuống dưới 300 LOC mỗi file), ImageGallery được tách thành các file độc lập:
1. `ImageGallery.tsx`: Lớp container hiển thị lưới ảnh dạng grid 2-3 cột, quản lý các bộ lọc tab niên vụ, và điều khiển trigger mở camera/thư viện ảnh.
2. `PhotoViewerModal.tsx`: Giao diện modal xem ảnh fullscreen nền đen mờ (`backdrop-blur-md`), hỗ trợ vuốt trái/phải (`swipe`) để chuyển ảnh tiếp theo/trước đó, tích hợp tính năng zoom/pan.
3. `DeleteConfirmModal.tsx`: Hộp thoại xác nhận xóa ảnh (chỉ hiển thị nút xóa cho Owner/Manager).
4. `PhotoTypeModal.tsx`: Modal dạng BottomSheet chọn phân loại ảnh (`general` | `health` | `fruit_count`) ngay sau khi chọn file để hệ thống áp dụng mức nén tương ứng.
5. `lib/hooks/use-image-zoom-pan.ts`: Custom hook quản lý trạng thái tọa độ x, y, scale và kích hoạt cử chỉ:
   - **Pinch-to-zoom**: Thu phóng 2 ngón tay trên mobile.
   - **Double-tap**: Nhấn đúp để chuyển đổi nhanh giữa zoom 1x và 2.5x.
   - **Drag Pan**: Kéo rê ảnh để xem chi tiết khi đang phóng to.
   - **Wheel zoom / Mouse zoom**: Cuộn chuột phóng to/thu nhỏ trên desktop.
   - Giới hạn biên (Boundary lock) để không cho phép kéo ảnh lệch hẳn ra ngoài khung nhìn.

**Định vị Ngày Chụp Ảnh (Date Parsing Fallback) & Sửa lỗi ngày mặc định:**
*   **Trích xuất Timestamp từ tên file (`getTimestampFromUrl`)**:
    Để khắc phục triệt để lỗi ảnh bị hiển thị sai ngày (ví dụ: ngày mặc định `01/01/2025` hoặc `01/01/1970`), hệ thống sử dụng giải thuật trích xuất kép:
    1. Hàm `getImageDate` thực hiện decode đường dẫn URI của ảnh.
    2. Tìm kiếm chuỗi số liên tiếp gồm 10 hoặc 13 chữ số đại diện cho Epoch Timestamp nằm trong tên file hoặc URL (ví dụ: trích xuất `1780456200000` từ `photo_1780456200000_0.jpg`).
    3. Nếu trích xuất thành công và năm từ ngày trích xuất $\ge 2000$, ưu tiên hiển thị ngày này làm ngày chụp thực tế của ảnh.
    4. Nếu trích xuất thất bại, mới sử dụng trường ngày lưu trữ trong database (`timestamp` hoặc `uploadDate`).
*   **Quy chuẩn tên file khi upload**:
    Khi chụp ảnh hoặc chọn ảnh từ thư viện, file bắt buộc phải được đổi tên thành `photo_${Date.now()}_${i}.jpg` (với `Date.now()` là số mili-giây hiện tại) trước khi gửi lên server để đảm bảo dấu thời gian được ghi vào tên file vật lý mãi mãi.

**Chống xung đột Z-Index trên iOS/PWA (React Portal):**
*   **Yêu cầu Portal**: Tất cả các modal overlay hiển thị đè màn hình (`PhotoViewerModal`, `DeleteConfirmModal`, `PhotoTypeModal`) **bắt buộc sử dụng React Portal (`createPortal`)** để đưa các node HTML ra ngoài cùng của cây DOM (móc trực tiếp vào `document.body`). Điều này giúp tránh hoàn toàn lỗi bị che khuất modal hoặc sai lệch lớp đè do thuộc tính `overflow-y-auto` hoặc `z-index` stacking context của các scroll wrapper trên hệ điều hành iOS.
*   **Hệ thống quản lý Z-Index tập trung (`lib/modal-z-index.ts`)**:
    Quy định mức độ ưu tiên của các lớp hiển thị theo hằng số cố định:
    ```typescript
    export const MODAL_Z_INDEX = {
      SIDEBAR: 30,
      NAVIGATION: 40,
      BOTTOM_TAB_BAR: 50,
      MAP_OVERLAY: 10001,
      TREE_DETAIL: 10002,
      MANAGEMENT_MODAL: 10003,
      PHOTO_VIEWER: 10004,
      LOADING_OVERLAY: 10005,
      ERROR_MODAL: 10006,
    } as const
    ```
*   **Tailwind CSS Safelist**: Đăng ký các class z-index động như `z-[10001]` đến `z-[10006]` vào mảng `safelist` trong `tailwind.config.ts` để đảm bảo Tailwind không tối ưu hóa/loại bỏ chúng trong bản build production.
*   **Chặn Scroll màn hình nền**: Sử dụng lớp quản lý `modalStack` để đếm số modal đang mở. Khi modal đầu tiên mở ra, set `document.body.style.overflow = 'hidden'` để khóa cuộn trang nền. Khi modal cuối cùng đóng lại, khôi phục `document.body.style.overflow = 'unset'` để nông dân tiếp tục cuộn xem thông tin cây.

**Cache:**
- Storage images cache bằng `Map<string, images>` trong memory
- Cache key: `${treeId}-${qrCode}-${farmId}`

---

#### A.6.2 TreeNoteSystem

**Chức năng:**
- Real-time notes: PocketBase Realtime subscription (SSE) qua `pb.collection('tree_notes').subscribe('*')` lọc theo treeId cục bộ.
- 4 loại note: 📘 Info, ⚠️ Warning, ✅ Success, 🚨 Urgent
- @Mentions: nhập `@username` → highlight + (future) notification
- Timeline hiển thị: avatar + tên + relative time + note content + type badge
- Max 50 notes hiển thị

**PocketBase collection:** `tree_notes`

**Schema:**
```typescript
{
  id: string
  farm: string // Relation
  tree: string // Relation
  content: string
  author?: string // Relation to users
  author_name: string
  author_email: string
  type: 'info' | 'warning' | 'success' | 'urgent'
  mentions?: string[]
  created: Date // PocketBase system auto field
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

**Data source:** Đọc thông tin từ trường JSON `seasons` trên collection `farms` và so sánh qua dữ liệu lịch sử trong `seasonal_stats` của cây sầu riêng.

#### A.6.4 SeasonInvestmentCard

**Chức năng:** So sánh chi phí đầu tư giữa mùa hiện tại và mùa trước.

**Data query:**
```typescript
// Mùa hiện tại:
pb.collection('investments').getList(1, 100, {
  filter: `farm = "${farmId}" && date >= "${year}-01-01 00:00:00" && date <= "${year}-12-31 23:59:59"`
})
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

**Data source:** `activity_logs` collection, filter: `resource = "trees" && resource_id = "${treeId}"`, sort: `-created`, limit: 20

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

**User name resolution:** Load từ PocketBase `users` collection, cache in-memory Map hoặc sử dụng tính năng expand relation.

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

5. **Optimistic UI**: Khi nhấn "Lưu", update UI ngay → sync PocketBase background → rollback nếu lỗi.

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
| 6 | `SeasonInvestmentCard` query PocketBase trực tiếp trong component | Chuyển sang service layer hoặc custom hook |
| 7 | Photo upload viết trực tiếp PocketBase trong component (L552-670) | Chuyển sang `PhotoService.uploadForTree()` |
| 8 | `convertToDate` logic lặp trong `getDurianSeasonStatus` | Import từ `date-utils.ts` |
| 9 | `handleSave` check permissions nhưng không dùng kết quả (L472-485) | Xóa dead code hoặc dùng để block save |
| 10 | Không có loading skeleton cho TreeNoteSystem + TreeTimeline | Thêm skeleton states |

---

*Tài liệu này tổng hợp từ phân tích codebase hiện tại + toàn bộ docs dự án. Phiên bản: 2026-05-26.*
