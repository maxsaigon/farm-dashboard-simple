'use client'

import AuthGuard from '@/components/AuthGuard'
import InvestmentManagement from '@/components/InvestmentManagement'

export default function MoneyPage() {
  return (
    <AuthGuard requiredPermission="read" requireFarmAccess={true}>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          
          <InvestmentManagement />
        </div>
      </div>
    </AuthGuard>
  )
}
