# Farm Manager - Ứng dụng Quản lý Trang trại Sầu Riêng

## Tổng quan

Farm Manager là một ứng dụng di động web (PWA) được thiết kế để quản lý trang trại sầu riêng thông minh. Ứng dụng hỗ trợ chụp ảnh cây trồng bằng AI, theo dõi vị trí GPS thời gian thực, và quản lý dữ liệu nông trại một cách hiệu quả.

## Thông tin Dự án

- **Tên dự án**: farm-dashboard-simple
- **Phiên bản**: 0.1.0
- **Framework**: Next.js 14 với React 18
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Maps**: Leaflet với OpenStreetMap
- **Styling**: Tailwind CSS
- **Ngôn ngữ**: TypeScript

## Cấu trúc Thư mục

```
/Users/daibui/Documents/React/farm-dashboard-simple/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page (redirects to /map)
│   ├── globals.css              # Global styles
│   ├── login/                   # Authentication page
│   ├── map/                     # Main map dashboard
│   ├── trees/                   # Tree management page
│   ├── camera/                  # Camera capture page
│   ├── admin/                   # Admin panel
│   ├── admin-zones/             # Zone management for admins
│   ├── money/                   # Investment/Money management
│   ├── zones/                   # Zone management
│   └── no-access/               # Access denied page
├── components/                  # React components
│   ├── UnifiedMap.tsx           # Main map component
│   ├── TreeDetail.tsx           # Tree details component
│   ├── TreeShowcase.tsx         # Tree showcase component
│   ├── AuthGuard.tsx            # Authentication guard
│   ├── Navigation.tsx           # Main navigation
│   ├── admin/                   # Admin-specific components
│   └── ui/                      # UI components
├── lib/                         # Utility libraries
│   ├── firebase.ts              # Firebase configuration
│   ├── simple-auth-context.tsx  # Authentication context
│   ├── farm-service.ts          # Farm data services
│   ├── types.ts                 # TypeScript type definitions
│   └── services/                # Various service modules
├── storage/                     # Archived unused files
│   ├── components/              # Unused components
│   ├── pages/                   # Debug/test pages
│   └── lib/                     # Unused libraries
├── docs/                        # Documentation
├── public/                      # Static assets
├── scripts/                     # Setup and utility scripts
└── e2e/                         # End-to-end tests
```

## Các Trang Chính

### 1. Trang chủ (/)
- Chuyển hướng tự động đến trang đăng nhập hoặc bản đồ tùy theo trạng thái xác thực

### 2. Đăng nhập (/login)
- Xác thực người dùng qua Firebase Auth
- Hỗ trợ email/password
- Chuyển hướng sau đăng nhập thành công

### 3. Bản đồ (/map)
- **Chức năng chính**: Hiển thị bản đồ tương tác với cây trồng và khu vực
- **Tính năng**:
  - Hiển thị cây trồng với vị trí GPS
  - Hiển thị khu vực (zones) với ranh giới
  - Chế độ theo dõi GPS thời gian thực
  - Tìm kiếm và lọc cây trồng
  - Chi tiết cây khi nhấn vào marker

### 4. Quản lý cây (/trees)
- **Chức năng**: Danh sách và quản lý chi tiết cây trồng
- **Tính năng**:
  - Hiển thị danh sách cây theo dạng lưới/mobile
  - Chi tiết đầy đủ của từng cây
  - Hiển thị ảnh và thông tin AI

### 5. Camera (/camera)
- **Chức năng**: Chụp ảnh cây trồng
- **Tính năng**:
  - Sử dụng camera thiết bị
  - Tự động lưu vị trí GPS
  - Tích hợp AI phân tích ảnh

### 6. Quản trị (/admin)
- **Chức năng**: Quản lý hệ thống cho admin
- **Tính năng**:
  - Quản lý người dùng
  - Quản lý trang trại
  - Giám sát hệ thống
  - Cấu hình hệ thống

## Các Component Chính

### Core Components
- **UnifiedMap**: Component bản đồ chính sử dụng Leaflet
- **TreeDetail**: Hiển thị thông tin chi tiết cây trồng
- **TreeShowcase**: Giao diện showcase cho cây
- **AuthGuard**: Bảo vệ route yêu cầu xác thực
- **Navigation**: Thanh điều hướng chính

### Admin Components
- **AdminDashboard**: Dashboard quản trị
- **UserManagement**: Quản lý người dùng
- **FarmManagement**: Quản lý trang trại
- **TreeManagement**: Quản lý cây trồng (admin)
- **ZoneManagement**: Quản lý khu vực

### UI Components
- **BottomSheet**: Sheet trượt từ dưới (mobile)
- **BottomTabBar**: Thanh tab dưới
- **LargeTitleHeader**: Header với tiêu đề lớn
- **Toast**: Thông báo toast

## Dịch vụ và Utilities

