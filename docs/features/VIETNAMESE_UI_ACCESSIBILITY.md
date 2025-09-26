# Vietnamese UI Text & Accessibility Specifications

## **VIETNAMESE UI TEXT LIBRARY**

### **Custom Fields Interface Text**

#### **Section Headers**
```typescript
const UI_TEXT = {
  // Main section
  customFields: 'Thông tin tùy chỉnh',
  addField: 'Thêm thông tin',
  manageFields: 'Quản lý trường dữ liệu',
  
  // Field categories
  categories: {
    basic: 'Thông tin cơ bản',
    harvest: 'Thu hoạch', 
    health: 'Sức khỏe',
    care: 'Chăm sóc',
    custom: 'Tùy chỉnh'
  },
  
  // Field types
  fieldTypes: {
    number: 'Số nguyên',
    decimal: 'Số thập phân', 
    text: 'Văn bản ngắn',
    textarea: 'Văn bản dài',
    date: 'Ngày tháng',
    select: 'Danh sách chọn',
    boolean: 'Có/Không'
  },
  
  // Actions
  actions: {
    save: 'Lưu',
    cancel: 'Hủy',
    edit: 'Chỉnh sửa',
    delete: 'Xóa',
    add: 'Thêm',
    create: 'Tạo',
    back: 'Quay lại',
    continue: 'Tiếp tục',
    clear: 'Xóa'
  }
}
```

#### **Field Names & Descriptions**
```typescript
const FIELD_NAMES = {
  // Harvest fields
  'fruit_count': {
    name: 'Số lượng trái',
    description: 'Số trái đếm được trên cây',
    placeholder: 'Nhập số trái đếm được',
    unit: 'trái'
  },
  'harvest_date': {
    name: 'Ngày thu hoạch cuối', 
    description: 'Lần thu hoạch gần nhất',
    placeholder: 'Chọn ngày thu hoạch'
  },
  'harvest_weight': {
    name: 'Khối lượng thu hoạch',
    description: 'Trọng lượng trái thu được', 
    placeholder: 'Nhập trọng lượng',
    unit: 'kg'
  },
  
  // Health fields
  'health_status_detail': {
    name: 'Tình trạng sức khỏe chi tiết',
    description: 'Đánh giá chi tiết về sức khỏe cây',
    options: ['Rất tốt', 'Tốt', 'Bình thường', 'Yếu', 'Cần điều trị']
  },
  'disease_notes': {
    name: 'Ghi chú bệnh tật',
    description: 'Ghi chú về các vấn đề bệnh tật', 
    placeholder: 'Mô tả tình trạng bệnh tật...'
  },
  
  // Care fields  
  'watering_schedule': {
    name: 'Lịch tưới nước',
    description: 'Thông tin về việc tưới nước',
    placeholder: 'Mô tả lịch tưới nước...'
  },
  'fertilizer_date': {
    name: 'Ngày bón phân cuối',
    description: 'Lần bón phân gần nhất',
    placeholder: 'Chọn ngày bón phân'
  },
  'pruning_notes': {
    name: 'Ghi chú tỉa cành',
    description: 'Thông tin về việc tỉa cành',
    placeholder: 'Mô tả việc tỉa cành...'
  },
  
  // Basic measurements
  'tree_height_custom': {
    name: 'Chiều cao thân chi tiết',
    description: 'Đo chiều cao chính xác',
    placeholder: 'Nhập chiều cao',
    unit: 'm'
  },
  'trunk_circumference': {
    name: 'Chu vi thân',
    description: 'Đo chu vi thân cây',
    placeholder: 'Nhập chu vi',
    unit: 'cm'
  }
}
```

#### **User Messages & Feedback**
```typescript
const MESSAGES = {
  // Success messages
  success: {
    fieldAdded: 'Đã thêm thông tin thành công',
    fieldUpdated: 'Đã cập nhật thông tin',
    fieldDeleted: 'Đã xóa thông tin',
    dataSaved: 'Dữ liệu đã được lưu'
  },
  
  // Error messages
  errors: {
    required: 'Trường này là bắt buộc',
    invalidNumber: 'Vui lòng nhập số hợp lệ',
    minValue: 'Giá trị tối thiểu là {min}',
    maxValue: 'Giá trị tối đa là {max}',
    minLength: 'Độ dài tối thiểu là {min} ký tự',
    maxLength: 'Độ dài tối đa là {max} ký tự',
    invalidFormat: 'Định dạng không hợp lệ',
    networkError: 'Lỗi kết nối mạng. Vui lòng thử lại.',
    saveError: 'Có lỗi khi lưu dữ liệu'
  },
  
  // Help text
  help: {
    numberInput: 'Sử dụng nút +/- để điều chỉnh nhanh',
    dateQuick: 'Chọn nhanh: Hôm nay, Hôm qua, Tuần trước',
    textTemplates: 'Chọn mẫu có sẵn hoặc nhập tùy chỉnh',
    fieldCreation: 'Tạo trường dữ liệu theo nhu cầu riêng'
  },
  
  // Empty states
  empty: {
    noCustomFields: 'Chưa có thông tin tùy chỉnh',
    noData: 'Chưa có dữ liệu',
    addFirstField: 'Thêm thông tin đầu tiên để bắt đầu theo dõi dữ liệu quan trọng'
  },
  
  // Confirmations
  confirmations: {
    deleteField: 'Bạn có chắc muốn xóa trường này không?',
    deleteValue: 'Xóa dữ liệu này sẽ không thể khôi phục',
    unsavedChanges: 'Bạn có thay đổi chưa lưu. Bạn có muốn rời khỏi không?'
  }
}
```

