'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  PREDEFINED_FIELDS, 
  FIELD_CATEGORIES,
  CustomFieldDefinition,
  CustomFieldCategory 
} from '@/lib/custom-field-types'

interface AddCustomFieldModalProps {
  isOpen: boolean
  onClose: () => void
  onAddField: (fieldId: string) => void
  existingFields: string[]
}

export function AddCustomFieldModal({ isOpen, onClose, onAddField, existingFields }: AddCustomFieldModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<CustomFieldCategory | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store current scroll position
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      
      return () => {
        // Restore scroll position
        const scrollY = document.body.style.top
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const availableFields = PREDEFINED_FIELDS.filter(field => 
    !existingFields.includes(field.id) &&
    (selectedCategory ? field.category === selectedCategory : true) &&
    (searchTerm ? field.labelVi.toLowerCase().includes(searchTerm.toLowerCase()) : true)
  )

  const handleAddField = (fieldId: string) => {
    onAddField(fieldId)
    onClose()
  }

  const modalContent = (
    <div 
      className="fixed inset-0 bg-white z-[9999] overflow-hidden"
      style={{ 
        touchAction: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <div 
        className="w-full h-full overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS-style Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-green-600 text-lg font-medium py-2 px-2 min-touch active:opacity-70 transition-opacity"
            >
              Hủy
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Thêm Thông Tin</h1>
            <div className="w-12"></div> {/* Spacer for center alignment */}
          </div>
        </div>

        {/* Search Section */}
        <div className="flex-shrink-0 bg-white px-4 py-4 border-b border-gray-100">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm thông tin..."
              className="w-full px-4 py-3 pl-12 text-base bg-gray-100 border-0 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-green-500"
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
              🔍
            </span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div 
          className="flex-1 overflow-y-auto"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y pinch-zoom'
          }}
        >
          {/* Category Filters */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium min-touch transition-all ${
                  selectedCategory === null
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                }`}
              >
                Tất cả
              </button>
              {Object.entries(FIELD_CATEGORIES).map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key as CustomFieldCategory)}
                  className={`px-4 py-2 rounded-full text-sm font-medium min-touch transition-all flex items-center space-x-2 ${
                    selectedCategory === key
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                  }`}
                >
                  <span>{category.icon}</span>
                  <span>{category.labelVi}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Available Fields */}
          <div className="flex-1" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {availableFields.length === 0 ? (
              <div className="text-center py-12 px-4">
                <span className="text-6xl mb-4 block">📝</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {existingFields.length === PREDEFINED_FIELDS.length 
                    ? 'Đã thêm đủ tất cả thông tin'
                    : 'Không tìm thấy thông tin phù hợp'
                  }
                </h3>
                <p className="text-gray-600">
                  {existingFields.length === PREDEFINED_FIELDS.length 
                    ? 'Bạn đã thêm tất cả các loại thông tin có sẵn'
                    : 'Thử tìm kiếm với từ khóa khác'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 bg-white">
                {availableFields.map((field) => (
                  <button
                    key={field.id}
                    onClick={() => handleAddField(field.id)}
                    className="w-full px-4 py-4 text-left active:bg-gray-50 transition-colors flex items-center space-x-4"
                  >
                    <div className="w-8 h-8 flex items-center justify-center text-xl shrink-0">
                      {field.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-base">{field.labelVi}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {field.placeholderVi || 'Thông tin bổ sung về cây'}
                      </p>
                    </div>
                    <div className="text-green-600 text-lg font-bold">
                      +
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // Render modal content using a portal to body to ensure proper z-index stacking
  return typeof window !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null
}

// Quick add button component for floating action
export function QuickAddFieldButton({ onClick, className = '' }: { onClick: () => void, className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full 
        shadow-lg hover:shadow-xl active:scale-95 transition-all
        flex items-center justify-center text-2xl font-bold
        fixed bottom-6 right-6 z-40
        ${className}
      `}
      title="Thêm thông tin cây"
    >
      +
    </button>
  )
}