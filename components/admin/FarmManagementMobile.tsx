'use client'

import { useState, useEffect } from 'react'
import {
  PlusIcon, MagnifyingGlassIcon, FunnelIcon,
  BuildingOfficeIcon, PencilIcon, TrashIcon,
  EyeIcon, UsersIcon, MapIcon
} from '@heroicons/react/24/outline'
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Farm } from '@/lib/types'

interface MobileFarm {
  id: string
  name: string
  owner: string
  location: string
  area: number
  trees: number | null
  users: number
  createdDate: string
}

export default function FarmManagementMobile() {
  const [farms, setFarms] = useState<MobileFarm[]>([])
  const [filteredFarms, setFilteredFarms] = useState<MobileFarm[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFarm, setSelectedFarm] = useState<MobileFarm | null>(null)
  const [loading, setLoading] = useState(true)

  const loadFarms = async () => {
    try {
      setLoading(true)
      const farmsQuery = query(collection(db, 'farms'))
      const farmsSnapshot = await getDocs(farmsQuery)

      const farmsData: MobileFarm[] = []

      for (const farmDoc of farmsSnapshot.docs) {
        const farmData = farmDoc.data() as Farm

        // Get farm users count
        const accessQuery = query(
          collection(db, 'userFarmAccess'),
          where('farmId', '==', farmDoc.id)
        )
        const accessSnapshot = await getDocs(accessQuery)
        const usersCount = accessSnapshot.size

        // Get owner info (first owner found)
        let ownerName = 'Chưa xác định'
        for (const accessDoc of accessSnapshot.docs) {
          const accessData = accessDoc.data()
          if (accessData.role === 'owner') {
            try {
              const userDoc = await getDocs(query(
                collection(db, 'users'),
                where('uid', '==', accessData.userId)
              ))
              if (!userDoc.empty) {
                ownerName = userDoc.docs[0].data().displayName || userDoc.docs[0].data().email || 'Chủ nông trại'
              }
            } catch (error) {
              console.warn('Could not fetch owner info:', error)
            }
            break
          }
        }

        const mobileFarm: MobileFarm = {
          id: farmDoc.id,
          name: farmData.name || 'Nông trại không tên',
          owner: ownerName,
          location: farmData.centerLatitude && farmData.centerLongitude ?
            `${farmData.centerLatitude.toFixed(4)}, ${farmData.centerLongitude.toFixed(4)}` :
            'Chưa cập nhật vị trí',
          area: farmData.totalArea || 0,
          trees: null,
          users: usersCount,
          createdDate: farmData.createdDate ?
            new Date(farmData.createdDate).toLocaleDateString('vi-VN') :
            'Chưa xác định'
        }

        farmsData.push(mobileFarm)
      }

      setFarms(farmsData)
    } catch (error) {
      console.error('Error loading farms:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFarms()
  }, [])

  useEffect(() => {
    let filtered = farms

    if (searchTerm) {
      filtered = filtered.filter(farm =>
        farm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        farm.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
        farm.location.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredFarms(filtered)
  }, [farms, searchTerm])

  const FarmCard = ({ farm }: { farm: MobileFarm }) => (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-3">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <h3 className="font-semibold text-gray-900">{farm.name}</h3>
            <p className="text-sm text-gray-500">Chủ: {farm.owner}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
        <div className="flex items-center text-gray-600">
          <span className="mr-1">📍</span>
          {farm.location}
        </div>
        <div className="flex items-center text-gray-600">
          <span>🌳 {farm.area} ha</span>
        </div>
        <div className="flex items-center text-gray-600">
          <span>🌲 {farm.trees === null ? 'Chưa thống kê' : `${farm.trees} cây`}</span>
        </div>
        <div className="flex items-center text-gray-600">
          <UsersIcon className="h-4 w-4 mr-1" />
          {farm.users} người
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">Tạo: {farm.createdDate}</span>
        <button disabled title="Chưa triển khai" className="text-gray-400 text-sm cursor-not-allowed">
          <MapIcon className="h-4 w-4 inline mr-1" />
          Bản đồ
        </button>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => setSelectedFarm(farm)}
          className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-sm"
        >
          <EyeIcon className="h-4 w-4 inline mr-1" />
          Xem
        </button>
        <button disabled title="Chưa triển khai" className="flex-1 bg-gray-50 text-gray-400 py-2 rounded-lg text-sm cursor-not-allowed">
          <PencilIcon className="h-4 w-4 inline mr-1" />
          Sửa
        </button>
        <button disabled title="Chưa triển khai" className="flex-1 bg-gray-50 text-gray-400 py-2 rounded-lg text-sm cursor-not-allowed">
          <TrashIcon className="h-4 w-4 inline mr-1" />
          Xóa
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Quản lý nông trại</h2>
        <button disabled title="Chưa triển khai" className="bg-gray-300 text-gray-500 p-2 rounded-lg cursor-not-allowed">
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-lg p-4">
        <div className="relative mb-3">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm nông trại..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

      </div>

      {/* Farm List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Đang tải danh sách nông trại...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFarms.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Không tìm thấy nông trại nào</p>
            </div>
          ) : (
            filteredFarms.map((farm) => (
              <FarmCard key={farm.id} farm={farm} />
            ))
          )}
        </div>
      )}

      {/* Farm Details Modal */}
      {selectedFarm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <h3 className="text-xl font-semibold text-center mb-2">{selectedFarm.name}</h3>
              <p className="text-gray-600 text-center mb-4">{selectedFarm.location}</p>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Chủ sở hữu:</span>
                  <span className="font-medium">{selectedFarm.owner}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Diện tích:</span>
                  <span className="font-medium">{selectedFarm.area} ha</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Số cây:</span>
                  <span className="font-medium">{selectedFarm.trees === null ? 'Chưa thống kê' : `${selectedFarm.trees} cây`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Người dùng:</span>
                  <span className="font-medium">{selectedFarm.users} người</span>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button disabled className="flex-1 bg-gray-200 text-gray-500 py-2 rounded-lg cursor-not-allowed">Chưa triển khai</button>
              </div>

              <div className="mt-3">
                <button
                  onClick={() => setSelectedFarm(null)}
                  className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
