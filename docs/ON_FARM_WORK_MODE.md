
# Chế Độ Làm Việc On-Farm (On-Farm Work Mode)

## 📋 Tổng Quan

**Chế độ làm việc On-Farm** là một tính năng mới được thiết kế đặc biệt cho nông dân làm việc trực tiếp trên nông trại. Chế độ này tối ưu hóa trải nghiệm mobile với giao diện fullscreen, GPS tracking tự động, và các tính năng hỗ trợ công việc thực địa.

## 🎯 Mục Đích

Giải quyết các vấn đề khi làm việc trên nông trại:
- ✅ **Fullscreen Map**: Tận dụng tối đa không gian màn hình điện thoại
- ✅ **GPS Tự Động**: Bật GPS và tracking ngay khi vào chế độ
- ✅ **Gợi Ý Cây Gần**: Hiển thị danh sách cây gần nhất theo GPS
- ✅ **Tạo Cây Mới**: Tạo cây mới tại vị trí hiện tại với GPS chính xác
- ✅ **UI Đơn Giản**: Loại bỏ các controls phức tạp, chỉ giữ lại tính năng cần thiết

## 🚀 Cách Sử Dụng

### 1. Kích Hoạt Chế Độ

Từ trang `/map`, nhấn nút **"Làm việc"** (màu xanh gradient) ở góc trên bên trái:

```
[🎒 Làm việc] [🌳 X Cây] [📍 Y Khu]
```

### 2. Cấp Quyền GPS

Khi lần đầu sử dụng, trình duyệt sẽ yêu cầu quyền truy cập vị trí:
- Nhấn **"Allow"** hoặc **"Cho phép"**
- Đảm bảo GPS/Location Services đã được bật trên điện thoại

### 3. Chờ GPS Khởi Động

- Màn hình sẽ hiển thị "📍 Đang lấy vị trí GPS..."
- Thường mất 3-10 giây để có tín hiệu GPS chính xác
- Độ chính xác tốt nhất khi ở ngoài trời

### 4. Xem Cây Gần Bạn

Khi GPS hoạt động, panel dưới cùng sẽ hiển thị:
- **Danh sách cây gần nhất** (trong bán kính 50m)
- **Khoảng cách** đến từng cây (màu đỏ < 10m, cam < 20m, xanh > 20m)
- Nhấn vào cây để xem chi tiết

### 5. Tạo Cây Mới

**Bước 1**: Đi đến vị trí muốn tạo cây mới

**Bước 2**: Nhấn nút **"Tạo cây mới tại đây"** (màu xanh gradient)

**Bước 3**: Điền thông tin:
- **Tên cây** (bắt buộc): Ví dụ "Cây sầu riêng số 1"
- **Giống cây** (bắt buộc): Chọn từ danh sách (Monthong, Musang King, v.v.)
- **Khu vực** (tùy chọn): Ví dụ "A01", "B05"

**Bước 4**: Kiểm tra vị trí GPS hiển thị

**Bước 5**: Nhấn **"Tạo cây"**

### 6. Thoát Chế Độ

Nhấn nút **✕** ở góc trên bên phải để quay lại chế độ bản đồ thông thường.

## 🗺️ Giao Diện

### Màn Hình Chính

```
┌─────────────────────────────────────┐
│  [GPS Status]            [✕ Close]  │
│                                      │
│                                      │
│         FULLSCREEN MAP               │
│      (Bản đồ toàn màn hình)         │
│                                      │
│    • Vị trí của bạn (chấm xanh)     │
│    • Cây gần (marker với khoảng cách)│
│    • Đường đi GPS (nếu có)          │
│                                      │
├─────────────────────────────────────┤
│  🗺️ Cây gần bạn (5)                 │
│  ┌─────────────────────────────┐   │
│  │ Cây Monthong A01      8.5m  │   │
│  │ Sầu riêng • A01             │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Cây Musang King B02   15.2m │   │
│  │ Musang King • B02           │   │
│  └─────────────────────────────┘   │
│                                      │
│  [➕ Tạo cây mới tại đây]           │
└─────────────────────────────────────┘
```

### Form Tạo Cây Mới

