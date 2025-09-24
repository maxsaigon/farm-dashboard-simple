'use client'

import AuthGuard from '@/components/AuthGuard'
import SimplifiedZoneManagement from '@/components/SimplifiedZoneManagement'

export default function ZonesPage() {
  return (
    <AuthGuard>
      <SimplifiedZoneManagement />
    </AuthGuard>
  )
}