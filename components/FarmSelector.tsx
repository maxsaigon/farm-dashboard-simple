'use client'

import { useState, useEffect } from 'react'
import { Farm } from '@/lib/types'
import { FarmService } from '@/lib/farm-service'
import { useAuth } from '@/lib/enhanced-auth-context'

interface FarmSelectorProps {
  selectedFarmId?: string
  onFarmChange: (farmId: string, farm: Farm) => void
  className?: string
}

export function FarmSelector({ selectedFarmId, onFarmChange, className = '' }: FarmSelectorProps) {
  const { user } = useAuth()
  const [farms, setFarms] = useState<Farm[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newFarmName, setNewFarmName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!user) return

    const unsubscribe = FarmService.subscribeToUserFarms(user.uid, (userFarms) => {
      setFarms(userFarms)
      setLoading(false)

      // Auto-select first farm if none selected and farms available
      if (!selectedFarmId && userFarms.length > 0) {
        onFarmChange(userFarms[0].id, userFarms[0])
      }
    })

    return unsubscribe
  }, [user, selectedFarmId, onFarmChange])

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newFarmName.trim()) return

    setCreating(true)
    try {
      const farmId = await FarmService.createFarm(
        {
          name: newFarmName.trim(),
          ownerName: user.displayName || user.email || 'Unknown'
        },
        user.uid
      )

      // The farm will be automatically added to the list via the subscription
      setNewFarmName('')
      setShowCreateForm(false)
      
      // Auto-select the new farm
      const newFarm = farms.find(f => f.id === farmId)
      if (newFarm) {
        onFarmChange(farmId, newFarm)
      }
    } catch (error) {
      console.error('Error creating farm:', error)
      alert('Failed to create farm. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const selectedFarm = farms.find(f => f.id === selectedFarmId)

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="text-sm text-gray-600">Loading farms...</span>
      </div>
    )
  }

  if (farms.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">No Farms Found</h3>
          <p className="text-sm text-yellow-700 mb-3">
            You don&apos;t have access to any farms yet. Create your first farm to get started.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Create First Farm
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateFarm} className="bg-white border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-gray-900">Create New Farm</h4>
            <div>
              <label htmlFor="farmName" className="block text-sm font-medium text-gray-700 mb-1">
                Farm Name
              </label>
              <input
                type="text"
                id="farmName"
                value={newFarmName}
                onChange={(e) => setNewFarmName(e.target.value)}
                placeholder="Enter farm name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={creating}
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={creating || !newFarmName.trim()}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Creating...' : 'Create Farm'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setNewFarmName('')
                }}
                disabled={creating}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <label htmlFor="farmSelect" className="block text-sm font-medium text-gray-700 mb-1">
            Select Farm
          </label>
          <select
            id="farmSelect"
            value={selectedFarmId || ''}
            onChange={(e) => {
              const farm = farms.find(f => f.id === e.target.value)
              if (farm) {
                onFarmChange(e.target.value, farm)
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a farm...</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name} {farm.ownerName && `(${farm.ownerName})`}
              </option>
            ))}
          </select>
        </div>
        
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="ml-3 bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 transition-colors text-sm"
        >
          + New Farm
        </button>
      </div>

      {selectedFarm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="font-medium text-blue-900">{selectedFarm.name}</h4>
          <div className="text-sm text-blue-700 mt-1 space-y-1">
            {selectedFarm.ownerName && <p>Owner: {selectedFarm.ownerName}</p>}
            {selectedFarm.totalArea && <p>Area: {selectedFarm.totalArea} hectares</p>}
            <p>Created: {selectedFarm.createdDate.toLocaleDateString()}</p>
          </div>
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreateFarm} className="bg-white border rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-gray-900">Create New Farm</h4>
          <div>
            <label htmlFor="farmName" className="block text-sm font-medium text-gray-700 mb-1">
              Farm Name
            </label>
            <input
              type="text"
              id="farmName"
              value={newFarmName}
              onChange={(e) => setNewFarmName(e.target.value)}
              placeholder="Enter farm name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={creating}
            />
          </div>
          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={creating || !newFarmName.trim()}
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? 'Creating...' : 'Create Farm'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false)
                setNewFarmName('')
              }}
              disabled={creating}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}