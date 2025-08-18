// TypeScript types matching iOS app Core Data entities
export interface Tree {
  id: string
  qrCode: string
  name?: string
  variety: string
  zoneCode: string
  plantingDate: Date
  healthStatus: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  needsAttention: boolean
  latitude?: number
  longitude?: number
  currentFruitCount: number
  estimatedYield: number
  lastInspectionDate?: Date
  notes?: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface Photo {
  id: string
  treeId: string
  imageUrl: string
  thumbnailUrl?: string
  timestamp: Date
  uploadStatus: 'pending' | 'uploaded' | 'failed'
  userId: string
}

export interface Farm {
  id: string
  name: string
  location?: string
  totalArea?: number
  userId: string
  createdAt: Date
}

export interface User {
  uid: string
  email?: string
  displayName?: string
  farmName?: string
  createdAt: Date
}

// Dashboard statistics
export interface DashboardStats {
  totalTrees: number
  healthyTrees: number
  treesNeedingAttention: number
  totalFruits: number
}