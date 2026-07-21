# Trang Thống Kê mùa vụ

> Status: Current
> Baseline: package `0.1.0`, Git commit `919cba3`
> Last reviewed: 2026-07-21
> Search keywords: thống kê, mùa vụ, so sánh mùa vụ, đếm trái, kết quả đếm trái, chi tiêu, đầu tư, statistics, season comparison

## 1. Phạm vi

Tài liệu này mô tả thiết kế và hành vi hiện tại của trang **Thống Kê** cho một nông trại. Tính năng được triển khai tại route `/statistics`.

Trang giúp người dùng trả lời nhanh ba câu hỏi:

1. Mùa này đã đếm được bao nhiêu trái và còn bao nhiêu cây chưa đếm?
2. Đã chi bao nhiêu tiền, chủ yếu vào hạng mục nào?
3. So với một mùa vụ khác thì các thông số tăng hay giảm?

Đối tượng sử dụng chính là nông dân, vì vậy giao diện phải ưu tiên điện thoại, chữ dễ đọc, thao tác đơn giản và hạn chế thuật ngữ kỹ thuật.

### Trạng thái triển khai

- Đã có route `/statistics` được bảo vệ bằng quyền đọc nông trại.
- Đã có bộ chọn hai mùa bất kỳ trong danh sách mùa của nông trại.
- Đã có thống kê đếm trái, chi tiêu, so sánh mùa, chi tiết theo khu vực và chi tiêu theo tháng.
- Đã bổ sung `seasonYear` cho khoản chi mới; khoản chi cũ tiếp tục dùng năm của `date` làm giá trị dự phòng.
- Đã thêm lối vào menu chính và giữ trang ngoài bottom tab.
- Công thức tổng hợp nằm trong `lib/season-statistics.ts` và có unit test riêng.

## 2. Vị trí và điều hướng

- Tạo route mới: `/statistics`.
- Tên hiển thị: **Thống Kê mùa vụ**.
- Thêm lối vào menu hamburger trên mobile.
- Trên desktop, thêm vào thanh điều hướng nếu đủ không gian; nếu không thì đặt trong menu **Thêm**.
- Không thêm trang vào `TABS` trong `components/ui/BottomTabBar.tsx`.
- Không thêm `/statistics` vào `allowedPaths` của bottom tab, để bottom tab không xuất hiện trên trang này.
- Trên mobile cần có nút quay lại rõ ràng.

Lý do không đặt trong bottom tab: đây là chức năng xem định kỳ, không phải thao tác thường xuyên khi người dùng đang làm việc ngoài vườn.

## 3. Cấu trúc giao diện đề xuất

### 3.1. Bộ chọn mùa vụ

Phần đầu trang gồm:

- Tên nông trại hiện tại.
- Bộ chọn **Mùa đang xem**.
- Bộ chọn **So sánh với**.
- Mặc định so sánh mùa đang chọn với mùa gần nhất còn lại có dữ liệu.
- Cho phép chọn hai mùa bất kỳ có trong `currentFarm.seasons`.

Không tự đổi `selectedSeasonYear` dùng chung của toàn ứng dụng khi người dùng chỉ thay mùa đối chiếu.

### 3.2. Tổng quan mùa vụ

Hiển thị bốn thẻ lớn:

1. Tổng số trái đã đếm.
2. Tiến độ đếm: `đã đếm / số cây cần đếm`.
3. Tổng chi phí.
4. Chi phí trung bình trên mỗi cây cần đếm.

Mỗi thẻ hiển thị thêm chênh lệch so với mùa đối chiếu, ví dụ:

- `Tăng 1.250 trái (+12%)`.
- `Giảm 8 triệu (-9%)`.
- Nếu mùa đối chiếu không có dữ liệu, hiển thị **Chưa có số liệu để so sánh**, không hiển thị `0%`.

### 3.3. Kết quả đếm trái

