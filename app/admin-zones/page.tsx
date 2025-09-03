'use client'

import React, { useState, useEffect } from 'react'
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface Zone {
  id: string
  name: string
  color: string
  boundary: Array<{ latitude: number; longitude: number }>
  farmId: string
  treeCount: number
  area: number
  isActive: boolean
  notes?: string
  createdAt?: Date
}

interface Farm {
  id: string
  name: string
}

export default function AdminZonesPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [farms, setFarms] = useState<Farm[]>([])
  const [selectedFarm, setSelectedFarm] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingZone, setEditingZone] = useState<Zone | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage)
    setLogs(prev => [logMessage, ...prev.slice(0, 9)]) // Keep last 10 logs
  }

  useEffect(() => {
    loadFarms()
  }, [])

  const loadFarms = async () => {
    try {
      log('Loading farms...')
      const farmsSnapshot = await getDocs(collection(db, 'farms'))
      const farmsData = farmsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || `Farm ${doc.id.slice(0, 8)}`
      }))
      setFarms(farmsData)
      log(`Loaded ${farmsData.length} farms`)
    } catch (error) {
      log(`Error loading farms: ${error}`)
    }
  }

  const loadZones = async (farmId: string) => {
    if (!farmId) return
    
    setLoading(true)
    try {
      log(`Loading zones for farm: ${farmId}`)
      
      // Try global zones collection
      const zonesRef = collection(db, 'zones')
      const zonesQuery = query(zonesRef, where('farmId', '==', farmId))
      const zonesSnapshot = await getDocs(zonesQuery)
      
      const zonesData = zonesSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name || `Zone ${doc.id.slice(0, 8)}`,
          color: data.color || '#3b82f6',
          boundary: data.boundary || [],
          farmId: data.farmId,
          treeCount: data.treeCount || 0,
          area: data.area || 0,
          isActive: data.isActive !== false,
          notes: data.notes || '',
          createdAt: data.createdAt?.toDate?.() || new Date()
        }
      })
      
      setZones(zonesData)
      log(`Loaded ${zonesData.length} zones`)
    } catch (error) {
      log(`Error loading zones: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFarmChange = (farmId: string) => {
    setSelectedFarm(farmId)
    if (farmId) {
      loadZones(farmId)
    } else {
      setZones([])
    }
  }

  const deleteZone = async (zoneId: string, zoneName: string) => {
    if (!confirm(`Delete zone "${zoneName}"? This cannot be undone.`)) return
    
    try {
      log(`Deleting zone: ${zoneName} (${zoneId})`)
      await deleteDoc(doc(db, 'zones', zoneId))
      setZones(prev => prev.filter(z => z.id !== zoneId))
      log(`Zone deleted successfully: ${zoneName}`)
    } catch (error) {
      log(`Error deleting zone: ${error}`)
    }
  }

  const duplicateZone = async (zone: Zone) => {
    try {
      log(`Duplicating zone: ${zone.name}`)
      const newZoneRef = doc(collection(db, 'zones'))
      const newZone = {
        ...zone,
        id: newZoneRef.id,
        name: `${zone.name} (Copy)`,
        createdAt: new Date()
      }
      
      await setDoc(newZoneRef, {
        ...newZone,
        createdAt: new Date()
      })
      
      setZones(prev => [...prev, newZone])
      log(`Zone duplicated successfully: ${newZone.name}`)
    } catch (error) {
      log(`Error duplicating zone: ${error}`)
    }
  }

  const clearAllZones = async () => {
    if (!selectedFarm) return
    if (!confirm(`Delete ALL zones for this farm? This cannot be undone!`)) return
    
    try {
      log(`Clearing all zones for farm: ${selectedFarm}`)
      const deletePromises = zones.map(zone => deleteDoc(doc(db, 'zones', zone.id)))
      await Promise.all(deletePromises)
      setZones([])
      log(`All zones cleared successfully`)
    } catch (error) {
      log(`Error clearing zones: ${error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">🔧 Super Admin - Zone Management</h1>
            <div className="flex items-center space-x-4">
              <a
                href="/map"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                → View Map
              </a>
              <a
                href="/"
                className="text-gray-600 hover:text-gray-700 font-medium"
              >
                ← Back
              </a>
            </div>
          </div>

          {/* Farm Selection */}
          <div className="mb-6 bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-4">
              <label className="font-medium text-gray-700">Select Farm:</label>
              <select
                value={selectedFarm}
                onChange={(e) => handleFarmChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select a Farm --</option>
                {farms.map(farm => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name} ({farm.id.slice(0, 8)})
                  </option>
                ))}
              </select>
              
              {selectedFarm && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => loadZones(selectedFarm)}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
                  >
                    {loading ? 'Loading...' : 'Refresh'}
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                  >
                    + New Zone
                  </button>
                  <button
                    onClick={clearAllZones}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                  >
                    🗑️ Clear All
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Zones List */}
          {selectedFarm && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Zones Table */}
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  Zones ({zones.length}) 
                  {loading && <span className="text-blue-600 ml-2">Loading...</span>}
                </h2>
                
                {zones.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {loading ? 'Loading zones...' : 'No zones found for this farm'}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {zones.map(zone => (
                      <div key={zone.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <div
                                className="w-4 h-4 rounded-full border border-gray-300"
                                style={{ backgroundColor: zone.color }}
                              ></div>
                              <h3 className="font-medium text-gray-900">{zone.name}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                zone.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {zone.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                              <div>ID: {zone.id.slice(0, 12)}...</div>
                              <div>Trees: {zone.treeCount}</div>
                              <div>Area: {zone.area} ha</div>
                              <div>Points: {zone.boundary?.length || 0}</div>
                            </div>
                            
                            {zone.notes && (
                              <div className="mt-2 text-sm text-gray-600">
                                Notes: {zone.notes}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col space-y-2 ml-4">
                            <button
                              onClick={() => setEditingZone(zone)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => duplicateZone(zone)}
                              className="text-green-600 hover:text-green-700 text-sm font-medium"
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => deleteZone(zone.id, zone.name)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Logs Panel */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Activity Log</h2>
                <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                  {logs.length === 0 ? (
                    <div className="text-gray-500">No activity yet...</div>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="mb-1">{log}</div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingZone) && (
        <ZoneModal
          zone={editingZone}
          farmId={selectedFarm}
          onClose={() => {
            setShowCreateModal(false)
            setEditingZone(null)
          }}
          onSave={(zone) => {
            if (editingZone) {
              setZones(prev => prev.map(z => z.id === zone.id ? zone : z))
              log(`Zone updated: ${zone.name}`)
            } else {
              setZones(prev => [...prev, zone])
              log(`Zone created: ${zone.name}`)
            }
            setShowCreateModal(false)
            setEditingZone(null)
          }}
          onLog={log}
        />
      )}
    </div>
  )
}

// Zone Create/Edit Modal Component
interface ZoneModalProps {
  zone: Zone | null
  farmId: string
  onClose: () => void
  onSave: (zone: Zone) => void
  onLog: (message: string) => void
}

function ZoneModal({ zone, farmId, onClose, onSave, onLog }: ZoneModalProps) {
  const [formData, setFormData] = useState({
    name: zone?.name || '',
    color: zone?.color || '#3b82f6',
    treeCount: zone?.treeCount || 0,
    area: zone?.area || 0,
    isActive: zone?.isActive !== false,
    notes: zone?.notes || '',
    boundaryText: zone ? JSON.stringify(zone.boundary, null, 2) : JSON.stringify([
      { latitude: 12.964719721189951, longitude: 108.10734795539481 },
      { latitude: 12.965282877587123, longitude: 108.10792439558159 },
      { latitude: 12.966500825869684, longitude: 108.10731307452419 },
      { latitude: 12.966106194021753, longitude: 108.10657156603018 }
    ], null, 2)
  })
  
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      let boundary = []
      try {
        boundary = JSON.parse(formData.boundaryText)
      } catch (e) {
        alert('Invalid boundary JSON format')
        setSaving(false)
        return
      }

      const zoneData: Zone = {
        id: zone?.id || '',
        name: formData.name,
        color: formData.color,
        boundary: boundary,
        farmId: farmId,
        treeCount: formData.treeCount,
        area: formData.area,
        isActive: formData.isActive,
        notes: formData.notes,
        createdAt: zone?.createdAt || new Date()
      }

      if (zone) {
        // Update existing zone
        onLog(`Updating zone: ${formData.name}`)
        await setDoc(doc(db, 'zones', zone.id), {
          ...zoneData,
          updatedAt: new Date()
        })
      } else {
        // Create new zone
        onLog(`Creating zone: ${formData.name}`)
        const newZoneRef = doc(collection(db, 'zones'))
        zoneData.id = newZoneRef.id
        await setDoc(newZoneRef, {
          ...zoneData,
          createdAt: new Date()
        })
      }

      onSave(zoneData)
    } catch (error) {
      onLog(`Error saving zone: ${error}`)
      alert(`Error saving zone: ${error}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {zone ? 'Edit Zone' : 'Create New Zone'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Zone Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter zone name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-8 border border-gray-300 rounded"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tree Count</label>
                <input
                  type="number"
                  value={formData.treeCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, treeCount: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Area (hectares)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.area}
                  onChange={(e) => setFormData(prev => ({ ...prev, area: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="mr-2"
                  />
                  Active
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Optional notes about this zone"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Boundary Points (JSON Format)
                <span className="text-sm text-gray-500 ml-2">Array of &#123;latitude, longitude&#125; objects</span>
              </label>
              <textarea
                value={formData.boundaryText}
                onChange={(e) => setFormData(prev => ({ ...prev, boundaryText: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={8}
                placeholder="JSON array of boundary points"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-6 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.name}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? 'Saving...' : zone ? 'Update Zone' : 'Create Zone'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}