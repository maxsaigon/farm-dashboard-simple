'use client'

import React, { useState, useRef } from 'react'
import { 
  CustomFieldDefinition, 
  CustomFieldValue, 
  validateFieldValue,
  QUICK_NOTE_TEMPLATES,
  WATERING_TEMPLATES 
} from '@/lib/custom-field-types'

interface CustomFieldInputProps {
  field: CustomFieldDefinition
  value?: CustomFieldValue
  onSave: (value: string | number | boolean | Date) => void
  onCancel?: () => void
  className?: string
  readOnly?: boolean
}

export function CustomFieldInput({ field, value, onSave, onCancel, className = '', readOnly = false }: CustomFieldInputProps) {
  const [currentValue, setCurrentValue] = useState<string | number | boolean>(
    value?.value?.toString() || (field.type === 'yes_no' ? false : '')
  )
  const [error, setError] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  const handleSave = () => {
    const validationError = validateFieldValue(field, currentValue)
    if (validationError) {
      setError(validationError)
      return
    }

    let processedValue: string | number | boolean | Date = currentValue

    // Process value based on field type
    switch (field.type) {
      case 'fruit_count':
      case 'measurements':
        processedValue = typeof currentValue === 'string' ? parseFloat(currentValue) || 0 : currentValue
        break
      case 'harvest_date':
        processedValue = new Date(currentValue.toString())
        break
      case 'yes_no':
        processedValue = Boolean(currentValue)
        break
      default:
        processedValue = currentValue.toString()
    }

    onSave(processedValue)
    setError(null)
  }

  const handleTemplateSelect = (template: string) => {
    setCurrentValue(template)
    setShowTemplates(false)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const getTemplates = () => {
    if (field.type === 'quick_notes') return QUICK_NOTE_TEMPLATES.vi
    if (field.type === 'watering_notes') return WATERING_TEMPLATES.vi
    return []
  }

  const renderInput = () => {
    const baseInputClasses = `
      w-full px-4 py-3 text-lg border-2 rounded-xl 
      focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
      disabled:bg-gray-100 disabled:cursor-not-allowed
      min-touch text-gray-900
      ${error ? 'border-red-500' : 'border-gray-300'}
    `

    switch (field.type) {
      case 'fruit_count':
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setCurrentValue(Math.max(0, (Number(currentValue) || 0) - 1))}
                disabled={readOnly}
                className="min-touch w-12 h-12 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-xl font-bold text-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                −
              </button>
              
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="number"
                value={typeof currentValue === 'boolean' ? '' : currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder={field.placeholderVi}
                disabled={readOnly}
                min={field.min}
                max={field.max}
                className={`${baseInputClasses} text-center text-2xl font-bold flex-1`}
              />
              
              <button
                type="button"
                onClick={() => setCurrentValue((Number(currentValue) || 0) + 1)}
                disabled={readOnly}
                className="min-touch w-12 h-12 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-xl font-bold text-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                +
              </button>
            </div>
            {field.unit && (
              <p className="text-center text-gray-600">Đơn vị: {field.unit === 'meters' ? 'mét' : field.unit}</p>
            )}
          </div>
        )

      case 'measurements':
        return (
          <div className="space-y-2">
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="number"
              step="0.1"
              value={typeof currentValue === 'boolean' ? '' : currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              placeholder={field.placeholderVi}
              disabled={readOnly}
              min={field.min}
              max={field.max}
              className={baseInputClasses}
            />
            {field.unit && (
              <p className="text-sm text-gray-600">Đơn vị: {field.unit === 'meters' ? 'mét' : field.unit}</p>
            )}
          </div>
        )

      case 'harvest_date':
        const today = new Date().toISOString().split('T')[0]
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        
        return (
          <div className="space-y-3">
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="date"
              value={typeof currentValue === 'boolean' ? '' : currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              disabled={readOnly}
              className={baseInputClasses}
            />
            {!readOnly && (
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setCurrentValue(today)}
                  className="flex-1 py-2 px-3 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg font-medium text-sm min-touch active:scale-95 transition-transform"
                >
                  Hôm Nay
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentValue(yesterday)}
                  className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium text-sm min-touch active:scale-95 transition-transform"
                >
                  Hôm Qua
                </button>
              </div>
            )}
          </div>
        )

      case 'health_status':
        return (
          <select
            value={typeof currentValue === 'boolean' ? '' : currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            disabled={readOnly}
            className={baseInputClasses}
          >
            <option value="">Chọn tình trạng sức khỏe...</option>
            {field.optionsVi?.map((option, index) => (
              <option key={index} value={field.options?.[index] || option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'yes_no':
        return (
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setCurrentValue(true)}
              disabled={readOnly}
              className={`
                flex-1 py-4 px-6 rounded-xl font-bold text-lg min-touch transition-all
                ${currentValue === true 
                  ? 'bg-green-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
                ${readOnly ? 'cursor-not-allowed opacity-50' : 'active:scale-95'}
              `}
            >
              ✓ Có
            </button>
            <button
              type="button"
              onClick={() => setCurrentValue(false)}
              disabled={readOnly}
              className={`
                flex-1 py-4 px-6 rounded-xl font-bold text-lg min-touch transition-all
                ${currentValue === false 
                  ? 'bg-red-500 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
                ${readOnly ? 'cursor-not-allowed opacity-50' : 'active:scale-95'}
              `}
            >
              ✗ Không
            </button>
          </div>
        )

      case 'quick_notes':
      case 'watering_notes':
        const templates = getTemplates()
        return (
          <div className="space-y-3">
            <div className="relative">
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={typeof currentValue === 'boolean' ? '' : currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder={field.placeholderVi}
                disabled={readOnly}
                rows={4}
                className={`${baseInputClasses} resize-none`}
              />
              {!readOnly && templates.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 rounded-lg min-touch"
                >
                  <span className="text-xl">📝</span>
                </button>
              )}
            </div>
            
            {showTemplates && templates.length > 0 && (
              <div className="bg-white border-2 border-gray-200 rounded-xl p-3 shadow-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Mẫu ghi chú nhanh:</p>
                <div className="space-y-1">
                  {templates.map((template, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleTemplateSelect(template)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg min-touch transition-colors"
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      default:
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={typeof currentValue === 'boolean' ? '' : currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder={field.placeholderVi}
            disabled={readOnly}
            className={baseInputClasses}
          />
        )
    }
  }

  if (readOnly) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{field.icon}</span>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{field.labelVi}</h4>
            <p className="text-lg text-gray-700 mt-1">
              {value ? (
                field.type === 'yes_no' ? (value.value ? 'Có' : 'Không') :
                field.type === 'harvest_date' && value.value instanceof Date ? 
                  value.value.toLocaleDateString('vi-VN') :
                value.value instanceof Date ?
                  value.value.toLocaleDateString('vi-VN') :
                String(value.value)
              ) : (
                <span className="text-gray-400">Chưa có dữ liệu</span>
              )}
              {field.unit && value && ` ${field.unit === 'meters' ? 'mét' : field.unit}`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center space-x-3">
        <span className="text-2xl">{field.icon}</span>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{field.labelVi}</h4>
          {field.required && <span className="text-red-500 text-sm">*</span>}
        </div>
      </div>

      {renderInput()}

      {error && (
        <p className="text-red-500 text-sm font-medium flex items-center space-x-2">
          <span>⚠️</span>
          <span>{error}</span>
        </p>
      )}

      <div className="flex space-x-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-xl font-bold text-lg min-touch shadow-lg active:scale-95 transition-all"
        >
          ✓ Lưu
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 px-6 rounded-xl font-bold text-lg min-touch shadow-lg active:scale-95 transition-all"
          >
            ✗ Hủy
          </button>
        )}
      </div>
    </div>
  )
}