- Thanh tiến độ lớn và dễ đọc.
- Số cây đã đếm.
- Số cây chưa đếm.
- Số cây non không cần đếm.
- Tổng số trái.
- Trung bình số trái trên một cây đã đếm.
- Phân bổ theo khu vực: tên khu, số trái, số cây đã đếm và tỷ lệ hoàn thành.
- Nút **Xem cây chưa đếm** dẫn sang bản đồ hoặc danh sách cây với bộ lọc phù hợp.

### 3.4. Chi tiêu mùa vụ

- Tổng số tiền.
- Số khoản chi.
- Biểu đồ cột ngang theo `category`, ví dụ Phân bón, Thuốc BVTV, Lao động, Công cụ và Khác.
- Danh sách ba hạng mục có chi phí lớn nhất.
- Chi phí trung bình trên mỗi cây cần đếm.
- Xu hướng chi theo tháng nằm trong phần **Xem chi tiết**, không hiển thị mặc định để tránh làm trang quá tải.
- Có thể mở rộng chi tiết theo `subcategory` khi người dùng chọn một hạng mục.

### 3.5. So sánh hai mùa

Hiển thị bảng đơn giản:

| Thông số | Mùa đang xem | Mùa đối chiếu | Chênh lệch |
|---|---:|---:|---:|
| Tổng trái | ... | ... | ... |
| Cây đã đếm | ... | ... | ... |
| Tiến độ đếm | ... | ... | ... |
| Trái/cây đã đếm | ... | ... | ... |
| Tổng chi phí | ... | ... | ... |
| Số khoản chi | ... | ... | ... |
| Chi phí/cây | ... | ... | ... |

Bên dưới bảng là phần so sánh từng hạng mục chi tiêu. Luôn dùng chữ **Tăng/Giảm** và số cụ thể; màu chỉ là tín hiệu phụ, không phải cách duy nhất để truyền đạt kết quả.

## 4. Nguồn dữ liệu và công thức

### 4.1. Kết quả đếm trái

Dữ liệu lấy từ `Tree.seasonalStats[seasonYear]` thông qua logic hiện có trong `lib/tree-season-status.ts`:

- Cây non có trạng thái `not_applicable` và không nằm trong mẫu số tiến độ.
- Cây trưởng thành có `fruitCountRecordedAt`, hoặc có số đếm cũ lớn hơn `0`, được xem là đã đếm.
- Cây trưởng thành chưa có bản ghi được xem là chưa đếm.
- Cây đã xác nhận `0 trái` vẫn phải được tính là đã đếm nếu có `fruitCountRecordedAt`.
- Mỗi cây chỉ dùng một kết quả cuối cùng: thủ công hoặc AI theo `fruitCountSource`; không cộng hai giá trị để tránh đếm trùng.

Công thức:

- `Tổng trái = tổng kết quả hợp lệ của các cây đã đếm`.
- `Trái/cây đã đếm = tổng trái / số cây đã đếm`.
- `Tiến độ đếm = số cây đã đếm / số cây trưởng thành cần đếm`.
- Dữ liệu theo khu được nhóm theo `zoneId`, dự phòng bằng `zoneCode`; cây chưa có khu nằm trong nhóm **Chưa phân khu**.

Không tái sử dụng trực tiếp `calculateFarmStatistics()` trong `lib/firestore.ts` cho trang mới. Hàm hiện tại dùng trường root của cây và cộng `manualFruitCount` với `aiFruitCount`, có thể làm sai thống kê theo mùa và đếm trùng kết quả.

### 4.2. Chi tiêu

Dữ liệu lấy từ `farms/{farmId}/investments`:

- `Tổng chi = tổng amount`.
- `Số khoản chi = số bản ghi`.
- `Chi theo hạng mục = nhóm theo category`.
- `Chi theo hạng mục con = nhóm theo subcategory`.
- `Chi theo tháng = nhóm theo tháng của date`.
- `Chi phí/cây = tổng chi / số cây trưởng thành cần đếm`.

