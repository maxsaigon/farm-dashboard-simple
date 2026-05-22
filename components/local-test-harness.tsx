'use client'

import React, { useState } from 'react'
import { useSimpleAuth, FarmRole } from '@/lib/optimized-auth-context'
import { generateMockZone, generateMockInvestment } from '@/lib/mock-data-generator'
import { db } from '@/lib/firebase'
import { doc, setDoc, deleteDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'

export default function LocalTestHarness() {
  const { user, currentFarm, getUserRole, refreshUserData } = useSimpleAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Only render during development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString()
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 19)])
  }

  const currentRole = currentFarm ? getUserRole(currentFarm.id) : null

  // Change user role
  const handleRoleChange = async (newRole: FarmRole) => {
    if (!user || !currentFarm) {
      log('Error: User or farm not active.')
      return
    }

    setLoading(true)
    try {
      log(`Attempting to switch role to: ${newRole}`)
      const q = query(
        collection(db, 'farmAccess'), 
        where('userId', '==', user.uid), 
        where('farmId', '==', currentFarm.id)
      )
      const snap = await getDocs(q)
      
      if (!snap.empty) {
        // Update existing access
        const docRef = doc(db, 'farmAccess', snap.docs[0].id)
        await updateDoc(docRef, { role: newRole })
        log(`Successfully updated role to ${newRole} in Firestore!`)
      } else {
        // Create new access
        const newAccessRef = doc(collection(db, 'farmAccess'))
        await setDoc(newAccessRef, {
          id: newAccessRef.id,
          userId: user.uid,
          farmId: currentFarm.id,
          role: newRole,
          isActive: true,
          grantedAt: new Date(),
          grantedBy: 'mock-test-harness'
        })
        log(`Created new role assignment for ${newRole} in Firestore!`)
      }
      
      // Refresh Auth Context
      await refreshUserData()
      log('Auth data refreshed.')
    } catch (error) {
      log(`Error changing role: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  // Seed Mock Zones
  const seedMockZones = async () => {
    if (!currentFarm) {
      log('Error: Choose a farm first.')
      return
    }

    setLoading(true)
    try {
      log('Generating 3 mock zones...')
      for (let i = 0; i < 3; i++) {
        // Generate with slightly shifted coordinates so they are distinct
        const latOffset = (i - 1) * 0.001
        const lngOffset = (i - 1) * 0.001
        
        const baseZone = generateMockZone(currentFarm.id)
        const shiftedBoundary = baseZone.boundaries?.map(pt => ({
          latitude: pt.latitude + latOffset,
          longitude: pt.longitude + lngOffset
        })) || []

        const zone = {
          ...baseZone,
          name: `Mock Zone ${i + 1}`,
          code: `MOCK-Z${i + 1}`,
          boundaries: shiftedBoundary,
          boundary: shiftedBoundary
        }

        // Dual-write:
        // 1. Subcollection path `/farms/{farmId}/zones/{zoneId}`
        await setDoc(doc(db, 'farms', currentFarm.id, 'zones', zone.id), {
          ...zone,
          updatedAt: new Date(),
          createdAt: new Date()
        })

        // 2. Legacy global path `/zones/{zoneId}`
        await setDoc(doc(db, 'zones', zone.id), {
          ...zone,
          updatedAt: new Date(),
          createdAt: new Date()
        })
        
        log(`Seeded: ${zone.name}`)
      }
      log('Successfully seeded 3 zones in both collections!')
    } catch (error) {
      log(`Error seeding zones: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  // Seed Mock Investments
  const seedMockInvestments = async () => {
    if (!currentFarm || !user) {
      log('Error: Choose a farm and login first.')
      return
    }

    setLoading(true)
    try {
      log('Generating 5 mock investments...')
      const categories = ['Phân bón', 'Hệ thống tưới', 'Công lao động', 'Giống cây', 'Thuốc bảo vệ thực vật']
      for (let i = 0; i < 5; i++) {
        const investment = generateMockInvestment(currentFarm.id, user.uid, {
          category: categories[i % categories.length],
          amount: (i + 1) * 1500000,
          date: new Date(Date.now() - i * 5 * 24 * 60 * 60 * 1000) // spread dates
        })

        // Write to subcollection path `/farms/{farmId}/investments/{invId}`
        await setDoc(doc(db, 'farms', currentFarm.id, 'investments', investment.id), {
          ...investment,
          createdAt: new Date(),
          updatedAt: new Date()
        })

        log(`Seeded investment: ${investment.category} - ${investment.amount.toLocaleString()} VND`)
      }
      log('Successfully seeded 5 investments!')
    } catch (error) {
      log(`Error seeding investments: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  // Clear seeded mock data
  const clearMockData = async () => {
    if (!currentFarm) {
      log('Error: Choose a farm first.')
      return
    }

    setLoading(true)
    try {
      log('Clearing mock zones and investments for this farm...')
      
      // Delete zones
      const farmZonesSnapshot = await getDocs(collection(db, 'farms', currentFarm.id, 'zones'))
      for (const d of farmZonesSnapshot.docs) {
        if (d.data().name?.startsWith('Mock Zone')) {
          await deleteDoc(doc(db, 'farms', currentFarm.id, 'zones', d.id))
          await deleteDoc(doc(db, 'zones', d.id))
          log(`Deleted zone: ${d.data().name}`)
        }
      }

      // Delete investments
      const investmentsSnapshot = await getDocs(collection(db, 'farms', currentFarm.id, 'investments'))
      for (const d of investmentsSnapshot.docs) {
        // Since we created investments with category and timestamp/ids, we check if they are generated by this mock tool
        if (d.id.startsWith('mock-inv-')) {
          await deleteDoc(doc(db, 'farms', currentFarm.id, 'investments', d.id))
          log(`Deleted investment: ${d.id}`)
        }
      }

      log('Mock data cleanup completed.')
    } catch (error) {
      log(`Error cleaning mock data: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-purple-600 hover:bg-purple-700 text-white font-bold p-3 rounded-full shadow-2xl transition-all hover:scale-105 flex items-center space-x-2 text-sm"
      >
        <span>🛠️</span>
        <span>Dev Tools</span>
      </button>

      {/* Floating Panel */}
      {isOpen && (
        <div className="absolute right-0 bottom-14 w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 overflow-hidden flex flex-col max-h-[500px]">
          <div className="flex items-center justify-between border-b pb-2 mb-3">
            <h3 className="font-bold text-gray-800 text-base">🛠️ Local Test Harness</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 font-bold"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Status Information */}
            <div className="bg-gray-50 rounded-lg p-2.5 text-xs space-y-1 text-gray-700 border border-gray-100">
              <div><strong>User:</strong> {user?.email || 'Not logged in'}</div>
              <div><strong>Farm:</strong> {currentFarm?.name || 'No farm selected'}</div>
              <div>
                <strong>Active Role:</strong>{' '}
                <span className="font-mono bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-[10px]">
                  {currentRole || 'none'}
                </span>
              </div>
            </div>

            {/* Role Switcher */}
            {user && currentFarm && (
              <div>
                <h4 className="font-semibold text-xs text-gray-500 mb-2 uppercase tracking-wider">Switch Active Role</h4>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['owner', 'manager', 'viewer'] as FarmRole[]).map(role => (
                    <button
                      key={role}
                      disabled={loading || currentRole === role}
                      onClick={() => handleRoleChange(role)}
                      className={`text-xs py-1.5 rounded-lg border font-medium transition-all ${
                        currentRole === role
                          ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                          : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                      }`}
                    >
                      {role.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mock Data seeding */}
            {currentFarm && (
              <div>
                <h4 className="font-semibold text-xs text-gray-500 mb-2 uppercase tracking-wider">Seed Mock Data</h4>
                <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                  <button
                    disabled={loading}
                    onClick={seedMockZones}
                    className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs py-1.5 rounded-lg font-medium transition-all"
                  >
                    🌱 Seed 3 Zones
                  </button>
                  <button
                    disabled={loading}
                    onClick={seedMockInvestments}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs py-1.5 rounded-lg font-medium transition-all"
                  >
                    💰 Seed 5 Investments
                  </button>
                </div>
                <button
                  disabled={loading}
                  onClick={clearMockData}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs py-1.5 rounded-lg font-medium transition-all"
                >
                  🗑️ Clear Seeded Mock Data
                </button>
              </div>
            )}

            {/* Log Panel */}
            <div>
              <h4 className="font-semibold text-xs text-gray-500 mb-1 uppercase tracking-wider">Activity Log</h4>
              <div className="bg-black text-green-400 p-2.5 rounded-lg font-mono text-[10px] h-32 overflow-y-auto space-y-1">
                {logs.length === 0 ? (
                  <div className="text-gray-500">No events logged yet.</div>
                ) : (
                  logs.map((lg, i) => <div key={i}>{lg}</div>)
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
