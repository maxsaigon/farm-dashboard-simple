# Custom Fields UI/UX Wireframes & User Flow

> Status: Design-only
> Baseline: package `0.1.0`, Git commit `7890775`
> Last reviewed: 2026-07-15

## Current Implementation Notice

These wireframes are visual proposals. The runtime exposes preset custom fields, but arbitrary field-definition management, gestures, auto-save, and complete offline behavior shown here are not implemented or verified.

## **USER FLOW OVERVIEW**

### **Primary User Journey: Adding Custom Data to Tree**
```
1. Farmer opens TreeDetail page
2. Scrolls to "Thông tin tùy chỉnh" (Custom Fields) section
3. Sees existing custom fields + "Thêm thông tin" (Add Field) button
4. Taps "Thêm thông tin" → Opens field selection modal
5. Chooses from predefined templates OR creates new field
6. Fills in the data value
7. Taps "Lưu" → Data saved, modal closes
8. New field appears in TreeDetail immediately
```

### **Secondary User Journey: Managing Field Definitions**
```
1. Farmer goes to Settings > "Quản lý trường dữ liệu" (Manage Fields)
2. Sees list of all custom field definitions
3. Can add, edit, or delete field definitions
4. Changes apply to all trees using those fields
```

---

## **WIREFRAME 1: Enhanced TreeDetail with Custom Fields Section**

```
┌─────────────────────────────────────────────────────────┐
│ [←] Cây Ri6 #A01                              [✏️] [🗑️] │
├─────────────────────────────────────────────────────────┤
│ 🌳 Tốt     🏷️ Ri6     ⚠️ Cần chú ý                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [Existing TreeDetail content...]                        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ ⚙️  THÔNG TIN TÙY CHỈNH                    [+ Thêm]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 📋 THÔNG TIN CỦA CÂY                                    │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🍎 Số lượng trái         │  127 trái        [✏️]   │ │
│ │ 📏 Chiều cao thân        │  4.2 m           [✏️]   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ 🥥 THU HOẠCH                                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📅 Ngày thu hoạch cuối   │  15/08/2024     [✏️]   │ │
│ │ ⚖️ Khối lượng thu hoạch  │  23 kg          [✏️]   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ 🚿 CHĂM SÓC                                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 💧 Tưới nước             │  Hàng ngày      [✏️]   │ │
│ │ 🌱 Bón phân lần cuối     │  10/08/2024     [✏️]   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│                        [+ Thêm trường mới]              │
└─────────────────────────────────────────────────────────┘
```

---

## **WIREFRAME 2: Add/Edit Custom Field Modal**

```
┌─────────────────────────────────────────────────────────┐
│                    THÊM THÔNG TIN                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ CHỌN LOẠI THÔNG TIN:                                    │
│                                                         │
│ ┌─────────────────────┐  ┌─────────────────────┐       │
│ │ 🍎 Số lượng trái    │  │ 📝 Ghi chú nhanh    │       │
│ │ Đếm số trái trên cây│  │ Ghi chú quan sát    │       │
│ └─────────────────────┘  └─────────────────────┘       │
│                                                         │
│ ┌─────────────────────┐  ┌─────────────────────┐       │
│ │ 📅 Ngày thu hoạch   │  │ 🌡️ Tình trạng      │       │
│ │ Lần thu hoạch cuối  │  │ Đánh giá sức khỏe  │       │
│ └─────────────────────┘  └─────────────────────┘       │
│                                                         │
│ ┌─────────────────────┐  ┌─────────────────────┐       │
│ │ 💧 Ghi chú tưới     │  │ ➕ Tạo trường mới   │       │
│ │ Thông tin tưới nước │  │ Tạo trường tùy chỉnh│       │
│ └─────────────────────┘  └─────────────────────┘       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                 [Hủy]           [Tiếp tục]              │
└─────────────────────────────────────────────────────────┘
```

---

## **WIREFRAME 3: Custom Field Value Input**

### **Number Input (Fruit Count)**
```
┌─────────────────────────────────────────────────────────┐
│                 🍎 SỐ LƯỢNG TRÁI                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Nhập số lượng trái đếm được trên cây này:               │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                    127                              │ │
│ └─────────────────────────────────────────────────────┘ │
│                                           trái         │
│                                                         │
│ [−1] [−10] [Clear] [+10] [+1]                           │
│                                                         │
│ 💡 Mẹo: Sử dụng nút +/- để điều chỉnh nhanh            │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                 [Hủy]           [Lưu]                   │
└─────────────────────────────────────────────────────────┘
```

### **Date Picker (Harvest Date)**
```
┌─────────────────────────────────────────────────────────┐
│               📅 NGÀY THU HOẠCH CUỐI                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Chọn ngày thu hoạch gần nhất:                           │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │              15/08/2024                             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ NHANH CHỌN:                                             │
│ [Hôm nay] [Hôm qua] [3 ngày trước] [Tuần trước]        │
│                                                         │
│ 📅 Lịch:                                                │
│ ┌───────────────────────────────────────────────────┐   │
│ │  T2  T3  T4  T5  T6  T7  CN                      │   │
│ │              1   2   3   4                       │   │
│ │   5   6   7   8   9  10  11                      │   │
│ │  12  13  14 [15] 16  17  18                      │   │
│ │  19  20  21  22  23  24  25                      │   │
│ └───────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                 [Hủy]           [Lưu]                   │
└─────────────────────────────────────────────────────────┘
```