### 4.3. Các thông số khác

Các trường sức khỏe, ghi chú và custom fields đang có trong dữ liệu nhưng chưa đồng nhất về ý nghĩa thống kê giữa các mùa. Không đưa chúng vào màn hình chính của phiên bản đầu tiên.

Có thể bổ sung phần **Thông tin khác** sau khi xác định được:

- Trường nào thực sự có tính mùa vụ.
- Cách tổng hợp hợp lệ cho từng kiểu dữ liệu.
- Có dữ liệu ở ít nhất một trong hai mùa đang so sánh.

## 5. Khoảng trống dữ liệu cần xử lý

### 5.1. Gắn mùa vụ cho khoản chi

`Investment` hiện chưa có trường mùa vụ riêng. Logic hiện tại suy ra mùa từ năm của `date`, có thể sai khi một mùa vụ kéo dài qua hai năm.

Đề xuất bổ sung:

```ts
interface Investment {
  seasonYear: number
}
```

Quy tắc:

- Khi tạo khoản chi mới, tự động gán `selectedSeasonYear`.
- Khi cập nhật khoản chi, giữ nguyên mùa vụ trừ khi người dùng chủ động thay đổi.
- Với dữ liệu cũ chưa có `seasonYear`, tạm suy ra từ năm của `date` và đánh dấu nội bộ là dữ liệu suy đoán.
- Không tự động di trú hàng loạt cho đến khi xác nhận quy tắc mùa vụ thực tế của nông trại.

### 5.2. Mùa vụ không liên tiếp

Không giả định mùa đối chiếu luôn là `selectedSeasonYear - 1`. Danh sách mùa có thể thiếu năm hoặc dữ liệu có thể chỉ tồn tại ở một số mùa. Cần chọn mùa gần nhất có trong `currentFarm.seasons`.

## 6. Tổ chức mã nguồn

```text
app/statistics/page.tsx
components/statistics/StatisticsDashboard.tsx
lib/season-statistics.ts
__tests__/season-statistics.test.ts
e2e/statistics.spec.ts
```

Các kiểu dữ liệu mới dự kiến:

- `SeasonStatistics`.
- `CategoryExpenseSummary`.
- `ZoneFruitSummary`.
- `SeasonComparison`.

`lib/season-statistics.ts` chứa các hàm thuần để tổng hợp và so sánh dữ liệu, không chứa React hoặc logic hiển thị. Dữ liệu cây, khu vực và chi tiêu được tải một lần, sau đó tổng hợp bằng `useMemo`; không tạo truy vấn Firestore riêng cho từng thẻ hoặc biểu đồ.

## 7. Trạng thái đặc biệt

Trang phải xử lý rõ các trường hợp:

- Chưa có mùa vụ.
- Chỉ có một mùa nên chưa thể so sánh.
- Có cây nhưng chưa ghi nhận kết quả đếm.
- Có chi tiêu nhưng chưa có kết quả đếm, hoặc ngược lại.
- Cây đã xác nhận `0 trái`.
- Mùa không có khoản chi.
- Khu vực đã bị xóa nhưng cây vẫn còn mã khu cũ.
- Mất mạng: hiển thị dữ liệu cache cùng thông báo **Có thể chưa cập nhật**.
- Một nguồn dữ liệu bị lỗi: vẫn hiển thị các phần còn sử dụng được.
- Mùa đối chiếu có mẫu số bằng `0`: không tính phần trăm thay đổi.

## 8. Yêu cầu trải nghiệm người dùng

