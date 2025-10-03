'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'

export default function DebugBoundaries() {
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

    try {
      console.log('🔍 BOUNDARY DEBUG: Loading zones for farm:', farmId)
      
      // Try global zones collection first
      let zonesRef = collection(db, 'zones')
      let zonesSnapshot = await getDocs(query(zonesRef, where('farmId', '==', farmId)))
      console.log('🔍 Found zones in global collection:', zonesSnapshot.docs.length)
      
      // If none, try farm-specific collection
      if (zonesSnapshot.empty) {
        console.log('🔍 Trying farm-specific zones collection')
        zonesRef = collection(db, 'farms', farmId, 'zones')
        zonesSnapshot = await getDocs(zonesRef)
        console.log('🔍 Found zones in farm collection:', zonesSnapshot.docs.length)
      }
      
      const zonesData = zonesSnapshot.docs.map(doc => {
        const data = doc.data()
        console.log('🔍 RAW ZONE DATA:', doc.id, JSON.stringify(data, null, 2))
        
        // Extract all possible boundary field names
        const boundaryFields = {
          boundaries: data.boundaries,
          coordinates: data.coordinates,
          polygon: data.polygon,
          points: data.points,
          boundary: data.boundary,
          coords: data.coords,
          vertices: data.vertices,
          shape: data.shape
        }
        
        console.log('🔍 BOUNDARY FIELDS for', doc.id, ':', boundaryFields)
        
        // Check data types
        Object.entries(boundaryFields).forEach(([key, value]) => {
          if (value) {
            console.log(`🔍 ${key}:`, typeof value, Array.isArray(value) ? `array[${value.length}]` : 'not array', value)
          }
        })
        
        return {
          id: doc.id,
          name: data.name || `Zone ${doc.id}`,
          rawData: data,
          boundaryFields: boundaryFields
        }
      })
      
      setZones(zonesData)
      
    } catch (err: unknown) {
      console.error('🔍 Zone loading error:', err)
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
          <p className="text-gray-600">Loading boundary data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🔍 Boundary Data Debug Tool
          </h1>
          
          <div className="mb-6 bg-blue-50 p-4 rounded-lg">
            <p><strong>Farm ID:</strong> {farmId}</p>
            <p><strong>Total Zones:</strong> {zones.length}</p>
            <p><strong>Status:</strong> {error ? 'Error' : 'Success'}</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <strong>Error:</strong> {error}
            </div>
          )}

          {zones.length > 0 && (
            <div className="space-y-6">
              {zones.map((zone) => (
                <div key={zone.id} className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Zone: {zone.name} ({zone.id})
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Boundary Fields Analysis:</h4>
                      <div className="space-y-2 text-sm">
                        {Object.entries(zone.boundaryFields).map(([fieldName, fieldValue]) => (
                          <div key={fieldName} className={`p-2 rounded ${fieldValue ? 'bg-green-50' : 'bg-gray-50'}`}>
                            <strong>{fieldName}:</strong> {
                              fieldValue ? (
                                <span className="text-green-600">
                                  Found ({typeof fieldValue}) 
                                  {Array.isArray(fieldValue) ? ` - Array[${fieldValue.length}]` : ''}
                                </span>
                              ) : (
                                <span className="text-gray-400">Not found</span>
                              )
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Full Raw Data:</h4>
                      <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-64">
                        {JSON.stringify(zone.rawData, null, 2)}
                      </pre>
                    </div>
                  </div>
                  
                  {/* Show first boundary field that has data */}
                  {Object.entries(zone.boundaryFields).map(([fieldName, fieldValue]) => {
                    if (fieldValue && Array.isArray(fieldValue) && fieldValue.length > 0) {
                      return (
                        <div key={fieldName} className="mt-4">
                          <h4 className="font-semibold text-gray-800 mb-2">
                            {fieldName} Content ({fieldValue.length} items):
                          </h4>
                          <pre className="text-xs bg-blue-50 p-3 rounded overflow-auto max-h-40">
                            {JSON.stringify(fieldValue, null, 2)}
                          </pre>
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <div className="space-x-4">
              <a
                href="/map"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                → Go to Map
              </a>
              <a
                href="/test-zones-simple"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                → Zone Test
              </a>
              <a
                href="/"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}