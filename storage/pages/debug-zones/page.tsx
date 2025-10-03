'use client'

import { useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'

export default function DebugZonesPage() {
  const [farmId, setFarmId] = useState('')
  const [loading, setLoading] = useState(false)
  const [zones, setZones] = useState<any[]>([])
  const [error, setError] = useState('')

  const loadZones = async () => {
    if (!farmId) return
    
    setLoading(true)
    setError('')
    setZones([])

    try {
      console.log('Loading zones for farm:', farmId)
      
      // Try to load zones from farm-specific collection first
      let zonesRef = collection(db, 'farms', farmId, 'zones')
      let zonesSnapshot = await getDocs(zonesRef)
      console.log('Found zones in farm collection:', zonesSnapshot.docs.length)
      
      // If no zones found in farm collection, try global zones collection filtered by farmId
      if (zonesSnapshot.empty) {
        console.log('No zones in farm collection, trying global zones collection')
        zonesRef = collection(db, 'zones')
        zonesSnapshot = await getDocs(query(zonesRef, where('farmId', '==', farmId)))
        console.log('Found zones in global collection:', zonesSnapshot.docs.length)
      }
      
      const zonesData = zonesSnapshot.docs.map(doc => {
        const data = doc.data()
        console.log('Raw zone data for', doc.id, ':', data)
        
        // Handle different possible field names for boundaries
        const boundaries = data.boundaries || data.coordinates || data.polygon || data.points || []
        
        // Handle different possible field names for metadata
        const metadata = data.metadata || {}
        const soilType = data.soilType || metadata.soilType || 'unknown'
        const drainageLevel = data.drainageLevel || metadata.drainageLevel || 'fair'
        const area = data.area || metadata.area || 0
        
        const zone = {
          id: doc.id,
          name: data.name || `Zone ${doc.id}`,
          description: data.description || '',
          color: data.color || '#3b82f6',
          boundaries: boundaries,
          soilType: soilType,
          drainageLevel: drainageLevel,
          treeCount: data.treeCount || 0,
          area: area,
          isActive: data.isActive !== false, // default to true
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
          raw: data // Keep raw data for debugging
        }
        
        return zone
      })
      
      console.log('Processed zones:', zonesData)
      setZones(zonesData)
      
    } catch (err: unknown) {
      console.error('Zone loading error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Zone loading failed'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🔍 Zone Data Debug Tool
          </h1>

          <div className="mb-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Farm ID (from Firebase)
                </label>
                <input
                  type="text"
                  value={farmId}
                  onChange={(e) => setFarmId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter farm ID to debug zones..."
                />
              </div>
              <button
                onClick={loadZones}
                disabled={loading || !farmId}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium"
              >
                {loading ? 'Loading...' : 'Load Zones'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <strong>Error:</strong> {error}
            </div>
          )}

          {zones.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Found {zones.length} zones:
              </h2>
              <div className="space-y-4">
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {zone.name}
                        </h3>
                        <div className="space-y-1 text-sm">
                          <p><strong>ID:</strong> {zone.id}</p>
                          <p><strong>Color:</strong> <span style={{color: zone.color}}>{zone.color}</span></p>
                          <p><strong>Active:</strong> {zone.isActive ? 'Yes' : 'No'}</p>
                          <p><strong>Tree Count:</strong> {zone.treeCount}</p>
                          <p><strong>Area:</strong> {zone.area} ha</p>
                          <p><strong>Soil:</strong> {zone.soilType}</p>
                          <p><strong>Drainage:</strong> {zone.drainageLevel}</p>
                          <p><strong>Boundaries Count:</strong> {zone.boundaries?.length || 0}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-md font-medium text-gray-800 mb-2">Raw Data:</h4>
                        <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-48">
                          {JSON.stringify(zone.raw, null, 2)}
                        </pre>
                      </div>
                    </div>
                    
                    {zone.boundaries && zone.boundaries.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-md font-medium text-gray-800 mb-2">
                          Boundaries ({zone.boundaries.length} points):
                        </h4>
                        <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(zone.boundaries, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {zones.length === 0 && !loading && farmId && (
            <div className="text-center py-8">
              <p className="text-gray-500">No zones found for farm ID: {farmId}</p>
              <p className="text-sm text-gray-400 mt-2">
                Make sure the farm ID is correct and zones exist in either:
                <br />• /farms/{farmId}/zones collection
                <br />• /zones collection with farmId field
              </p>
            </div>
          )}

          <div className="mt-8 text-center">
            <a
              href="/"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}