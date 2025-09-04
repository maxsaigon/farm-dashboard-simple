// Custom Field Types for Tree Management
// Optimized for durian farmers with mobile-first design

export type CustomFieldType = 
  | 'fruit_count' 
  | 'quick_notes' 
  | 'harvest_date' 
  | 'health_status' 
  | 'watering_notes' 
  | 'measurements' 
  | 'yes_no' 
  | 'custom_text'

export type CustomFieldCategory = 'harvest' | 'health' | 'care' | 'basic'

export interface CustomFieldDefinition {
  id: string
  type: CustomFieldType
  label: string
  labelVi: string
  category: CustomFieldCategory
  icon: string
  placeholder?: string
  placeholderVi?: string
  unit?: string
  options?: string[]
  optionsVi?: string[]
  required?: boolean
  min?: number
  max?: number
  multiline?: boolean
}

export interface CustomFieldValue {
  fieldId: string
  value: string | number | boolean | Date
  updatedAt: Date
  updatedBy?: string
}

export interface TreeCustomFields {
  treeId: string
  fields: CustomFieldValue[]
  lastUpdated: Date
}

// Predefined field templates optimized for durian farming
export const PREDEFINED_FIELDS: CustomFieldDefinition[] = [
  {
    id: 'fruit_count',
    type: 'fruit_count',
    label: 'Fruit Count',
    labelVi: 'Số Lượng Trái',
    category: 'harvest',
    icon: '🍎',
    placeholder: 'Enter number of fruits',
    placeholderVi: 'Nhập số lượng trái',
    min: 0,
    max: 999
  },
  {
    id: 'quick_notes',
    type: 'quick_notes',
    label: 'Quick Notes',
    labelVi: 'Ghi Chú Nhanh',
    category: 'basic',
    icon: '📝',
    placeholder: 'Add notes about this tree...',
    placeholderVi: 'Thêm ghi chú về cây này...',
    multiline: true
  },
  {
    id: 'last_harvest',
    type: 'harvest_date',
    label: 'Last Harvest Date',
    labelVi: 'Ngày Thu Hoạch Cuối',
    category: 'harvest',
    icon: '📅',
    placeholder: 'Select harvest date',
    placeholderVi: 'Chọn ngày thu hoạch'
  },
  {
    id: 'health_status',
    type: 'health_status',
    label: 'Health Status',
    labelVi: 'Tình Trạng Sức Khỏe',
    category: 'health',
    icon: '🌡️',
    options: ['Excellent', 'Good', 'Fair', 'Poor', 'Diseased'],
    optionsVi: ['Rất Tốt', 'Tốt', 'Trung Bình', 'Kém', 'Bệnh']
  },
  {
    id: 'watering_schedule',
    type: 'watering_notes',
    label: 'Watering Notes',
    labelVi: 'Ghi Chú Tưới Nước',
    category: 'care',
    icon: '💧',
    placeholder: 'Watering schedule and notes...',
    placeholderVi: 'Lịch tưới nước và ghi chú...',
    multiline: true
  },
  {
    id: 'tree_height',
    type: 'measurements',
    label: 'Tree Height',
    labelVi: 'Chiều Cao Cây',
    category: 'basic',
    icon: '📏',
    unit: 'meters',
    placeholder: 'Height in meters',
    placeholderVi: 'Chiều cao tính bằng mét',
    min: 0,
    max: 50
  },
  {
    id: 'needs_pruning',
    type: 'yes_no',
    label: 'Needs Pruning',
    labelVi: 'Cần Tỉa Cành',
    category: 'care',
    icon: '✂️'
  },
  {
    id: 'fertilized_recently',
    type: 'yes_no',
    label: 'Fertilized Recently',
    labelVi: 'Đã Bón Phân Gần Đây',
    category: 'care',
    icon: '🌱'
  }
]

// Common templates for quick data entry
export const QUICK_NOTE_TEMPLATES = {
  en: [
    'Tree looks healthy',
    'Needs more water',
    'Ready for harvest soon',
    'Pruning required',
    'Fertilizer applied',
    'Pest damage observed'
  ],
  vi: [
    'Cây trông khỏe mạnh',
    'Cần tưới nước thêm',
    'Sắp đến lúc thu hoạch',
    'Cần tỉa cành',
    'Đã bón phân',
    'Phát hiện sâu bệnh'
  ]
}

export const WATERING_TEMPLATES = {
  en: [
    'Daily watering needed',
    'Water every 2 days',
    'Reduce watering in rainy season',
    'Deep watering once a week',
    'Check soil moisture first'
  ],
  vi: [
    'Cần tưới nước hàng ngày',
    'Tưới nước 2 ngày một lần',
    'Giảm tưới trong mùa mưa',
    'Tưới thấm một lần mỗi tuần',
    'Kiểm tra độ ẩm đất trước'
  ]
}

// Categories for organizing fields
export const FIELD_CATEGORIES = {
  harvest: {
    label: 'Harvest',
    labelVi: 'Thu Hoạch',
    icon: '🍎',
    color: 'bg-orange-100 border-orange-200 text-orange-800'
  },
  health: {
    label: 'Health',
    labelVi: 'Sức Khỏe',
    icon: '🌡️',
    color: 'bg-red-100 border-red-200 text-red-800'
  },
  care: {
    label: 'Care',
    labelVi: 'Chăm Sóc',
    icon: '💧',
    color: 'bg-blue-100 border-blue-200 text-blue-800'
  },
  basic: {
    label: 'Basic Info',
    labelVi: 'Thông Tin Cơ Bản',
    icon: '📝',
    color: 'bg-gray-100 border-gray-200 text-gray-800'
  }
}

// Utility functions
export function getFieldDefinition(fieldId: string): CustomFieldDefinition | undefined {
  return PREDEFINED_FIELDS.find(field => field.id === fieldId)
}

export function getFieldsByCategory(category: CustomFieldCategory): CustomFieldDefinition[] {
  return PREDEFINED_FIELDS.filter(field => field.category === category)
}

export function formatFieldValue(field: CustomFieldDefinition, value: any): string {
  if (value === null || value === undefined || value === '') return ''
  
  switch (field.type) {
    case 'fruit_count':
    case 'measurements':
      const numValue = typeof value === 'string' ? parseFloat(value) : value
      return field.unit ? `${numValue} ${field.unit}` : numValue.toString()
    
    case 'harvest_date':
      if (value instanceof Date) {
        return value.toLocaleDateString('vi-VN')
      }
      return new Date(value).toLocaleDateString('vi-VN')
    
    case 'health_status':
      if (field.options && field.optionsVi) {
        const index = field.options.indexOf(value.toString())
        return index >= 0 ? field.optionsVi[index] : value.toString()
      }
      return value.toString()
    
    case 'yes_no':
      return value ? 'Có' : 'Không'
    
    default:
      return value.toString()
  }
}

// Validation functions
export function validateFieldValue(field: CustomFieldDefinition, value: any): string | null {
  if (field.required && (value === null || value === undefined || value === '')) {
    return `${field.labelVi} là bắt buộc`
  }
  
  if (field.type === 'fruit_count' || field.type === 'measurements') {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue)) {
      return 'Vui lòng nhập số hợp lệ'
    }
    if (field.min !== undefined && numValue < field.min) {
      return `Giá trị tối thiểu là ${field.min}`
    }
    if (field.max !== undefined && numValue > field.max) {
      return `Giá trị tối đa là ${field.max}`
    }
  }
  
  return null
}