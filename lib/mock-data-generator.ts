import type { Farm, User, FarmZone, Investment, UserFarmAccess } from './types'

export function generateMockUser(override?: Partial<User>): User {
  return {
    uid: `mock-user-${Math.random().toString(36).substr(2, 9)}`,
    email: 'mock-user@example.com',
    displayName: 'Mock User',
    createdAt: new Date(),
    ...override
  }
}

export function generateMockFarm(override?: Partial<Farm>): Farm {
  const id = `mock-farm-${Math.random().toString(36).substr(2, 9)}`
  return {
    id,
    name: `Mock Farm - ${id.slice(-4).toUpperCase()}`,
    ownerName: 'Mock Owner',
    totalArea: 12.5,
    createdDate: new Date(),
    centerLatitude: 12.965,
    centerLongitude: 108.107,
    boundaryCoordinates: JSON.stringify([
      { latitude: 12.964, longitude: 108.106 },
      { latitude: 12.966, longitude: 108.106 },
      { latitude: 12.966, longitude: 108.108 },
      { latitude: 12.964, longitude: 108.108 }
    ]),
    ...override
  }
}

export function generateMockZone(farmId: string, override?: Partial<FarmZone>): FarmZone {
  const id = `mock-zone-${Math.random().toString(36).substr(2, 9)}`
  const boundary = [
    { latitude: 12.964719721189951, longitude: 108.10734795539481 },
    { latitude: 12.965282877587123, longitude: 108.10792439558159 },
    { latitude: 12.966500825869684, longitude: 108.10731307452419 },
    { latitude: 12.966106194021753, longitude: 108.10657156603018 }
  ]
  return {
    id,
    name: `Khu vực ${id.slice(-4).toUpperCase()}`,
    code: `ZONE-${id.slice(-4).toUpperCase()}`,
    description: 'Mock Zone Description',
    color: '#10b981',
    colorData: { red: 0.06, green: 0.73, blue: 0.51, alpha: 1.0 },
    boundary,
    boundaries: boundary,
    treeCount: Math.floor(Math.random() * 200) + 50,
    area: 1.8,
    isActive: true,
    notes: 'Khu vực thử nghiệm mock data',
    farmId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...override
  }
}

export function generateMockInvestment(farmId: string, userId: string, override?: Partial<Investment>): Investment {
  const id = `mock-inv-${Math.random().toString(36).substr(2, 9)}`
  return {
    id,
    amount: Math.floor(Math.random() * 5000000) + 500000,
    category: 'Phân bón',
    subcategory: 'NPK',
    date: new Date(),
    notes: 'Mua phân bón định kỳ',
    quantity: 10,
    unit: 'Bao',
    pricePerUnit: 250000,
    treeCount: 50,
    isRecurring: false,
    farmId,
    createdBy: userId,
    userId, // for backward compatibility
    createdAt: new Date(),
    updatedAt: new Date(),
    ...override
  }
}

export function generateMockUserFarmAccess(userId: string, farmId: string, role: 'owner' | 'manager' | 'viewer' = 'viewer'): UserFarmAccess {
  return {
    id: `mock-access-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    farmId,
    role,
    permissions: role === 'owner' ? ['read', 'write', 'admin'] : role === 'manager' ? ['read', 'write'] : ['read'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
}
