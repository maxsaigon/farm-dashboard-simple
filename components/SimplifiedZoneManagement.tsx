import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSimpleAuth } from '@/lib/optimized-auth-context'
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  MapIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChartBarIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { MapPinIcon } from '@heroicons/react/24/solid'

// Preset colors for the swatches
const PRESET_COLORS = [
  { name: 'Emerald', value: '#10b981' },
  { name: 'Green', value: '#059669' },
  { name: 'Teal', value: '#0d9488' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Red', value: '#ef4444' },
]

// Convert hex color to RGB colorData format (for database compatibility)
function hexToColorData(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return {
      red: parseInt(result[1], 16) / 255,
      green: parseInt(result[2], 16) / 255,
      blue: parseInt(result[3], 16) / 255,
      alpha: 1.0
    }
  }
  return { red: 0.23, green: 0.51, blue: 0.96, alpha: 1.0 }
}

// Calculate polygon area in hectares from coordinates
function polygonAreaHectares(coords: Array<{ latitude: number; longitude: number }>): number {
  if (!coords || coords.length < 3) return 0

  const R = 6371000 // earth radius in meters

  // Compute centroid latitude for scale
  const lat0 = coords.reduce((sum, p) => sum + p.latitude, 0) / coords.length
  const lat0Rad = (lat0 * Math.PI) / 180

  // Convert to x/y (meters) using equirectangular approximation
  const points = coords.map(p => {
    const x = (p.longitude * Math.PI / 180) * R * Math.cos(lat0Rad)
    const y = (p.latitude * Math.PI / 180) * R
    return { x, y }
  })

  // Shoelace formula
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    sum += points[i].x * points[j].y - points[j].x * points[i].y
  }
  const areaMeters2 = Math.abs(sum) / 2
  const areaHectares = areaMeters2 / 10000
  return areaHectares
}

interface Zone {
  id: string
  name: string
  code?: string
  description?: string
  color?: string
  boundaries?: Array<{ latitude: number; longitude: number }>
  area: number // square meters or hectares
  treeCount: number
  plantedTreeCount?: number
  youngTreeCount?: number
  matureTreeCount?: number
  deadTreeCount?: number
  averageHealth: number
  lastInspectionDate?: Date
  isActive: boolean
  createdAt?: Date
  needsAttention?: boolean
  notes?: string
}

