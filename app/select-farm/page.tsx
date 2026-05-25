'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSimpleAuth, SimpleFarm } from '@/lib/optimized-auth-context'
import AuthGuard from '@/components/AuthGuard'
import { FarmService } from '@/lib/farm-service'
import {
  MapIcon,
  CheckCircleIcon,
  UserGroupIcon,
  ClockIcon,
  PlusIcon,
  ArrowRightOnRectangleIcon,
  SparklesIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

function SelectFarmContent() {
  const router = useRouter()
  const { user, farms, currentFarm, setCurrentFarm, getUserRole, farmAccess, signOut, refreshUserData } = useSimpleAuth()
  const [selectedFarm, setSelectedFarm] = useState<SimpleFarm | null>(currentFarm || (farms.length > 0 ? farms[0] : null))
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newFarmName, setNewFarmName] = useState('')
  const [newFarmArea, setNewFarmArea] = useState('0')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update selected farm if farms load
  useEffect(() => {
    if (!selectedFarm && farms.length > 0) {
      setSelectedFarm(farms[0])
    }
  }, [farms, selectedFarm])

  // Set document title
  useEffect(() => {
    document.title = 'Chọn Nông Trại - Farm Manager'
  }, [])

  const handleSelectFarm = (farm: SimpleFarm) => {
    setSelectedFarm(farm)
  }

  const handleConfirmSelection = () => {
    if (selectedFarm) {
      setCurrentFarm(selectedFarm)
      router.push('/map')
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newFarmName.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      // 1. Create farm on Firestore using FarmService
      const farmId = await FarmService.createFarm({
        name: newFarmName.trim(),
        ownerName: user.displayName || user.email || 'Chủ trại',
        totalArea: parseFloat(newFarmArea) || 0
      }, user.uid)

      // 2. Refresh user data inside SimpleAuthProvider so farms array gets updated
      await refreshUserData()

      // 3. Clear inputs & close modal
      setNewFarmName('')
      setNewFarmArea('0')
      setShowCreateModal(false)

      // 4. Find the newly created farm in the updated farms list and select it
      // Let's reload state and redirect
      router.push('/')
    } catch (err) {
      console.error('Error creating farm:', err)
      setError('Không thể tạo nông trại. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRoleLabel = (farmId: string) => {
    const role = getUserRole(farmId)
    switch (role) {
      case 'owner':
        return { label: 'Chủ trại', color: 'text-rose-700 bg-rose-50 border-rose-200' }
      case 'manager':
        return { label: 'Quản lý', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' }
      case 'viewer':
        return { label: 'Người xem', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
      default:
        return { label: 'Thành viên', color: 'text-gray-700 bg-gray-50 border-gray-200' }
    }
  }

  const getAccessDate = (farmId: string) => {
    const access = farmAccess.find(a => a.farmId === farmId)
    return access?.grantedAt || new Date()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex flex-col justify-between p-4 pb-24 md:pb-6">
      {/* Top Header */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🌾</span>
          <span className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-emerald-800 to-teal-700">
            FarmManager
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors border border-rose-200 active:scale-95 duration-200"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          <span>Đăng xuất</span>
        </button>
      </div>

      {/* Main Box */}
      <div className="max-w-md w-full mx-auto bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/50 p-6 flex-1 flex flex-col justify-between my-4">
        <div>
          {/* Welcome Text */}
          <div className="mb-6">
            <h1 className="text-2xl font-black text-gray-900 leading-tight">
              Xin chào, {user?.displayName || user?.email?.split('@')[0] || 'Nhà nông'}!
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Vui lòng chọn nông trại để làm việc hoặc tạo một nông trại mới.
            </p>
          </div>

          {/* Farms List */}
          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
            {farms.length === 0 ? (
              <div className="text-center py-8 bg-emerald-50/50 rounded-2xl border border-emerald-100 p-6">
                <span className="text-4xl block mb-2">🧑‍🌾</span>
                <h3 className="font-bold text-emerald-950">Chưa có nông trại</h3>
                <p className="text-xs text-emerald-800 mt-1">
                  Nhấn vào nút &quot;Tạo nông trại mới&quot; bên dưới để bắt đầu quản lý.
                </p>
              </div>
            ) : (
              farms.map((farm) => {
                const isSelected = selectedFarm?.id === farm.id
                const roleStyle = getRoleLabel(farm.id)
                const accessDate = getAccessDate(farm.id)

                return (
                  <div
                    key={farm.id}
                    onClick={() => handleSelectFarm(farm)}
                    className={`group relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-md scale-[1.01]'
                        : 'border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/10 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-xl transition-colors ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          <MapIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 group-hover:text-emerald-900 transition-colors">
                            {farm.name}
                          </h3>
                          <p className="text-xs text-gray-500">
                            Chủ sở hữu: {farm.ownerName || 'Chưa rõ'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {isSelected && (
                          <CheckCircleIcon className="h-6 w-6 text-emerald-600 animate-scaleIn" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed border-gray-100 mt-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleStyle.color}`}>
                          {roleStyle.label}
                        </span>
                        <span className="flex items-center space-x-0.5 text-gray-500">
                          <UserGroupIcon className="h-3.5 w-3.5" />
                          <span>{farm.totalArea ? `${farm.totalArea.toFixed(1)} ha` : '0 ha'}</span>
                        </span>
                      </div>
                      <span className="flex items-center space-x-0.5 text-gray-400">
                        <ClockIcon className="h-3.5 w-3.5" />
                        <span>{new Date(accessDate).toLocaleDateString('vi-VN')}</span>
                      </span>
                    </div>

                    {farm.isActive === false && (
                      <div className="absolute top-2 right-2 text-[9px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded">
                        Tạm dừng
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Buttons Action */}
        <div className="mt-8 space-y-3">
          <button
            onClick={handleConfirmSelection}
            disabled={!selectedFarm}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-400 text-white py-4 px-6 rounded-2xl font-bold transition-all duration-300 shadow-lg shadow-emerald-600/10 active:scale-95 disabled:shadow-none disabled:active:scale-100 flex items-center justify-center space-x-2"
          >
            <SparklesIcon className="h-5 w-5" />
            <span>Vào Nông Trại</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 py-3.5 px-6 rounded-2xl font-bold transition-all duration-200 border border-emerald-200/50 flex items-center justify-center space-x-2 active:scale-95"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Tạo Nông Trại Mới</span>
          </button>
        </div>
      </div>

      {/* Create Farm Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 animate-slideUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-gray-900">Tạo nông trại mới</h3>
                <p className="text-xs text-gray-500">Khởi tạo không gian làm việc của bạn</p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setError(null)
                }}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors active:scale-90"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateFarm} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Tên nông trại
                </label>
                <input
                  type="text"
                  required
                  value={newFarmName}
                  onChange={(e) => setNewFarmName(e.target.value)}
                  placeholder="Ví dụ: Nông trại Sầu riêng Miền Đông"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  style={{ minHeight: '44px' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Diện tích (ha)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={newFarmArea}
                  onChange={(e) => setNewFarmArea(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  style={{ minHeight: '44px' }}
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl">
                  {error}
                </div>
              )}

              <div className="flex space-x-3 pt-4 border-t border-gray-50 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setError(null)
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold transition-all text-sm active:scale-95"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newFarmName.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all text-sm flex items-center justify-center space-x-1 active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Đang tạo...</span>
                    </>
                  ) : (
                    <span>Tạo nông trại</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SelectFarmPage() {
  return (
    <AuthGuard requireFarmAccess={false}>
      <SelectFarmContent />
    </AuthGuard>
  )
}
