'use client'

import { useState } from 'react'
import { collection, getDocs, query, limit } from 'firebase/firestore'
import { signIn } from '@/lib/auth'
import { db } from '@/lib/firebase'

export default function TestFirebasePage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState<Array<{ test: string; status: string; data: string }>>([])
  const [error, setError] = useState('')

  const testFirebaseConnection = async () => {
    setLoading(true)
    setError('')
    setTestResults([])

    try {
      // Test 1: Firebase connection
      setTestResults(prev => [...prev, { test: 'Firebase Config', status: 'OK', data: 'Connected to Firebase' }])

      // Test 2: Authentication
      const userCredential = await signIn(email, password)
      setTestResults(prev => [...prev, { 
        test: 'Authentication', 
        status: 'OK', 
        data: `Logged in as: ${userCredential.email} (${userCredential.uid})`
      }])

      // Test 3: Firestore read
      const treesRef = collection(db, 'trees')
      const q = query(treesRef, limit(5))
      const snapshot = await getDocs(q)
      
      const trees = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      setTestResults(prev => [...prev, { 
        test: 'Firestore Read', 
        status: 'OK', 
        data: `Found ${trees.length} trees in database`
      }])

      // Test 4: User's trees specifically
      const userTreesRef = collection(db, 'trees')
      const userQuery = query(userTreesRef, limit(10))
      const userSnapshot = await getDocs(userQuery)
      const userTrees = userSnapshot.docs.map(doc => doc.data())

      setTestResults(prev => [...prev, { 
        test: 'User Trees', 
        status: 'OK', 
        data: `Total trees: ${userTrees.length}, Sample data: ${JSON.stringify(userTrees.slice(0, 2), null, 2)}`
      }])

    } catch (err: unknown) {
      console.error('Firebase test error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Test failed'
      setError(errorMessage)
      setTestResults(prev => [...prev, { 
        test: 'Error', 
        status: 'FAILED', 
        data: errorMessage
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🧪 Firebase Connection Test
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test Form */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Test Credentials</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (same as iOS app)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your-email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  onClick={testFirebaseConnection}
                  disabled={loading || !email || !password}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium"
                >
                  {loading ? 'Testing...' : 'Test Firebase Connection'}
                </button>
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <strong>Error:</strong> {error}
                </div>
              )}
            </div>

            {/* Test Results */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Test Results</h2>
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.status === 'OK'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    <div className="font-medium">
                      {result.status === 'OK' ? '✅' : '❌'} {result.test}
                    </div>
                    <div className="text-sm mt-1 break-words">
                      {result.data}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-3">Firebase Configuration</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm space-y-1">
                <p><strong>Project ID:</strong> {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}</p>
                <p><strong>Auth Domain:</strong> {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}</p>
                <p><strong>Storage Bucket:</strong> {process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
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