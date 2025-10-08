# Satellite Map Implementation - Auto-Switching Hybrid Mode

## Tổng quan

Đã thêm chức năng xem bản đồ vệ tinh sử dụng **Esri World Imagery** (miễn phí) vào trang map hiện tại với 3 chế độ xem và tính năng **tự động chuyển đổi thông minh**:

1. **🤖 Tự động** (Mặc định) - Tự động chuyển đổi giữa Hybrid và Bản đồ dựa trên zoom level
2. **🗺️ Bản đồ** - Chỉ hiển thị OpenStreetMap (bản đồ đường phố)
3. **🌍 Hybrid** - Kết hợp ảnh vệ tinh + nhãn OSM (độ mờ 40%)

## Thay đổi

### Files đã sửa đổi:
- `components/UnifiedMap.tsx` - Thêm satellite layer, layer toggle và auto-switching logic
- `app/globals.css` - Thêm CSS transitions cho chuyển đổi mượt mà

### Files backup:
- `components/UnifiedMap.backup.tsx` - Bản backup của code gốc

### Tính năng mới:

1. **🤖 Chế độ Tự động (Auto Mode)** - TÍNH NĂNG MỚI!
   - Tự động phát hiện zoom level
   - Zoom 1-18: Sử dụng Hybrid mode (vệ tinh + nhãn)
   - Zoom 19+: Tự động chuyển sang Bản đồ (do Esri không có data)
   - Chuyển đổi mượt mà với CSS transitions
   - Hiển thị chế độ hiện tại trong nút: "🤖 Tự động (Hybrid)" hoặc "🤖 Tự động (Bản đồ)"

2. **Layer Toggle Control** (Góc trên bên phải)
   - 3 nút để chuyển đổi giữa các chế độ xem
   - Giao diện đơn giản, dễ sử dụng
   - Mặc định: Auto mode

3. **Esri World Imagery**
   - Nguồn: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
   - Miễn phí, không cần API key
   - Độ phân giải cao, cập nhật thường xuyên
   - Hỗ trợ zoom level lên đến 19 (maxZoom: 19)
   - Tự động fallback sang OSM khi không có data

4. **Hybrid Mode**
   - Ảnh vệ tinh làm nền
   - OSM labels với độ mờ 40% để thấy tên đường, địa danh
   - Cân bằng tốt giữa chi tiết địa hình và thông tin địa lý

5. **Smooth Transitions**
   - CSS transitions 0.5s cho layer opacity
   - Chuyển đổi mượt mà giữa các chế độ
   - Không bị giật lag khi zoom

## Cách sử dụng

### Trên trang Map:
1. Mở trang `/map`
2. Bản đồ sẽ tự động ở chế độ **Tự động**
3. Zoom in/out để thấy tự động chuyển đổi:
   - Zoom 1-18: Hybrid mode (vệ tinh + nhãn)
   - Zoom 19+: Street map (chi tiết cao)
4. Hoặc chọn thủ công ở góc trên bên phải:
   - **🤖 Tự động**: Để hệ thống tự chuyển đổi (khuyến nghị)
   - **🗺️ Bản đồ**: Luôn dùng bản đồ đường phố
   - **🌍 Hybrid**: Luôn dùng vệ tinh + nhãn

## Rollback Instructions

Nếu ảnh vệ tinh không hoạt động tốt hoặc muốn quay lại phiên bản cũ:

### Cách 1: Sử dụng Git
```bash
# Xem lịch sử commit
git log --oneline

# Rollback về commit trước khi thêm satellite
git revert <commit-hash>
```

### Cách 2: Khôi phục từ backup
```bash
# Copy file backup về file chính
cp components/UnifiedMap.backup.tsx components/UnifiedMap.tsx
```

### Cách 3: Xóa thủ công
Mở `components/UnifiedMap.tsx` và:

