'use client'

import { useEffect, useRef, useCallback } from 'react'

/**
 * Custom React Hook to prevent screen sleep/dimming using the Screen Wake Lock API.
 * This is crucial for GPS tracking while the user is active in the field.
 */
export function useWakeLock(enabled: boolean = false) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wakeLockRef = useRef<any>(null)

  const requestWakeLock = useCallback(async () => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) {
      console.warn('⚠️ [WakeLock] Screen Wake Lock API is not supported on this browser.')
      return
    }

    try {
      if (wakeLockRef.current) {
        return // Already active
      }
      
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
      console.log('✅ [WakeLock] Screen Wake Lock acquired successfully.')
      
      wakeLockRef.current.addEventListener('release', () => {
        console.log('🔒 [WakeLock] Screen Wake Lock was released.')
        wakeLockRef.current = null
      })
    } catch (err) {
      console.error('❌ [WakeLock] Failed to request Screen Wake Lock:', err)
    }
  }, [])

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release()
        console.log('🔓 [WakeLock] Screen Wake Lock released manually.')
        wakeLockRef.current = null
      } catch (err) {
        console.error('❌ [WakeLock] Failed to release Screen Wake Lock:', err)
      }
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      requestWakeLock()

      // Browser automatically releases wake lock on tab switch / sleep.
      // Re-request when app returns to foreground.
      const handleVisibilityChange = async () => {
        if (document.visibilityState === 'visible') {
          console.log('👀 [WakeLock] Page became visible, re-requesting Wake Lock...')
          await requestWakeLock()
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        releaseWakeLock()
      }
    } else {
      releaseWakeLock()
    }
  }, [enabled, requestWakeLock, releaseWakeLock])

  return { requestWakeLock, releaseWakeLock }
}
