# ⚙️ Bản tả Kỹ thuật & Tương tác Hệ thống (Functional & Interactive UI/UX Spec)

Tài liệu này cung cấp bản đồ chi tiết về các chức năng, trạng thái (React state), hành động của người dùng (User triggers) và cấu trúc cơ sở dữ liệu (Firestore schema) của ứng dụng **FarmManager**. 

Mục tiêu là cung cấp cho **Google Stitch Agent** đầy đủ logic vận hành để khi thiết kế lại UI/UX, Agent không làm mất mát bất kỳ luồng nghiệp vụ hoặc tính năng ngầm nào của ứng dụng.

---

## 🗺️ 1. Bản đồ Route & Cấu trúc Component

Mỗi đường dẫn (route) trong ứng dụng Next.js được cấu thành từ các Component và yêu cầu kiểm tra quyền truy cập cụ thể:

```
/ (Root Redirector)
 └── AuthGuard (Kiểm tra trạng thái đăng nhập)
      ├── Chưa đăng nhập ──> /login
      └── Đã đăng nhập
           ├── Chưa chọn nông trại ──> /select-farm
           └── Đã chọn nông trại
                ├── Có quyền đọc ──> /map
                └── Không có quyền ──> /no-access

/login
 └── LoginPage (Form đăng nhập bằng Email/Password)

/select-farm
 └── SelectFarmPage
      └── AuthGuard (Không bắt buộc chọn farm)
           └── SelectFarmContent
                ├── Danh sách Farm + Phân vai (Role)
                └── Modal: Tạo nông trại mới (Tên, Diện tích)

/map (Trang chủ chính)
 └── MapPage (Tải danh sách cây & khu vực từ Cache hoặc Firestore)
      └── AuthGuard (Bắt buộc chọn farm + Quyền đọc)
           ├── Header: Chế độ Làm việc | Bộ lọc | Cài đặt nâng cao
           ├── Leaflet Map (UnifiedMap)
           ├── Chi tiết Cây / Khu vực (BottomSheet trên di động)
           └── Chế độ làm việc On-farm (OnFarmWorkMode)
                ├── Theo dõi vị trí GPS thời gian thực (Polyline)
                ├── Đo khoảng cách & Gợi ý Cây trồng gần nhất (Turf.js)
                └── Hiệu chuẩn GPS chính xác cao (GPS Burst Calibration)

/zones (Danh sách khu vực)
 └── ZonesPage ──> Hiển thị danh sách phân khu & diện tích.

/admin-zones (Quản trị khu vực)
 └── AdminZonesPage ──> Thao tác CRUD ranh giới khu vực trên Map (Polygon JSON).

/trees (Danh mục cây sầu riêng)
 └── TreesPage 
      └── TreeList (Virtual scrolling 100+ cây, Tìm kiếm, Lọc, Sắp xếp)
      └── FullscreenTreeShowcase (Chi tiết cây, Lịch sử bón phân/tỉa cành, Ghi chú, Ảnh)

/camera (Chụp ảnh AI)
 └── CameraPage ──> Giao diện camera di động chụp ảnh sầu riêng & đếm trái AI.

/money (Quản lý chi phí)
 └── MoneyPage
      └── InvestmentManagement (Danh sách chi phí, Thống kê, So sánh mùa vụ)
```

---

## ⚡ 2. Quản lý Trạng thái & Các Hành động Tương tác (State & Action Spec)

### 2.1. Trang chọn Nông trại (`/select-farm`)
- **Trạng thái chính (State)**:
  - `selectedFarm`: Nông trại đang được click chọn (tạm thời trước khi xác nhận).
  - `showCreateModal`: Boolean điều khiển hiển thị modal tạo farm mới.
- **Hành động & Sự kiện (User Triggers & Handlers)**:
  - **Click thẻ Farm**: Kích hoạt `handleSelectFarm(farm)`. Cập nhật viền xanh lá làm nổi bật farm được chọn.
  - **Nút "Vào Nông Trại"**: Kích hoạt `handleConfirmSelection()`. Ghi đè `currentFarm` vào Context Auth, lưu `currentFarm_{uid}` vào `localStorage` và chuyển hướng sang `/map`.
  - **Nút "Tạo Nông Trại Mới"**: Mở modal nhập tên (`newFarmName`) và diện tích (`newFarmArea`). Nhấn nút "Tạo" sẽ gọi `FarmService.createFarm()` lên Firestore, sau đó tự động tải lại danh sách farm và chọn farm mới tạo.

---

### 2.2. Bản đồ Trang trại (`/map`)
- **Trạng thái chính (State)**:
  - `showTrees` & `showZones`: Toggles hiển thị điểm chấm tròn (Tree Markers) và đa giác ranh giới (Zone Polygons).
  - `mapLayer`: `'auto'` (vệ tinh khi zoom xa, đường phố khi zoom gần), `'street'` (đường phố), hoặc `'hybrid'` (vệ tinh).
  - `workModeActive`: Boolean chuyển đổi sang chế độ đi vườn thực tế.
