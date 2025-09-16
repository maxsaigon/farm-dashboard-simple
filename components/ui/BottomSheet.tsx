'use client'

import React, { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { motion } from 'framer-motion'

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
  full: 96,
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

  const points = { ...DEFAULT_SNAP_POINTS, ...(snapPoints || {}) }

  const vhToPx = (vh: number) => Math.round(window.innerHeight * (vh / 100))

  const targetTopFor = (detent: BottomSheetDetent) => {
    const vh = 100 - points[detent]
    return Math.max(vhToPx(vh) + safeAreaTop(), 0)
  }

  const safeAreaTop = () => {
    const env = getComputedStyle(document.documentElement).getPropertyValue('--sat')
    const parsed = parseInt(env || '0', 10)
    return isNaN(parsed) ? 0 : parsed
  }

  useEffect(() => {
    if (!isOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [isOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      setCurrentDetent(initialDetent)
      setTranslateY(0)
    }
  }, [isOpen, initialDetent])

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    if (!sheetRef.current) return
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
      setTranslateY(Math.max(dy, -40))
    } else {
      setTranslateY(dy)
    }
  }

  const onPointerUp = (_e: React.PointerEvent) => {
    if (startY.current == null) return
    const dy = (lastY.current || 0) - (startY.current || 0)
    startY.current = null

    const closeThreshold = 120
    const snapThreshold = 60

    if (dy > closeThreshold) {
      const currentIdx = detents.indexOf(currentDetent)
      if (currentIdx === detents.length - 1) {
        // animate out then close
        setTranslateY(window.innerHeight)
        setTimeout(() => {
          onClose()
          setTranslateY(0)
        }, 180)
      } else {
        const next = detents[currentIdx + 1]
        setCurrentDetent(next)
        setTranslateY(0)
      }
      return
    }

    if (Math.abs(dy) > snapThreshold) {
      const currentIdx = detents.indexOf(currentDetent)
      const nextIdx = dy > 0 ? Math.min(currentIdx + 1, detents.length - 1) : Math.max(currentIdx - 1, 0)
      setCurrentDetent(detents[nextIdx])
    }
    setTranslateY(0)
  }

  if (!isOpen) return null

  const top = targetTopFor(currentDetent)

  return (
    // Ensure BottomSheet sits above map layers (Leaflet uses high z-index on overlays)
    <div className={clsx('fixed inset-0 z-[99999]', 'flex flex-col')} aria-modal="true" role="dialog">
      {/* Backdrop */}
      <motion.div
        className={clsx('absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity pointer-events-auto', backdropClassName)}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Sheet */}
      <motion.div
        ref={sheetRef}
  className={clsx('absolute left-0 right-0 rounded-t-2xl bg-white shadow-xl', 'touch-none', className)}
  style={{ zIndex: 100000, top, transform: `translateY(${translateY}px)` }}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 380, damping: 30 } }}
        exit={{ y: 40, opacity: 0, transition: { duration: 0.2 } }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div data-role="sheet-handle" className="pt-3 pb-2 px-4 sticky top-0 ios-blur rounded-t-2xl">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-gray-300 mb-2" />
          {header}
        </div>
        <div className="px-4 pb-safe-bottom">
          {children}
        </div>
      </motion.div>
    </div>
  )
}

export default BottomSheet
