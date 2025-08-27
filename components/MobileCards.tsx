'use client'

import React from 'react'
import { 
  MapPinIcon,
  CameraIcon,
  QrCodeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  HeartIcon
} from '@heroicons/react/24/outline'

// Mobile Tree Card optimized for touch
export interface MobileTreeCardProps {
  tree: {
    id: string
    name: string
    latitude?: number
    longitude?: number
    plantingDate?: Date
    variety?: string
    treeStatus: 'Young Tree' | 'Mature' | 'Old Tree' | 'Dead'
    healthStatus: 'Good' | 'Fair' | 'Poor' | 'Disease'
    qrCode?: string
    manualFruitCount?: number
    aiFruitCount?: number
    needsAttention: boolean
    photoCount: number
    lastPhotoDate?: Date
  }
  onSelect?: (tree: any) => void
  onQuickPhoto?: (tree: any) => void
  onViewLocation?: (tree: any) => void
}

export function MobileTreeCard({ tree, onSelect, onQuickPhoto, onViewLocation }: MobileTreeCardProps) {
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'Good': return 'text-green-600 bg-green-50'
      case 'Fair': return 'text-yellow-600 bg-yellow-50'
      case 'Poor': return 'text-orange-600 bg-orange-50'
      case 'Disease': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Good': return <CheckCircleIcon className="h-4 w-4" />
      case 'Fair': return <ClockIcon className="h-4 w-4" />
      case 'Poor': return <ExclamationTriangleIcon className="h-4 w-4" />
      case 'Disease': return <ExclamationTriangleIcon className="h-4 w-4" />
      default: return <CheckCircleIcon className="h-4 w-4" />
    }
  }

  const daysSincePhoto = tree.lastPhotoDate 
    ? Math.floor((new Date().getTime() - tree.lastPhotoDate.getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden touch-manipulation active:scale-98 transition-transform"
      onClick={() => onSelect?.(tree)}
    >
      {/* Header with status and actions */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate text-lg">
              {tree.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {tree.variety} • ID: {tree.id.slice(-6)}
            </p>
          </div>
          
          {tree.needsAttention && (
            <div className="ml-2 p-2 bg-red-50 rounded-full">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            </div>
          )}
        </div>

        {/* Health Status Badge */}
        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium mt-3 ${getHealthColor(tree.healthStatus)}`}>
          {getStatusIcon(tree.healthStatus)}
          <span className="ml-1">{tree.healthStatus}</span>
        </div>
      </div>

      {/* Key Info Grid */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Location */}
          {tree.latitude && tree.longitude && (
            <div className="flex items-center space-x-2">
              <MapPinIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-600 truncate">
                GPS: {tree.latitude.toFixed(4)}, {tree.longitude.toFixed(4)}
              </span>
            </div>
          )}

          {/* Photos */}
          <div className="flex items-center space-x-2">
            <CameraIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-600">
              {tree.photoCount} ảnh
              {daysSincePhoto && (
                <span className={`ml-1 ${daysSincePhoto > 7 ? 'text-amber-600' : 'text-gray-500'}`}>
                  ({daysSincePhoto}d)
                </span>
              )}
            </span>
          </div>

          {/* QR Code */}
          {tree.qrCode && (
            <div className="flex items-center space-x-2">
              <QrCodeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-600">QR: {tree.qrCode}</span>
            </div>
          )}

          {/* Fruit Count */}
          {(tree.manualFruitCount || tree.aiFruitCount) && (
            <div className="flex items-center space-x-2">
              <HeartIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                {tree.aiFruitCount || tree.manualFruitCount} quả
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-gray-50 px-4 py-3 flex space-x-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onQuickPhoto?.(tree)
          }}
          className="flex-1 bg-green-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-green-700 active:bg-green-800 transition-colors touch-manipulation flex items-center justify-center space-x-2"
        >
          <CameraIcon className="h-4 w-4" />
          <span>Chụp ảnh</span>
        </button>
        
        {tree.latitude && tree.longitude && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onViewLocation?.(tree)
            }}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
          >
            <MapPinIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// Mobile Stats Card for dashboard
export interface MobileStatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'gray'
  trend?: { value: number; isPositive: boolean }
  onClick?: () => void
}

export function MobileStatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = 'green', 
  trend,
  onClick 
}: MobileStatsCardProps) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-50 text-gray-600'
  }

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 touch-manipulation active:scale-98 transition-transform"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 leading-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <p className={`text-sm font-medium mt-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

// Mobile Action Button for quick field actions
export interface MobileActionButtonProps {
  title: string
  subtitle?: string
  icon: React.ElementType
  onClick: () => void
  color?: 'green' | 'blue' | 'yellow' | 'red'
  disabled?: boolean
  badge?: string | number
}

export function MobileActionButton({ 
  title, 
  subtitle, 
  icon: Icon, 
  onClick, 
  color = 'green',
  disabled = false,
  badge
}: MobileActionButtonProps) {
  const colorClasses = {
    green: disabled ? 'bg-gray-100 text-gray-400' : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
    blue: disabled ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    yellow: disabled ? 'bg-gray-100 text-gray-400' : 'bg-yellow-600 text-white hover:bg-yellow-700 active:bg-yellow-800',
    red: disabled ? 'bg-gray-100 text-gray-400' : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full p-4 rounded-xl font-medium transition-colors touch-manipulation relative
        flex items-center space-x-3 text-left
        ${colorClasses[color]}
        ${disabled ? 'cursor-not-allowed' : 'active:scale-98 transition-transform'}
      `}
    >
      <div className="p-2 bg-white/20 rounded-lg">
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        {subtitle && <p className="text-sm opacity-90">{subtitle}</p>}
      </div>
      {badge && (
        <span className="bg-white/20 px-2 py-1 rounded-full text-sm font-medium">
          {badge}
        </span>
      )}
    </button>
  )
}

// Mobile Form Input optimized for field use
export interface MobileInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'number' | 'tel' | 'email'
  placeholder?: string
  required?: boolean
  error?: string
  disabled?: boolean
  suffix?: string
}

export function MobileInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  error,
  disabled,
  suffix
}: MobileInputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-3 text-base border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors
            ${error ? 'border-red-300' : 'border-gray-300'}
            ${disabled ? 'bg-gray-50 text-gray-500' : 'bg-white'}
          `}
        />
        {suffix && (
          <span className="absolute right-3 top-3 text-gray-500 text-base">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

// Mobile Select optimized for touch
export interface MobileSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  required?: boolean
  error?: string
  disabled?: boolean
}

export function MobileSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  error,
  disabled
}: MobileSelectProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`
          w-full px-4 py-3 text-base border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors appearance-none bg-no-repeat bg-right
          ${error ? 'border-red-300' : 'border-gray-300'}
          ${disabled ? 'bg-gray-50 text-gray-500' : 'bg-white'}
        `}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.75rem center',
          backgroundSize: '1.5em 1.5em'
        }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}