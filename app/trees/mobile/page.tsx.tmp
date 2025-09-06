'use client'

import React from 'react'
import MobileTreeList from '@/components/MobileTreeList'
import AuthGuard from '@/components/AuthGuard'

export default function MobileTreesPage() {
  return (
    <AuthGuard requiredPermission="farm:view" requireFarmAccess={true}>
      <MobileTreeList />
    </AuthGuard>
  )
}