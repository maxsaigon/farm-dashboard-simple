import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, Timestamp, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import type { FertilizerCalculation } from './types'

function toDate(value: any): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    try { return value.toDate() } catch { return null }
  }
  if (typeof value === 'number') return new Date(value * 1000)
  if (typeof value === 'string') { const d = new Date(value); return isNaN(d.getTime()) ? null : d }
  if (value && typeof value === 'object' && 'seconds' in value) {
    const sec = (value as any).seconds || 0
    const ns = (value as any).nanoseconds || 0
    return new Date(sec * 1000 + ns / 1_000_000)
  }
  return null
}

function calcsCol(userId: string, farmId: string) {
  return collection(db, 'users', userId, 'farms', farmId, 'fertilizerCalculations')
}

function calcDoc(userId: string, farmId: string, id: string) {
  return doc(db, 'users', userId, 'farms', farmId, 'fertilizerCalculations', id)
}

export type FertilizerRecord = FertilizerCalculation & {
  createdAt?: Date
  updatedAt?: Date
  createdBy?: string
  userId?: string
}

export function subscribeToFertilizerCalculations(userId: string, farmId: string, callback: (items: FertilizerRecord[]) => void) {
  if (!userId || !farmId) {
    callback([])
    return () => {}
  }
  const q = query(calcsCol(userId, farmId), orderBy('createdDate', 'desc'))
  return onSnapshot(q, (snap) => {
    const items: FertilizerRecord[] = snap.docs.map(d => {
      const data = d.data() as any
      return {
        id: d.id,
        fertilizerType: data.fertilizerType || 'N/A',
        amountPerTree: Number(data.amountPerTree) || 0,
        unit: data.unit || '',
        treeStatus: data.treeStatus || undefined,
        season: data.season || undefined,
        createdDate: toDate(data.createdDate) || new Date(),
        isActive: Boolean(data.isActive),
        farmId: data.farmId || farmId,
        createdAt: toDate(data.createdAt) || undefined,
        updatedAt: toDate(data.updatedAt) || undefined,
        createdBy: data.createdBy,
        userId: data.userId,
      }
    })
    callback(items)
  }, (err) => {
    console.error('subscribeToFertilizerCalculations error:', err)
    callback([])
  })
}

export async function addFertilizerCalculation(userId: string, farmId: string, calc: Omit<FertilizerRecord, 'id' | 'farmId'>): Promise<string> {
  const ref = doc(calcsCol(userId, farmId))
  const payload: any = {
    ...calc,
    userId,
    farmId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdDate: calc.createdDate instanceof Date ? Timestamp.fromDate(calc.createdDate) : serverTimestamp(),
  }
  await setDoc(ref, payload)
  return ref.id
}

export async function updateFertilizerCalculation(userId: string, farmId: string, id: string, updates: Partial<FertilizerRecord>): Promise<void> {
  const ref = calcDoc(userId, farmId, id)
  const data: any = { ...updates, updatedAt: serverTimestamp() }
  if (updates.createdDate instanceof Date) data.createdDate = Timestamp.fromDate(updates.createdDate)
  await updateDoc(ref, data)
}

export async function deleteFertilizerCalculation(userId: string, farmId: string, id: string): Promise<void> {
  await deleteDoc(calcDoc(userId, farmId, id))
}
