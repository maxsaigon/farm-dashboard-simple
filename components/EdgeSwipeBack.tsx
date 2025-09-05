'use client'

import { useEffect } from 'react'

/**
 * Adds iOS-like edge swipe back navigation on mobile.
 * Swiping right from the very left edge (>80px) with a small vertical delta will trigger history.back().
 */
export default function EdgeSwipeBack() {
  useEffect(() => {
    let startX = 0
    let startY = 0
    let tracking = false

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      // Only start if near left edge
      if (t.clientX <= 16) {
        startX = t.clientX
        startY = t.clientY
        tracking = true
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return
      // Avoid interfering with vertical scroll; if vertical movement dominates, cancel
      const t = e.touches[0]
      const dx = t.clientX - startX
      const dy = Math.abs(t.clientY - startY)
      if (dy > 30 && dy > Math.abs(dx)) {
        tracking = false
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return
      tracking = false
      const t = e.changedTouches[0]
      const dx = t.clientX - startX
      const dy = Math.abs(t.clientY - startY)
      if (dx > 80 && dy < 40) {
        // Trigger back navigation
        if (window.history.length > 1) {
          window.history.back()
        }
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', onTouchStart as any)
      window.removeEventListener('touchmove', onTouchMove as any)
      window.removeEventListener('touchend', onTouchEnd as any)
    }
  }, [])

  return null
}
