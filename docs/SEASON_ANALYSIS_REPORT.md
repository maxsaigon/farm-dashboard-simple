# Báo cáo Phân tích Logic Mùa vụ và Đề xuất Cải tiến (2025 - 2026)

Tài liệu này phân tích cơ chế hoạt động của codebase hiện tại liên quan đến việc quản lý mùa vụ (đầu tư, sản lượng, hình ảnh) và đề xuất phương án cải tiến nhằm chuẩn bị cho mùa vụ mới 2026, tránh xung đột hoặc ghi đè lên dữ liệu mùa vụ 2025.

---

## 1. Phân tích hiện trạng codebase

Qua tìm hiểu codebase, các thành phần liên quan đến mùa vụ đang được thiết lập như sau:

### 1.1. Logic tính toán mùa vụ trong Quản lý đầu tư (`InvestmentManagement.tsx`)
- **Cơ chế**: Hiện tại, mùa vụ được xác định tự động dựa trên tháng trong năm bằng hàm `getSeasonFromDate(date: Date)`:
  - **Chuẩn bị (Pre-season)**: Tháng 4 - 6 (Tháng 3 - 5 trong JS `getMonth()`)
  - **Trong mùa (In-season)**: Tháng 7 - 9 (Tháng 6 - 8 trong JS `getMonth()`)
  - **Thu hoạch/Dọn vườn (Post-season)**: Tháng 10 - 12 (Tháng 9 - 11 trong JS `getMonth()`)
  - **Trái vụ/Nghỉ ngơi (Off-season)**: Tháng 1 - 3 (Tháng 0 - 2 trong JS `getMonth()`). Đặc biệt, các khoản chi tiêu trong giai đoạn này được tính cho **mùa vụ năm trước** (`year - 1`).
- **Thẻ hiển thị sản lượng/đầu tư**: `SeasonInvestmentCard` (Dòng 779) so sánh tổng chi phí của mùa vụ hiện tại (`currentSeasonYear`) với mùa vụ trước đó (`currentSeasonYear - 1`).
- **Hạn chế**:
  - Các mốc tháng phân định mùa vụ đang được **hardcode** cứng cho cây sầu riêng. Nếu thời tiết thay đổi hoặc nông trại ở vùng miền khác có chu kỳ khác, hệ thống sẽ tính toán sai lệch.
  - Việc tính toán dựa trên ngày hiện tại của hệ thống. Khi bước qua ngày 1/4/2026, ứng dụng tự động chuyển toàn bộ đầu tư mới sang mùa vụ 2026 và coi mùa vụ 2025 là "Mùa trước". Nông dân không có nút lựa chọn thủ công để xem lại chi tiết các mùa cũ.

### 1.2. Trạng thái cây và Sản lượng trái (`TreeDetail.tsx` & `types.ts`)
- **Cơ chế**: Tài liệu của một cây trồng (`Tree`) chứa các trường sản lượng trực tiếp:
  - `manualFruitCount` (Số lượng trái đếm thủ công)
  - `aiFruitCount` (Số lượng trái đếm qua AI)
  - `lastCountDate` & `healthStatus` & `notes`
- **Hạn chế nghiêm trọng (Nguy cơ mất dữ liệu)**:
  - Các trường này là giá trị đơn lẻ đại diện cho **trạng thái hiện tại**. 
  - Khi bắt đầu mùa vụ 2026, nếu nông dân tiến hành đếm trái mới và cập nhật vào cây, dữ liệu sản lượng của mùa vụ 2025 sẽ bị **ghi đè và biến mất hoàn toàn** khỏi tài liệu của cây đó.
  - Dữ liệu lịch sử chỉ còn lưu vết gián tiếp ở dạng nhật ký hoạt động (`auditLogs`) hoặc danh sách các lần nhập liệu thủ công (`manualEntries`), không được cấu trúc hóa để so sánh năng suất cây qua các năm.