- **Hành động & Sự kiện (User Triggers & Handlers)**:
  - **Click vào Point Cây trên Bản đồ**: Mở `FullscreenTreeShowcase` cho cây đó.
  - **Click vào Phân khu trên Bản đồ**: Highlight ranh giới khu vực, mở BottomSheet hiển thị thông tin khu vực (Diện tích, Số cây, Mô tả).
  - **Lọc Niên Vụ (Season Selector)**: Dropdown ở thanh điều hướng trên cùng thay đổi `selectedSeasonYear` (ví dụ: 2025, 2026). Khi niên vụ thay đổi, bản đồ tự động tải lại dữ liệu thống kê số trái và lịch sử bón phân của mùa vụ đó.

---

### 2.3. Chế độ Làm việc Vườn thực tế (`OnFarmWorkMode` trên `/map`)
Chế độ này được thiết kế để sử dụng trực tiếp ngoài thực địa bằng di động, có các tương tác đặc biệt:
- **Trạng thái chính (State)**:
  - `userPosition`: Tọa độ GPS hiện tại của nông dân.
  - `trackingHistory`: Mảng các điểm tọa độ đã đi qua để vẽ đường đi chấm lửng (breadcrumb).
  - `nearbyTrees`: Danh sách tối đa 5 cây sầu riêng gần vị trí nông dân nhất trong bán kính 50m (tính toán động qua thư viện `@turf/turf`).
- **Hành động & Sự kiện (User Triggers & Handlers)**:
  - **Tự động di chuyển bản đồ**: Bản đồ tự động zoom đến vị trí nông dân ở mức zoom cao nhất (Level 20) qua component `AutoCenterMap`.
  - **Calibrate (Hiệu chuẩn GPS)**: Khi nhấn nút tạo cây mới, hệ thống kích hoạt `getGPSBurst(4, 500)` để thu thập 4 mẫu định vị trong 2 giây rồi lấy trung bình nhằm giảm sai số do bóng cây hoặc thiết bị.
  - **Tạo Cây Mới**: Tự động xác định khu vực gần nhất (`nearestZone`), điền form và cho phép chụp ảnh.
  - **Đồng bộ Ngoại tuyến (Offline Photo Queue)**: Nếu thiết bị mất sóng hoặc không kết nối Wifi, ảnh chụp sẽ được chuyển thành Blob và ghi vào IndexedDB (`savePendingPhoto`). Khi có mạng Wifi trở lại, background worker sẽ tự động nén thông minh (`compressImageSmart`) và tải lên Firebase Storage.

---

### 2.4. Danh mục & Chi tiết Cây trồng (`/trees`)
- **Trình cuộn ảo (Virtual Scrolling)**: Sử dụng thư viện `@tanstack/react-virtual` để hiển thị mượt mà danh sách hàng trăm cây sầu riêng trên điện thoại yếu.
- **Pull-to-Refresh**: Nông dân có thể vuốt màn hình xuống để tải lại dữ liệu mới nhất từ Firestore.
- **Form chỉnh sửa chi tiết**:
  - **Cập nhật số lượng trái**: Nhập số trái đếm thủ công (`count`), hệ thống tự động lưu vào node mùa vụ `seasonalStats[year].manualFruitCount` của cây trồng.
  - **Cần chú ý (Attention Needed)**: Checkbox chuyển đổi cờ `needsAttention` (chữ màu đỏ/icon cảnh báo màu cam).
  - **Cập nhật vị trí GPS thủ công**: Hạn chế chỉ cho phép cập nhật trong bán kính **30m** so với vị trí cũ để tránh lỗi nhập sai dữ liệu. Yêu cầu nông dân tích chọn xác nhận nếu khoảng cách lệch trên **5m**.

---

### 2.5. Quản lý Đầu tư & Chi phí (`/money`)
- **Trạng thái chính (State)**:
  - `viewMode`: `'list'` (danh mục hóa đơn cuộn), `'summary'` (phân tích chi phí).
  - `filterCategory`: Lọc theo các nhóm chi phí như Phân bón, Thuốc bảo vệ thực vật, Công cụ, Lao động, Khác.
- **So sánh chi phí theo mùa**: 
  - Đọc Firestore và tính toán tổng số tiền đầu tư mùa này vs mùa trước, xuất tỉ lệ thay đổi phần trăm tăng/giảm kèm đồ thị xu hướng tháng.
  - Hỗ trợ chụp và tải ảnh hóa đơn mua hàng lên Storage để đối soát.

---

## 🗄️ 3. Định nghĩa Cấu trúc Dữ liệu (Firestore Data Schemas)

Agent Stitch cần duy trì chính xác cấu trúc trường dữ liệu sau khi thiết kế lại form hoặc màn hình nhập liệu:

