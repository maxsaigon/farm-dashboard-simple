'use client'

import React, { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

export type BottomSheetDetent = 'full' | 'large' | 'medium' | 'small'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  initialDetent?: BottomSheetDetent
  detents?: BottomSheetDetent[]
  header?: React.ReactNode
  children: React.ReactNode
  className?: string
  backdropClassName?: string
  snapPoints?: Partial<Record<BottomSheetDetent, number>> // in vh (0..100)
}

// Default snap point percentages similar to iOS
const DEFAULT_SNAP_POINTS: Record<BottomSheetDetent, number> = {
  full: 96,      // nearly full height, leaving safe top
  large: 75,
  medium: 50,
  small: 25,
}

export function BottomSheet({
  isOpen,
  onClose,
  initialDetent = 'large',
  detents = ['full', 'large', 'medium', 'small'],
  header,
  children,
  className,
  backdropClassName,
  snapPoints,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number | null>(null)
  const lastY = useRef<number>(0)
  const [currentDetent, setCurrentDetent] = useState<BottomSheetDetent>(initialDetent)
  const [translateY, setTranslateY] = useState<number>(0)
  const [animating, setAnimating] = useState<boolean>(false)

  const points = { ...DEFAULT_SNAP_POINTS, ...(snapPoints || {}) }

  // Compute pixel positions from vh
  const vhToPx = (vh: number) => Math.round(window.innerHeight * (vh / 100))

  const targetTopFor = (detent: BottomSheetDetent) => {
    const vh = 100 - points[detent]
    return Math.max(vhToPx(vh) + safeAreaTop(), 0)
  }

  const safeAreaTop = () => {
    // Approximation for safe area; browsers without env var just return 0
    const env = getComputedStyle(document.documentElement).getPropertyValue('--sat')
    const parsed = parseInt(env || '0', 10)
    return isNaN(parsed) ? 0 : parsed
  }

  // Lock scroll when open
  useEffect(() => {
    if (!isOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // Reset to initial detent on open
  useEffect(() => {
    if (isOpen) {
      setCurrentDetent(initialDetent)
      setTranslateY(0)
    }
  }, [isOpen, initialDetent])

  // Gesture handlers
  const onPointerDown = (e: React.PointerEvent) => {
    // Only start when touching the sheet header/handle area
    const target = e.target as HTMLElement
    if (!sheetRef.current) return

    // allow dragging from header or handle area
    const sheetTop = sheetRef.current.querySelector('[data-role="sheet-handle"]')
    if (sheetTop && !sheetTop.contains(target)) return

    startY.current = e.clientY
    lastY.current = e.clientY
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (startY.current == null) return
    const dy = e.clientY - (startY.current || 0)
    lastY.current = e.clientY

    if (dy < 0) {
      // dragging upward -> reduce translateY to negative but clamp small
      setTranslateY(Math.max(dy, -40))
    } else {
      // dragging downward -> move sheet
      setTranslateY(dy)
    }
  }

  const onPointerUp = (_e: React.PointerEvent) => {
    if (startY.current == null) return
    const dy = (lastY.current || 0) - (startY.current || 0)
    startY.current = null

    // thresholds
    const closeThreshold = 120
    const snapThreshold = 60

    if (dy > closeThreshold) {
      // drag down far -> either snap to next lower detent or close if already at smallest
      const currentIdx = detents.indexOf(currentDetent)
      if (currentIdx === detents.length - 1) {
        // already at smallest
        setAnimating(true)
        // animate out then close
        setTranslateY(window.innerHeight)
        setTimeout(() => {
          setAnimating(false)
          onClose()
          setTranslateY(0)
        }, 180)
      } else {
        const next = detents[currentIdx + 1]
        setCurrentDetent(next)
        setAnimating(true)
        setTimeout(() => setAnimating(false), 180)
        setTranslateY(0)
      }
      return
    }

    if (Math.abs(dy) > snapThreshold) {
      // snap to nearest detent based on direction
      const currentIdx = detents.indexOf(currentDetent)
      const nextIdx = dy > 0 ? Math.min(currentIdx + 1, detents.length - 1) : Math.max(currentIdx - 1, 0)
      setCurrentDetent(detents[nextIdx])
    }
    setAnimating(true)
    setTimeout(() => setAnimating(false), 180)
    setTranslateY(0)
  }

  if (!isOpen) return null

  const top = targetTopFor(currentDetent)

  return (
    <div className={clsx('fixed inset-0 z-50', 'flex flex-col')} aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className={clsx(
          'absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity',
          backdropClassName
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={clsx(
          'absolute left-0 right-0 rounded-t-2xl bg-white shadow-xl',
          'touch-none',
          className
        )}
        style={{
          top,
          transform: `translateY(${translateY}px)`,
          transition: animating ? 'transform 180ms ease, top 180ms ease' : undefined,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Handle + Header */}
        <div data-role="sheet-handle" className="pt-3 pb-2 px-4 sticky top-0 bg-white/80 backdrop-blur rounded-t-2xl">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-gray-300 mb-2" />
          {header}
        </div>
        <div className="px-4 pb-safe-bottom">
          {children}
        </div>
      </div>
    </div>
  )
}

export default BottomSheet
