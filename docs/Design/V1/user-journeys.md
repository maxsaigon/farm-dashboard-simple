# 🧭 Quy trình Nghiệp vụ & Trải nghiệm Người dùng (Detailed User Journeys & Business Logic)

Tài liệu này đặc tả chi tiết các luồng trải nghiệm người dùng thực tế (User Journeys), cùng với các thuật toán, công thức tính toán và logic đồng bộ chạy ngầm của ứng dụng **FarmManager**.

---

## 👥 1. Các Vai trò Người dùng (User Personas & Permissions)

| Vai trò | Phân quyền chính | Bối cảnh sử dụng |
| :--- | :--- | :--- |
| **Nông dân / Công nhân** (`worker`) | - Xem bản đồ & danh sách cây trồng.<br>- Cập nhật số lượng trái & trạng thái sức khỏe.<br>- Chụp ảnh AI và bón phân, tỉa cành.<br>- **Không** được vẽ ranh giới khu vực hoặc xóa cây. | Thao tác trực tiếp ngoài vườn sầu riêng, sử dụng điện thoại di động dưới trời nắng, thường xuyên bị mất kết nối mạng. |
| **Chủ trang trại / Quản lý** (`manager` / `owner`) | - Toàn quyền quản lý cây trồng (CRUD).<br>- Vẽ và chỉnh sửa đa giác ranh giới phân khu (`/admin-zones`).<br>- Ghi nhận và duyệt chi phí vật tư, nhân công (`/money`). | Giám sát hoạt động từ xa hoặc trực tiếp tại chòi nông trại. Sử dụng cả máy tính bảng và điện thoại di động. |
| **Super Admin** (`super_admin`) | - Quản lý tất cả tài khoản, phân quyền hệ thống.<br>- Tạo mới nông trại, gán nông trại cho tổ chức.<br>- Xem nhật ký kiểm toán (Audit Logs) toàn hệ thống. | Quản lý nền tảng ở văn phòng, cấu hình hệ thống và tối ưu hóa tài nguyên máy chủ. |

---

## 🏃 2. Các Hành trình Tương tác Cốt lõi (Critical User Journeys)

### 2.1. Hành trình 1: Kiểm tra Cây trồng & Cập nhật Số lượng Trái (On-Field Tree Audit)
* **Bối cảnh**: Nông dân đi kiểm tra sức khỏe cây sầu riêng Ri6 tại Khu A và đếm số lượng trái trước thu hoạch.
* **Luồng tương tác**:
  ```mermaid
  sequenceDiagram
      actor Worker as Nông dân
      participant UI as Giao diện /trees
      participant DB as Cache/Firestore
      
      Worker->>UI: Tìm cây (nhập tên hoặc quét mã QR)
      UI->>DB: Truy vấn dữ liệu cây
      DB-->>UI: Hiển thị thẻ cây (Tree Card)
      Worker->>UI: Nhấp vào thẻ cây
      UI->>UI: Mở FullscreenTreeShowcase (BottomSheet)
      Worker->>UI: Nhấp "Chỉnh sửa"
      Worker->>UI: Thay đổi số trái đếm thủ công (ví dụ: 45)
      Worker->>UI: Tích chọn "Cần chú ý" (nếu phát hiện sâu bệnh)
      Worker->>UI: Nhấn "Lưu"
      UI->>DB: Cập nhật seasonalStats[2026].manualFruitCount = 45
      UI-->>Worker: Hiển thị Toast "Lưu thành công!"
  ```

---

### 2.2. Hành trình 2: Hiệu chuẩn Định vị & Tạo Cây mới ngoài thực địa
* **Bối cảnh**: Nông dân trồng một cây sầu riêng mới và muốn lấy tọa độ GPS chính xác nhất để ghim lên bản đồ. Do tán cây sầu riêng rộng che khuất sóng vệ tinh, GPS của điện thoại thường bị trôi (GPS Bounce).
* **Giải pháp kỹ thuật (GPS Burst Calibration)**:
  1. Khi nông dân nhấn nút **"Hiệu chuẩn tọa độ" (Calibrate)**, hệ thống kích hoạt hàm `gpsTrackingService.getGPSBurst(samples=4, intervalMs=500)`.
  2. Hệ thống thu thập 4 mẫu tọa độ liên tục trong vòng 2 giây.
  3. Lọc bỏ các mẫu có sai số bán kính định vị (Accuracy Radius) `> 15m`.
  4. Lấy trung bình cộng (Arithmetic Mean) của các tọa độ còn lại để ra tọa độ cuối cùng, giúp tăng độ chính xác lên gấp đôi.
* **Luồng tương tác**:
  ```
  [Nông dân: Nhấn nút tạo cây]
         │
         ▼
  [Kích hoạt định vị thiết bị]
         │
         ▼
  [Lấy 4 mẫu GPS liên tiếp trong 2 giây]
         │
         ▼
  [Lọc bỏ mẫu sai số > 15m] ──(Tất cả mẫu yếu?)──> [Cảnh báo: Sóng GPS yếu, hãy ra vùng trống]
         │ Có ít nhất 1 mẫu tốt
         ▼
  [Tính trung bình tọa độ các mẫu tốt]
         │
         ▼
  [Tự động điền vĩ độ/kinh độ mới] ──> [Tính toán phân khu gần nhất bằng Polygon Containment]
  ```

