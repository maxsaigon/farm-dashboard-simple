'use client'

import { useEffect, useRef, useCallback } from 'react'

interface GestureHandlers {
  onPinchStart?: (distance: number, center: { x: number, y: number }) => void
  onPinchMove?: (distance: number, center: { x: number, y: number }) => void
  onPinchEnd?: () => void
  onSwipe?: (direction: 'left' | 'right' | 'up' | 'down', distance: number) => void
  onLongPress?: (point: { x: number, y: number }) => void
  onDoubleTap?: (point: { x: number, y: number }) => void
  onTap?: (point: { x: number, y: number }) => void
}

interface UseMobileGesturesOptions {
  element?: HTMLElement | null
  enabled?: boolean
  longPressDelay?: number
  swipeThreshold?: number
  pinchThreshold?: number
}

export function useMobileGestures(
  handlers: GestureHandlers,
  options: UseMobileGesturesOptions = {}
) {
  const {
    element,
    enabled = true,
    longPressDelay = 500,
    swipeThreshold = 50,
    pinchThreshold = 10
  } = options

  const touchStartRef = useRef<{ x: number, y: number, time: number } | null>(null)
  const touchStart2Ref = useRef<{ x: number, y: number } | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastTapRef = useRef<number>(0)
  const isPinchingRef = useRef(false)
  const initialDistanceRef = useRef<number>(0)

  // Calculate distance between two touch points
  const getTouchDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  // Calculate center point between two touch points
  const getTouchCenter = useCallback((touch1: Touch, touch2: Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    }
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((e: Event) => {
    const touchEvent = e as TouchEvent
    if (!enabled) return

    const touches = touchEvent.touches

    if (touches.length === 1) {
      // Single touch
      const touch = touches[0]
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      }

      // Start long press timer
      longPressTimerRef.current = setTimeout(() => {
        if (touchStartRef.current) {
          handlers.onLongPress?.({
            x: touchStartRef.current.x,
            y: touchStartRef.current.y
          })
        }
      }, longPressDelay)

    } else if (touches.length === 2) {
      // Two finger touch (potential pinch)
      const touch1 = touches[0]
      const touch2 = touches[1]

      touchStartRef.current = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
        time: Date.now()
      }

      touchStart2Ref.current = {
        x: touch2.clientX,
        y: touch2.clientY
      }

      initialDistanceRef.current = getTouchDistance(touch1, touch2)
      isPinchingRef.current = false

      // Clear long press timer for multi-touch
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    }
  }, [enabled, longPressDelay, getTouchDistance, handlers])

  // Handle touch move
  const handleTouchMove = useCallback((e: Event) => {
    const touchEvent = e as TouchEvent
    if (!enabled) return

    const touches = touchEvent.touches

    if (touches.length === 1 && touchStartRef.current) {
      // Single touch move - potential swipe
      // Clear long press timer if moved
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    } else if (touches.length === 2 && touchStartRef.current && touchStart2Ref.current) {
      // Two finger move - pinch gesture
      const touch1 = touches[0]
      const touch2 = touches[1]
      const currentDistance = getTouchDistance(touch1, touch2)
      const center = getTouchCenter(touch1, touch2)

      const distanceDiff = Math.abs(currentDistance - initialDistanceRef.current)

      if (distanceDiff > pinchThreshold) {
        if (!isPinchingRef.current) {
          // Start pinch
          isPinchingRef.current = true
          handlers.onPinchStart?.(currentDistance, center)
        } else {
          // Continue pinch
          handlers.onPinchMove?.(currentDistance, center)
        }
      }
    }
  }, [enabled, pinchThreshold, getTouchDistance, getTouchCenter, handlers])

  // Handle touch end
  const handleTouchEnd = useCallback((e: Event) => {
    const touchEvent = e as TouchEvent
    if (!enabled) return

    const touches = touchEvent.changedTouches
    const now = Date.now()

    // Clear timers
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    // Handle pinch end
    if (isPinchingRef.current) {
      isPinchingRef.current = false
      handlers.onPinchEnd?.()
      return
    }

    // Handle single touch end
    if (touches.length === 1 && touchStartRef.current) {
      const touch = touches[0]
      const startX = touchStartRef.current.x
      const startY = touchStartRef.current.y
      const endX = touch.clientX
      const endY = touch.clientY

      const deltaX = endX - startX
      const deltaY = endY - startY
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      // Check for swipe
      if (distance > swipeThreshold) {
        let direction: 'left' | 'right' | 'up' | 'down'

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? 'right' : 'left'
        } else {
          direction = deltaY > 0 ? 'down' : 'up'
        }

        handlers.onSwipe?.(direction, distance)
      } else {
        // Check for double tap
        const timeSinceLastTap = now - lastTapRef.current
        if (timeSinceLastTap < 300) {
          handlers.onDoubleTap?.({ x: endX, y: endY })
          lastTapRef.current = 0
        } else {
          // Single tap
          handlers.onTap?.({ x: endX, y: endY })
          lastTapRef.current = now
        }
      }
    }

    // Reset touch refs
    touchStartRef.current = null
    touchStart2Ref.current = null
  }, [enabled, swipeThreshold, handlers])

  // Set up event listeners
  useEffect(() => {
    const targetElement = element || document

    if (enabled) {
      targetElement.addEventListener('touchstart', handleTouchStart, { passive: false })
      targetElement.addEventListener('touchmove', handleTouchMove, { passive: false })
      targetElement.addEventListener('touchend', handleTouchEnd, { passive: false })
    }

    return () => {
      targetElement.removeEventListener('touchstart', handleTouchStart)
      targetElement.removeEventListener('touchmove', handleTouchMove)
      targetElement.removeEventListener('touchend', handleTouchEnd)

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [element, enabled, handleTouchStart, handleTouchMove, handleTouchEnd])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])
}

// Haptic feedback utility
export const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: 50,
      medium: [50, 50, 50],
      heavy: [100, 50, 100]
    }
    navigator.vibrate(patterns[type])
  }
}

// Voice command recognition
export const useVoiceCommands = (commands: Record<string, () => void>) => {
  const recognitionRef = useRef<any>(null)
  const [isListening, setIsListening] = useState(false)

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()

    recognitionRef.current.lang = 'vi-VN'
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = false

    recognitionRef.current.onstart = () => setIsListening(true)
    recognitionRef.current.onend = () => setIsListening(false)

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase()

      // Match commands
      for (const [keyword, action] of Object.entries(commands)) {
        if (transcript.includes(keyword.toLowerCase())) {
          action()
          break
        }
      }
    }

    recognitionRef.current.start()
  }, [commands])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  return { isListening, startListening, stopListening }
}

// Import React for useState
import { useState } from 'react'