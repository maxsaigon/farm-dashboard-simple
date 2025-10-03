'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'

export default function TestZonesSimple() {
  const [zones, setZones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const farmId = "F210C3FC-F191-4926-9C15-58D6550A716A"

  useEffect(() => {
    loadZones()
  }, [])

  const loadZones = async () => {
    setLoading(true)
    setError('')
    setZones([])

    try {
      console.log('Testing zone loading for farm:', farmId)
      
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
        return {
          id: doc.id,
          name: data.name || `Zone ${doc.id}`,
          color: data.color || '#3b82f6',
          boundaries: data.boundaries || [],
          isActive: data.isActive !== false,
          raw: data
        }
      })
      
      console.log('ZONE RESULTS:', zonesData.length, 'zones loaded')
      console.log('First zone sample:', zonesData[0])
      
      setZones(zonesData)
      
    } catch (err: unknown) {
      console.error('Zone loading error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Zone loading failed'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading zones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Zone Loading Test Results
          </h1>
          
          <div className="mb-6 bg-blue-50 p-4 rounded-lg">
            <p><strong>Farm ID:</strong> {farmId}</p>
            <p><strong>Total Zones Found:</strong> {zones.length}</p>
            <p><strong>Status:</strong> {error ? 'Error' : 'Success'}</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Zone Summary:</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{zones.length}</div>
                <div className="text-sm text-gray-600">Total Zones</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {zones.filter(z => z.boundaries && z.boundaries.length > 0).length}
                </div>
                <div className="text-sm text-gray-600">With Boundaries</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {zones.filter(z => z.boundaries && z.boundaries.length >= 3).length}
                </div>
                <div className="text-sm text-gray-600">Valid Polygons (3+ points)</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {zones.filter(z => z.isActive).length}
                </div>
                <div className="text-sm text-gray-600">Active Zones</div>
              </div>
            </div>
          </div>

          {zones.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">First 5 Zones:</h3>
              <div className="space-y-4">
                {zones.slice(0, 5).map((zone) => (
                  <div key={zone.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium" style={{color: zone.color}}>
                        {zone.name}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        zone.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {zone.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>ID:</strong> {zone.id}<br/>
                      <strong>Boundaries:</strong> {zone.boundaries?.length || 0} points<br/>
                      <strong>Valid Polygon:</strong> {zone.boundaries?.length >= 3 ? 'Yes' : 'No'}
                    </div>

                    {zone.boundaries && zone.boundaries.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-blue-600 text-sm">
                          Show boundary coordinates ({zone.boundaries.length} points)
                        </summary>
                        <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-auto">
                          {JSON.stringify(zone.boundaries, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <div className="space-x-4">
              <a
                href="/map"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                → Go to Map Page
              </a>
              <a
                href="/debug-zones"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                → Full Debug Page
              </a>
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
    </div>
  )
}