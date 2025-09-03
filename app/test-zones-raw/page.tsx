'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'

export default function TestZonesRaw() {
  const [status, setStatus] = useState('Initializing...')
  const [zones, setZones] = useState<any[]>([])
  const [logs, setLogs] = useState<string[]>([])

  const farmId = "F210C3FC-F191-4926-9C15-58D6550A716A"

  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage)
    setLogs(prev => [...prev, logMessage])
  }

  useEffect(() => {
    testZoneLoading()
  }, [])

  const testZoneLoading = async () => {
    try {
      setStatus('Loading zones...')
      log('🚀 Starting zone loading test')
      log(`🎯 Target farm ID: ${farmId}`)

      // Test Firebase connection first
      log('🔥 Testing Firebase connection...')
      
      // Method 1: Global zones collection with farmId filter
      log('📍 Method 1: Global zones with farmId filter')
      const globalZonesRef = collection(db, 'zones')
      const globalQuery = query(globalZonesRef, where('farmId', '==', farmId))
      const globalSnapshot = await getDocs(globalQuery)
      log(`📍 Global zones found: ${globalSnapshot.docs.length}`)

      if (globalSnapshot.docs.length > 0) {
        const sampleZone = globalSnapshot.docs[0]
        const sampleData = sampleZone.data()
        log(`📍 Sample zone: ${sampleZone.id}`)
        log(`📍 Sample data keys: ${Object.keys(sampleData).join(', ')}`)
        log(`📍 Has boundaries: ${!!sampleData.boundaries} (${sampleData.boundaries?.length || 0} points)`)
        
        if (sampleData.boundaries && sampleData.boundaries.length > 0) {
          log(`📍 First boundary point: ${JSON.stringify(sampleData.boundaries[0])}`)
        }
      }

      // Method 2: Farm-specific collection
      log('🏠 Method 2: Farm-specific zones collection')
      try {
        const farmZonesRef = collection(db, 'farms', farmId, 'zones')
        const farmSnapshot = await getDocs(farmZonesRef)
        log(`🏠 Farm-specific zones found: ${farmSnapshot.docs.length}`)
      } catch (farmError) {
        log(`🏠 Farm-specific collection error: ${farmError}`)
      }

      // Process all zones
      const allZones = globalSnapshot.docs.map(doc => {
        const data = doc.data()
        log(`🔍 Processing zone ${doc.id}: name="${data.name}", boundaries=${data.boundaries?.length || 0}`)
        
        return {
          id: doc.id,
          name: data.name || `Unnamed Zone ${doc.id}`,
          boundaries: data.boundaries || [],
          boundariesCount: data.boundaries?.length || 0,
          hasBoundaries: !!(data.boundaries && data.boundaries.length > 0),
          validBoundaries: !!(data.boundaries && data.boundaries.length >= 3),
          rawData: data
        }
      })

      setZones(allZones)
      
      const validZones = allZones.filter(z => z.validBoundaries)
      log(`✅ Processing complete: ${allZones.length} total zones, ${validZones.length} with valid boundaries`)
      setStatus(`Complete: ${allZones.length} zones loaded, ${validZones.length} valid`)

    } catch (error) {
      const errorMsg = `❌ Error loading zones: ${error}`
      log(errorMsg)
      setStatus('Error occurred')
      console.error('Zone loading error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🧪 Raw Zone Loading Test
          </h1>
          
          <div className="mb-6 bg-blue-50 p-4 rounded-lg">
            <p><strong>Status:</strong> {status}</p>
            <p><strong>Farm ID:</strong> {farmId}</p>
            <p><strong>Zones Found:</strong> {zones.length}</p>
            <p><strong>Valid Zones:</strong> {zones.filter(z => z.validBoundaries).length}</p>
          </div>

          {/* Logs */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Execution Log:</h2>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </div>

          {/* Zone Summary */}
          {zones.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Zone Summary:</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 border-b text-left text-sm font-medium">ID</th>
                      <th className="px-4 py-2 border-b text-left text-sm font-medium">Name</th>
                      <th className="px-4 py-2 border-b text-left text-sm font-medium">Boundaries</th>
                      <th className="px-4 py-2 border-b text-left text-sm font-medium">Valid</th>
                      <th className="px-4 py-2 border-b text-left text-sm font-medium">First Point</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zones.slice(0, 10).map((zone) => (
                      <tr key={zone.id} className={zone.validBoundaries ? 'bg-green-50' : 'bg-red-50'}>
                        <td className="px-4 py-2 border-b text-xs font-mono">{zone.id.slice(0, 8)}...</td>
                        <td className="px-4 py-2 border-b text-sm">{zone.name}</td>
                        <td className="px-4 py-2 border-b text-sm">{zone.boundariesCount}</td>
                        <td className="px-4 py-2 border-b text-sm">
                          {zone.validBoundaries ? '✅' : '❌'}
                        </td>
                        <td className="px-4 py-2 border-b text-xs">
                          {zone.boundaries.length > 0 ? JSON.stringify(zone.boundaries[0]).slice(0, 50) + '...' : 'None'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="text-center space-x-4">
            <button
              onClick={testZoneLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Re-run Test
            </button>
            <a
              href="/map"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              → Go to Map
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}