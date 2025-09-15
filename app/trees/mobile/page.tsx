'use client'

import React from 'react'
import MobileTreeList from '@/components/MobileTreeList'
import AuthGuard from '@/components/AuthGuard'

export default function MobileTreesPage() {
  return (
    <AuthGuard requiredPermission="read" requireFarmAccess={true}>
      <MobileTreeList />
    </AuthGuard>
  )
}