1. Xóa import `LayersControl` từ dòng 4
2. Xóa type `MapLayerType` (dòng ~72-73)
3. Xóa state `mapLayer` (dòng ~403)
4. Thay thế phần TileLayer (dòng ~735-760) bằng:
```tsx
<TileLayer
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  maxZoom={22}
/>
```
5. Xóa Map Layer Toggle control (dòng ~900-935)
6. Đổi `top-36` thành `top-4` cho Compact GPS Status (dòng ~1210)

## Technical Details

### Auto-Switching Logic
```tsx
const handleZoomEnd = () => {
  const zoom = map.getZoom()
  // Esri World Imagery has good data up to zoom 18
  // Switch to street map at zoom 19+ for better detail
  if (zoom >= 19) {
    onAutoSwitch('street')
  } else {
    onAutoSwitch('hybrid')
  }
}
```

### Satellite Layer Configuration
```tsx
<TileLayer
  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
  attribution='Tiles &copy; Esri'
  maxZoom={19}  // Limited to 19 to avoid "No Data" tiles
  className="satellite-layer"
/>
```

### Hybrid Mode Implementation
- Satellite layer: Full opacity (1.0)
- OSM layer: 40% opacity (0.4) in hybrid, 100% in street mode
- Smooth transitions với CSS: `transition: opacity 0.5s ease-in-out`
- OSM layer luôn được render để đảm bảo có data ở mọi zoom level

### Performance Notes
- Esri tiles được cache bởi browser
- CSS transitions tối ưu cho chuyển đổi mượt mà
- Không ảnh hưởng đến hiệu suất GPS tracking
- Tương thích với tất cả tính năng hiện có
- Auto-switching chỉ trigger khi zoom thay đổi (không continuous)

## Alternatives

Nếu muốn thử các nguồn ảnh vệ tinh khác:

### 1. Mapbox Satellite (Cần API key)
```tsx
url="https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.jpg?access_token=YOUR_TOKEN"
```

### 2. Google Maps Satellite (Cần API key)
Cần chuyển sang Google Maps API thay vì Leaflet

### 3. Bing Maps Aerial (Cần API key)
```tsx
url="https://ecn.t{s}.tiles.virtualearth.net/tiles/a{q}.jpeg?g=1"
```

## Support

Nếu gặp vấn đề:
1. Kiểm tra console log trong browser
2. Đảm bảo kết nối internet ổn định
3. Thử clear browser cache
4. Rollback về phiên bản cũ nếu cần

## Credits

- **Esri World Imagery**: Miễn phí cho sử dụng phi thương mại
- **OpenStreetMap**: Dữ liệu bản đồ mở
- **Leaflet**: Thư viện bản đồ JavaScript

## Giải thích Auto-Switching

### Tại sao cần Auto-Switching?
Esri World Imagery không có dữ liệu ở zoom level cao (20+), dẫn đến hiển thị "Map Data Not Yet Available". Auto-switching giải quyết vấn đề này bằng cách:

1. **Zoom 1-19**: Sử dụng Hybrid mode
   - Esri có data tốt
   - Hiển thị ảnh vệ tinh + nhãn OSM
   - Tốt cho xem tổng quan và vùng rộng

2. **Zoom 20+**: Tự động chuyển sang Street map
   - OSM có data chi tiết ở mọi zoom level
   - Hiển thị đường phố, tòa nhà rõ ràng
   - Tốt cho xem chi tiết từng cây, vị trí chính xác

### Lợi ích:
- ✅ Không bao giờ thấy "No Data" tiles
- ✅ Luôn có data tốt nhất ở mọi zoom level
- ✅ Chuyển đổi mượt mà, không giật lag
- ✅ Người dùng không cần lo lắng về việc chọn layer

---

**Ngày tạo**: 2025-01-08
**Phiên bản**: 2.0 (Auto-Switching)
**Trạng thái**: ✅ Hoạt động tốt với auto-switching thông minh