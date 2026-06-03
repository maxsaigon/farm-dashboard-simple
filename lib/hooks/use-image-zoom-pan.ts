'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface ZoomPanOptions {
  resetDependency?: any
  onSwipeDown?: () => void
}

export function useImageZoomPan(options: ZoomPanOptions = {}) {
  const { resetDependency, onSwipeDown } = options

  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  // Refs for tracking mouse/touch interactions
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const isTouchDragging = useRef(false)
  const touchDragStart = useRef({ x: 0, y: 0 })
  const initialTouchDistance = useRef<number | null>(null)
  const initialScale = useRef<number>(1)
  const touchStartY = useRef<number | null>(null)
  const touchStartX = useRef<number | null>(null)
  const lastTap = useRef<number>(0)

  // Reset zoom when dependency changes
  useEffect(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [resetDependency])

  // Calculate boundary clamping for image panning
  const clampPosition = useCallback((newX: number, newY: number, currentScale: number) => {
    if (currentScale <= 1) return { x: 0, y: 0 }
    
    // Use window dimension heuristics for standard clamping boundaries
    const maxOffsetX = (window.innerWidth * (currentScale - 1)) / 2
    const maxOffsetY = (window.innerHeight * (currentScale - 1)) / 2
    
    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, newX)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, newY))
    }
  }, [])

  // Desktop Mouse Handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return
    isDragging.current = true
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y }
  }, [scale, position])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || scale <= 1) return
    const newX = e.clientX - dragStart.current.x
    const newY = e.clientY - dragStart.current.y
    setPosition(clampPosition(newX, newY, scale))
  }, [scale, clampPosition])

  const handleMouseUpOrLeave = useCallback(() => {
    isDragging.current = false
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const zoomFactor = 0.15
    const newScale = e.deltaY < 0 ? scale + zoomFactor : scale - zoomFactor
    const clampedScale = Math.max(1, Math.min(4, newScale))
    setScale(clampedScale)
    if (clampedScale === 1) {
      setPosition({ x: 0, y: 0 })
    }
  }, [scale])

  // Handle double-tap/double-click zoom
  const handleDoubleTap = useCallback((clientX: number, clientY: number) => {
    if (scale > 1) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    } else {
      setScale(2.5)
      setPosition({ x: 0, y: 0 })
    }
  }, [scale])

  const handleImageClick = useCallback((e: React.MouseEvent) => {
    if (e.detail === 2) {
      handleDoubleTap(e.clientX, e.clientY)
    }
  }, [handleDoubleTap])

  // Mobile Touch Handlers
  const getTouchDistance = useCallback((e: React.TouchEvent) => {
    const t1 = e.touches[0]
    const t2 = e.touches[1]
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = getTouchDistance(e)
      initialTouchDistance.current = dist
      initialScale.current = scale
      isTouchDragging.current = false
    } else if (e.touches.length === 1) {
      const touch = e.touches[0]
      touchStartY.current = touch.clientY
      touchStartX.current = touch.clientX
      
      const now = Date.now()
      const DOUBLE_TAP_DELAY = 300
      if (now - lastTap.current < DOUBLE_TAP_DELAY) {
        handleDoubleTap(touch.clientX, touch.clientY)
        lastTap.current = 0 // Reset
        return
      }
      lastTap.current = now

      if (scale > 1) {
        isTouchDragging.current = true
        touchDragStart.current = {
          x: touch.clientX - position.x,
          y: touch.clientY - position.y
        }
      }
    }
  }, [scale, position, getTouchDistance, handleDoubleTap])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialTouchDistance.current !== null) {
      const dist = getTouchDistance(e)
      const factor = dist / initialTouchDistance.current
      const newScale = initialScale.current * factor
      const clampedScale = Math.max(1, Math.min(4, newScale))
      setScale(clampedScale)
      if (clampedScale === 1) {
        setPosition({ x: 0, y: 0 })
      }
    } else if (e.touches.length === 1 && isTouchDragging.current && scale > 1) {
      const touch = e.touches[0]
      const newX = touch.clientX - touchDragStart.current.x
      const newY = touch.clientY - touchDragStart.current.y
      setPosition(clampPosition(newX, newY, scale))
      
      if (e.cancelable) {
        e.preventDefault()
      }
    }
  }, [scale, clampPosition, getTouchDistance])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    initialTouchDistance.current = null
    isTouchDragging.current = false
    
    // Swipe down to close (only when not zoomed in)
    if (scale === 1 && touchStartY.current !== null && onSwipeDown) {
      const touch = e.changedTouches[0]
      const diffY = touch.clientY - touchStartY.current
      const diffX = touch.clientX - touchStartX.current!
      
      if (diffY > 75 && Math.abs(diffY) > Math.abs(diffX)) {
        onSwipeDown()
      }
    }
    
    touchStartY.current = null
    touchStartX.current = null
  }, [scale, onSwipeDown])

  return {
    scale,
    position,
    isDragging: isDragging.current,
    isTouchDragging: isTouchDragging.current,
    handleMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
    handleWheel,
    handleImageClick,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  }
}