```
┌─────────────────────────────────────┐
│  ➕ Tạo cây mới tại vị trí hiện tại  │
│                                      │
│  Tên cây *                          │
│  [_________________________]        │
│                                      │
│  Giống cây *                        │
│  [Monthong ▼]                       │
│                                      │
│  Khu vực (tùy chọn)                 │
│  [_________________________]        │
│                                      │
│  📍 Vị trí GPS:                     │
│  10.762622, 106.660172              │
│  Độ chính xác: ±8m                  │
│                                      │
│  [Hủy]  [Tạo cây]                   │
└─────────────────────────────────────┘
```

## 🎨 Màu Sắc & Ý Nghĩa

### GPS Status
- 🟢 **Xanh lá + pulse**: GPS hoạt động tốt
- 🟡 **Vàng**: Đang kết nối GPS
- 🔴 **Đỏ**: Lỗi GPS hoặc không có quyền

### Khoảng Cách Cây
- 🔴 **Đỏ** (< 10m): Rất gần, có thể chạm tay
- 🟠 **Cam** (10-20m): Gần, trong tầm nhìn
- 🟢 **Xanh** (> 20m): Xa hơn

### Marker Trên Map
- 🔵 **Chấm xanh dương + pulse**: Vị trí của bạn
- 🔴 **Marker đỏ**: Cây được chọn
- 🟢 **Marker xanh**: Cây bình thường
- 🟡 **Marker vàng**: Cây non (treeStatus = "Cây Non")

## 🔧 Tính Năng Kỹ Thuật

### GPS Tracking
- **Service**: iOS-Optimized GPS (`lib/ios-optimized-gps.ts`)
- **Độ chính xác**: High accuracy mode
- **Cập nhật**: Mỗi 3 mét di chuyển
- **Timeout**: 5 giây
- **Lịch sử**: Lưu 50 điểm gần nhất

### Proximity Detection
- **Bán kính**: 50 mét
- **Thuật toán**: Turf.js distance calculation
- **Sắp xếp**: Theo khoảng cách tăng dần
- **Giới hạn**: Hiển thị tối đa 5 cây gần nhất

### Auto-Center Map
- Tự động di chuyển map theo vị trí GPS
- Zoom level: 20 (rất gần, ~10m radius)
- Animation: Smooth transition

### Tạo Cây Mới
- Lưu tọa độ GPS chính xác (latitude, longitude)
- Lưu độ chính xác GPS (gpsAccuracy)
- Tự động set plantingDate = ngày hiện tại
- Tự động set healthStatus = "Good"
- Validation: Bắt buộc có tên và giống cây

## 📱 Tối Ưu Mobile

### Fullscreen Mode
- `position: fixed; inset: 0`
- Chiếm toàn bộ viewport
- Không có header/footer
- z-index: 50 (cao nhất)

### Touch-Friendly
- Nút lớn, dễ nhấn (min 44x44px)
- Spacing rộng giữa các elements
- Active states với scale animation
- Haptic feedback (nếu có)

### Performance
- Lazy loading map tiles
- Debounced GPS updates
- Memoized calculations
- Efficient re-renders

## 🐛 Xử Lý Lỗi

### GPS Không Hoạt Động
**Nguyên nhân**:
- Quyền bị từ chối
- GPS tắt trên thiết bị
- Trong nhà, tín hiệu yếu
- Trình duyệt không hỗ trợ

**Giải pháp**:
1. Kiểm tra Settings → Privacy → Location Services
2. Bật GPS/Location trên điện thoại
3. Ra ngoài trời để có tín hiệu tốt hơn
4. Thử trình duyệt khác (Chrome, Safari)
5. Reload trang và cấp quyền lại

### Không Thấy Cây Gần
**Nguyên nhân**:
- Không có cây nào trong bán kính 50m
- GPS chưa chính xác
- Dữ liệu cây chưa load

**Giải pháp**:
- Chờ GPS ổn định (độ chính xác < 20m)
- Di chuyển gần cây hơn
- Kiểm tra dữ liệu cây có tọa độ GPS

### Không Tạo Được Cây
**Nguyên nhân**:
- Chưa đăng nhập
- Không có quyền write
- GPS chưa sẵn sàng
- Thiếu thông tin bắt buộc

