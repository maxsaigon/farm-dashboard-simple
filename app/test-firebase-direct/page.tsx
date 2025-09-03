'use client'

import { useState } from 'react'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'

export default function TestFirebaseDirect() {
  const [results, setResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const farmId = "F210C3FC-F191-4926-9C15-58D6550A716A"

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testDirectConnection = async () => {
    setLoading(true)
    setResults([])
    
    try {
      addResult('🔥 Starting Firebase direct connection test')
      
      // Test 1: Check if we can access zones collection
      addResult('📁 Testing global zones collection access...')
      const zonesRef = collection(db, 'zones')
      const allZonesSnapshot = await getDocs(zonesRef)
      addResult(`📁 Global zones collection: ${allZonesSnapshot.docs.length} total documents`)
      
      // Test 2: Check zones for our farm
      addResult(`🎯 Looking for zones with farmId: ${farmId}`)
      const farmZones = allZonesSnapshot.docs.filter(doc => {
        const data = doc.data()
        return data.farmId === farmId
      })
      addResult(`🎯 Found ${farmZones.length} zones for our farm`)
      
      // Test 3: Examine first few zones
      farmZones.slice(0, 3).forEach((doc, index) => {
        const data = doc.data()
        addResult(`🔍 Zone ${index + 1} (${doc.id}): name=${data.name || 'unnamed'}, boundaries=${data.boundaries?.length || 0}`)
        
        if (data.boundaries && data.boundaries.length > 0) {
          addResult(`  📍 First boundary point: ${JSON.stringify(data.boundaries[0])}`)
        }
      })
      
      // Test 4: Check farm-specific zones collection
      addResult(`🏠 Testing farm-specific zones collection: farms/${farmId}/zones`)
      try {
        const farmZonesRef = collection(db, 'farms', farmId, 'zones')
        const farmZonesSnapshot = await getDocs(farmZonesRef)
        addResult(`🏠 Farm-specific zones: ${farmZonesSnapshot.docs.length} documents`)
      } catch (err) {
        addResult(`❌ Farm-specific zones error: ${err}`)
      }
      
      // Test 5: Try to access a specific farm document
      addResult(`🚜 Testing farm document access: farms/${farmId}`)
      try {
        const farmRef = doc(db, 'farms', farmId)
        const farmDoc = await getDoc(farmRef)
        if (farmDoc.exists()) {
          const farmData = farmDoc.data()
          addResult(`🚜 Farm exists: name=${farmData.name || 'unnamed'}`)
        } else {
          addResult(`❌ Farm document does not exist`)
        }
      } catch (err) {
        addResult(`❌ Farm document error: ${err}`)
      }
      
      addResult('✅ Firebase connection test completed')
      
    } catch (error) {
      addResult(`❌ Fatal error: ${error}`)
      console.error('Firebase test error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🔥 Firebase Direct Connection Test
          </h1>
          
          <div className="mb-6">
            <button
              onClick={testDirectConnection}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
            >
              {loading ? 'Testing...' : 'Run Firebase Test'}
            </button>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="font-semibold mb-4">Test Results:</h2>
            <div className="space-y-1 text-sm font-mono">
              {results.length === 0 ? (
                <p className="text-gray-500">Click "Run Firebase Test" to start</p>
              ) : (
                results.map((result, index) => (
                  <div key={index} className="py-1">
                    {result}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            <div className="space-x-4">
              <a
                href="/debug-boundaries"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                → Boundary Debug
              </a>
              <a
                href="/map"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                → Map
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