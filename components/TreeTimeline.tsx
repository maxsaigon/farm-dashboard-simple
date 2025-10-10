'use client'

import React, { useEffect, useState } from 'react'
import { 
  ClockIcon, 
  UserIcon, 
  PencilIcon,
  MapPinIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { collection, query, where, orderBy, getDocs, limit, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface TreeActivity {
  id: string
  timestamp: Date
  userId: string
  userName: string
  action: string
  field?: string
  oldValue?: any
  newValue?: any
  details?: Record<string, any>
}

interface TreeTimelineProps {
  treeId: string
  farmId: string
  className?: string
}

// Helper to format field names in Vietnamese
const formatFieldName = (field: string): string => {
  const fieldNames: Record<string, string> = {
    manualFruitCount: 'Số lượng trái',
    needsAttention: 'Cần chú ý',
    treeStatus: 'Trạng thái cây',
    latitude: 'Vĩ độ',
    longitude: 'Kinh độ',
    healthStatus: 'Tình trạng sức khỏe',
    healthNotes: 'Ghi chú sức khỏe',
    variety: 'Giống cây',
    name: 'Tên cây',
    notes: 'Ghi chú',
    zoneCode: 'Mã khu vực',
    plantingDate: 'Ngày trồng',
    fertilizedDate: 'Ngày bón phân',
    prunedDate: 'Ngày tỉa cành'
  }
  return fieldNames[field] || field
}

// Helper to format values
const formatValue = (value: any, field?: string): string => {
  if (value === null || value === undefined) return 'N/A'
  
  if (typeof value === 'boolean') {
    return value ? 'Có' : 'Không'
  }
  
  if (field === 'treeStatus') {
    const statusMap: Record<string, string> = {
      'Young Tree': 'Cây Non',
      'Mature': 'Cây Trưởng Thành',
      'Old': 'Cây Già',
      'Cây Non': 'Cây Non',
      'Cây Trưởng Thành': 'Cây Trưởng Thành',
      'Cây Già': 'Cây Già'
    }
    return statusMap[value] || value
  }
  
  if (field === 'healthStatus') {
    const healthMap: Record<string, string> = {
      'Excellent': 'Xuất sắc',
      'Good': 'Tốt',
      'Fair': 'Trung bình',
      'Poor': 'Kém'
    }
    return healthMap[value] || value
  }
  
  if (typeof value === 'number') {
    if (field === 'latitude' || field === 'longitude') {
      return value.toFixed(6)
    }
    return value.toLocaleString()
  }
  
  return String(value)
}

// Get icon for action type
const getActionIcon = (action: string, field?: string) => {
  if (action.includes('GPS') || field === 'latitude' || field === 'longitude') {
    return <MapPinIcon className="w-4 h-4" />
  }
  if (action.includes('PHOTO') || action.includes('IMAGE') || action.includes('UPLOADED')) {
    return <PhotoIcon className="w-4 h-4" />
  }
  if (action.includes('COUNT') || field === 'manualFruitCount') {
    return <ChartBarIcon className="w-4 h-4" />
  }
  if (action.includes('ATTENTION') || field === 'needsAttention') {
    return <ExclamationTriangleIcon className="w-4 h-4" />
  }
  if (action.includes('STATUS') || field === 'treeStatus' || field === 'healthStatus') {
    return <CheckCircleIcon className="w-4 h-4" />
  }
  return <PencilIcon className="w-4 h-4" />
}

// Get color for action type
const getActionColor = (action: string, field?: string): string => {
  if (action.includes('GPS') || field === 'latitude' || field === 'longitude') {
    return 'text-blue-600 bg-blue-50'
  }
  if (action.includes('PHOTO') || action.includes('IMAGE') || action.includes('UPLOADED')) {
    return 'text-purple-600 bg-purple-50'
  }
  if (action.includes('COUNT') || field === 'manualFruitCount') {
    return 'text-green-600 bg-green-50'
  }
  if (action.includes('ATTENTION') || field === 'needsAttention') {
    return 'text-orange-600 bg-orange-50'
  }
  if (action.includes('STATUS') || field === 'treeStatus' || field === 'healthStatus') {
    return 'text-indigo-600 bg-indigo-50'
  }
  return 'text-gray-600 bg-gray-50'
}

// Get action description in Vietnamese
const getActionDescription = (action: string, field?: string, details?: Record<string, any>): string => {
  if (action === 'PHOTO_UPLOADED') {
    const photoType = details?.photoType
    const typeNames: Record<string, string> = {
      general: 'chung',
      health: 'sức khỏe',
      fruit_count: 'đếm trái'
    }
    return `Thêm ảnh ${typeNames[photoType] || 'mới'}`
  }
  if (action === 'TREE_CREATED') {
    return 'Tạo cây mới'
  }
  if (action === 'TREE_DELETED') {
    return 'Xóa cây'
  }
  if (action === 'TREE_UPDATE' && field) {
    return formatFieldName(field)
  }
  return action
}

// Format relative time
const formatRelativeTime = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Vừa xong'
  if (diffMins < 60) return `${diffMins} phút trước`
  if (diffHours < 24) return `${diffHours} giờ trước`
  if (diffDays < 7) return `${diffDays} ngày trước`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng trước`
  return `${Math.floor(diffDays / 365)} năm trước`
}

export default function TreeTimeline({ treeId, farmId, className = '' }: TreeTimelineProps) {
  const [activities, setActivities] = useState<TreeActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true)
        setError(null)

        // Query audit logs for this specific tree
        // Using simpler query to avoid composite index requirement
        const auditRef = collection(db, 'auditLogs')
        const q = query(
          auditRef,
          where('resourceId', '==', treeId),
          orderBy('timestamp', 'desc'),
          limit(20)
        )

        const snapshot = await getDocs(q)
        const logs: TreeActivity[] = []
        
        // Cache for user display names
        const userDisplayNames = new Map<string, string>()

        // Fetch user display names
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data()
          
          // Filter for tree resource type and photo uploads
          if (data.resource === 'tree' || (data.resource === 'photo' && data.details?.treeId === treeId)) {
            const userId = data.userId || 'unknown'
            
            // Get display name from users collection if not cached
            if (!userDisplayNames.has(userId) && userId !== 'unknown') {
              try {
                const userDoc = await getDoc(doc(db, 'users', userId))
                if (userDoc.exists()) {
                  const userData = userDoc.data()
                  userDisplayNames.set(userId, userData.displayName || userData.email?.split('@')[0] || 'Unknown User')
                } else {
                  // Fallback to email from audit log
                  const email = data.userEmail || 'Unknown User'
                  userDisplayNames.set(userId, email.split('@')[0] || email)
                }
              } catch (error) {
                // Fallback to email from audit log
                const email = data.userEmail || 'Unknown User'
                userDisplayNames.set(userId, email.split('@')[0] || email)
              }
            }
            
            const userName = userDisplayNames.get(userId) || data.userEmail?.split('@')[0] || 'Unknown User'
            
            logs.push({
              id: docSnap.id,
              timestamp: data.timestamp?.toDate() || new Date(),
              userId: userId,
              userName: userName,
              action: data.action || 'UPDATE',
              field: data.details?.field,
              oldValue: data.details?.oldValue,
              newValue: data.details?.newValue,
              details: data.details || {}
            })
          }
        }

        setActivities(logs)
      } catch (err) {
        console.error('Error loading tree activities:', err)
        // Show more detailed error for debugging
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error('Detailed error:', errorMessage)
        setError('Chưa có lịch sử thay đổi')
      } finally {
        setLoading(false)
      }
    }

    if (treeId && farmId) {
      loadActivities()
    }
  }, [treeId, farmId])

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-4 shadow-sm ${className}`}>
        <div className="flex items-center space-x-2 mb-3">
          <ClockIcon className="w-5 h-5 text-gray-600" />
          <h3 className="text-base font-semibold text-gray-900">Lịch sử</h3>
        </div>
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse flex space-x-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-2 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-4 shadow-sm ${className}`}>
        <div className="flex items-center space-x-2 mb-3">
          <ClockIcon className="w-5 h-5 text-gray-600" />
          <h3 className="text-base font-semibold text-gray-900">Lịch sử</h3>
        </div>
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-4 shadow-sm ${className}`}>
        <div className="flex items-center space-x-2 mb-3">
          <ClockIcon className="w-5 h-5 text-gray-600" />
          <h3 className="text-base font-semibold text-gray-900">Lịch sử</h3>
        </div>
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">Chưa có lịch sử thay đổi</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <ClockIcon className="w-5 h-5 text-gray-600" />
          <h3 className="text-base font-semibold text-gray-900">Lịch sử</h3>
        </div>
        <span className="text-xs text-gray-500">{activities.length}</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {activities.map((activity, index) => {
          const isLast = index === activities.length - 1
          const colorClass = getActionColor(activity.action, activity.field)
          
          return (
            <div key={activity.id} className="relative">
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-4 top-9 bottom-0 w-0.5 bg-gray-200"></div>
              )}
              
              <div className="flex space-x-2">
                {/* Icon */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full ${colorClass} flex items-center justify-center relative z-10`}>
                  {getActionIcon(activity.action, activity.field)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-50 rounded-lg p-2">
                    {/* User and time */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-900 truncate">
                        {activity.userName}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                    </div>

                    {/* Action description */}
                    <div className="text-xs text-gray-700">
                      <div>
                        <span className="font-medium">{getActionDescription(activity.action, activity.field, activity.details)}</span>
                        {activity.field && activity.oldValue !== undefined && activity.newValue !== undefined ? (
                          <div className="mt-1 flex items-center space-x-1 text-xs">
                            <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
                              {formatValue(activity.oldValue, activity.field)}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                              {formatValue(activity.newValue, activity.field)}
                            </span>
                          </div>
                        ) : activity.field && activity.newValue !== undefined ? (
                          <span className="ml-1">
                            → <span className="font-medium">{formatValue(activity.newValue, activity.field)}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}