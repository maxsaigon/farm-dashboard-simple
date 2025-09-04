// Import custom field types
import type { TreeCustomFields } from './custom-field-types'

// TypeScript types matching iOS app Core Data entities
export interface Tree {
  id: string
  name?: string
  farmId: string
  latitude: number
  longitude: number
  gpsAccuracy?: number
  plantingDate?: Date
  variety?: string
  treeStatus?: 'Young Tree' | 'Mature' | 'Old'
  healthStatus?: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  notes?: string
  qrCode?: string
  zoneCode?: string
  zoneName?: string
  manualFruitCount: number
  lastCountDate?: Date
  treeHeight?: number
  trunkDiameter?: number
  healthNotes?: string
  fertilizedDate?: Date
  prunedDate?: Date
  diseaseNotes?: string
  needsSync?: boolean
  lastSyncDate?: Date
  aiFruitCount: number
  lastAIAnalysisDate?: Date
  aiAccuracy?: number
  needsAttention: boolean
  customFields?: TreeCustomFields
  createdAt?: Date
  updatedAt?: Date
  farmName?: string // Added by admin service for cross-farm displays
}

export interface Photo {
  id: string
  timestamp: Date
  localPath: string
  farmId: string
  filename?: string
  photoType?: 'general' | 'health' | 'fruit_count'
  userNotes?: string
  manualFruitCount?: number
  latitude?: number
  longitude?: number
  altitude?: number
  needsAIAnalysis?: boolean
  uploadedToServer?: boolean
  serverProcessed?: boolean
  uploadDate?: Date
  thumbnailPath?: string
  compressedPath?: string
  aiReadyPath?: string
  originalPath?: string
  localStorageDate?: Date
  totalLocalSize?: number
  treeId?: string
  farmName?: string // Added by admin service for cross-farm displays
}

export interface Farm {
  id: string
  name: string
  ownerName?: string
  totalArea?: number
  createdDate: Date
  centerLatitude?: number
  centerLongitude?: number
  boundaryCoordinates?: string
}

export interface User {
  uid: string
  email?: string
  displayName?: string
  createdAt: Date
}

// User-Farm association for access control
export interface UserFarmAccess {
  id: string
  userId: string
  farmId: string
  role: 'owner' | 'manager' | 'viewer'
  permissions: string[]
  createdAt: Date
  updatedAt: Date
}

// Manual entry data
export interface ManualEntry {
  id: string
  entryDate: Date
  farmId: string
  fruitCount: number
  healthRating: number
  notes?: string
  weather?: string
  entryType?: 'daily' | 'weekly' | 'monthly'
  treeId?: string
  farmName?: string // Added by admin service for cross-farm displays
}

// Investment tracking
export interface Investment {
  id: string
  amount: number
  category: string
  subcategory?: string
  date: Date
  notes?: string
  quantity?: number
  unit?: string
  pricePerUnit?: number
  treeCount?: number
  isRecurring?: boolean
  recurringPeriod?: string
  farmId: string
}

// Fertilizer calculations
export interface FertilizerCalculation {
  id: string
  fertilizerType: string
  amountPerTree: number
  unit: string
  treeStatus?: string
  season?: string
  createdDate: Date
  isActive: boolean
  farmId: string
}

// Farm zones for spatial management
export interface FarmZone {
  id: string
  name: string
  colorData: {
    red: number
    green: number
    blue: number
    alpha: number
  }
  boundary: Array<{
    latitude: number
    longitude: number
  }>
  treeCount: number
  notes: string
  farmId?: string
  updatedAt: number
  version: number
}

// Dashboard statistics
export interface DashboardStats {
  totalTrees: number
  healthyTrees: number
  treesNeedingAttention: number
  totalFruits: number
  gpsCoverage: number
  zonesCount: number
}

// Farm statistics (matching iOS FarmStatistics)
export interface FarmStatistics {
  season: number
  totalTrees: number
  totalHarvest: number
  totalInvestment: number
  totalRevenue: number
  profit: number
  averageHarvestPerTree: number
  gpsCoverage: number
  zonesCount: number
  profitMargin: number
  investmentPerTree: number
  revenuePerTree: number
}

// Zone statistics
export interface ZoneStatistics {
  zone: FarmZone
  treeCount: number
  totalHarvest: number
  averageHarvestPerTree: number
  estimatedInvestment: number
  harvestEfficiency: number
  performance: 'excellent' | 'good' | 'average' | 'poor' | 'veryPoor'
}

// Monthly investment data
export interface MonthlyInvestment {
  month: number
  amount: number
  monthName: string
}

// Season management
export interface HarvestSeason {
  farmId: string
  name: string
  startDate: Date
  endDate: Date
  totalTrees: number
  totalHarvest: number
  totalInvestment: number
  notes?: string
}