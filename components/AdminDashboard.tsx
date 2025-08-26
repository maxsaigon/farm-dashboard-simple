'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/enhanced-auth-context'
import { AdminService } from '@/lib/admin-service'
import { Tree, ManualEntry, Photo, Farm } from '@/lib/types'
import { 
  ChartBarIcon, 
  MapIcon, 
  CameraIcon, 
  DocumentTextIcon,
  EyeIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/outline'

export function AdminDashboard() {
  const { user, isAdmin } = useAuth()
  const [allTrees, setAllTrees] = useState<Tree[]>([])
  const [allEntries, setAllEntries] = useState<ManualEntry[]>([])
  const [allPhotos, setAllPhotos] = useState<Photo[]>([])
  const [allFarms, setAllFarms] = useState<Farm[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'trees' | 'entries' | 'photos' | 'farms'>('overview')

  useEffect(() => {
    if (!isAdmin || !user) return

    const loadAdminData = async () => {
      try {
        setLoading(true)
        
        const [trees, entries, photos, farms] = await Promise.all([
          AdminService.getAllTrees(),
          AdminService.getAllManualEntries(),
          AdminService.getAllPhotos(),
          AdminService.getAllFarms()
        ])
        
        setAllTrees(trees)
        setAllEntries(entries)
        setAllPhotos(photos)
        setAllFarms(farms)
        
      } catch (error) {
        console.error('Error loading admin data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAdminData()
  }, [isAdmin, user])

  if (!isAdmin) return null

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  const farmStats = allFarms.map(farm => {
    const farmTrees = allTrees.filter(tree => tree.farmId === farm.id)
    const farmEntries = allEntries.filter(entry => entry.farmId === farm.id)
    const farmPhotos = allPhotos.filter(photo => photo.farmId === farm.id)
    
    return {
      ...farm,
      treeCount: farmTrees.length,
      entryCount: farmEntries.length,
      photoCount: farmPhotos.length,
      totalFruits: farmTrees.reduce((sum, tree) => 
        sum + (tree.manualFruitCount || 0) + (tree.aiFruitCount || 0), 0
      )
    }
  })

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'farms', name: `Farms (${allFarms.length})`, icon: BuildingOffice2Icon },
    { id: 'trees', name: `Trees (${allTrees.length})`, icon: MapIcon },
    { id: 'entries', name: `Entries (${allEntries.length})`, icon: DocumentTextIcon },
    { id: 'photos', name: `Photos (${allPhotos.length})`, icon: CameraIcon }
  ]

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
        <div className="flex items-center space-x-3">
          <EyeIcon className="h-8 w-8" />
          <div>
            <h2 className="text-2xl font-bold">Admin Dashboard</h2>
            <p className="text-purple-100">System-wide data access and management</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => {
            const IconComponent = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'trees' | 'entries' | 'photos' | 'farms')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <IconComponent className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <BuildingOffice2Icon className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">Total Farms</p>
                    <p className="text-2xl font-semibold text-blue-900">{allFarms.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <MapIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">Total Trees</p>
                    <p className="text-2xl font-semibold text-green-900">{allTrees.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-8 w-8 text-orange-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-orange-600">Manual Entries</p>
                    <p className="text-2xl font-semibold text-orange-900">{allEntries.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <CameraIcon className="h-8 w-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-600">Total Photos</p>
                    <p className="text-2xl font-semibold text-purple-900">{allPhotos.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Farm Overview */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Farm Overview</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farm</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trees</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entries</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photos</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Fruits</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {farmStats.map((farm) => (
                      <tr key={farm.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{farm.name}</div>
                            <div className="text-sm text-gray-500">{farm.ownerName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{farm.treeCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{farm.entryCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{farm.photoCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{farm.totalFruits.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'farms' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">All Farms</h3>
            <div className="grid gap-4">
              {allFarms.map((farm) => (
                <div key={farm.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{farm.name}</h4>
                      <p className="text-sm text-gray-500">Owner: {farm.ownerName}</p>
                      <p className="text-sm text-gray-500">Created: {farm.createdDate?.toLocaleDateString?.() || 'Unknown'}</p>
                      {farm.totalArea && <p className="text-sm text-gray-500">Area: {farm.totalArea} hectares</p>}
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{farm.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'trees' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">All Trees</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tree</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farm</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variety</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Health</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fruits</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allTrees.slice(0, 50).map((tree) => (
                    <tr key={tree.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{tree.name || tree.qrCode || tree.id.slice(0, 8)}</div>
                        <div className="text-sm text-gray-500">Zone: {tree.zoneCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tree.farmName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tree.variety}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          tree.healthStatus === 'Excellent' ? 'bg-green-100 text-green-800' :
                          tree.healthStatus === 'Good' ? 'bg-blue-100 text-blue-800' :
                          tree.healthStatus === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {tree.healthStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {((tree.manualFruitCount || 0) + (tree.aiFruitCount || 0)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allTrees.length > 50 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Showing first 50 of {allTrees.length} trees
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'entries' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">All Manual Entries</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farm</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fruit Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Health Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allEntries.slice(0, 50).map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.entryDate?.toLocaleDateString?.() || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.farmName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.fruitCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.healthRating}/5</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{entry.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allEntries.length > 50 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Showing first 50 of {allEntries.length} entries
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">All Photos</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farm</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Upload Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allPhotos.slice(0, 50).map((photo) => (
                    <tr key={photo.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {photo.timestamp?.toLocaleDateString?.() || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{photo.farmName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{photo.photoType}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          photo.uploadedToServer ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {photo.uploadedToServer ? 'Uploaded' : 'Local'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{photo.userNotes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allPhotos.length > 50 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Showing first 50 of {allPhotos.length} photos
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}