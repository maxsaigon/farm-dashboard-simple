'use client'

import { useState } from 'react'
import { storage } from '@/lib/firebase'
import { ref, listAll, getDownloadURL } from 'firebase/storage'

export default function DebugStorage() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage)
    setLogs(prev => [logMessage, ...prev.slice(0, 49)])
  }

  const debugStorageStructure = async () => {
    try {
      setLoading(true)
      setResults([])
      setLogs([])
      
      log('🚀 Starting Firebase Storage structure debug')
      
      // Common storage paths to check
      const pathsToCheck = [
        '',  // Root
        'images',
        'photos',
        'trees',
        'tree-photos',
        'farm-photos',
        'thumbnails',
        'uploads'
      ]
      
      const structureResults = []
      
      for (const path of pathsToCheck) {
        try {
          log(`📁 Checking path: ${path || 'root'}`)
          const pathRef = ref(storage, path)
          const result = await listAll(pathRef)
          
          const folderInfo = {
            path: path || 'root',
            folders: result.prefixes.map(prefix => prefix.name),
            files: result.items.slice(0, 5).map(item => ({
              name: item.name,
              fullPath: item.fullPath
            })),
            totalFiles: result.items.length,
            totalFolders: result.prefixes.length
          }
          
          log(`📁 Path '${path || 'root'}': ${result.prefixes.length} folders, ${result.items.length} files`)
          
          if (result.prefixes.length > 0) {
            log(`📂 Subfolders: ${result.prefixes.map(p => p.name).join(', ')}`)
          }
          
          if (result.items.length > 0) {
            log(`📄 Sample files: ${result.items.slice(0, 3).map(i => i.name).join(', ')}`)
          }
          
          structureResults.push(folderInfo)
          
          // If we find tree-related folders, examine one
          if (path === 'trees' && result.prefixes.length > 0) {
            const sampleTreeId = result.prefixes[0].name
            log(`🌳 Examining sample tree folder: ${sampleTreeId}`)
            
            try {
              const treeRef = ref(storage, `trees/${sampleTreeId}`)
              const treeResult = await listAll(treeRef)
              
              log(`🌳 Tree '${sampleTreeId}': ${treeResult.items.length} files`)
              
              // Try to get URL for first image
              if (treeResult.items.length > 0) {
                const firstImage = treeResult.items[0]
                try {
                  const url = await getDownloadURL(firstImage)
                  log(`🔗 Sample URL: ${url.substring(0, 100)}...`)
                } catch (urlError) {
                  log(`❌ Failed to get URL for ${firstImage.fullPath}: ${urlError}`)
                }
              }
            } catch (treeError) {
              log(`❌ Error examining tree folder: ${treeError}`)
            }
          }
          
        } catch (error) {
          log(`❌ Error accessing path '${path}': ${error}`)
          structureResults.push({
            path: path || 'root',
            error: error instanceof Error ? error.message : String(error),
            folders: [],
            files: [],
            totalFiles: 0,
            totalFolders: 0
          })
        }
      }
      
      setResults(structureResults)
      log('✅ Storage structure debug complete')
      
    } catch (error) {
      log(`❌ Critical error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🗃️ Firebase Storage Structure Debug
          </h1>
          
          <div className="mb-6 bg-blue-50 p-4 rounded-lg">
            <p><strong>Status:</strong> {loading ? 'Scanning...' : 'Ready'}</p>
            <p><strong>Paths Scanned:</strong> {results.length}</p>
          </div>

          {/* Storage Structure Results */}
          {results.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Storage Structure:</h2>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className={`border rounded-lg p-4 ${result.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                    <div className="font-mono text-sm font-semibold text-gray-800 mb-2">
                      📁 {result.path}
                    </div>
                    
                    {result.error ? (
                      <div className="text-red-600 text-sm">❌ {result.error}</div>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <div>📂 Folders: {result.totalFolders}</div>
                        <div>📄 Files: {result.totalFiles}</div>
                        
                        {result.folders.length > 0 && (
                          <div>
                            <div className="font-medium">Subfolders:</div>
                            <div className="ml-4 text-xs font-mono bg-gray-100 p-2 rounded">
                              {result.folders.join(', ')}
                            </div>
                          </div>
                        )}
                        
                        {result.files.length > 0 && (
                          <div>
                            <div className="font-medium">Sample Files:</div>
                            <div className="ml-4 text-xs font-mono bg-gray-100 p-2 rounded space-y-1">
                              {result.files.map((file: any, i: number) => (
                                <div key={i}>{file.name}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logs */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Debug Log:</h2>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </div>

          <div className="text-center space-x-4">
            <button
              onClick={debugStorageStructure}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              disabled={loading}
            >
              {loading ? 'Scanning...' : 'Debug Storage Structure'}
            </button>
            <a
              href="/test-thumbnails"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              → Thumbnail Test
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}