### 1.3. Hình ảnh cây trồng (`ImageGallery.tsx` & `photo-service.ts`)
- **Cơ chế**: Ảnh chụp được tải lên Firebase Storage theo đường dẫn `farms/{farmId}/trees/{treeId}/photos/{timestamp}/{filename}` và tạo một tài liệu trong collection `photos` kèm theo `timestamp`.
- **Giao diện hiện tại**: `ImageGallery.tsx` tải toàn bộ ảnh thuộc về `treeId` và hiển thị trên một lưới ảnh duy nhất.
- **Hạn chế**:
  - Không có sự phân biệt hình ảnh giữa các năm. Ảnh hoa/trái non của 2026 sẽ nằm lẫn lộn với ảnh trái chín hoặc ảnh cây bị bệnh của năm 2025.
  - Người dùng không thể lọc nhanh: *"Chỉ hiển thị ảnh của mùa vụ 2025"* để đối chiếu tiến độ phát triển của trái ở cùng kỳ năm ngoái.

---

## 2. Các rủi ro lớn khi bước vào mùa vụ 2026

1. **Ghi đè dữ liệu cũ**: Nông dân nhập số trái mới (2026) làm mất dữ liệu trái thu hoạch năm 2025. Các thống kê tổng hợp của farm sẽ bị sai lệch (dashboard sẽ hiển thị số trái hiện tại thay vì tổng số trái đã thu hoạch ở mùa trước).
2. **Hỗn loạn thư viện ảnh**: Ảnh trái của hai mùa vụ khác nhau bị trộn lẫn, làm giảm giá trị của tính năng theo dõi tiến độ sinh trưởng trực quan.
3. **Thiếu tính chủ động**: Hệ thống tự động chuyển mùa vụ dựa vào thời gian thực tế của thiết bị, gây khó khăn nếu mùa vụ bị kéo dài hoặc thu hoạch muộn hơn dự kiến.

---

## 3. Đề xuất phương án cải tiến

Để giải quyết triệt để các vấn đề trên và chuẩn bị tốt nhất cho mùa vụ 2026, chúng tôi đề xuất cải tiến theo các hướng sau:

### Cải tiến 1: Bổ sung Context quản lý Mùa vụ tích cực (Active Season Context)
- **Giải pháp**: Xây dựng một `SeasonProvider` cung cấp trạng thái `activeSeason` toàn hệ thống (mặc định là `2026` dựa trên năm hiện tại).
- **Giao diện**: Thêm một thanh chọn mùa vụ nhỏ (Dropdown Selector) ở góc trên màn hình chính/bản đồ để người dùng có thể chủ động chuyển đổi giữa `Mùa vụ 2026` và `Mùa vụ 2025 (Đã kết thúc)`.
- **Tác động**: Toàn bộ dữ liệu hiển thị (Bản đồ, Thống kê, Danh sách cây, Chi phí đầu tư) sẽ tự động lọc theo mùa vụ được chọn.

### Cải tiến 2: Cải tiến cấu trúc lưu trữ dữ liệu Cây theo mùa vụ (Seasonal Tree Data)
Có 3 phương án để lưu trữ sản lượng trái và sức khỏe cây theo mùa:

| Phương án | Chi tiết kỹ thuật | Ưu điểm | Nhược điểm |
| :--- | :--- | :--- | :--- |
| **PA 1: Tích hợp Bản ghi Mùa vụ vào Cây (Bản đồ Lịch sử)** | Thêm trường `seasonalStats` vào `Tree` schema:<br>`seasonalStats: { [year: string]: { manualFruitCount: number, healthStatus: string, notes: string } }` | Đơn giản, không cần thay đổi cấu trúc bảng Firestore, truy vấn nhanh trong 1 lần đọc Tree. | Document size của cây có thể phình to nếu lưu quá nhiều năm (nhưng với 5-10 năm thì hoàn toàn không đáng kể). |
| **PA 2: Sử dụng Subcollection `seasons`** | Tạo subcollection mới dưới cây:<br>`farms/{farmId}/trees/{treeId}/seasons/{year}` chứa thông tin sản lượng/sức khỏe của năm đó. | Cực kỳ sạch sẽ về mặt kiến trúc dữ liệu, dễ mở rộng thêm nhiều trường đặc thù sau này. | Cần thực hiện truy vấn phụ (Sub-query) để lấy thông tin mùa vụ, tăng số lượng lượt đọc Firebase (Read operations). |
| **PA 3: Tổng hợp động từ dữ liệu nhập liệu** | Không lưu sản lượng trên cây nữa, mà tính toán động bằng cách lấy bản ghi cuối cùng của năm đó trong collection `manualEntries`. | Không trùng lặp dữ liệu. Dữ liệu luôn nhất quán. | Tốc độ tải trang sẽ chậm hơn do phải aggregate dữ liệu từ hàng ngàn bản ghi nhập liệu mỗi lần mở bản đồ hoặc danh sách. |

