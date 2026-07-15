# Kiến Trúc Runtime Hiện Tại (Current Runtime Architecture)

> Status: Current
> Baseline: package `0.1.0`, Git commit `7890775` with local documentation changes
> Last reviewed: 2026-07-15

Tài liệu này là nguồn chính cho kiến trúc runtime đang hoạt động. Release identity, mức độ sẵn sàng và blockers được tổng hợp tại [`../CURRENT_STATE.md`](../CURRENT_STATE.md); xung đột schema và mô hình đích nằm tại [`../schema/CANONICAL_SCHEMA.md`](../schema/CANONICAL_SCHEMA.md).

## 1. Tổng Quan

Farm Manager hiện là Next.js 14 App Router PWA chạy phía client, kết nối trực tiếp tới Firebase qua Firebase Web SDK. Không có application server riêng đứng giữa trình duyệt và Firebase trong luồng runtime chính.

```text
Next.js 14 / React 18 PWA
  |-- app/ routes and components/
  |-- SimpleAuthProvider + client AuthGuard
  |-- MapLibre GL + react-map-gl + Mapbox Draw + Turf
  `-- Firebase Web SDK
        |-- Firebase Authentication
        |-- Cloud Firestore
        `-- Firebase Storage
```

Các dependency PocketBase và Socket.IO, script migration, cùng service WebSocket thử nghiệm vẫn có trong repository, nhưng không tạo thành backend runtime đang hoạt động. Homeserver/FastAPI/Ollama chỉ là đề xuất tại [`proposals/homeserver_backend_proposal.md`](./proposals/homeserver_backend_proposal.md).

## 2. Frontend Và Bản Đồ

- UI dùng Next.js App Router, React, TypeScript và Tailwind CSS; root layout bọc ứng dụng bằng `SimpleAuthProvider` tại [`../../app/layout.tsx`](../../app/layout.tsx).
- Trang `/map` tải động [`../../components/UnifiedMap.tsx`](../../components/UnifiedMap.tsx).
- Renderer hiện tại là MapLibre GL `5.24.0` qua `react-map-gl/maplibre` `8.1.1`, không phải Leaflet/react-leaflet.
- `UnifiedMap` dùng raster OpenStreetMap cho street layer, Esri World Imagery cho satellite layer, và phối hai nguồn cho hybrid/auto mode.
- Zones được render dưới dạng GeoJSON fill/line; trees dùng MapLibre markers. Mapbox Draw hỗ trợ vẽ polygon và Turf thực hiện các phép tính không gian.
- Foreground GPS và on-farm work mode có triển khai. Browser/PWA không bảo đảm theo dõi nền khi iOS đình chỉ hoặc đóng ứng dụng.

Các tài liệu Leaflet/vector cũ trong thư mục này được giữ làm lịch sử hoặc đề xuất và không phải mô tả renderer hiện tại.

## 3. Xác Thực Và Quyền Client

Firebase Authentication email/password cung cấp danh tính. Root layout dùng `SimpleAuthProvider` được export từ [`../../lib/optimized-auth-context.tsx`](../../lib/optimized-auth-context.tsx), vì vậy tên runtime vẫn là SimpleAuth dù file có tên `optimized-auth-context`.

Provider hiện thực:

- theo dõi Firebase user bằng `onAuthStateChanged`;
- tải/tạo profile trong `users`;
- đọc quyền farm đang active từ canonical collection `userFarmAccess`;
- tải các document `farms/{farmId}` tương ứng;
- cache trong memory 5 phút và lưu snapshot auth vào `localStorage` với key `farmDashboard_authState` tối đa 7 ngày;
- lưu farm đang chọn bằng `currentFarm_${userId}`.

Code hiện tại không có listener `storage` cho cross-tab auth sync, không dùng key `farmDashboard_authState_v2`, và không triển khai đúng cơ chế refresh sau 2 giây được mô tả trong các báo cáo tối ưu cũ. Xem notice trong [`AUTH_OPTIMIZATION_GUIDE.md`](./AUTH_OPTIMIZATION_GUIDE.md).

