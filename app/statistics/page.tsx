'use client'

import AuthGuard from '@/components/AuthGuard'
import StatisticsDashboard from '@/components/statistics/StatisticsDashboard'

export default function StatisticsPage() {
  return (
    <AuthGuard requiredPermission="read" requireFarmAccess={true}>
      <StatisticsDashboard />
    </AuthGuard>
  )
}