export default function SimplifiedZoneManagement() {
  const router = useRouter()
  const { currentFarm, isFarmOwner } = useSimpleAuth()
  
  // State variables
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingZone, setEditingZone] = useState<Zone | null>(null)
  
  // Delete confirmation state
  const [deleteConfirmZone, setDeleteConfirmZone] = useState<Zone | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    color: '#10b981',
    area: 0,
    isActive: true,
    notes: '',
    treeCount: 0
  })

  // Load zones from Firebase
  const loadZones = useCallback(async () => {
    if (!currentFarm?.id) {
      setZones([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Try farm-specific collection first
      const farmZonesRef = collection(db, 'farms', currentFarm.id, 'zones')

      // Also try legacy global zones collection
      const legacyZonesRef = collection(db, 'zones')
      const legacyZonesQuery = query(legacyZonesRef, where('farmId', '==', currentFarm.id))

      // Fetch both concurrently to avoid sequential loading bottlenecks
      const [farmZonesSnapshot, legacyZonesSnapshot] = await Promise.all([
        getDocs(farmZonesRef),
        getDocs(legacyZonesQuery)
      ])

      const mergedMap = new Map<string, Zone>()

      const processDoc = (docSnapshot: any) => {
        const data = docSnapshot.data()

        // Handle different possible field names for boundaries
        let boundaries = data.boundaries || data.boundary || data.coordinates || data.polygon || data.points || []

        if (boundaries && Array.isArray(boundaries) && boundaries.length > 0) {
          boundaries = boundaries.map((point: any) => {
            // Handle Firebase GeoPoint format or custom format
            if (point && typeof point === 'object') {
              const lat = point._lat || point.latitude || point._latitude
              const lng = point._long || point.longitude || point._longitude || point._longitude
              if (lat !== undefined && lng !== undefined) {
                return { latitude: lat, longitude: lng }
              }
            }
            return point
          })
        }

        // Calculate area from boundaries if available
        let computedArea = data.area || 0
        if (boundaries && Array.isArray(boundaries) && boundaries.length >= 3) {
          try {
            computedArea = polygonAreaHectares(boundaries)
          } catch {
            // Failed to compute area for zone
          }
        }

        // Handle metadata object
        const metadata = data.metadata || {}
        
        // Determine if zone needs attention
        const twoWeeksAgo = new Date()
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
        const lastInspection = data.lastInspectionDate?.toDate?.() || data.lastInspectionDate
        const needsAttention = !lastInspection || 
                              lastInspection < twoWeeksAgo || 
                              (data.averageHealth && data.averageHealth < 7)

        const finalArea = computedArea || data.area || metadata.area || 0

        // Standardize color (hex or RGB colorData)
        let color = data.color
        if (!color && data.colorData) {
          const { red, green, blue } = data.colorData
          const toHex = (c: number) => {
            const hex = Math.round((c || 0) * 255).toString(16)
            return hex.length === 1 ? '0' + hex : hex
          }
          color = `#${toHex(red || 0)}${toHex(green || 0)}${toHex(blue || 0)}`
        }
        if (!color) color = '#10b981'

        return {
          id: docSnapshot.id,
          name: data.name || `Khu ${docSnapshot.id.slice(-4)}`,
          code: data.code || '',
          description: data.description || data.notes || '',
          color: color,
          boundaries: boundaries,
          area: finalArea,
          treeCount: data.treeCount || 0,
          plantedTreeCount: data.plantedTreeCount || 0,
          youngTreeCount: data.youngTreeCount || 0,
          matureTreeCount: data.matureTreeCount || 0,
          deadTreeCount: data.deadTreeCount || 0,
          averageHealth: data.averageHealth || 8.0,
          lastInspectionDate: lastInspection instanceof Date ? lastInspection : (lastInspection?.toDate?.() || null),
          isActive: data.isActive !== false,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
          needsAttention,
          notes: data.notes || data.description || ''
        } as Zone
      }

      // 1. Process legacy global zones first
      legacyZonesSnapshot.docs.forEach(doc => {
        mergedMap.set(doc.id, processDoc(doc))
      })

      // 2. Overwrite/merge with new farm-scoped zones
      farmZonesSnapshot.docs.forEach(doc => {
        mergedMap.set(doc.id, processDoc(doc))
      })

      setZones(Array.from(mergedMap.values()))
    } catch (error) {
      console.error('Error loading zones:', error)
      setZones([])
    } finally {
      setLoading(false)
    }
  }, [currentFarm?.id])

  useEffect(() => {
    loadZones()
  }, [loadZones])

  // Check if current user is owner of the farm
  const isOwner = isFarmOwner ? isFarmOwner(currentFarm?.id) : false

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode('create')
    setEditingZone(null)
    setFormData({
      name: '',
      code: '',
      color: '#10b981',
      area: 0,
      isActive: true,
      notes: '',
      treeCount: 0
    })
    setShowModal(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (zone: Zone) => {
    setModalMode('edit')
    setEditingZone(zone)
    setFormData({
      name: zone.name,
      code: zone.code || '',
      color: zone.color || '#10b981',
      area: zone.area,
      isActive: zone.isActive !== false,
      notes: zone.notes || zone.description || '',
      treeCount: zone.treeCount || 0
    })
    setShowModal(true)
  }

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentFarm?.id || !formData.name) return

    setSaving(true)
    try {
      const activeId = editingZone?.id || doc(collection(db, 'zones')).id
      const boundaryPoints = editingZone?.boundaries || []

      // Calculate area dynamically if boundary has points
      let computedArea = formData.area
      if (boundaryPoints && Array.isArray(boundaryPoints) && boundaryPoints.length >= 3) {
        try {
          computedArea = polygonAreaHectares(boundaryPoints)
        } catch {
          // area fallback
        }
      }

      const colorData = hexToColorData(formData.color)
      const payload: any = {
        id: activeId,
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase() || '',
        color: formData.color,
        colorData,
        boundary: boundaryPoints,
        boundaries: boundaryPoints,
        farmId: currentFarm.id,
        treeCount: formData.treeCount,
        area: computedArea,
        isActive: formData.isActive,
        notes: formData.notes.trim(),
        updatedAt: new Date()
      }

      if (modalMode === 'create') {
        payload.createdAt = new Date()
        payload.treeCount = 0
        payload.averageHealth = 8.0
      } else if (editingZone) {
        payload.createdAt = editingZone.createdAt || new Date()
        payload.treeCount = editingZone.treeCount || 0
        payload.averageHealth = editingZone.averageHealth || 8.0
      }

      // Write to Firestore - path 1 (scoped)
      await setDoc(doc(db, 'farms', currentFarm.id, 'zones', activeId), payload)
      // Write to Firestore - path 2 (legacy global)
      await setDoc(doc(db, 'zones', activeId), payload)

      // Reload zones to get updated UI
      await loadZones()
      setShowModal(false)
    } catch (err) {
      console.error('Error saving zone:', err)
      alert('Đã xảy ra lỗi khi lưu khu vực.')
    } finally {
      setSaving(false)
    }
  }

  // Delete Zone Action
  const handleDeleteZone = async () => {
    if (!deleteConfirmZone || !currentFarm?.id) return

    try {
      const zoneId = deleteConfirmZone.id
      // Delete from scoped path
      await deleteDoc(doc(db, 'farms', currentFarm.id, 'zones', zoneId))
      // Delete from legacy global path
      await deleteDoc(doc(db, 'zones', zoneId))

      setZones(prev => prev.filter(z => z.id !== zoneId))
      setDeleteConfirmZone(null)
    } catch (err) {
      console.error('Error deleting zone:', err)
      alert('Đã xảy ra lỗi khi xóa khu vực.')
    }
  }

  // Filter zones based on search
  const filteredZones = zones.filter(zone =>
    zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (zone.code && zone.code.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Calculate simple stats
  const totalZones = zones.length
  const totalTrees = zones.reduce((sum, zone) => sum + zone.treeCount, 0)
  
  // Calculate average health of all zones
  const activeZones = zones.filter(z => z.isActive)
  const averageHealthVal = activeZones.length > 0 
    ? (activeZones.reduce((sum, zone) => sum + (zone.averageHealth || 8.0), 0) / activeZones.length).toFixed(1) 
    : '8.0'

  const handleZoneAction = async (action: string, zone: Zone) => {
    switch (action) {
      case 'view_map':
        // Navigate to map focused on this zone
        if (zone.boundaries && zone.boundaries.length > 0) {
          const centerLat = zone.boundaries.reduce((sum, p) => sum + p.latitude, 0) / zone.boundaries.length
          const centerLng = zone.boundaries.reduce((sum, p) => sum + p.longitude, 0) / zone.boundaries.length
          router.push(`/map?lat=${centerLat}&lng=${centerLng}&zoom=16&zone=${zone.id}`)
        } else {
          router.push(`/map?zone=${zone.id}`)
        }
        break
      case 'inspect':
        if (!currentFarm?.id) return
        try {
          const farmZoneRef = doc(db, 'farms', currentFarm.id, 'zones', zone.id)
          await updateDoc(farmZoneRef, {
            lastInspectionDate: new Date()
          })
          try {
            const legacyZoneRef = doc(db, 'zones', zone.id)
            await updateDoc(legacyZoneRef, {
              lastInspectionDate: new Date()
            })
          } catch (e) {
            console.warn('Failed to update legacy zone path:', e)
          }
          
          setZones(prev => prev.map(z =>
            z.id === zone.id
              ? { ...z, lastInspectionDate: new Date(), needsAttention: false }
              : z
          ))
        } catch (error) {
          console.error('Failed to update inspection date:', error)
        }
        break
    }
  }

  if (!currentFarm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapIcon className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Chọn trang trại</h2>
          <p className="text-gray-500 mb-4">Vui lòng chọn trang trại từ thanh công cụ để xem các khu vực.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium text-sm">Đang tải khu vực...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 with-bottom-tab pb-12">
      {/* Sleek Modern Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200/80 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Khu vực</h1>
            <p className="text-xs text-gray-500">Quản lý ranh giới và cây trồng của nông trại</p>
          </div>
          {isOwner && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center space-x-1.5 py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-md shadow-green-100 hover:shadow-lg"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Thêm Khu</span>
            </button>
          )}
        </div>
        
        {/* Search Input */}
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm khu vực theo tên hoặc mã..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Modern Stats Grid */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/50 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-2">
              <MapIcon className="h-5 w-5" />
            </div>
            <div className="text-xl font-bold text-gray-900">{totalZones}</div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5">Khu vực</div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/50 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mb-2">
              <ChartBarIcon className="h-5 w-5" />
            </div>
            <div className="text-xl font-bold text-green-600">{totalTrees}</div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5">Cây trồng</div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/50 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-2">
              <CheckCircleIcon className="h-5 w-5" />
            </div>
            <div className="text-xl font-bold text-emerald-600">{averageHealthVal}/10</div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5">Sức khỏe TB</div>
          </div>
        </div>
      </div>

      {/* Zones List */}
      <div className="px-4">
        {filteredZones.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm px-6">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapIcon className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              {searchTerm ? 'Không tìm thấy khu vực' : 'Chưa có khu vực'}
            </h3>
            <p className="text-xs text-gray-500 mb-6 max-w-xs mx-auto">
              {searchTerm 
                ? 'Thử tìm với từ khóa hoặc ký tự khác' 
                : 'Tạo các khu vực ranh giới giúp bạn theo dõi sức khỏe và quản lý nông trại dễ dàng hơn'}
            </p>
            {!searchTerm && isOwner && (
              <button
                onClick={handleOpenCreate}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors inline-flex items-center space-x-2 shadow-md shadow-green-50"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Tạo khu vực đầu tiên</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredZones.map((zone) => (
              <ZoneCard 
                key={zone.id} 
                zone={zone} 
                isOwner={isOwner}
                onAction={handleZoneAction}
                onEdit={handleOpenEdit}
                onDelete={(z) => setDeleteConfirmZone(z)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transform scale-100 transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {modalMode === 'create' ? 'Thêm Khu Vực Mới' : 'Chỉnh Sửa Khu Vực'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Điền thông tin chi tiết cho phân khu nông trại</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveZone} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Row 1: Name & Code */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Tên khu vực *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="VD: Khu A"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Mã khu vực</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="VD: KHU-A"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all text-sm font-medium"
                  />
                </div>
              </div>

              {/* Row 2: Area & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Diện tích (hecta)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.area || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, area: parseFloat(e.target.value) || 0 }))}
                    placeholder="VD: 1.5"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all text-sm font-medium"
                  />
                </div>
                <div className="flex flex-col justify-end pb-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Trạng thái hoạt động</label>
                  <label className="flex items-center space-x-3 cursor-pointer p-2.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2 accent-green-600 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-700">Đang hoạt động</span>
                  </label>
                </div>
              </div>

              {/* Color Swatch Picker */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Màu đại diện</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                      className={`w-8 h-8 rounded-full border-2 transition-all relative ${
                        formData.color.toLowerCase() === color.value.toLowerCase() 
                          ? 'border-gray-900 scale-110 shadow-sm' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {formData.color.toLowerCase() === color.value.toLowerCase() && (
                        <CheckIcon className="w-4 h-4 text-white absolute inset-0 m-auto font-bold" />
                      )}
                    </button>
                  ))}
                </div>
                {/* Custom Color Input */}
                <div className="flex items-center space-x-3 bg-gray-50 border border-gray-200 rounded-xl p-2.5">
                  <span className="text-xs font-semibold text-gray-500">Màu tùy chỉnh:</span>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-10 h-7 border border-gray-300 rounded cursor-pointer p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="flex-1 px-2.5 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 font-mono"
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Ghi chú / Mô tả</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Nhập ghi chú hoặc mô tả về khu vực này..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all text-sm font-medium"
                />
              </div>
            </form>

            {/* Modal Actions */}
            <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-100 transition-all"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveZone}
                disabled={saving || !formData.name}
                className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md shadow-green-100"
              >
                {saving ? 'Đang lưu...' : modalMode === 'create' ? 'Tạo Khu' : 'Cập Nhật'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmZone && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-in text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExclamationTriangleIcon className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Xóa khu vực này?</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              Bạn có chắc chắn muốn xóa khu vực <strong className="text-gray-800">&ldquo;{deleteConfirmZone.name}&rdquo;</strong>? 
              Hành động này không thể hoàn tác và sẽ xóa tất cả ranh giới bản đồ của khu vực này.
            </p>
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => setDeleteConfirmZone(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteZone}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm active:scale-95 transition-all shadow-md shadow-red-100"
              >
                Xóa Khu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Optimized Zone Card Component
interface ZoneCardProps {
  zone: Zone
  isOwner: boolean
  onAction: (action: string, zone: Zone) => void
  onEdit: (zone: Zone) => void
  onDelete: (zone: Zone) => void
}

function ZoneCard({ 
  zone, 
  isOwner,
  onAction,
  onEdit,
  onDelete
}: ZoneCardProps) {
  
  // Smart Area Unit display check (resolves hectares vs square meters bug)
  const formatAreaDisplay = (z: Zone) => {
    // If boundaries are available and valid, calculate from boundaries
    if (z.boundaries && z.boundaries.length >= 3) {
      try {
        const calculatedArea = polygonAreaHectares(z.boundaries)
        return `${calculatedArea.toFixed(1)} ha`
      } catch {
        // Fallback to direct field
      }
    }

    if (!z.area || z.area === 0) {
      return 'Chưa có dữ liệu'
    }

    // Smart logic: if area > 100, it's stored in sqm (so divide by 10k), else it's already in hectares
    const finalArea = z.area > 100 ? z.area / 10000 : z.area
    return `${finalArea.toFixed(1)} ha`
  }

  // Health score color styling
  const healthBadgeStyle = zone.averageHealth >= 8 
    ? 'bg-green-50 text-green-700 border-green-200' 
    : zone.averageHealth >= 6 
      ? 'bg-yellow-50 text-yellow-700 border-yellow-200' 
      : 'bg-red-50 text-red-700 border-red-200'

  return (
    <div 
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md hover:scale-[1.005] relative"
      style={{ borderLeft: `5.5px solid ${zone.color || '#10b981'}` }}
    >
      {/* Upper Section */}
      <div className="flex items-start justify-between mb-3.5">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-gray-900 tracking-tight">{zone.name}</h3>
            {zone.code && (
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 font-mono text-[9px] font-bold rounded">
                {zone.code}
              </span>
            )}
            {!zone.isActive && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-bold rounded-full">
                Ngưng
              </span>
            )}
          </div>
          {zone.notes && (
            <p className="text-xs text-gray-400 line-clamp-1 pr-6">{zone.notes}</p>
          )}
        </div>
        
        {/* Health score badge */}
        <div className={`px-2 py-1 rounded-lg border text-xs font-bold ${healthBadgeStyle}`}>
          Sức khỏe: {zone.averageHealth ? zone.averageHealth.toFixed(1) : '8.0'}
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-2 gap-4 bg-gray-50/50 rounded-xl p-3.5 mb-4 border border-gray-100">
        <div className="text-center">
          <div className="text-base font-extrabold text-gray-900">{zone.treeCount}</div>
          <div className="text-[10px] font-semibold text-gray-400 mt-0.5">Tổng số cây</div>
        </div>
        <div className="text-center border-l border-gray-200/50">
          <div className="text-base font-extrabold text-blue-600">
            {formatAreaDisplay(zone)}
          </div>
          <div className="text-[10px] font-semibold text-gray-400 mt-0.5">Diện tích</div>
        </div>
      </div>

      {/* Actions Row */}
      <div className="flex items-center justify-between space-x-2">
        <button
          onClick={() => onAction('view_map', zone)}
          className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-all active:scale-98"
        >
          <MapPinIcon className="h-4 w-4" />
          <span>Xem vị trí</span>
        </button>

        {isOwner && (
          <div className="flex space-x-1.5">
            <button
              onClick={() => onEdit(zone)}
              className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-all border border-gray-200/40 hover:border-gray-300"
              title="Chỉnh sửa"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(zone)}
              className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all border border-red-100"
              title="Xóa khu vực"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}