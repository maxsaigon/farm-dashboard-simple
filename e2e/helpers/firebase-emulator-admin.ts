import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

export const E2E_USER = {
  uid: 'e2e-owner',
  email: 'e2e-owner@example.test',
  password: 'E2e-only-password-123!'
}

export const E2E_FARM_ID = 'e2e-farm'
export const E2E_TREE_ID = 'e2e-tree-001'

export async function seedFirebaseEmulators() {
  const projectId = process.env.GCLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  if (!projectId?.startsWith('demo-') || !process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Refusing to seed without demo project and Firebase emulator hosts')
  }

  const app = getApps()[0] || initializeApp({ projectId, credential: applicationDefault() })
  const auth = getAuth(app)
  const db = getFirestore(app)

  try {
    await auth.getUser(E2E_USER.uid)
  } catch {
    await auth.createUser({
      uid: E2E_USER.uid,
      email: E2E_USER.email,
      password: E2E_USER.password,
      displayName: 'E2E Farm Owner',
      emailVerified: true
    })
  }

  const now = FieldValue.serverTimestamp()
  await db.doc(`users/${E2E_USER.uid}`).set({
    uid: E2E_USER.uid,
    email: E2E_USER.email,
    displayName: 'E2E Farm Owner',
    emailVerified: true,
    preferredLanguage: 'vi',
    timezone: 'Asia/Ho_Chi_Minh',
    createdAt: now
  })
  await db.doc(`farms/${E2E_FARM_ID}`).set({
    id: E2E_FARM_ID,
    ownerId: E2E_USER.uid,
    createdBy: E2E_USER.uid,
    name: 'E2E Durian Farm',
    ownerName: 'E2E Farm Owner',
    totalArea: 2,
    currentSeasonYear: 2026,
    seasons: [2026, 2025],
    isActive: true,
    createdDate: now
  })
  await db.doc(`userFarmAccess/${E2E_USER.uid}_${E2E_FARM_ID}`).set({
    id: `${E2E_USER.uid}_${E2E_FARM_ID}`,
    userId: E2E_USER.uid,
    farmId: E2E_FARM_ID,
    role: 'owner',
    permissions: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
    isActive: true,
    grantedBy: E2E_USER.uid,
    grantedAt: now,
    createdAt: now,
    updatedAt: now
  })
  await db.doc(`farms/${E2E_FARM_ID}/trees/${E2E_TREE_ID}`).set({
    id: E2E_TREE_ID,
    farmId: E2E_FARM_ID,
    name: 'E2E Durian Tree 001',
    qrCode: 'E2E-QR-001',
    variety: 'Monthong',
    healthStatus: 'Good',
    treeStatus: 'Cây Trưởng Thành',
    manualFruitCount: 12,
    aiFruitCount: 3,
    latitude: 10.762622,
    longitude: 106.660172,
    plantingDate: now,
    createdAt: now,
    updatedAt: now,
    seasonalStats: {
      2026: {
        manualFruitCount: 12,
        aiFruitCount: 3,
        fruitCountRecordedAt: now,
        fruitCountSource: 'manual',
        healthStatus: 'Good',
        updatedAt: now
      },
      2025: {
        manualFruitCount: 10,
        aiFruitCount: 0,
        fruitCountRecordedAt: now,
        fruitCountSource: 'manual',
        healthStatus: 'Good',
        updatedAt: now
      }
    }
  })
  await db.doc(`farms/${E2E_FARM_ID}/investments/e2e-investment-2026`).set({
    id: 'e2e-investment-2026',
    farmId: E2E_FARM_ID,
    amount: 1_500_000,
    category: 'Phân bón',
    date: new Date('2026-05-01T00:00:00.000Z'),
    seasonYear: 2026,
    isRecurring: false,
    createdBy: E2E_USER.uid,
    createdAt: now,
    updatedAt: now
  })
  await db.doc(`farms/${E2E_FARM_ID}/investments/e2e-investment-2025`).set({
    id: 'e2e-investment-2025',
    farmId: E2E_FARM_ID,
    amount: 1_000_000,
    category: 'Phân bón',
    date: new Date('2025-05-01T00:00:00.000Z'),
    seasonYear: 2025,
    isRecurring: false,
    createdBy: E2E_USER.uid,
    createdAt: now,
    updatedAt: now
  })
}
