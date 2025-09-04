'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/enhanced-auth-context'
import { updateTree, deleteTree } from '@/lib/firestore'
import { Tree } from '@/lib/types'
import { 
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CameraIcon,
  BeakerIcon,
  ScissorsIcon,
  HeartIcon,
  EyeIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { ImageGallery } from './ImageGallery'
import { CustomFieldsSection } from './CustomFieldsSection'
import { CustomFieldValue, TreeCustomFields } from '@/lib/custom-field-types'

interface TreeDetailProps {
  tree: Tree | null
  onClose: () => void
  onTreeUpdate?: (updatedTree: Tree) => void
  onTreeDelete?: (treeId: string) => void
  className?: string
}

export function TreeDetail({ tree, onClose, onTreeUpdate, onTreeDelete, className = '' }: TreeDetailProps) {
  const { user, currentFarm } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Tree>>({})
  const [customFields, setCustomFields] = useState<TreeCustomFields | undefined>()

  useEffect(() => {
    if (tree) {
      setFormData({
        name: tree.name || '',
        variety: tree.variety || '',
        zoneCode: tree.zoneCode || '',
        plantingDate: tree.plantingDate,
        healthStatus: tree.healthStatus || 'Good',
        treeHeight: tree.treeHeight || 0,
        trunkDiameter: tree.trunkDiameter || 0,
        manualFruitCount: tree.manualFruitCount || 0,
        notes: tree.notes || '',
        healthNotes: tree.healthNotes || '',
        diseaseNotes: tree.diseaseNotes || '',
        needsAttention: tree.needsAttention || false
      })
      
      // Set custom fields from tree data
      setCustomFields(tree.customFields as TreeCustomFields)
    }
  }, [tree])

  if (!tree) {
    return (
      <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 ${className}`}>
        <div className="text-center py-12">
          <EyeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chọn một cây để xem chi tiết</h3>
          <p className="text-gray-600">
            Nhấn vào một cây trong danh sách để xem thông tin chi tiết.
          </p>
        </div>
      </div>
    )
  }

  const handleSave = async () => {
    if (!user || !currentFarm || !tree) return

    setLoading(true)
    try {
      await updateTree(currentFarm.id, tree.id, user.uid, {
        ...formData,
        updatedAt: new Date()
      })

      const updatedTree = { ...tree, ...formData, updatedAt: new Date() }
      onTreeUpdate?.(updatedTree)
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating tree:', error)
      alert('Có lỗi xảy ra khi cập nhật thông tin cây')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!user || !currentFarm || !tree) return

    if (!confirm('Bạn có chắc chắn muốn xóa cây này không? Hành động này không thể hoàn tác.')) {
      return
    }

    setLoading(true)
    try {
      await deleteTree(currentFarm.id, tree.id, user.uid)
      onTreeDelete?.(tree.id)
      onClose()
    } catch (error) {
      console.error('Error deleting tree:', error)
      alert('Có lỗi xảy ra khi xóa cây')
    } finally {
      setLoading(false)
    }
  }

  const handleCustomFieldsSave = async (treeId: string, fields: CustomFieldValue[]) => {
    if (!user || !currentFarm) return
    
    try {
      // For now, we'll store custom fields in the tree's customFields property
      // In a real app, this would be a separate collection or subcollection
      const updatedCustomFields: TreeCustomFields = {
        treeId,
        fields,
        lastUpdated: new Date()
      }
      
      await updateTree(currentFarm.id, treeId, user.uid, {
        customFields: updatedCustomFields,
        updatedAt: new Date()
      })
      
      setCustomFields(updatedCustomFields)
    } catch (error) {
      console.error('Error saving custom fields:', error)
      throw error // Let CustomFieldsSection handle the error display
    }
  }

  const getHealthIcon = (status?: string) => {
    switch (status) {
      case 'Excellent': 
      case 'Good': 
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />
      case 'Poor': 
        return <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
      default: 
        return <ClockIcon className="h-6 w-6 text-yellow-500" />
    }
  }

  const getHealthStatusColor = (status?: string) => {
    switch (status) {
      case 'Excellent': return 'bg-green-100 text-green-800 border-green-200'
      case 'Good': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Poor': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (date?: Date | null) => {
    if (!date) return 'Chưa có thông tin'
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
  }

  const formatDateTime = (date?: Date | null) => {
    if (!date) return 'Chưa có thông tin'
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const totalFruits = (tree.manualFruitCount || 0) + (tree.aiFruitCount || 0)

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 ${className}`} data-testid="tree-detail">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="flex items-center space-x-2 px-3 py-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-50"
            title="Quay lại"
            data-testid="back-button"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span className="text-sm lg:hidden">Quay lại</span>
          </button>
          <div className="flex items-center space-x-3">
            {getHealthIcon(tree.healthStatus)}
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {tree.name || `Cây ${tree.variety || tree.zoneName || tree.id.slice(0, 8)}`}
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                {tree.variety && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {tree.variety}
                  </span>
                )}
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getHealthStatusColor(tree.healthStatus)}`}>
                  {tree.healthStatus || 'Chưa đánh giá'}
                </span>
                {tree.needsAttention && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                    Cần chú ý
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                <PencilIcon className="h-4 w-4" />
                <span>Chỉnh sửa</span>
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4" />
                <span>Xóa</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Đang lưu...' : 'Lưu'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <MapPinIcon className="h-5 w-5 mr-2" />
              Thông tin cơ bản
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên cây</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Nhập tên cây"
                  />
                ) : (
                  <p className="text-gray-900">{tree.name || 'Chưa đặt tên'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giống cây</label>
                {isEditing ? (
                  <select
                    value={formData.variety || ''}
                    onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Chọn giống cây</option>
                    <option value="Kan Yao">Kan Yao</option>
                    <option value="Ri6">Ri6</option>
                    <option value="Monthong">Monthong</option>
                    <option value="Musang King">Musang King</option>
                    <option value="Black Thorn">Black Thorn</option>
                    <option value="Red Prawn">Red Prawn</option>
                    <option value="Khác">Khác</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{tree.variety || 'Chưa xác định'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khu vực</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.zoneCode || ''}
                    onChange={(e) => setFormData({ ...formData, zoneCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Ví dụ: A01, B05..."
                  />
                ) : (
                  <p className="text-gray-900">{tree.zoneCode || 'Chưa phân khu'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày trồng</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.plantingDate ? formData.plantingDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      plantingDate: e.target.value ? new Date(e.target.value) : undefined 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{formatDate(tree.plantingDate)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">QR Code</label>
                <p className="text-gray-900 font-mono text-sm">{tree.qrCode || 'Chưa có'}</p>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Thông số sinh trưởng
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái sức khỏe</label>
                {isEditing ? (
                  <select
                    value={formData.healthStatus || ''}
                    onChange={(e) => setFormData({ ...formData, healthStatus: e.target.value as Tree['healthStatus'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="Excellent">Xuất sắc</option>
                    <option value="Good">Tốt</option>
                    <option value="Fair">Bình thường</option>
                    <option value="Poor">Yếu</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{tree.healthStatus || 'Chưa đánh giá'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chiều cao (m)</label>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.treeHeight || ''}
                    onChange={(e) => setFormData({ ...formData, treeHeight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.0"
                  />
                ) : (
                  <p className="text-gray-900">{tree.treeHeight ? `${tree.treeHeight} m` : 'Chưa đo'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đường kính thân (cm)</label>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.trunkDiameter || ''}
                    onChange={(e) => setFormData({ ...formData, trunkDiameter: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.0"
                  />
                ) : (
                  <p className="text-gray-900">{tree.trunkDiameter ? `${tree.trunkDiameter} cm` : 'Chưa đo'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số trái đếm thủ công</label>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    value={formData.manualFruitCount || ''}
                    onChange={(e) => setFormData({ ...formData, manualFruitCount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0"
                  />
                ) : (
                  <p className="text-gray-900">{(tree.manualFruitCount || 0).toLocaleString()} trái</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số trái AI phát hiện</label>
                <p className="text-gray-900">{(tree.aiFruitCount || 0).toLocaleString()} trái</p>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tổng số trái</label>
                <p className="text-lg font-semibold text-green-600">{totalFruits.toLocaleString()} trái</p>
              </div>
            </div>
          </div>
        </div>

        {/* Care History */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
            <HeartIcon className="h-5 w-5 mr-2" />
            Lịch sử chăm sóc
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center text-green-700 mb-2">
                <BeakerIcon className="h-5 w-5 mr-2" />
                <span className="font-medium">Bón phân</span>
              </div>
              <p className="text-green-900">{formatDate(tree.fertilizedDate)}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center text-blue-700 mb-2">
                <ScissorsIcon className="h-5 w-5 mr-2" />
                <span className="font-medium">Tỉa cành</span>
              </div>
              <p className="text-blue-900">{formatDate(tree.prunedDate)}</p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center text-purple-700 mb-2">
                <CameraIcon className="h-5 w-5 mr-2" />
                <span className="font-medium">Chụp ảnh AI</span>
              </div>
              <p className="text-purple-900">{formatDate(tree.lastAIAnalysisDate)}</p>
            </div>
          </div>
        </div>

        {/* Notes and Observations */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ghi chú và quan sát</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú chung</label>
              {isEditing ? (
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Nhập ghi chú về cây..."
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">{tree.notes || 'Chưa có ghi chú'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú sức khỏe</label>
              {isEditing ? (
                <textarea
                  value={formData.healthNotes || ''}
                  onChange={(e) => setFormData({ ...formData, healthNotes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Nhập ghi chú về tình trạng sức khỏe..."
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">{tree.healthNotes || 'Chưa có ghi chú sức khỏe'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú bệnh tật</label>
              {isEditing ? (
                <textarea
                  value={formData.diseaseNotes || ''}
                  onChange={(e) => setFormData({ ...formData, diseaseNotes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Nhập ghi chú về bệnh tật..."
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">{tree.diseaseNotes || 'Chưa có ghi chú bệnh tật'}</p>
              )}
            </div>

            {isEditing && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="needsAttention"
                  checked={formData.needsAttention || false}
                  onChange={(e) => setFormData({ ...formData, needsAttention: e.target.checked })}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="needsAttention" className="ml-2 block text-sm text-gray-900">
                  Cây này cần được chú ý đặc biệt
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Custom Fields Section */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin bổ sung</h3>
          <CustomFieldsSection
            treeId={tree.id}
            customFields={customFields || (tree.customFields as TreeCustomFields)}
            onSave={handleCustomFieldsSave}
          />
        </div>

        {/* Image Gallery */}
        <div className="border-t border-gray-200 pt-6">
          <ImageGallery tree={tree} />
        </div>

        {/* System Information */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin hệ thống</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Tọa độ GPS:</span>
              <div className="font-medium">
                {tree.latitude && tree.longitude 
                  ? `${tree.latitude.toFixed(6)}, ${tree.longitude.toFixed(6)}`
                  : 'Chưa có tọa độ'
                }
              </div>
            </div>
            <div>
              <span className="text-gray-500">Độ chính xác GPS:</span>
              <div className="font-medium">{tree.gpsAccuracy ? `${tree.gpsAccuracy}m` : 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-500">Ngày tạo:</span>
              <div className="font-medium">{formatDateTime(tree.createdAt)}</div>
            </div>
            <div>
              <span className="text-gray-500">Cập nhật lần cuối:</span>
              <div className="font-medium">{formatDateTime(tree.updatedAt)}</div>
            </div>
            <div>
              <span className="text-gray-500">Đồng bộ lần cuối:</span>
              <div className="font-medium">{formatDateTime(tree.lastSyncDate)}</div>
            </div>
            <div>
              <span className="text-gray-500">Đếm trái lần cuối:</span>
              <div className="font-medium">{formatDateTime(tree.lastCountDate)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}