### Authentication
- **simple-auth-context.tsx**: Context quản lý xác thực
- **simple-auth-service.ts**: Dịch vụ xác thực
- Sử dụng Firebase Auth

### Database Services
- **farm-service.ts**: Quản lý dữ liệu trang trại
- **photo-service.ts**: Quản lý ảnh
- **admin-service.ts**: Dịch vụ admin
- **audit-service.ts**: Ghi log hoạt động

### Utilities
- **firebase.ts**: Cấu hình Firebase
- **types.ts**: Định nghĩa TypeScript
- **logger.ts**: Hệ thống logging
- **validation-utils.ts**: Tiện ích validation

## API Routes

### /api (Next.js API Routes)
- **/api/auth**: Xác thực
- **/api/farms**: Quản lý trang trại
- **/api/trees**: Quản lý cây trồng
- **/api/zones**: Quản lý khu vực
- **/api/photos**: Quản lý ảnh

## Cơ sở dữ liệu

### Firestore Collections
- **farms/{farmId}/trees**: Dữ liệu cây trồng
- **farms/{farmId}/zones**: Dữ liệu khu vực
- **farms/{farmId}/photos**: Ảnh cây trồng
- **users**: Thông tin người dùng
- **farms**: Thông tin trang trại

### Cấu trúc dữ liệu Tree
```typescript
interface Tree {
  id: string
  farmId: string
  name: string
  qrCode: string
  variety: string
  zoneCode: string
  plantingDate: Date
  healthStatus: string
  latitude: number
  longitude: number
  // ... other fields
}
```

### Cấu trúc dữ liệu Zone
```typescript
interface Zone {
  id: string
  name: string
  boundaries: Array<{ latitude: number; longitude: number }>
  treeCount: number
  area: number
  isActive: boolean
}
```

## Tính năng Nâng cao

### AI Integration
- Phân tích ảnh cây trồng tự động
- Đếm trái tự động
- Phát hiện bệnh tật

### GPS Tracking
- Theo dõi vị trí thời gian thực
- Lưu vị trí khi chụp ảnh
- Tính toán khoảng cách và diện tích

### Real-time Updates
- Đồng bộ dữ liệu thời gian thực qua Firestore
- Cập nhật trạng thái cây trồng
- Thông báo thay đổi

### Mobile Optimization
- Thiết kế responsive cho mobile
- PWA (Progressive Web App)
- Offline support
- Touch gestures

## Quy trình Phát triển

### Setup Development
```bash
npm install
npm run setup:firebase
npm run dev
```

### Testing
```bash
npm run test:firebase
npm run test:minimal
npx playwright test
```

### Build Production
```bash
npm run build
npm start
```

## Bảo mật

### Authentication
- Firebase Auth với email/password
- Role-based access control (RBAC)
- Farm-level permissions

### Data Security
- Firestore security rules
- Input validation
- XSS protection

## Hiệu suất

### Optimization
- Code splitting với Next.js
- Image optimization
- Lazy loading components
- Caching strategies

### Monitoring
- Error tracking
- Performance monitoring
- User analytics

## Triển khai

### Environment Variables
```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_SITE_URL=https://farm-manager.vercel.app
```

### Deployment Platforms
- **Vercel**: Recommended for Next.js
- **Firebase Hosting**: Alternative
- **Docker**: For containerized deployment

## Files Đã Di chuyển vào Storage

### Components không sử dụng
- FarmerFriendlyMap.tsx
- InteractiveMap.tsx
- VectorEnhancedMap.tsx
- CustomFarmVectorMap.tsx
- MapWrapper.tsx
- OpenStreetMap.tsx
- RealTimeTreePositioning.tsx
- OptimizedPhotoViewer.tsx
- ImageGallery.tsx
- TreeImagePreview.tsx
- ShareTreeModal.tsx
- UserInfo.tsx
- MigrationPrompt.tsx

### Pages debug/test
- debug-boundaries/
- debug-farm-assignment/
- test-firebase/
- debug-storage/
- debug-zones/
- test-zones-raw/
- test-firebase-direct/
- test-thumbnails/
- tmp_debug_access/
- test-zones-simple/

### Libraries không sử dụng
- enhanced-auth-context.tsx
- enhanced-auth-service.ts
- background-geolocation.ts
- google-maps-loader.ts
- investment-service.ts
- fertilizer-service.ts
- websocket-service.ts
- farm-service.ts.bak

## Lưu ý Phát triển

1. **Mobile First**: Ứng dụng được thiết kế ưu tiên cho mobile
2. **Offline Support**: Hỗ trợ hoạt động offline cơ bản
3. **Real-time**: Đồng bộ dữ liệu thời gian thực
4. **Scalable**: Kiến trúc dễ mở rộng
5. **Secure**: Bảo mật ở mức cao

## Liên hệ

- **Team**: Farm Manager Development Team
- **Email**: contact@farm-manager.com
- **Website**: https://farm-manager.vercel.app

---

*Documentation generated on 2025-10-03*