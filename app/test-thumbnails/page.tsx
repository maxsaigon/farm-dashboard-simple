'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getPhotoWithUrls, PhotoWithUrls } from '@/lib/photo-service'

export default function TestThumbnails() {
  const [photos, setPhotos] = useState<PhotoWithUrls[]>([])
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<string[]>([])

  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage)
    setLogs(prev => [logMessage, ...prev.slice(0, 19)])
  }

  useEffect(() => {
    testThumbnailLoading()
  }, [])

  const testThumbnailLoading = async () => {
    try {
      setLoading(true)
      log('🚀 Starting thumbnail loading test')

      // Get sample photos from Firestore
      const photosRef = collection(db, 'photos')
      const q = query(photosRef, orderBy('timestamp', 'desc'), limit(5))
      const snapshot = await getDocs(q)
      
      log(`📷 Found ${snapshot.docs.length} photos in Firestore`)

      if (snapshot.docs.length === 0) {
        log('❌ No photos found in Firestore')
        setLoading(false)
        return
      }

      const photosData = []
      
      for (const doc of snapshot.docs.slice(0, 3)) {
        const data = doc.data()
        log(`🔍 Processing photo ${doc.id}`)
        
        const photo = {
          id: doc.id,
          timestamp: data.timestamp?.toDate() || new Date(),
          localPath: data.localPath || '',
          farmId: data.farmId || '',
          filename: data.filename,
          thumbnailPath: data.thumbnailPath,
          compressedPath: data.compressedPath,
          aiReadyPath: data.aiReadyPath,
          originalPath: data.originalPath,
          treeId: data.treeId,
          photoType: data.photoType,
          userNotes: data.userNotes,
          manualFruitCount: data.manualFruitCount,
          latitude: data.latitude,
          longitude: data.longitude,
          altitude: data.altitude,
          needsAIAnalysis: data.needsAIAnalysis || false,
          uploadedToServer: data.uploadedToServer || false,
          serverProcessed: data.serverProcessed || false,
          uploadDate: data.uploadDate?.toDate(),
          localStorageDate: data.localStorageDate?.toDate(),
          totalLocalSize: data.totalLocalSize,
          farmName: data.farmName
        }

        log(`📁 Photo paths - thumbnailPath: ${photo.thumbnailPath || 'none'}`)
        log(`📁 Photo paths - originalPath: ${photo.originalPath || 'none'}`)
        log(`📁 Photo paths - compressedPath: ${photo.compressedPath || 'none'}`)
        log(`📁 Photo paths - localPath: ${photo.localPath || 'none'}`)
        log(`🔧 Expected correct path: farms/${photo.farmId}/trees/${photo.treeId}/photos/${photo.id}/`)

        try {
          log(`🔄 Getting URLs for photo ${doc.id}...`)
          // Use the correct farmId instead of the one in photo data (which might be 'default')
          const correctFarmId = "F210C3FC-F191-4926-9C15-58D6550A716A"
          const photoWithUrls = await getPhotoWithUrls(photo, correctFarmId)
          
          log(`✅ URLs loaded - imageUrl: ${photoWithUrls.imageUrl ? 'SUCCESS' : 'FAILED'}`)
          log(`✅ URLs loaded - thumbnailUrl: ${photoWithUrls.thumbnailUrl ? 'SUCCESS' : 'FAILED'}`)
          log(`🔗 Image URL: ${photoWithUrls.imageUrl?.substring(0, 100) || 'none'}...`)
          log(`🔗 Thumbnail URL: ${photoWithUrls.thumbnailUrl?.substring(0, 100) || 'none'}...`)
          
          photosData.push(photoWithUrls)
        } catch (urlError) {
          log(`❌ Error getting URLs for photo ${doc.id}: ${urlError}`)
        }
      }

      setPhotos(photosData)
      log(`✅ Thumbnail loading test complete: ${photosData.length} photos processed`)
    } catch (error) {
      log(`❌ Error in thumbnail test: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🖼️ Thumbnail URL Loading Test
          </h1>
          
          <div className="mb-6 bg-blue-50 p-4 rounded-lg">
            <p><strong>Status:</strong> {loading ? 'Loading...' : 'Complete'}</p>
            <p><strong>Photos Tested:</strong> {photos.length}</p>
            <p><strong>Success Rate:</strong> {photos.length > 0 ? `${photos.filter(p => p.imageUrl || p.thumbnailUrl).length}/${photos.length}` : 'N/A'}</p>
          </div>

          {/* Photo Results */}
          {photos.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Photo Results:</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {photos.map((photo, index) => (
                  <div key={photo.id} className={`border rounded-lg p-4 ${photo.loadError ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                    <div className="text-sm font-mono text-gray-600 mb-2">
                      ID: {photo.id.slice(0, 8)}...
                    </div>
                    
                    {photo.thumbnailUrl && (
                      <div className="mb-2">
                        <div className="text-xs text-gray-500 mb-1">Thumbnail:</div>
                        <img 
                          src={photo.thumbnailUrl} 
                          alt="Thumbnail" 
                          className="w-full h-32 object-cover rounded border"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement
                            img.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    
                    {photo.imageUrl && !photo.thumbnailUrl && (
                      <div className="mb-2">
                        <div className="text-xs text-gray-500 mb-1">Image:</div>
                        <img 
                          src={photo.imageUrl} 
                          alt="Image" 
                          className="w-full h-32 object-cover rounded border"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement
                            img.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="text-xs space-y-1">
                      <div>Tree: {photo.treeId?.slice(0, 8) || 'N/A'}</div>
                      <div>Type: {photo.photoType || 'general'}</div>
                      <div>URLs: {photo.imageUrl ? '✅' : '❌'} / {photo.thumbnailUrl ? '✅' : '❌'}</div>
                      <div>Error: {photo.loadError ? 'YES' : 'NO'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logs */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Execution Log:</h2>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </div>

          <div className="text-center space-x-4">
            <button
              onClick={testThumbnailLoading}
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