- Thiết kế mobile-first.
- Vùng bấm tối thiểu `44px`.
- Số tiền định dạng theo `vi-VN` và VND.
- Ưu tiên các từ quen thuộc như **Số trái**, **Đã đếm**, **Chưa đếm**, **Tiền đã chi**.
- Không yêu cầu người dùng hiểu tooltip hoặc ký hiệu biểu đồ để biết kết quả.
- Biểu đồ chỉ dùng để hỗ trợ; các số chính luôn có nhãn bằng chữ.
- Không hiển thị quá bốn thẻ tổng quan cùng lúc.
- Các phần chi tiết có thể thu gọn.
- Không dùng màu đỏ/xanh làm cách duy nhất để biểu đạt tăng hoặc giảm.

## 9. Kế hoạch triển khai đã thực hiện

### Giai đoạn 1: Chuẩn hóa dữ liệu và công thức

1. Bổ sung `seasonYear` cho `Investment` và luồng tạo/cập nhật khoản chi.
2. Xác định chiến lược tương thích cho khoản chi cũ.
3. Xây dựng `lib/season-statistics.ts`.
4. Viết unit test cho dữ liệu đếm trái, chi tiêu, khu vực và so sánh mùa.

### Giai đoạn 2: MVP giao diện

1. Tạo route `/statistics` với `AuthGuard` và quyền đọc nông trại.
2. Thêm lối vào menu, không thay đổi bottom tab.
3. Xây dựng bộ chọn hai mùa.
4. Hiển thị bốn thẻ tổng quan.
5. Hiển thị tiến độ đếm và chi phí theo hạng mục.
6. Hiển thị bảng so sánh hai mùa.

### Giai đoạn 3: Phân tích chi tiết

1. Thêm thống kê đếm trái theo khu vực.
2. Thêm xu hướng chi theo tháng.
3. Thêm thao tác dẫn tới danh sách cây chưa đếm.
4. Bổ sung phần chi tiết hạng mục và hạng mục con.

### Giai đoạn 4: Hoàn thiện và kiểm thử

1. Hoàn thiện trạng thái trống, lỗi và offline.
2. Kiểm tra khả năng đọc trên màn hình nhỏ.
3. Viết E2E cho đổi mùa, so sánh mùa, đổi nông trại và điều hướng từ menu.
4. Kiểm thử với dữ liệu có mùa thiếu, cây đếm `0 trái` và khoản chi kéo dài qua năm.

## 10. Tiêu chí nghiệm thu

- So sánh được hai mùa bất kỳ có trong `currentFarm.seasons`.
- Không cộng trùng kết quả thủ công và AI.
- Cây đã xác nhận `0 trái` không bị xem là chưa đếm.
- Tổng chi bằng tổng các hạng mục và chỉ thuộc đúng mùa.
- Không giả định các mùa luôn liên tiếp.
- Đổi nông trại không làm lẫn dữ liệu.
- Trang không xuất hiện trong bottom tab.
- Các thông tin chính đọc được ngay mà không cần mở biểu đồ chi tiết.
- Giao diện không phụ thuộc riêng vào màu sắc để truyền đạt ý nghĩa.
- Có unit test cho công thức và E2E cho luồng so sánh mùa.

## 11. Tệp hiện tại liên quan

- `lib/types.ts`: kiểu `Tree`, `TreeSeasonalStats`, `Investment` và các kiểu thống kê cũ.
- `lib/tree-season-status.ts`: xác định trạng thái và tiến độ đếm trái theo mùa.
- `lib/investment-service.ts`: đọc và ghi khoản chi theo phạm vi nông trại.
- `components/InvestmentManagement.tsx`: tổng hợp chi tiêu hiện tại theo năm của `date`.
- `lib/optimized-auth-context.tsx`: danh sách mùa và mùa đang chọn.
- `components/Navigation.tsx`: menu desktop và hamburger mobile.
- `components/ui/BottomTabBar.tsx`: danh sách bottom tab và phạm vi route hiển thị.
- `docs/features/SEASON_MANAGEMENT_GUIDE.md`: hành vi quản lý mùa vụ hiện tại.
- `docs/schema/CANONICAL_SCHEMA.md`: các xung đột và định hướng schema chung.
