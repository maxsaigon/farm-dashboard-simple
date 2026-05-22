'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSimpleAuth } from '@/lib/optimized-auth-context'
import { updateTree, deleteTree } from '@/lib/firestore'
import { Tree } from '@/lib/types'
import {
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { ImageGallery } from './ImageGallery'
import { CustomFieldsSection } from './CustomFieldsSection'
import { CustomFieldValue, TreeCustomFields } from '@/lib/custom-field-types'
import { useToast } from './Toast'

interface TreeDetailProps {
  tree: Tree | null
  onClose: () => void
  onTreeUpdate?: (updatedTree: Tree) => void
  onTreeDelete?: (treeId: string) => void
  className?: string
  fullScreen?: boolean
  /** When true on mobile, disables the internal full-screen portal so the component can be embedded (e.g., in a BottomSheet). */
  disableMobileFullscreen?: boolean
}

export function TreeDetail({ tree, onClose, onTreeUpdate, onTreeDelete, className = '', fullScreen = false, disableMobileFullscreen = false }: TreeDetailProps) {
  const { user, currentFarm } = useSimpleAuth()
  const { showSuccess, showError, ToastContainer } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Tree>>({})
  const [customFields, setCustomFields] = useState<TreeCustomFields | undefined>()
  const [isMobile, setIsMobile] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')

  // Mobile detection and body scroll locking
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768
      setIsMobile(isMobileDevice)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Body scroll locking for mobile full-screen mode
  useEffect(() => {
    if (tree && isMobile) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      
      return () => {
        const scrollY = document.body.style.top
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
      }
    }
  }, [tree, isMobile])

  // Memoize form data initialization to prevent unnecessary re-renders
  const initialFormData = useMemo(() => {
    if (!tree) return {}
    return {
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
    }
  }, [tree])

  useEffect(() => {
    if (tree) {
      setFormData(initialFormData)
      // Set custom fields from tree data
      setCustomFields(tree.customFields as TreeCustomFields)
    }
  }, [tree, initialFormData])


  const validateFormData = useCallback((data: Partial<Tree>) => {
    if (!data.name || data.name.trim() === '') {
      return { isValid: false, message: 'Vui lòng nhập tên cây' }
    }
    if (!data.variety) {
      return { isValid: false, message: 'Vui lòng chọn giống cây' }
    }
    return { isValid: true, message: '' }
  }, [])

  const handleSave = useCallback(async () => {
    // Authentication check
    if (!user) {
      showError('Vui lòng đăng nhập', 'Bạn cần đăng nhập để lưu thông tin cây.')
      return
    }

    if (!currentFarm) {
      showError('Không có trang trại', 'Vui lòng chọn trang trại trước khi lưu thông tin cây.')
      return
    }

    if (!tree) {
      showError('Không tìm thấy cây', 'Không có thông tin cây để cập nhật.')
      return
    }

    // Validate form data
    const validation = validateFormData(formData)
    if (!validation.isValid) {
      showError('Thông tin không hợp lệ', validation.message)
      return
    }

    setLoading(true)
    setSaveStatus('saving')
    
    try {
      await updateTree(currentFarm.id, tree.id, user.uid, {
        ...formData,
        updatedAt: new Date()
      })

      const updatedTree = { ...tree, ...formData, updatedAt: new Date() }
      onTreeUpdate?.(updatedTree)
      
      setSaveStatus('success')
      showSuccess('Lưu thành công!', 'Thông tin cây đã được cập nhật.')
      
      // Exit edit mode after short delay
      setTimeout(() => {
        setIsEditing(false)
        setSaveStatus('idle')
      }, 1500)
      
    } catch (error) {
      setSaveStatus('error')
      showError(
        'Không thể lưu thông tin',
        'Vui lòng kiểm tra kết nối mạng và thử lại.'
      )
    } finally {
      setLoading(false)
    }
  }, [user, currentFarm, tree, formData, showSuccess, showError, onTreeUpdate])

  const handleDelete = useCallback(async () => {
    // Authentication check
    if (!user) {
      showError('Vui lòng đăng nhập', 'Bạn cần đăng nhập để xóa cây.')
      return
    }

    if (!currentFarm) {
      showError('Không có trang trại', 'Vui lòng chọn trang trại trước khi xóa cây.')
      return
    }

    if (!tree) {
      showError('Không tìm thấy cây', 'Không có cây để xóa.')
      return
    }

    if (!confirm('Bạn có chắc chắn muốn xóa cây này không? Hành động này không thể hoàn tác.')) {
      return
    }

    setLoading(true)
    try {
      await deleteTree(currentFarm.id, tree.id, user.uid)
      onTreeDelete?.(tree.id)
      onClose()
    } catch (error) {
      alert('Có lỗi xảy ra khi xóa cây')
    } finally {
      setLoading(false)
    }
  }, [user, currentFarm, tree, showError, onTreeDelete, onClose])

  const handleCustomFieldsSave = useCallback(async (treeId: string, fields: CustomFieldValue[]) => {
    // Authentication check
    if (!user) {
      showError('Vui lòng đăng nhập', 'Bạn cần đăng nhập để lưu thông tin bổ sung.')
      throw new Error('Authentication required')
    }

    if (!currentFarm) {
      showError('Không có trang trại', 'Vui lòng chọn trang trại trước khi lưu thông tin.')
      throw new Error('Farm not selected')
    }
    
    try {
      // For now, we'll store custom fields in the tree's customFields property
      // In a real app, this would be a separate collection or subcollection
      const updatedCustomFields: TreeCustomFields = {
        treeId,
        fields,
        lastUpdated: new Date()
      }
      
      const updatedTreeData = {
        customFields: updatedCustomFields,
        updatedAt: new Date()
      }

      await updateTree(currentFarm.id, treeId, user.uid, updatedTreeData)

      setCustomFields(updatedCustomFields)
      
      // Update the parent component's tree data if callback exists
      if (onTreeUpdate && tree) {
        const updatedTree: Tree = {
          ...tree,
          ...updatedTreeData
        }
        onTreeUpdate(updatedTree)
      }
    } catch (error) {
      throw error // Let CustomFieldsSection handle the error display
    }
  }, [user, currentFarm, showError, onTreeUpdate, tree])

  const getHealthIcon = useCallback((status?: string) => {
    switch (status) {
      case 'Excellent': 
      case 'Good': 
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />
      case 'Poor': 
        return <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
      default: 
        return <ClockIcon className="h-6 w-6 text-yellow-500" />
    }
  }, [])

  const getHealthStatusColor = useCallback((status?: string) => {
    switch (status) {
      case 'Excellent': return 'bg-green-100 text-green-800 border-green-200'
      case 'Good': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Poor': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }, [])

  const getHealthStatusText = useCallback((status?: string) => {
    switch (status) {
      case 'Excellent': return 'Xuất sắc'
      case 'Good': return 'Tốt'
      case 'Fair': return 'Bình thường'
      case 'Poor': return 'Cần chăm sóc'
      default: return 'Chưa đánh giá'
    }
  }, [])


  // Simplified return - just return the tree detail component
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

  return (
    <div className={`bg-white ${isMobile ? '' : 'rounded-xl shadow-lg border border-gray-200'} ${className}`} data-testid="tree-detail">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          {!isMobile && (
            <button
              onClick={onClose}
              className="flex items-center space-x-2 px-3 py-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-50"
              title="Quay lại"
              data-testid="back-button"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span className="text-sm lg:hidden">Quay lại</span>
            </button>
          )}
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
          {!user ? (
            <div className="text-sm text-gray-500 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
              <span>Đăng nhập để chỉnh sửa</span>
            </div>
          ) : !isEditing ? (
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

      {/* Simplified Farmer-Focused Content */}
      <div className={`p-6 space-y-8 ${isMobile ? '' : 'max-h-[calc(100vh-200px)] overflow-y-auto'}`}>
        
        {/* Essential Tree Information - What farmers actually need */}
        <div className="space-y-6">
          
          {/* Tree Identity */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="text-lg font-semibold text-gray-800 flex items-center mb-2">
                  🌳 Tên cây
                  <span className="text-red-500 ml-2">*</span>
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl 
                               focus:border-green-500 focus:ring-4 focus:ring-green-100
                               bg-white shadow-sm min-touch"
                    placeholder="Ví dụ: Cây sầu riêng số 1"
                  />
                ) : (
                  <p className="text-gray-900 text-xl font-semibold">{tree.name || 'Chưa đặt tên'}</p>
                )}
              </div>

              <div>
                <label className="text-lg font-semibold text-gray-800 flex items-center mb-2">
                  🌱 Giống cây
                  <span className="text-red-500 ml-2">*</span>
                </label>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'Monthong', vietnamese: 'Monthong' },
                      { value: 'Musang King', vietnamese: 'Musang King' },
                      { value: 'Kan Yao', vietnamese: 'Kan Yao' },
                      { value: 'Ri6', vietnamese: 'Ri6' },
                      { value: 'Black Thorn', vietnamese: 'Black Thorn' },
                      { value: 'Red Prawn', vietnamese: 'Red Prawn' },
                    ].map((variety) => (
                      <button
                        key={variety.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, variety: variety.value })}
                        className={`p-4 border-2 rounded-xl text-center transition-all min-touch active:scale-95 ${
                          formData.variety === variety.value
                            ? 'border-green-500 bg-green-50 text-green-800 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <div className="font-semibold text-lg">{variety.value}</div>
                        <div className="text-sm text-gray-500">{variety.vietnamese}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-semibold text-lg">
                      {tree.variety || 'Chưa xác định'}
                    </span>
                  </div>
                )}
              </div>

              {/* Only show zone if it exists and makes sense */}
              {(tree.zoneCode || isEditing) && (
                <div>
                  <label className="text-lg font-semibold text-gray-800 flex items-center mb-2">
                    📍 Khu vực
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.zoneCode || ''}
                      onChange={(e) => setFormData({ ...formData, zoneCode: e.target.value })}
                      className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl 
                                 focus:border-green-500 focus:ring-4 focus:ring-green-100
                                 bg-white shadow-sm min-touch"
                      placeholder="Ví dụ: A01, B05..."
                    />
                  ) : (
                    <p className="text-gray-900 text-lg font-medium">{tree.zoneName || tree.zoneCode || 'Chưa phân khu'}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Health & Production - What matters to farmers */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
              💪 Tình trạng & sản lượng
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-lg font-semibold text-gray-800 mb-2 block">🌡️ Sức khỏe cây</label>
                {isEditing ? (
                  <select
                    value={formData.healthStatus || ''}
                    onChange={(e) => setFormData({ ...formData, healthStatus: e.target.value as Tree['healthStatus'] })}
                    className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl 
                               focus:border-green-500 focus:ring-4 focus:ring-green-100
                               bg-white shadow-sm min-touch"
                  >
                    <option value="">Chọn tình trạng</option>
                    <option value="Excellent">🟢 Xuất sắc</option>
                    <option value="Good">🟡 Tốt</option>
                    <option value="Fair">🟠 Bình thường</option>
                    <option value="Poor">🔴 Cần chăm sóc</option>
                  </select>
                ) : (
                  <div className={`inline-flex px-4 py-2 rounded-full font-semibold text-lg ${getHealthStatusColor(tree.healthStatus)}`}>
                    {getHealthIcon(tree.healthStatus)}
                    <span className="ml-2">{getHealthStatusText(tree.healthStatus)}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-lg font-semibold text-gray-800 mb-2 block">🥭 Số lượng trái</label>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    value={formData.manualFruitCount || ''}
                    onChange={(e) => setFormData({ ...formData, manualFruitCount: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl 
                               focus:border-green-500 focus:ring-4 focus:ring-green-100
                               bg-white shadow-sm min-touch"
                    placeholder="Nhập số trái đã đếm"
                  />
                ) : (
                  <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                    <div className="text-3xl font-bold text-green-600 text-center">
                      {(tree.manualFruitCount || 0).toLocaleString()} trái
                    </div>
                    <p className="text-sm text-gray-500 text-center mt-1">Đếm thủ công</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Simple Notes Section - Only if needed */}
          {(tree.notes || isEditing) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-3">
                📝 Ghi chú
              </h3>
              {isEditing ? (
                <div className="space-y-4">
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl 
                             focus:border-green-500 focus:ring-4 focus:ring-green-100
                             bg-white shadow-sm min-touch"
                    placeholder="Thêm ghi chú về cây này..."
                  />
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="needsAttention"
                      checked={formData.needsAttention || false}
                      onChange={(e) => setFormData({ ...formData, needsAttention: e.target.checked })}
                      className="h-5 w-5 text-red-600 focus:ring-red-500 border-2 border-gray-300 rounded"
                    />
                    <label htmlFor="needsAttention" className="ml-3 text-lg text-gray-900 font-medium">
                      ⚠️ Cây cần chú ý đặc biệt
                    </label>
                  </div>
                </div>
              ) : (
                <p className="text-gray-900 text-lg leading-relaxed whitespace-pre-wrap">
                  {tree.notes}
                </p>
              )}
            </div>
          )}
        </div>



          {/* Image Gallery - Simplified */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-3">
              📸 Hình ảnh cây
            </h3>
            <ImageGallery tree={tree} />
          </div>

          {/* Custom Fields - Simplified */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-3">
              📋 Thông tin thêm
            </h3>
            <CustomFieldsSection
              treeId={tree.id}
              customFields={customFields || (tree.customFields as TreeCustomFields)}
              onSave={handleCustomFieldsSave}
            />
          </div>
      </div>
    </div>
  )
}