'use client'

import { useState } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc 
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function DebugFarmAssignmentPage() {
  const { user, farms, farmAccess, refreshUserData } = useSimpleAuth()
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runDiagnostic = async () => {
    if (!user) return

    setLoading(true)
    try {
      console.log('🔍 Running farm assignment diagnostic...')
      
      const result = {
        userId: user.uid,
        userEmail: user.email,
        issues: [] as string[],
        recommendations: [] as string[],
        currentContext: {
          farmAccessCount: farmAccess.length,
          farmsCount: farms.length,
          activeFarmAccess: farmAccess.filter(a => a.isActive),
          farmRoles: farmAccess.map(a => a.role)
        },
        databaseCheck: {
          rolesInDB: [] as any[],
          farmsInDB: [] as any[]
        }
      }

      // Check roles in database
      const rolesQuery = query(collection(db, 'userRoles'), where('userId', '==', user.uid))
      const rolesSnapshot = await getDocs(rolesQuery)
      
      result.databaseCheck.rolesInDB = rolesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        grantedAt: doc.data().grantedAt?.toDate()
      }))

      // Check farm roles specifically
      const farmRolesInDB = result.databaseCheck.rolesInDB.filter(role => role.scopeType === 'farm')
      const activeRolesInDB = farmRolesInDB.filter(role => role.isActive === true)

      console.log('📊 Database roles:', result.databaseCheck.rolesInDB.length)
      console.log('🏭 Farm roles in DB:', farmRolesInDB.length)
      console.log('✅ Active farm roles in DB:', activeRolesInDB.length)

      // Check each farm exists
      for (const role of activeRolesInDB) {
        try {
          const farmDoc = await getDoc(doc(db, 'farms', role.scopeId))
          if (farmDoc.exists()) {
            const farmData = farmDoc.data()
            result.databaseCheck.farmsInDB.push({
              id: role.scopeId,
              ...farmData,
              roleType: role.roleType,
              grantedAt: role.grantedAt
            })
          } else {
            result.issues.push(`Farm ${role.scopeId} referenced in role but doesn't exist`)
          }
        } catch (error) {
          result.issues.push(`Error loading farm ${role.scopeId}: ${error}`)
        }
      }

      // Analyze issues
      if (farmRolesInDB.length === 0) {
        result.issues.push('No farm roles found in database')
        result.recommendations.push('Use the Farm Assignment System to assign this user to a farm')
      } else if (activeRolesInDB.length === 0) {
        result.issues.push('User has farm roles but none are active')
        result.recommendations.push('Activate the farm roles using the Fix button below')
      } else if (result.databaseCheck.farmsInDB.length === 0) {
        result.issues.push('User has active roles but referenced farms don\'t exist')
        result.recommendations.push('Check that farm documents exist in the farms collection')
      } else if (result.currentContext.farmsCount === 0) {
        result.issues.push('User has valid farm access but auth context is not loading farms')
        result.recommendations.push('Try refreshing user data or reloading the page')
      } else {
        result.recommendations.push('✅ User should have farm access!')
      }

      setDiagnosticResult(result)

    } catch (error) {
      console.error('Diagnostic error:', error)
      setDiagnosticResult({
        userId: user.uid,
        userEmail: user.email,
        issues: [`Diagnostic failed: ${error}`],
        recommendations: ['Try refreshing the page and running the diagnostic again']
      })
    } finally {
      setLoading(false)
    }
  }

  const fixCommonIssues = async () => {
    if (!user || !diagnosticResult) return

    setLoading(true)
    try {
      console.log('🔧 Attempting to fix common issues...')

      // Fix 1: Activate inactive farm roles
      const rolesQuery = query(collection(db, 'userRoles'), where('userId', '==', user.uid))
      const rolesSnapshot = await getDocs(rolesQuery)
      
      let fixedRoles = 0
      for (const roleDoc of rolesSnapshot.docs) {
        const roleData = roleDoc.data()
        if (roleData.scopeType === 'farm' && roleData.isActive !== true) {
          await updateDoc(doc(db, 'userRoles', roleDoc.id), {
            isActive: true,
            updatedAt: new Date()
          })
          fixedRoles++
          console.log(`✅ Activated role: ${roleData.roleType} for farm ${roleData.scopeId}`)
        }
      }

      // Fix 2: Update user account if needed
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const updates: any = {}
        
        if (userData.accountStatus !== 'active') {
          updates.accountStatus = 'active'
        }
        if (!userData.isEmailVerified) {
          updates.isEmailVerified = true
        }
        
        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, 'users', user.uid), updates)
          console.log('✅ Updated user account status')
        }
      }

      console.log(`✅ Fixed ${fixedRoles} inactive roles`)
      
      // Refresh user data
      await refreshUserData()
      
      // Re-run diagnostic
      await runDiagnostic()
      
      alert(`Fixed ${fixedRoles} inactive roles. Please refresh the page to see changes.`)

    } catch (error) {
      console.error('Fix failed:', error)
      alert('Fix failed. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  const forceRefresh = async () => {
    setLoading(true)
    try {
      await refreshUserData()
      await runDiagnostic()
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Please log in</h2>
          <p className="text-gray-600">You need to be logged in to use the farm assignment debugger.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">🔍 Farm Assignment Debugger</h1>
          
          {/* Current Status */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Current Status</h3>
            <div className="text-sm text-blue-800">
              <p><strong>User:</strong> {user.email}</p>
              <p><strong>Farm Access:</strong> {farmAccess.length}</p>
              <p><strong>Active Access:</strong> {farmAccess.filter(a => a.isActive).length}</p>
              <p><strong>Accessible Farms:</strong> {farms.length}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={runDiagnostic}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Running...' : 'Run Diagnostic'}
            </button>
            
            <button
              onClick={forceRefresh}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              Refresh Data
            </button>

            {diagnosticResult && diagnosticResult.issues.length > 0 && (
              <button
                onClick={fixCommonIssues}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                🔧 Fix Issues
              </button>
            )}
          </div>

          {/* Diagnostic Results */}
          {diagnosticResult && (
            <div className="space-y-6">
              {/* Issues */}
              {diagnosticResult.issues.length > 0 && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <h3 className="font-medium text-red-900 mb-2">❌ Issues Found</h3>
                  <ul className="text-sm text-red-800 space-y-1">
                    {diagnosticResult.issues.map((issue: string, index: number) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {diagnosticResult.recommendations.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-medium text-yellow-900 mb-2">💡 Recommendations</h3>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {diagnosticResult.recommendations.map((rec: string, index: number) => (
                      <li key={index}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Database Check */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">📊 Database Status</h3>
                <div className="text-sm text-gray-800 space-y-2">
                  <p><strong>Roles in Database:</strong> {diagnosticResult.databaseCheck.rolesInDB.length}</p>
                  <p><strong>Accessible Farms in Database:</strong> {diagnosticResult.databaseCheck.farmsInDB.length}</p>
                  
                  {diagnosticResult.databaseCheck.farmsInDB.length > 0 && (
                    <div>
                      <p className="font-medium mt-2">Farms with Access:</p>
                      <ul className="ml-4">
                        {diagnosticResult.databaseCheck.farmsInDB.map((farm: any, index: number) => (
                          <li key={index}>• {farm.name} ({farm.roleType})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Success */}
              {diagnosticResult.issues.length === 0 && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-2">✅ All Good!</h3>
                  <p className="text-sm text-green-800">
                    No issues found. User should have proper farm access.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">🔧 How to Use</h3>
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
              <li>Click "Run Diagnostic" to check for farm assignment issues</li>
              <li>If issues are found, click "Fix Issues" to automatically resolve common problems</li>
              <li>If the fix doesn't work, use the admin Farm Assignment System to manually assign the user</li>
              <li>Always refresh the page after making changes to see the updates</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}