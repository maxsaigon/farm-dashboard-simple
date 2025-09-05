'use client'

import React, { useEffect, useState } from 'react'
import clsx from 'clsx'

interface LargeTitleHeaderProps {
  title: string
  subtitle?: string
  className?: string
}

/**
 * iOS-style large title that collapses to a compact header on scroll.
 * Drop this below your global Navigation. Works best on mobile.
 */
export default function LargeTitleHeader({ title, subtitle, className }: LargeTitleHeaderProps) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setCollapsed(window.scrollY > 12)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className={clsx('relative bg-transparent', className)}>
      {/* Compact title (sticks under top nav) */}
      <div
        className={clsx(
          'sticky z-30 -top-px', // keep under top nav; -top-px helps avoid 1px gaps
          'backdrop-blur bg-white/70 border-b border-transparent',
          'transition-all duration-200 ease-out',
          collapsed ? 'py-2 border-gray-200' : 'py-0 border-transparent',
        )}
        style={{ top: '64px' }}
        aria-hidden={!collapsed}
      >
        <div className="px-4">
          <h1 className={clsx('font-semibold text-gray-900 transition-all', collapsed ? 'text-xl' : 'text-transparent h-0 overflow-hidden')}>{title}</h1>
        </div>
      </div>

      {/* Large title section */}
      <div className={clsx('px-4 pt-4 pb-4 transition-all', collapsed ? 'pt-2 pb-2' : 'pt-6 pb-6')}
           aria-live="polite">
        <h1 className={clsx('text-gray-900 font-bold transition-transform origin-left', collapsed ? 'text-2xl' : 'text-3xl')}>{title}</h1>
        {subtitle && (
          <p className={clsx('text-gray-600 transition-opacity', collapsed ? 'opacity-90 mt-1' : 'opacity-100 mt-2')}>{subtitle}</p>
        )}
      </div>
    </div>
  )
}