### **Textarea (Watering Notes)**
```
┌─────────────────────────────────────────────────────────┐
│               💧 GHI CHÚ TƯỚI NƯỚC                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Tưới 2 lần/ngày, sáng 6h và chiều 4h.              │ │
│ │ Đất vẫn ẩm, không cần tưới nhiều.                  │ │
│ │ Cần kiểm tra hệ thống tưới nhỏ giọt.               │ │
│ │                                                     │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                    127/300 ký tự       │
│                                                         │
│ TEMPLATES:                                              │
│ [Tưới đều đặn] [Cần nhiều nước] [Giảm tưới]           │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                 [Hủy]           [Lưu]                   │
└─────────────────────────────────────────────────────────┘
```

---

## **WIREFRAME 4: Field Management Settings**

```
┌─────────────────────────────────────────────────────────┐
│ [←] QUẢN LÝ TRƯỜNG DỮ LIỆU                   [+ Tạo]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 📋 THÔNG TIN CƠ BẢN                                     │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🍎 Số lượng trái                    Số    [⚙️] [🗑️]│ │
│ │ 📏 Chiều cao thân                   Số    [⚙️] [🗑️]│ │
│ │ ⚖️ Cân nặng trung bình              Số    [⚙️] [🗑️]│ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ 🥥 THU HOẠCH                                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📅 Ngày thu hoạch cuối              Ngày  [⚙️] [🗑️]│ │
│ │ ⚖️ Khối lượng thu hoạch             Số    [⚙️] [🗑️]│ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ 🚿 CHĂM SÓC                                              │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 💧 Ghi chú tưới nước                Text  [⚙️] [🗑️]│ │
│ │ 🌱 Ngày bón phân cuối               Ngày  [⚙️] [🗑️]│ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│                        [+ Tạo trường mới]              │
└─────────────────────────────────────────────────────────┘
```

---

## **WIREFRAME 5: Create New Field Definition**

```
┌─────────────────────────────────────────────────────────┐
│                    TẠO TRƯỜNG MỚI                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Tên trường: *                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Nhiệt độ đất                                        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Biểu tượng:                                             │
│ [🌡️] [📊] [💧] [🌱] [📏] [⚖️] [📅] [📝] [Khác...]     │
│                                                         │
│ Loại dữ liệu: *                                         │
│ ● Số nguyên    ○ Số thập phân   ○ Văn bản               │
│ ○ Văn bản dài  ○ Ngày tháng     ○ Có/Không             │
│ ○ Danh sách chọn                                        │
│                                                         │
│ Đơn vị:                                                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ °C                                                  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Nhóm:                                                   │
│ ○ Thông tin cơ bản  ○ Thu hoạch  ● Chăm sóc           │
│ ○ Sức khỏe         ○ Tùy chỉnh                         │
│                                                         │
│ ☑ Bắt buộc phải nhập                                   │
│ ☐ Hiển thị trên màn hình chính                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                 [Hủy]           [Tạo]                   │
└─────────────────────────────────────────────────────────┘
```

---

## **MOBILE INTERACTION PATTERNS**

### **Gesture Support:**
- **Tap**: Select field, edit value
- **Long Press**: Quick action menu (edit/delete field)
- **Swipe Left**: Delete field value
- **Swipe Right**: Mark as favorite/pin to top
- **Pull to Refresh**: Sync field definitions from server

### **Touch Target Specifications:**
- **Minimum button size**: 52px × 52px (exceeds iOS 44px guideline)
- **Field rows**: 60px minimum height
- **Input areas**: 48px minimum height
- **Spacing between touch targets**: 8px minimum

### **One-Handed Operation:**
- **Bottom sheet modals**: Easy thumb reach
- **Floating action button**: Bottom-right corner
- **Quick action bar**: Bottom of screen
- **Swipe gestures**: Alternative to small buttons

---

## **ACCESSIBILITY & FARMER-FRIENDLY FEATURES**

### **High Contrast Mode:**
```css
/* Sunlight visibility */
.field-card {
  background: #FFFFFF;
  border: 2px solid #E5E7EB;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.field-value {
  font-size: 18px;
  font-weight: 600;
  color: #1F2937;
}

.field-label {
  font-size: 16px;
  color: #374151;
  font-weight: 500;
}
```

### **Vietnamese Text Optimization:**
- **Font**: System fonts with good Vietnamese support
- **Text size**: Minimum 16px for outdoor reading
- **Line height**: 1.5 for easy scanning
- **Contrast ratio**: 4.5:1 minimum for WCAG compliance

### **Error Prevention:**
- **Confirmation dialogs**: For destructive actions
- **Auto-save**: Save field values automatically
- **Validation**: Real-time input validation
- **Offline support**: Works without internet connection
