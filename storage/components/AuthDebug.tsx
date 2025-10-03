'use client'

import { useSimpleAuth } from '@/lib/simple-auth-context'
import { useEffect, useState } from 'react'

export default function AuthDebug() {
  const { user, firebaseUser, loading, roles, permissions, isAdmin } = useSimpleAuth()
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    const loadDebugInfo = async () => {
      try {
        const { enhancedAuthService } = await import('@/lib/enhanced-auth-service')
        const { collection, query, where, getDocs } = await import('firebase/firestore')
        const { db } = await import('@/lib/firebase')

        if (firebaseUser) {
          // Check user roles directly from database
          const rolesQuery = query(
            collection(db, 'userRoles'),
            where('userId', '==', firebaseUser.uid),
            where('isActive', '==', true)
          )
          const rolesSnapshot = await getDocs(rolesQuery)
          const dbRoles = rolesSnapshot.docs.map(doc => doc.data())

          // Check admin config
          const adminConfigQuery = query(collection(db, 'adminConfig'))
          const adminSnapshot = await getDocs(adminConfigQuery)
          const adminConfig = adminSnapshot.docs.map(doc => doc.data())

          setDebugInfo({
            firebaseUID: firebaseUser.uid,
            firebaseEmail: firebaseUser.email,
            enhancedUser: user,
            rolesFromContext: roles,
            rolesFromDB: dbRoles,
            permissions: permissions,
            isAdmin: isAdmin(),
            adminConfig: adminConfig
          })
        }
      } catch (error) {
        console.error('Debug info error:', error)
        setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    if (!loading) {
      loadDebugInfo()
    }
  }, [user, firebaseUser, loading, roles, permissions, isAdmin])

  if (loading) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-bold text-blue-800">🔄 Authentication Loading...</h3>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <h3 className="font-bold text-gray-800 mb-4">🐛 Authentication Debug Info</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-gray-700">Firebase User:</h4>
          <pre className="text-xs bg-white p-2 rounded border overflow-auto">
            {firebaseUser ? JSON.stringify({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              emailVerified: firebaseUser.emailVerified
            }, null, 2) : 'Not logged in'}
          </pre>
        </div>

        <div>
          <h4 className="font-semibold text-gray-700">Enhanced User:</h4>
          <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32">
            {user ? JSON.stringify({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              accountStatus: user.accountStatus
            }, null, 2) : 'No enhanced user data'}
          </pre>
        </div>

        <div>
          <h4 className="font-semibold text-gray-700">Roles & Permissions:</h4>
          <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32">
            {JSON.stringify({
              roles: roles.length,
              permissions: permissions.length,
              isAdmin: isAdmin()
            }, null, 2)}
          </pre>
        </div>

        {debugInfo && (
          <div>
            <h4 className="font-semibold text-gray-700">Database Check:</h4>
            <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-64">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <h4 className="font-semibold text-yellow-800">Expected Super Admin UID:</h4>
          <code className="text-sm">O6aFgoNhDigSIXk6zdYSDrFWhWG2</code>
          <p className="text-sm text-yellow-700 mt-2">
            {firebaseUser?.uid === 'O6aFgoNhDigSIXk6zdYSDrFWhWG2' 
              ? '✅ Logged in with correct UID' 
              : '❌ Different UID - check if you\'re logged in with the right account'}
          </p>
        </div>
      </div>
    </div>
  )
}