---

### 2.3. Hành trình 3: Chỉnh sửa Vị trí Cây & Cảnh báo Sai lệch Khoảng cách (Coordinates Guard)
* **Bối cảnh**: Quản lý muốn điều chỉnh lại vị trí của một cây bị lệch trên bản đồ vệ tinh.
* **Ràng buộc nghiệp vụ (Business Rules)**:
  - Do tọa độ được lưu trữ trực tiếp ảnh hưởng đến việc chỉ đường và quét mã QR ngoài thực địa, hệ thống áp dụng **Coordinates Guard** để tránh lỗi nhập sai (ví dụ: gõ nhầm số kinh/vĩ độ khiến cây bay ra biển).
  - Khoảng cách sai lệch giữa tọa độ cũ và tọa độ mới được tính bằng công thức **Haversine**:
    $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
    *(Trong đó $R = 6371000$m, $\phi$ là vĩ độ, $\lambda$ là kinh độ)*
  - **Quy tắc chặn cảnh báo**:
    - **Khoảng cách < 5m**: Cho phép lưu tự động không cần cảnh báo.
    - **Khoảng cách từ 5m - 30m**: Hiển thị hộp thoại xác nhận: *"Tọa độ mới lệch X mét so với vị trí cũ. Bạn có chắc chắn muốn cập nhật?"*.
    - **Khoảng cách > 30m**: Chặn không cho lưu và hiển thị thông báo lỗi: *"Không thể dịch chuyển cây vượt quá 30m. Vui lòng di chuyển lại gần cây hoặc kiểm tra lại tọa độ."* (trừ tài khoản có quyền `super_admin`).

---

### 2.4. Hành trình 4: Chụp ảnh AI & Quản lý hàng đợi Ngoại tuyến (Offline Photo Sync Queue)
* **Bối cảnh**: Nông dân chụp ảnh trái sầu riêng ngoài vườn để AI đếm số lượng trái, nhưng khu vực này hoàn toàn không có sóng di động (offline).
* **Quy trình xử lý ngoại tuyến (Offline Architecture)**:
  1. **Chụp ảnh**: Ứng dụng chụp khung hình camera và chuyển đổi thành đối tượng `Blob`.
  2. **Nén ảnh**: Sử dụng `photoCompression.compressImageSmart()` để giảm dung lượng file xuống còn `< 150KB` bằng cách giảm độ phân giải xuống `1080p` và chất lượng JPEG xuống `0.75` nhằm tiết kiệm băng thông khi gửi qua mạng di động yếu.
  3. **Lưu trữ cục bộ**: Do không thể upload lên Storage, Blob ảnh được ghi trực tiếp vào cơ sở dữ liệu **IndexedDB** (`offline-photos-db`) kèm ID của cây trồng và ghi chú.
  4. **Lắng nghe kết nối**: Trình duyệt đăng ký Service Worker lắng nghe sự kiện `'online'` của hệ thống hoặc component `offlineSyncService` phát hiện trạng thái mạng được khôi phục.
  5. **Đồng bộ hóa ngầm (Background Sync)**: Khi có mạng, hàng đợi tự động đẩy ảnh lên Firebase Storage, lấy URL ảnh, gửi yêu cầu đếm trái tới Mock AI API, cập nhật trường `aiFruitCount` và cập nhật lịch sử nhật ký của cây trồng trên Firestore.

---

### 2.5. Hành trình 5: Quản trị khu vực & Tính toán Diện tích Phân khu (Zone drawing & Math)
* **Bối cảnh**: Chủ trang trại vẽ ranh giới một phân khu mới (Khu C) trên bản đồ vệ tinh.
* **Logic tính toán**:
  - Khi chủ trang trại click các điểm trên bản đồ để tạo thành một đa giác khép kín (Polygon), tọa độ của các đỉnh được lưu dưới dạng mảng: `boundaries: Array<{latitude: number, longitude: number}>`.
  - **Tính toán diện tích (Area Computation)**: Diện tích được tính toán thời gian thực bằng công thức diện tích đa giác phẳng sau khi đã chuyển đổi tọa độ địa lý (kinh vĩ độ) sang hệ tọa độ phẳng UTM gần đúng xung quanh tâm nông trại (bằng mét):
    $$x_i = (Longitude_i \times \frac{\pi}{180}) \times R \times \cos(Latitude_{center})$$
    $$y_i = (Latitude_i \times \frac{\pi}{180}) \times R$$
    $$Diện\ tích = \frac{1}{2} \left| \sum_{i=0}^{n-1} (x_i y_{i+1} - x_{i+1} y_i) \right| \div 10000 \quad (Hecta)$$
  - **Thuộc nhóm phân khu (Point-in-Polygon Check)**: Khi một cây được thêm mới, hệ thống tự động chạy thuật toán tia cắt (Ray-casting algorithm) để kiểm tra tọa độ cây có nằm trong đa giác phân khu nào không. Nếu có, hệ thống tự động gán `zoneCode` cho cây đó mà nông dân không cần phải chọn thủ công.
