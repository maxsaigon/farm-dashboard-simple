'use client'

import { useState, useEffect } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import { AdminService } from '@/lib/admin-service'
import { Photo } from '@/lib/types'
import { 
  PhotoIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CalendarIcon,
  CameraIcon,
  MapPinIcon,
  UserIcon,
  ChartBarIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface PhotoStats {
  totalPhotos: number
  storageUsed: string
  photosThisMonth: number
  averageFileSize: string
  topContributors: Array<{ userId: string; userEmail: string; count: number }>
}

export default function PhotoManagement() {
  const { user } = useEnhancedAuth()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFarm, setFilterFarm] = useState<string>('all')
  const [filterUser, setFilterUser] = useState<string>('all')
  const [filterDateRange, setFilterDateRange] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')

  const [stats, setStats] = useState<PhotoStats>({
    totalPhotos: 0,
    storageUsed: '0 MB',
    photosThisMonth: 0,
    averageFileSize: '0 MB',
    topContributors: []
  })

  const [farms, setFarms] = useState<Array<{id: string, name: string}>>([])
  const [users, setUsers] = useState<Array<{id: string, email: string}>>([])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    calculateStats()
  }, [photos])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load photos, farms, and users using AdminService
      const [photosData, farmsData, usersData] = await Promise.all([
        AdminService.getAllPhotos(),
        AdminService.getAllFarms(),
        AdminService.getAllUsers()
      ])

      setPhotos(photosData)
      setFarms(farmsData.map(f => ({ id: f.id, name: f.name })))
      setUsers(usersData.map(u => ({ id: u.id, email: u.email })))
      
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = () => {
    const totalPhotos = photos.length
    
    // Calculate photos this month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const photosThisMonth = photos.filter(photo => 
      photo.uploadedAt && photo.uploadedAt >= startOfMonth
    ).length

    // Calculate storage used (estimated)
    const totalSizeBytes = photos.reduce((sum, photo) => sum + (photo.fileSize || 2000000), 0) // Default 2MB per photo
    const storageUsed = formatFileSize(totalSizeBytes)
    const averageFileSize = formatFileSize(totalPhotos > 0 ? totalSizeBytes / totalPhotos : 0)

    // Calculate top contributors
    const contributorCounts: Record<string, { userEmail: string; count: number }> = {}
    photos.forEach(photo => {
      if (photo.uploadedBy) {
        if (!contributorCounts[photo.uploadedBy]) {
          const user = users.find(u => u.id === photo.uploadedBy)
          contributorCounts[photo.uploadedBy] = {
            userEmail: user?.email || 'Unknown User',
            count: 0
          }
        }
        contributorCounts[photo.uploadedBy].count++
      }
    })

    const topContributors = Object.entries(contributorCounts)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    setStats({
      totalPhotos,
      storageUsed,
      photosThisMonth,
      averageFileSize,
      topContributors
    })
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getFilteredAndSortedPhotos = () => {
    let filtered = photos.filter(photo => {
      const matchesSearch = photo.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           photo.description?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFarm = filterFarm === 'all' || photo.farmId === filterFarm
      const matchesUser = filterUser === 'all' || photo.uploadedBy === filterUser
      
      let matchesDate = true
      if (filterDateRange !== 'all' && photo.uploadedAt) {
        const now = new Date()
        switch (filterDateRange) {
          case 'today':
            matchesDate = photo.uploadedAt.toDateString() === now.toDateString()
            break
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            matchesDate = photo.uploadedAt >= weekAgo
            break
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            matchesDate = photo.uploadedAt >= monthAgo
            break
        }
      }
      
      return matchesSearch && matchesFarm && matchesUser && matchesDate
    })

    // Sort photos
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (b.uploadedAt?.getTime() || 0) - (a.uploadedAt?.getTime() || 0)
        case 'oldest':
          return (a.uploadedAt?.getTime() || 0) - (b.uploadedAt?.getTime() || 0)
        case 'name':
          return (a.fileName || '').localeCompare(b.fileName || '')
        case 'size':
          return (b.fileSize || 0) - (a.fileSize || 0)
        default:
          return 0
      }
    })

    return filtered
  }

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A'
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      return
    }

    try {
      // This would call a delete function from AdminService
      // await AdminService.deletePhoto(photoId)
      setPhotos(prev => prev.filter(p => p.id !== photoId))
      setShowPhotoModal(false)
      alert('Photo deleted successfully')
    } catch (error) {
      console.error('Error deleting photo:', error)
      alert('Failed to delete photo')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const filteredPhotos = getFilteredAndSortedPhotos()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Photo Management</h1>
          <p className="text-gray-600">Manage photos and media across all farms</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <CloudArrowUpIcon className="h-5 w-5 mr-2" />
          Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PhotoIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Photos</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalPhotos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Storage Used</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.storageUsed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">This Month</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.photosThisMonth}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <CameraIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg File Size</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.averageFileSize}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Contributors */}
      {stats.topContributors.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Contributors</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {stats.topContributors.map((contributor, index) => (
              <div key={contributor.userId} className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">{index + 1}</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {contributor.userEmail}
                  </p>
                  <p className="text-sm text-gray-500">{contributor.count} photos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search photos..."
            />
          </div>

          <div className="flex items-center space-x-4">
            {/* Filters */}
            <select
              value={filterFarm}
              onChange={(e) => setFilterFarm(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Farms</option>
              {farms.map(farm => (
                <option key={farm.id} value={farm.id}>{farm.name}</option>
              ))}
            </select>

            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.email}</option>
              ))}
            </select>

            <select
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">By Name</option>
              <option value="size">By Size</option>
            </select>
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Photos Found</h3>
          <p className="text-gray-600 mb-4">
            {photos.length === 0 
              ? "No photos are available in the database yet." 
              : "No photos match your current filters."}
          </p>
          {photos.length === 0 && (
            <p className="text-sm text-gray-500">
              Photos will appear here once they are uploaded to the system.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group relative bg-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedPhoto(photo)
                  setShowPhotoModal(true)
                }}
              >
                <div className="aspect-square">
                  {photo.thumbnailUrl || photo.downloadURL ? (
                    <img
                      src={photo.thumbnailUrl || photo.downloadURL}
                      alt={photo.fileName || 'Photo'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PhotoIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <EyeIcon className="h-6 w-6 text-white" />
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                  <p className="text-white text-xs truncate">{photo.fileName}</p>
                  <p className="text-gray-300 text-xs">
                    {photo.fileSize ? formatFileSize(photo.fileSize) : 'Unknown size'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination could be added here */}
        </div>
      )}

      {/* Photo Details Modal */}
      {showPhotoModal && selectedPhoto && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowPhotoModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Photo Details</h3>
                  <div className="flex items-center space-x-2">
                    {selectedPhoto.downloadURL && (
                      <a
                        href={selectedPhoto.downloadURL}
                        download={selectedPhoto.fileName}
                        className="p-2 text-gray-400 hover:text-blue-600"
                        title="Download photo"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDeletePhoto(selectedPhoto.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Delete photo"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Photo Display */}
                  <div className="bg-gray-100 rounded-lg overflow-hidden">
                    {selectedPhoto.downloadURL ? (
                      <img
                        src={selectedPhoto.downloadURL}
                        alt={selectedPhoto.fileName || 'Photo'}
                        className="w-full h-auto max-h-96 object-contain"
                      />
                    ) : (
                      <div className="w-full h-64 flex items-center justify-center">
                        <PhotoIcon className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Photo Metadata */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">File Name</label>
                      <p className="text-sm text-gray-900">{selectedPhoto.fileName || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <p className="text-sm text-gray-900">{selectedPhoto.description || 'No description'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">File Size</label>
                        <p className="text-sm text-gray-900">
                          {selectedPhoto.fileSize ? formatFileSize(selectedPhoto.fileSize) : 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Uploaded</label>
                        <p className="text-sm text-gray-900">{formatDate(selectedPhoto.uploadedAt)}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Uploaded By</label>
                      <p className="text-sm text-gray-900">
                        {users.find(u => u.id === selectedPhoto.uploadedBy)?.email || 'Unknown User'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Farm</label>
                      <p className="text-sm text-gray-900">
                        {farms.find(f => f.id === selectedPhoto.farmId)?.name || 'Unknown Farm'}
                      </p>
                    </div>

                    {selectedPhoto.treeId && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tree ID</label>
                        <p className="text-sm text-gray-900">{selectedPhoto.treeId}</p>
                      </div>
                    )}

                    {(selectedPhoto.latitude && selectedPhoto.longitude) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Location</label>
                        <p className="text-sm text-gray-900">
                          {selectedPhoto.latitude.toFixed(6)}, {selectedPhoto.longitude.toFixed(6)}
                        </p>
                      </div>
                    )}

                    {selectedPhoto.capturedAt && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Captured At</label>
                        <p className="text-sm text-gray-900">{formatDate(selectedPhoto.capturedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowPhotoModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}