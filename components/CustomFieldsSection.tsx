'use client'

import React, { useState, useEffect } from 'react'
import { 
  CustomFieldDefinition, 
  CustomFieldValue, 
  TreeCustomFields,
  getFieldDefinition,
  FIELD_CATEGORIES,
  formatFieldValue
} from '@/lib/custom-field-types'
import { CustomFieldInput } from './CustomFieldInput'
import { AddCustomFieldModal, QuickAddFieldButton } from './AddCustomFieldModal'

interface CustomFieldsSectionProps {
  treeId: string
  customFields?: TreeCustomFields
  onSave: (treeId: string, fields: CustomFieldValue[]) => Promise<void>
  className?: string
}

export function CustomFieldsSection({ treeId, customFields, onSave, className = '' }: CustomFieldsSectionProps) {
  const [activeFields, setActiveFields] = useState<string[]>([])
  const [fieldValues, setFieldValues] = useState<Record<string, CustomFieldValue>>({})
  const [editingField, setEditingField] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    harvest: true,
    health: true,
    care: false,
    basic: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize field values from props
  useEffect(() => {
    if (customFields?.fields) {
      const fieldsMap: Record<string, CustomFieldValue> = {}
      const activeFieldIds: string[] = []
      
      customFields.fields.forEach(field => {
        fieldsMap[field.fieldId] = field
        activeFieldIds.push(field.fieldId)
      })
      
      setFieldValues(fieldsMap)
      setActiveFields(activeFieldIds)
    }
  }, [customFields])

  const handleAddField = (fieldId: string) => {
    if (!activeFields.includes(fieldId)) {
      setActiveFields([...activeFields, fieldId])
      setEditingField(fieldId)
    }
  }

  const handleSaveFieldValue = async (fieldId: string, value: string | number | boolean | Date) => {
    setIsLoading(true)
    setError(null)

    try {
      const newFieldValue: CustomFieldValue = {
        fieldId,
        value,
        updatedAt: new Date()
      }

      const updatedFieldValues = {
        ...fieldValues,
        [fieldId]: newFieldValue
      }

      const updatedFields = Object.values(updatedFieldValues)
      
      await onSave(treeId, updatedFields)
      
      setFieldValues(updatedFieldValues)
      setEditingField(null)
    } catch (err) {
      setError('Không thể lưu thông tin. Vui lòng thử lại.')
      console.error('Error saving field:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteField = async (fieldId: string) => {
    if (window.confirm('Bạn có chắc muốn xóa thông tin này?')) {
      setIsLoading(true)
      
      try {
        const { [fieldId]: removed, ...remainingValues } = fieldValues
        const updatedFields = Object.values(remainingValues)
        
        await onSave(treeId, updatedFields)
        
        setFieldValues(remainingValues)
        setActiveFields(activeFields.filter(id => id !== fieldId))
        setEditingField(null)
      } catch (err) {
        setError('Không thể xóa thông tin. Vui lòng thử lại.')
        console.error('Error deleting field:', err)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const getFieldsByCategory = (category: string) => {
    return activeFields
      .map(fieldId => getFieldDefinition(fieldId))
      .filter((field): field is CustomFieldDefinition => 
        field !== undefined && field.category === category
      )
  }

  const hasFieldsInCategory = (category: string) => {
    return getFieldsByCategory(category).length > 0
  }

  if (activeFields.length === 0) {
    return (
      <div className={`bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 ${className}`}>
        <div className="text-center">
          <span className="text-4xl mb-3 block">📝</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có thông tin bổ sung</h3>
          <p className="text-gray-600 mb-4">
            Thêm thông tin như số trái, ghi chú, ngày thu hoạch để theo dõi cây tốt hơn
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold min-touch shadow-lg active:scale-95 transition-all"
          >
            + Thêm Thông Tin
          </button>
        </div>

        <AddCustomFieldModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAddField={handleAddField}
          existingFields={activeFields}
        />
      </div>
    )
  }

  return (
    <div className={`relative space-y-4 ${className}`}>
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <p className="text-red-800 font-medium flex items-center space-x-2">
            <span>⚠️</span>
            <span>{error}</span>
          </p>
        </div>
      )}

      {/* Render fields by category */}
      {Object.entries(FIELD_CATEGORIES).map(([categoryKey, category]) => {
        if (!hasFieldsInCategory(categoryKey)) return null

        const categoryFields = getFieldsByCategory(categoryKey)
        const isExpanded = expandedCategories[categoryKey]

        return (
          <div key={categoryKey} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleCategory(categoryKey)}
              className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors min-touch"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{category.icon}</span>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">{category.labelVi}</h3>
                  <p className="text-sm text-gray-600">{categoryFields.length} thông tin</p>
                </div>
              </div>
              <span className={`text-2xl transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                ⌄
              </span>
            </button>

            {isExpanded && (
              <div className="p-4 space-y-4 border-t border-gray-100">
                {categoryFields.map((field) => (
                  <div key={field.id} className="relative">
                    {editingField === field.id ? (
                      <div className={`p-4 bg-blue-50 border-2 border-blue-200 rounded-xl ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <CustomFieldInput
                          field={field}
                          value={fieldValues[field.id]}
                          onSave={(value) => handleSaveFieldValue(field.id, value)}
                          onCancel={() => setEditingField(null)}
                        />
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                        <CustomFieldInput
                          field={field}
                          value={fieldValues[field.id]}
                          onSave={() => {}} // Not used in read-only mode
                          readOnly={true}
                        />
                        
                        {/* Action buttons - only visible on hover/touch */}
                        <div className="flex justify-end space-x-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingField(field.id)}
                            disabled={isLoading}
                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg min-touch shadow-lg active:scale-95 transition-all disabled:opacity-50"
                            title="Chỉnh sửa"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteField(field.id)}
                            disabled={isLoading}
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg min-touch shadow-lg active:scale-95 transition-all disabled:opacity-50"
                            title="Xóa"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Quick Add Button - Relative position within container */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold text-lg min-touch shadow-lg active:scale-95 transition-all flex items-center space-x-2"
          title="Thêm thông tin cây"
        >
          <span className="text-xl">+</span>
          <span>Thêm Thông Tin</span>
        </button>
      </div>

      {/* Add Field Modal */}
      <AddCustomFieldModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddField={handleAddField}
        existingFields={activeFields}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-25 flex items-center justify-center z-10 rounded-xl">
          <div className="bg-white rounded-xl p-6 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="font-medium">Đang lưu...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}