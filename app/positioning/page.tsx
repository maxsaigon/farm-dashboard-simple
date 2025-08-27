'use client'

import React from 'react'
import MobileLayout from '@/components/MobileLayout'
import RealTimeTreePositioning from '@/components/RealTimeTreePositioning'

export default function PositioningPage() {
  return (
    <MobileLayout currentTab="positioning">
      <RealTimeTreePositioning />
    </MobileLayout>
  )
}