Roles `owner`, `manager`, `viewer` và permissions được kiểm tra trong client qua context và [`../../components/AuthGuard.tsx`](../../components/AuthGuard.tsx). `AuthGuard` chỉ quyết định render/redirect trong trình duyệt. Nó không phải ranh giới bảo mật backend, không thể thay thế Firestore/Storage Security Rules, và client có thể bị bỏ qua bởi request trực tiếp tới backend.

## 4. Farm Access Canonical

Runtime dùng deterministic membership document:

- `userFarmAccess/{userId}_{farmId}`;
- role `owner | manager | viewer` và `isActive`;
- farm và initial owner membership được tạo trong một atomic batch;
- top-level `farmAccess` chỉ còn read-only trong cửa sổ migration và không được runtime ghi mới.

Dữ liệu `farmAccess` persisted vẫn cần migration một lần. Runtime authorization không còn dựa vào collection legacy.

## 5. Firestore Và Storage

Firebase là backend runtime đang active:

- Firestore lưu users, farms, access records, trees, zones, photos, investments và seasonal data.
- Firebase Storage nhận ảnh từ gallery/upload flows.
- Firestore local persistence và IndexedDB v2 queue hỗ trợ ảnh offline; queue được sync bởi foreground application khi online.

Các đường dẫn chính không hoàn toàn canonical:

| Entity | Paths được code active sử dụng | Trạng thái |
|---|---|---|
| Access | `userFarmAccess/{userId}_{farmId}` | Canonical writes; `farmAccess` legacy read-only |
| Trees | `farms/{farmId}/trees/{treeId}` | Chủ yếu farm-scoped |
| Zones | `farms/{farmId}/zones/{zoneId}` | Canonical writes; top-level legacy read-only |
| Photos | `farms/{farmId}/photos/{photoId}` | Canonical writes; top-level legacy read-only |
| Investments | farm-scoped và một số rule top-level lịch sử | Cần đối chiếu schema canonical |

Không được suy ra tính phân vùng dữ liệu chỉ từ ERD hoặc tên path. Mô hình current/target chi tiết được duy trì tại [`../schema/CANONICAL_SCHEMA.md`](../schema/CANONICAL_SCHEMA.md).

## 6. Trạng Thái Bảo Mật

`firestore.rules` và `storage.rules` hiện deny-by-default:

- viewer đọc farm được cấp nhưng không ghi;
- manager/owner ghi domain data theo policy, owner quản lý membership/xóa farm;
- system admin dựa trên Firebase custom claim `admin`, không dựa email/UID client;
- legacy top-level paths không nhận write mới;
- Storage giới hạn ảnh theo farm membership, content type và kích thước.

Client guards vẫn chỉ là UX guards; Security Rules là backend boundary. Firestore Rules emulator matrix hiện pass 8 tests. Custom claims phải được cấp qua trusted Admin SDK process; Storage Rules vẫn cần test matrix riêng.

Ứng dụng vẫn là internal beta/pre-production cho đến khi legacy migration, Storage rules tests, admin Auth lifecycle, CI/hosting, monitoring và rollout operations hoàn tất.

## Build Identity

`next.config.mjs` đọc version từ `package.json` và resolve Git SHA từ CI hoặc local Git. Admin Settings hiển thị hai giá trị này. Đây là public diagnostic metadata, không phải authorization. Local dirty build chỉ định danh `HEAD`; release artifacts nên build từ clean immutable CI source.

## Admin Data Provenance

Admin dashboard chỉ hiển thị counts được truy vấn từ Firestore. Unsupported trends, synthetic tree/status/health values và silent demo owner/farm fallback đã bị loại. `system/settings` vẫn chỉ là stored configuration; chưa có notification, authentication-policy, maintenance hoặc backup service enforcement.

## 7. Hệ Thống Không Active

- PocketBase có dependency, client helper và migration/setup scripts, nhưng không có active page/component dùng nó làm nguồn dữ liệu runtime.
- WebSocket service có thể bị disable khi không có URL và không tạo thành homeserver backend đã triển khai.
- FastAPI, SQLite, Redis, Ollama và Caddy trong homeserver document là thiết kế tương lai.
- AI fields/UI language không tương đương một model/API pipeline đang hoạt động.

Khi code và tài liệu khác nhau, ưu tiên source code và Firebase configuration đã deploy theo [`../DOCUMENTATION_POLICY.md`](../DOCUMENTATION_POLICY.md).
