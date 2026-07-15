# Farm Manager Documentation

> Status: Current
> Baseline: package `0.1.0`, Git commit `7890775` with local documentation changes
> Last reviewed: 2026-07-15

Thư mục này mô tả codebase Farm Manager đang tồn tại trong repository. Runtime hiện tại là Next.js 14 mobile PWA kết nối trực tiếp Firebase; đây là bản beta/pre-production, không phải ReNEW V2, PocketBase edition hoặc homeserver edition.

## Đọc Trước

1. [`CURRENT_STATE.md`](./CURRENT_STATE.md): phiên bản, mức hoàn thiện, kiểm chứng và release blockers.
2. [`architecture/ARCHITECTURE.md`](./architecture/ARCHITECTURE.md): kiến trúc runtime Firebase/Next.js hiện tại.
3. [`schema/CANONICAL_SCHEMA.md`](./schema/CANONICAL_SCHEMA.md): schema đang dùng, các path xung đột và mô hình đích.
4. [`DOCUMENTATION_POLICY.md`](./DOCUMENTATION_POLICY.md): quy ước trạng thái và cách duy trì tài liệu.

Khi tài liệu lịch sử hoặc mockup khác với các nguồn trên, ưu tiên code, Firebase configuration và bốn tài liệu hiện hành này.

## Trạng Thái Tài Liệu

| Nhãn | Ý nghĩa |
|---|---|
| `Current` | Phản ánh runtime hiện tại. |
| `Partial` | Có implementation nhưng còn thiếu hoặc không nhất quán. |
| `Historical` | Báo cáo tại một thời điểm cũ, không phải trạng thái hiện tại. |
| `Proposal` | Hướng thay đổi tương lai, chưa active. |
| `Design-only` | Tham chiếu UX/UI tĩnh, không chứng minh implementation. |
| `Deprecated` | Cách tiếp cận cũ, chỉ giữ để tham khảo. |

## Runtime Hiện Tại

- Next.js 14.2.35, React 18.3.1, TypeScript 5.9.2.
- Firebase Authentication, Cloud Firestore và Firebase Storage.
- MapLibre GL, react-map-gl, Mapbox Draw và Turf.
- Role client đơn giản: `owner`, `manager`, `viewer`.
- Tree, map, zone, investment, season và tree gallery là các module chính.
- Camera lưu ảnh canonical hoặc enqueue IndexedDB; PWA/offline tổng quát, AI, admin lifecycle và background GPS vẫn hoàn thiện một phần.
- Firestore/Storage Rules đã farm-scoped và deny-by-default; legacy persisted data vẫn cần migration/cleanup.
- Admin chỉ hiển thị metric có nguồn hoặc trạng thái chưa có dữ liệu; settings được lưu nhưng chưa điều khiển service runtime.
- Admin Settings hiển thị package version và Git SHA được nhúng lúc build.

Chi tiết và kết quả kiểm chứng nằm trong [`CURRENT_STATE.md`](./CURRENT_STATE.md).

## Mục Lục

### Architecture

- [`architecture/ARCHITECTURE.md`](./architecture/ARCHITECTURE.md): nguồn kiến trúc hiện hành.
- [`architecture/AUTH_OPTIMIZATION_GUIDE.md`](./architecture/AUTH_OPTIMIZATION_GUIDE.md): auth cache đang triển khai một phần.
- [`architecture/SATELLITE_MAP_IMPLEMENTATION.md`](./architecture/SATELLITE_MAP_IMPLEMENTATION.md): trạng thái map layer hiện tại và lịch sử chuyển đổi.
- [`architecture/Vector_MAP.md`](./architecture/Vector_MAP.md): đề xuất vector map cũ.
- [`architecture/proposals/homeserver_backend_proposal.md`](./architecture/proposals/homeserver_backend_proposal.md): đề xuất homeserver, chưa active.

### Features

- [`features/CREATE_TREE_WORKFLOW.md`](./features/CREATE_TREE_WORKFLOW.md): tạo cây tại vườn và giới hạn photo/AI hiện tại.
- [`features/ON_FARM_WORK_MODE.md`](./features/ON_FARM_WORK_MODE.md): chế độ làm việc tại vườn.
- [`features/GPS_TRACKING_COMPLETE_GUIDE.md`](./features/GPS_TRACKING_COMPLETE_GUIDE.md): GPS foreground và giới hạn background tracking.
- [`features/SEASON_MANAGEMENT_GUIDE.md`](./features/SEASON_MANAGEMENT_GUIDE.md): quản lý niên vụ.
- [`features/Farm-Linked-Investments.md`](./features/Farm-Linked-Investments.md): investment farm-scoped và legacy migration.
- [`features/TreeNoteSystem.md`](./features/TreeNoteSystem.md): ghi chú cây cơ bản.
- [`features/CUSTOM_FIELDS_DESIGN_SUMMARY.md`](./features/CUSTOM_FIELDS_DESIGN_SUMMARY.md): thiết kế custom fields; runtime chỉ hỗ trợ preset fields.

Các file khác trong [`features/`](./features/) chứa hướng dẫn chi tiết, phân tích cũ và đề xuất UX; đọc nhãn trạng thái trước khi sử dụng.

### Testing And Deployment

- [`testing/TESTING_GUIDE.md`](./testing/TESTING_GUIDE.md): lệnh kiểm tra hiện có và khoảng trống automation.
- [`deployment/DEPLOYMENT_GUIDE.md`](./deployment/DEPLOYMENT_GUIDE.md): blockers còn lại và release gate.
- [`setup/FIREBASE_SETUP_GUIDE.md`](./setup/FIREBASE_SETUP_GUIDE.md): setup Firebase local/staging.
- [`setup/ADMIN_SETUP.md`](./setup/ADMIN_SETUP.md): ghi chú setup admin và giới hạn authorization.

Các `*_TEST_REPORT.md` là báo cáo lịch sử, không phải release gate hiện tại.

### Schema And Migration

- [`schema/CANONICAL_SCHEMA.md`](./schema/CANONICAL_SCHEMA.md): kế hoạch canonical hóa chưa hoàn tất migration.
- [`migration/MIGRATION_GUIDE.md`](./migration/MIGRATION_GUIDE.md): hướng dẫn migration còn giá trị tham khảo.
- [`migration/`](./migration/): completion reports và roadmap lịch sử.

### Design References

- [`Design/V1/design.md`](./Design/V1/design.md): UI V1 lịch sử; map runtime đã chuyển từ Leaflet sang MapLibre.
- [`Design/v2/renew_farm_logic/DESIGN.md`](./Design/v2/renew_farm_logic/DESIGN.md): ReNEW V2 design-only.
- [`superpowers/specs/2026-05-18-tree-map-flow-refactor-design.md`](./superpowers/specs/2026-05-18-tree-map-flow-refactor-design.md): đề xuất refactor chưa được triển khai đầy đủ.

Ảnh, video và HTML trong `Design/` là design assets. Chúng không phải bằng chứng một route hoặc feature đang hoạt động.

## Ngoài `/docs`

- [`../DOCUMENTATION.md`](../DOCUMENTATION.md): tài liệu root cũ; dùng `/docs` làm nguồn ưu tiên cho trạng thái hiện tại.
- [`../ReNEW.md`](../ReNEW.md): đặc tả rebuild PocketBase tương lai, không phải runtime hiện tại.
