'use client'

import { useSimpleAuth } from '@/lib/simple-auth-context'
import { ShieldCheckIcon, CogIcon } from '@heroicons/react/24/outline'

export function AdminBanner() {
  const { user, isAdmin, currentFarm } = useSimpleAuth()

  if (!isAdmin || !user) return null

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-lg mb-6">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <ShieldCheckIcon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Admin Mode</h3>
          <p className="text-sm opacity-90">
            Full access to all farms and management features
          </p>
          {currentFarm && (
            <p className="text-xs opacity-75 mt-1">
              Current Farm: {currentFarm.name}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 text-xs bg-white/20 px-3 py-1 rounded-full">
          <CogIcon className="h-4 w-4" />
          <span>Testing Mode</span>
        </div>
      </div>
    </div>
  )
}