### 3.1. Tài liệu Cây trồng (`/farms/{farmId}/trees/{treeId}`)
```typescript
interface Tree {
  id: string;               // Mã định danh (Firestore Doc ID)
  farmId: string;           // ID nông trại sở hữu
  name: string;             // Tên cây (Ví dụ: Cây Ri6 - Hàng 2 - Số 4)
  qrCode: string;           // Mã QR dán trên thân cây
  variety: string;          // Giống cây (Ví dụ: Monthong, Ri6, Musang King)
  zoneCode: string;         // Mã khu vực (Ví dụ: KHU_A)
  plantingDate: Date;       // Ngày trồng cây
  healthStatus: 'Excellent' | 'Good' | 'Fair' | 'Poor'; // Sức khỏe hiện tại
  needsAttention: boolean;  // Cờ đánh dấu cây cần chăm sóc đặc biệt
  manualFruitCount: number; // Số trái đếm thủ công vụ hiện tại
  aiFruitCount: number;     // Số trái quét được qua ảnh AI
  latitude: number;         // Vĩ độ GPS
  longitude: number;        // Kinh độ GPS
  gpsAccuracy: number;      // Sai số định vị (mét)
  
  // Lưu trữ dữ liệu lịch sử theo từng năm/niên vụ
  seasonalStats?: {
    [seasonYear: number]: {
      manualFruitCount: number;
      aiFruitCount: number;
      healthStatus: string;
      notes: string;
      updatedAt: Date;
    }
  };
  
  fertilizedDate?: Date;    // Ngày bón phân gần nhất
  prunedDate?: Date;        // Ngày tỉa cành gần nhất
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2. Tài liệu Phân khu (`/farms/{farmId}/zones/{zoneId}`)
```typescript
interface Zone {
  id: string;
  name: string;             // Tên phân khu (Ví dụ: Phân khu Đông)
  code: string;             // Mã phân khu (Ví dụ: ZONE_EAST)
  description: string;      // Mô tả chi tiết đất đai/địa hình
  color: string;            // Mã màu HEX hiển thị ranh giới trên bản đồ (#3b82f6)
  area: number;             // Diện tích tính bằng Hecta (ha)
  treeCount: number;        // Tổng số cây trồng trong khu vực
  isActive: boolean;        // Trạng thái hoạt động
  
  // Tọa độ các điểm tạo nên ranh giới đa giác (Polygon)
  boundaries: Array<{
    latitude: number;
    longitude: number;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.3. Tài liệu Khoản chi tiêu (`/farms/{farmId}/investments/{investmentId}`)
```typescript
interface Investment {
  id: string;
  amount: number;           // Số tiền chi tiêu (VNĐ)
  category: 'Phân bón' | 'Thuốc BVTV' | 'Công cụ' | 'Lao động' | 'Khác';
  subcategory?: string;     // Loại chi tiết (Ví dụ: Phân NPK 16-16-8)
  date: Date;               // Ngày mua hàng / chi trả
  notes?: string;           // Ghi chú chi tiết hóa đơn
  quantity?: number;        // Số lượng mua
  unit?: string;            // Đơn vị tính (Kg, Bao, Lít, Ngày công)
  pricePerUnit?: number;    // Đơn giá
  images?: string[];        // Danh sách URL ảnh hóa đơn đã tải lên Storage
  isRecurring: boolean;     // Cờ lặp lại chi phí
  recurringPeriod?: string; // Chu kỳ lặp lại (Hàng tháng, Hàng năm)
  createdBy: string;        // UID người tạo khoản chi này
  createdAt: Date;
}
```

---

## 💡 4. Những Điểm lưu ý Cực kỳ Quan trọng đối với UX thiết kế mới

1. **Interception (Tránh đè nút)**: Bottom navigation bar trên thiết bị di động phải nằm ở lớp dưới (`z-30` hoặc `z-[9999]` được cấu hình cẩn thận) để không che khuất hay đè lên các nút thao tác nổi như "Chụp ảnh nhanh" hoặc nút mở "Dev Tools".
2. **Quy trình điền Form đơn giản**: Khi nông dân đi vườn, tay họ thường bị bẩn hoặc đeo găng. Tránh bắt họ gõ bàn phím quá nhiều. Nên thiết kế các nút bấm tăng/giảm số lượng lớn (`+` / `-` lớn cho số lượng trái sầu riêng) và các nút chọn nhanh (Dropdown lớn, Select-chips thay vì gõ text).
3. **Độ tương phản cao ngoài trời nắng**: Nông trại sầu riêng có ánh sáng mặt trời chiếu trực tiếp rất mạnh. Thiết kế UI mới phải có độ tương phản văn bản cao (High Contrast), cỡ chữ to rõ, icon hiển thị sắc nét để dễ đọc dưới ánh nắng chói chang.
4. **Trực quan hóa sai số GPS**: Nông dân cần biết thiết bị của họ có đang nhận sóng tốt không. Hãy hiển thị vòng tròn sai số (Accuracy Circle) xung quanh marker của nông dân trên bản đồ một cách rõ ràng (Màu xanh: GPS tốt < 5m, Màu cam: Sai số trung bình 5-15m, Màu đỏ: Sóng yếu > 15m).
