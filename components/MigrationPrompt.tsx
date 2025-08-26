'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/enhanced-auth-context'
import { MigrationService } from '@/lib/migration-service'
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export function MigrationPrompt() {
  const { user } = useAuth()
  const [migrationStatus, setMigrationStatus] = useState<{
    hasLegacyData: boolean
    hasNewData: boolean
    migrationNeeded: boolean
    defaultFarmExists: boolean
  } | null>(null)
  const [migrating, setMigrating] = useState(false)
  const [migrationComplete, setMigrationComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!user) return

    // Check if user has already dismissed migration prompt
    const dismissKey = `migration_dismissed_${user.uid}`
    if (localStorage.getItem(dismissKey)) {
      setDismissed(true)
      return
    }

    // Check migration status
    MigrationService.getMigrationStatus(user.uid)
      .then(status => {
        setMigrationStatus(status)
        
        // Auto-dismiss if no migration needed
        if (!status.migrationNeeded) {
          setDismissed(true)
        }
      })
      .catch(err => {
        console.error('Error checking migration status:', err)
        setDismissed(true)
      })
  }, [user])

  const handleMigrate = async () => {
    if (!user || !migrationStatus?.migrationNeeded) return

    setMigrating(true)
    setError(null)

    try {
      const userData = {
        uid: user.uid,
        email: user.email || undefined,
        displayName: user.displayName || undefined,
        createdAt: new Date()
      }

      await MigrationService.migrateLegacyData(user.uid, userData)
      
      setMigrationComplete(true)
      setMigrating(false)
      
      // Auto-dismiss after successful migration
      setTimeout(() => {
        handleDismiss()
      }, 3000)
      
    } catch (err) {
      console.error('Migration failed:', err)
      setError((err as Error).message || 'Migration failed. Please try again.')
      setMigrating(false)
    }
  }

  const handleDismiss = () => {
    if (user) {
      const dismissKey = `migration_dismissed_${user.uid}`
      localStorage.setItem(dismissKey, 'true')
    }
    setDismissed(true)
  }

  const handleSkip = () => {
    // Show warning that they can migrate later
    if (confirm('You can migrate your data later from the settings. Are you sure you want to skip?')) {
      handleDismiss()
    }
  }

  // Don't show if dismissed or no migration needed
  if (dismissed || !migrationStatus?.migrationNeeded || migrationComplete) {
    return null
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {migrationComplete ? (
            <CheckCircleIcon className="h-6 w-6 text-green-400" />
          ) : (
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
          )}
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className="text-lg font-medium text-yellow-800">
            {migrationComplete ? 'Migration Complete!' : 'Data Migration Available'}
          </h3>
          
          <div className="mt-2 text-sm text-yellow-700">
            {migrationComplete ? (
              <div>
                <p className="text-green-700">
                  ✅ Your data has been successfully migrated to the new farm-based system. 
                  You can now access your trees and photos alongside your iOS app data.
                </p>
                <p className="mt-2 text-xs text-gray-600">
                  This message will disappear automatically...
                </p>
              </div>
            ) : (
              <div>
                <p>
                  We&apos;ve detected existing data from the previous version of the web app. 
                  To ensure compatibility with your iOS app, we can migrate this data to the new farm-based system.
                </p>
                
                <div className="mt-3 space-y-2">
                  <p className="font-medium">What will be migrated:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Your existing trees and their data</li>
                    <li>Photo records and metadata</li>
                    <li>A default farm will be created for your data</li>
                  </ul>
                </div>
                
                <div className="mt-3 p-3 bg-yellow-100 rounded">
                  <p className="text-xs">
                    <strong>Note:</strong> This will make your web data compatible with the iOS app. 
                    Your original data will be preserved during migration.
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded">
              <p className="text-sm text-red-700">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          {!migrationComplete && (
            <div className="mt-4 flex space-x-3">
              <button
                onClick={handleMigrate}
                disabled={migrating}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {migrating ? 'Migrating...' : 'Migrate Data'}
              </button>
              
              <button
                onClick={handleSkip}
                disabled={migrating}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Skip for Now
              </button>
              
              <button
                onClick={handleDismiss}
                disabled={migrating}
                className="text-yellow-700 hover:text-yellow-800 px-2 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}