"use client"

import React from 'react'
import { usePathname } from 'next/navigation'
import BottomTabBar from './BottomTabBar'

export default function ConditionalBottomTabBar() {
  const pathname = usePathname() || ''

  // Hide the bottom tab bar on the map page for a cleaner map UX
  if (pathname.startsWith('/map')) return null

  return <BottomTabBar />
}