> [!TIP]
> **Khuyên dùng Phương án 1 (Bản đồ Lịch sử)** vì tính đơn giản trong triển khai, tối ưu chi phí đọc Firestore và rất phù hợp với quy mô nông trại gia đình/vừa phải của ứng dụng hiện tại.

### Cải tiến 3: Phân nhóm và Bộ lọc Ảnh theo Mùa vụ (Seasonal Image Gallery)
- **Thuộc tính dữ liệu**: Khi tải ảnh lên, tự động xác định và gán trường `seasonYear: number` vào tài liệu `Photo` trong Firestore (ví dụ: gán `2026` nếu thuộc mùa vụ 2026).
- **Giao diện ImageGallery**:
  - Chia lưới hiển thị ảnh thành các Tab: **"Mùa vụ 2026"** và **"Mùa vụ 2025"**.
  - Mặc định mở Tab của mùa vụ hiện tại.
  - Hiển thị nhãn thời gian rõ ràng (ví dụ: *Tháng 5, 2025* và *Tháng 5, 2026*) để nông dân dễ so sánh trạng thái cây qua cùng kỳ các năm.

---

## 4. Kế hoạch triển khai kỹ thuật (Draft Implementation Plan)

### Bước 1: Cập nhật Firebase Schema & Thêm dữ liệu mẫu
1. Cập nhật kiểu dữ liệu `Tree` trong `types.ts`:
   ```typescript
   export interface TreeSeasonalStats {
     manualFruitCount: number
     aiFruitCount: number
     healthStatus: string
     notes?: string
     updatedAt: Date
   }

   export interface Tree {
     // ... các trường hiện tại ...
     seasonalStats?: {
       [seasonYear: number]: TreeSeasonalStats
     }
   }
   ```
2. Cập nhật kiểu dữ liệu `Photo` trong `types.ts`:
   ```typescript
   export interface Photo {
     // ... các trường hiện tại ...
     seasonYear?: number
   }
   ```

### Bước 2: Viết Script Di trú dữ liệu (Migration Script)
Tạo một file script chạy một lần (one-off script) để:
- Quét toàn bộ cây trồng hiện tại.
- Lấy giá trị `manualFruitCount`, `aiFruitCount`, `healthStatus` hiện tại (đang là dữ liệu của 2025) và chuyển chúng vào trường `seasonalStats[2025]`.
- Quét toàn bộ ảnh trong hệ thống, dựa vào `timestamp` để gán `seasonYear: 2025` cho các ảnh chụp trước năm 2026.

### Bước 3: Cập nhật UI và Logic nghiệp vụ
1. **Context**: Tạo `SeasonContext` để lưu trữ năm mùa vụ đang chọn.
2. **TreeDetail**: 
   - Thay đổi các input cập nhật sản lượng trái để ghi đè vào `seasonalStats[selectedSeasonYear]` thay vì ghi trực tiếp vào các trường ở root.
   - Hiển thị lịch sử sản lượng các mùa trước ngay trên màn hình chi tiết cây để tạo sự trực quan.
3. **ImageGallery**:
   - Lọc hình ảnh theo `selectedSeasonYear` hoặc hiển thị nhóm theo năm.
   - Khi upload ảnh mới, tự động xác định `seasonYear` dựa vào ngày chụp và lưu vào Firestore.
4. **Dashboard**:
   - Cập nhật thống kê tổng số trái và chi phí đầu tư dựa vào mùa vụ đang chọn trên Header.