#### **Quick Action Templates**
```typescript
const QUICK_TEMPLATES = {
  // Watering notes templates
  watering: [
    'Tưới đều đặn 2 lần/ngày',
    'Cần tưới nhiều nước hơn',
    'Giảm lượng nước tưới',
    'Hệ thống tự động hoạt động tốt',
    'Kiểm tra hệ thống nhỏ giọt'
  ],
  
  // Health status templates  
  health: [
    'Phát triển tốt, không có vấn đề',
    'Cần theo dõi thêm',
    'Phát hiện dấu hiệu bệnh', 
    'Đã điều trị, đang hồi phục',
    'Cần can thiệp ngay lập tức'
  ],
  
  // General notes templates
  general: [
    'Cây phát triển bình thường',
    'Ra hoa nhiều',
    'Có trái non xuất hiện',
    'Sắp đến mùa thu hoạch',
    'Cần chăm sóc đặc biệt'
  ],
  
  // Care activity templates
  care: [
    'Đã thực hiện theo lịch',
    'Cần điều chỉnh thời gian',
    'Hoãn do thời tiết',
    'Hoàn thành tốt',
    'Cần lặp lại sau 1 tuần'
  ]
}
```

---

## **ACCESSIBILITY SPECIFICATIONS**

### **Touch & Mobile Optimization**

#### **Touch Target Sizes**
```css
/* Minimum touch targets exceed Apple's 44px guideline */
.touch-target {
  min-height: 52px;
  min-width: 52px;
  padding: 12px;
}

/* Field input areas */
.field-input {
  min-height: 48px;
  padding: 12px 16px;
  font-size: 18px; /* Prevents zoom on iOS */
}

/* Action buttons */
.action-button {
  min-height: 52px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
}

/* Touch spacing between elements */
.touch-spacing {
  margin: 8px 0; /* Minimum 8px between touch targets */
}
```

#### **High Contrast for Outdoor Use**
```css
/* Sunlight-readable color scheme */
:root {
  --primary-green: #059669; /* High contrast green */
  --text-primary: #111827; /* Near black for readability */
  --text-secondary: #374151; /* Dark gray */
  --border-color: #D1D5DB; /* Visible borders */
  --background-card: #FFFFFF; /* Pure white backgrounds */
  --shadow-strong: 0 4px 12px rgba(0, 0, 0, 0.15); /* Strong shadows */
}

/* High contrast field cards */
.field-card {
  background: var(--background-card);
  border: 2px solid var(--border-color);
  box-shadow: var(--shadow-strong);
  border-radius: 12px;
}

/* Strong focus indicators */
.field-input:focus {
  outline: 3px solid #10B981;
  outline-offset: 2px;
  border-color: #10B981;
}
```

#### **Typography for Vietnamese Text**
```css
/* Vietnamese-optimized font stack */
body {
  font-family: 
    "SF Pro Text", /* iOS default */
    "Roboto", /* Android default */
    "Inter", /* Web fallback */
    system-ui, 
    -apple-system, 
    sans-serif;
  font-feature-settings: "kern" 1, "liga" 1;
  text-rendering: optimizeLegibility;
}

/* Minimum readable sizes */
.text-label {
  font-size: 16px;
  line-height: 1.5;
  font-weight: 500;
  color: var(--text-secondary);
}

.text-value {
  font-size: 18px;
  line-height: 1.4;
  font-weight: 600;
  color: var(--text-primary);
}

.text-help {
  font-size: 14px;
  line-height: 1.5;
  color: #6B7280;
}

/* Vietnamese diacritic support */
.vietnamese-text {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.025em;
}
```

### **Gesture Support & One-Handed Operation**

#### **Swipe Actions**
```typescript
// Swipe gesture specifications
const SWIPE_GESTURES = {
  // Swipe right to edit field
  editSwipe: {
    direction: 'right',
    threshold: 50, // pixels
    feedback: 'haptic-light'
  },
  
  // Swipe left to delete
  deleteSwipe: {
    direction: 'left', 
    threshold: 80, // pixels
    feedback: 'haptic-warning'
  },
  
  // Long press for context menu
  longPress: {
    duration: 500, // milliseconds
    feedback: 'haptic-medium'
  }
}
```

