import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDocs, Timestamp, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import type { Investment } from './types'

// Helper: convert Firestore date-like values to JS Date
function toDate(value: any): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    try { return value.toDate() } catch { return null }
  }
  if (typeof value === 'number') return new Date(value * 1000)
  if (typeof value === 'string') { const d = new Date(value); return isNaN(d.getTime()) ? null : d }
  if (value && typeof value === 'object' && 'seconds' in value) {
    const sec = value.seconds || 0; const ns = value.nanoseconds || 0
    return new Date(sec * 1000 + ns / 1_000_000)
  }
  return null
}

// Path helpers following iOS doc: users/{uid}/farms/{farmId}/investments
function investmentsCol(userId: string, farmId: string) {
  return collection(db, 'users', userId, 'farms', farmId, 'investments')
}

function investmentDoc(userId: string, farmId: string, investmentId: string) {
  return doc(db, 'users', userId, 'farms', farmId, 'investments', investmentId)
}

// Legacy path from doc: users/{uid}/investments
function legacyInvestmentsCol(userId: string) {
  return collection(db, 'users', userId, 'investments')
}

export type InvestmentRecord = Investment & {
  userId?: string
  createdAt?: Date
  updatedAt?: Date
  createdBy?: string
  createdByName?: string
}

export function subscribeToInvestments(userId: string, farmId: string, callback: (items: InvestmentRecord[]) => void) {
  if (!userId || !farmId) {
    console.log('subscribeToInvestments: Missing userId or farmId')
    callback([])
    return () => {}
  }

  console.log(`subscribeToInvestments: Setting up listener for user ${userId}, farm ${farmId}`)
  const q = query(investmentsCol(userId, farmId), orderBy('date', 'desc'))

  return onSnapshot(q, (snap) => {
    console.log(`subscribeToInvestments: Received ${snap.docs.length} investments`)
    const items: InvestmentRecord[] = snap.docs.map(d => {
      const data = d.data() as any
      return {
        id: d.id,
        amount: Number(data.amount) || 0,
        category: data.category || 'Khác',
        subcategory: data.subcategory || undefined,
        date: toDate(data.date) || new Date(),
        notes: data.notes || undefined,
        quantity: typeof data.quantity === 'number' ? data.quantity : undefined,
        unit: data.unit || undefined,
        pricePerUnit: typeof data.pricePerUnit === 'number' ? data.pricePerUnit : undefined,
        treeCount: typeof data.treeCount === 'number' ? data.treeCount : undefined,
        isRecurring: Boolean(data.isRecurring),
        recurringPeriod: data.recurringPeriod || undefined,
        farmId: data.farmId || farmId,
        userId: data.userId,
        createdBy: data.createdBy,
        createdAt: toDate(data.createdAt) || undefined,
        updatedAt: toDate(data.updatedAt) || undefined,
        images: Array.isArray(data.images) ? data.images : undefined,
      }
    })
    callback(items)
  }, (err) => {
    console.error('subscribeToInvestments error:', err)
    console.error('subscribeToInvestments error details:', {
      userId,
      farmId,
      errorCode: err.code,
      errorMessage: err.message
    })
    callback([])
  })
}

export async function addInvestment(userId: string, farmId: string, investment: Omit<InvestmentRecord, 'id' | 'farmId'>): Promise<string> {
  if (!userId || !farmId) throw new Error('Missing userId or farmId')
  const ref = doc(investmentsCol(userId, farmId))
  const payload: any = {
    ...investment,
    userId,
    farmId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    date: investment.date instanceof Date ? Timestamp.fromDate(investment.date) : (investment.date || serverTimestamp()),
  }
  await setDoc(ref, payload)
  return ref.id
}

export async function updateInvestment(userId: string, farmId: string, id: string, updates: Partial<InvestmentRecord>): Promise<void> {
  if (!userId || !farmId || !id) throw new Error('Missing ids')
  const ref = investmentDoc(userId, farmId, id)
  const data: any = { ...updates, updatedAt: serverTimestamp() }
  if (updates.date instanceof Date) data.date = Timestamp.fromDate(updates.date)
  await updateDoc(ref, data)
}

export async function deleteInvestment(userId: string, farmId: string, id: string): Promise<void> {
  if (!userId || !farmId || !id) throw new Error('Missing ids')
  const ref = investmentDoc(userId, farmId, id)
  await deleteDoc(ref)
}

// One-way copy of legacy docs to nested path, assigning farmId if missing
export async function migrateLegacyInvestments(userId: string, activeFarmId: string): Promise<number> {
  try {
    if (!userId || !activeFarmId) return 0
    const legacySnap = await getDocs(legacyInvestmentsCol(userId))
    if (legacySnap.empty) return 0
    let migrated = 0
    for (const d of legacySnap.docs) {
      const data = d.data() as any
      const targetRef = doc(investmentsCol(userId, activeFarmId), d.id)
      const payload: any = {
        ...data,
        userId,
        farmId: data.farmId || activeFarmId,
        createdAt: data.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      // Normalize date
      if (data.date) {
        const maybeDate = toDate(data.date)
        payload.date = maybeDate ? Timestamp.fromDate(maybeDate) : serverTimestamp()
      } else {
        payload.date = serverTimestamp()
      }
      await setDoc(targetRef, payload)
      migrated++
    }
    return migrated
  } catch (e) {
    console.error('migrateLegacyInvestments error:', e)
    return 0
  }
}
