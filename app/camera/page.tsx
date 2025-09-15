'use client'

import React from 'react'
import MobileCameraCapture from '@/components/MobileCameraCapture'
import AuthGuard from '@/components/AuthGuard'

export default function CameraPage() {
  return (
    <AuthGuard requiredPermission="read" requireFarmAccess={true}>
      <MobileCameraCapture />
    </AuthGuard>
  )
}