#### **Bottom Sheet Modal Design**
```css
/* Bottom-anchored modals for thumb reach */
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 90vh;
  border-radius: 20px 20px 0 0;
  background: white;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
}

/* Pull handle for easy dismissal */
.bottom-sheet::before {
  content: '';
  display: block;
  width: 36px;
  height: 4px;
  background: #D1D5DB;
  border-radius: 2px;
  margin: 12px auto 8px;
}

/* One-handed friendly button placement */
.modal-actions {
  position: sticky;
  bottom: 0;
  padding: 16px;
  background: white;
  border-top: 1px solid #E5E7EB;
}
```

### **Error Prevention & Recovery**

#### **Input Validation Visual Feedback**
```css
/* Progressive validation states */
.field-input--valid {
  border-color: #10B981;
  background-color: #F0FDF4;
}

.field-input--invalid {
  border-color: #EF4444;
  background-color: #FEF2F2;
}

.field-input--warning {
  border-color: #F59E0B;
  background-color: #FFFBEB;
}

/* Error message styling */
.error-message {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #FEE2E2;
  border: 1px solid #FECACA;
  border-radius: 8px;
  color: #DC2626;
  font-size: 14px;
  font-weight: 500;
  margin-top: 8px;
}

.error-message::before {
  content: '⚠️';
  margin-right: 8px;
  font-size: 16px;
}
```

#### **Offline Mode Support**
```typescript
// Offline state indicators and messaging
const OFFLINE_TEXT = {
  status: 'Chế độ ngoại tuyến',
  description: 'Dữ liệu sẽ đồng bộ khi có kết nối',
  queuedChanges: 'Có {count} thay đổi chờ đồng bộ',
  syncButton: 'Đồng bộ ngay',
  syncSuccess: 'Đã đồng bộ thành công',
  syncError: 'Lỗi đồng bộ. Sẽ thử lại tự động.'
}

// Auto-save configuration
const AUTOSAVE_CONFIG = {
  debounceMs: 1000, // Wait 1s after last change
  retryAttempts: 3,
  retryDelayMs: 5000,
  offlineQueueLimit: 100
}
```

### **Screen Reader & Voice Control Support**

#### **ARIA Labels (Vietnamese)**
```typescript
const ARIA_LABELS = {
  // Field interactions
  editField: 'Chỉnh sửa trường {fieldName}',
  deleteField: 'Xóa trường {fieldName}',
  addField: 'Thêm trường dữ liệu mới',
  saveField: 'Lưu thông tin {fieldName}',
  cancelEdit: 'Hủy chỉnh sửa',
  
  // Field types
  numberInput: 'Nhập số cho {fieldName}',
  textInput: 'Nhập văn bản cho {fieldName}',
  dateInput: 'Chọn ngày cho {fieldName}',
  selectInput: 'Chọn giá trị cho {fieldName}',
  
  // Status messages
  fieldRequired: 'Trường bắt buộc',
  fieldOptional: 'Trường tùy chọn',
  fieldSaved: 'Đã lưu {fieldName}',
  fieldError: 'Lỗi nhập liệu tại {fieldName}'
}
```

### **Performance Considerations**

#### **Lazy Loading & Virtualization**
```typescript
// Field rendering optimization
const PERFORMANCE_CONFIG = {
  // Only render visible fields initially
  initialRenderLimit: 10,
  
  // Lazy load field definitions
  lazyLoadThreshold: 20,
  
  // Virtual scrolling for large field lists
  virtualScrollingThreshold: 50,
  
  // Debounce field value changes
  valueChangeDebounce: 300,
  
  // Image lazy loading
  imageLazyLoadOffset: 100
}
```

#### **Animation & Transition Guidelines**
```css
/* Farmer-friendly animations - quick and clear */
.field-transition {
  transition: all 0.2s ease-out;
}

.modal-enter {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### **Testing & Validation Checklist**

#### **Accessibility Testing**
- [ ] All interactive elements have minimum 52px touch targets
- [ ] Color contrast ratio ≥ 4.5:1 for normal text, 3:1 for large text  
- [ ] Text remains readable when zoomed to 200%
- [ ] All form fields have associated labels
- [ ] Error messages are announced to screen readers
- [ ] Focus management works properly with keyboard navigation
- [ ] Vietnamese text renders correctly across devices
- [ ] Offline functionality works as expected

#### **Mobile UX Testing**
- [ ] One-handed operation possible for all primary functions
- [ ] Swipe gestures work reliably 
- [ ] Modal dismissal is intuitive
- [ ] Text input doesn't trigger unwanted zoom on iOS
- [ ] Touch targets don't overlap or cause mis-taps
- [ ] Loading states provide clear feedback
- [ ] Works well with thick farming gloves
- [ ] Readable under direct sunlight

#### **Vietnamese Language Testing**
- [ ] All Vietnamese characters display correctly
- [ ] Diacritics don't cause layout issues
- [ ] Text truncation handles Vietnamese words properly
- [ ] Date/number formatting follows Vietnamese conventions
- [ ] Voice input works with Vietnamese
- [ ] Text-to-speech pronounces Vietnamese correctly