**Giải pháp**:
- Đăng nhập lại
- Kiểm tra quyền truy cập farm
- Chờ GPS có tín hiệu
- Điền đầy đủ tên và giống cây

## 🔐 Bảo Mật & Quyền

### Yêu Cầu
- ✅ Đã đăng nhập (user.uid)
- ✅ Có quyền truy cập farm (farmId)
- ✅ Có quyền write để tạo cây mới

### Kiểm Tra
```typescript
if (!user) {
  alert('Vui lòng đăng nhập')
  return
}

const hasAccess = await FarmService.checkFarmAccess(
  userId, 
  farmId, 
  ['write']
)
```

## 📊 Dữ Liệu Lưu Trữ

### Cây Mới (Tree Document)
```typescript
{
  id: string,                    // Auto-generated
  farmId: string,                // From current farm
  name: string,                  // User input
  variety: string,               // User selection
  zoneCode: string,              // User input (optional)
  latitude: number,              // From GPS
  longitude: number,             // From GPS
  gpsAccuracy: number,           // From GPS
  plantingDate: Date,            // Current date
  healthStatus: 'Good',          // Default
  manualFruitCount: 0,           // Default
  aiFruitCount: 0,               // Default
  needsAttention: false,         // Default
  createdAt: Date,               // Timestamp
  updatedAt: Date                // Timestamp
}
```

## 🎓 Best Practices

### Khi Làm Việc Trên Nông Trại
1. **Bật GPS trước**: Đảm bảo GPS đã bật trước khi vào chế độ
2. **Ở ngoài trời**: GPS hoạt động tốt nhất ở không gian mở
3. **Chờ ổn định**: Đợi độ chính xác < 15m trước khi tạo cây
4. **Đặt tên rõ ràng**: Dùng tên dễ nhớ, dễ tìm (VD: "Cây A01-001")
5. **Kiểm tra vị trí**: Xác nhận vị trí GPS trước khi tạo cây
6. **Lưu thường xuyên**: Tạo cây ngay khi đến vị trí, đừng để sau

### Khi Gặp Vấn Đề
1. **Reload trang**: Thử F5 hoặc pull-to-refresh
2. **Tắt/Bật GPS**: Toggle GPS trong Settings
3. **Đăng xuất/nhập**: Clear session và đăng nhập lại
4. **Xóa cache**: Clear browser cache nếu cần
5. **Liên hệ support**: Báo lỗi với screenshot

## 🚀 Roadmap & Cải Tiến

### Đã Hoàn Thành ✅
- [x] Fullscreen map mode
- [x] Auto GPS tracking
- [x] Proximity detection (50m radius)
- [x] Nearby trees list with distance
- [x] Create tree at current location
- [x] iOS-optimized GPS service
- [x] Auto-center map to user location

### Đang Phát Triển 🔄
- [ ] Offline mode support
- [ ] Voice commands
- [ ] Photo capture integration
- [ ] Quick actions (water, fertilize, prune)
- [ ] Route optimization for visiting trees

### Kế Hoạch Tương Lai 📅
- [ ] AR mode (Augmented Reality)
- [ ] Tree health AI detection
- [ ] Weather integration
- [ ] Task scheduling
- [ ] Team collaboration features

## 📞 Hỗ Trợ

### Liên Hệ
- **Email**: support@farm-dashboard.com
- **Phone**: +84 xxx xxx xxx
- **GitHub Issues**: [Link to repo]

### Tài Liệu Liên Quan
- [GPS Tracking Service](../lib/ios-optimized-gps.ts)
- [Map Page Implementation](../app/map/page.tsx)
- [OnFarmWorkMode Component](../components/OnFarmWorkMode.tsx)
- [Architecture Guide](./architecture/ARCHITECTURE.md)

## 📝 Changelog

### Version 1.0.0 (2025-01-03)
- 🎉 Initial release
- ✨ Fullscreen work mode
- 📍 GPS tracking with iOS optimization
- 🌳 Nearby trees detection
- ➕ Create tree at GPS location
- 📱 Mobile-first design

---

**Tác giả**: Kilo Code  
**Ngày tạo**: 03/01/2025  
**Phiên bản**: 1.0.0  
**Trạng thái**: Production Ready ✅