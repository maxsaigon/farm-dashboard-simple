'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Tree } from '@/lib/types'
import TreeShowcase from '@/components/TreeShowcase'
import AuthGuard from '@/components/AuthGuard'
import LargeTitleHeader from '@/components/ui/LargeTitleHeader'
import { useSimpleAuth } from '@/lib/simple-auth-context'

export default function TreeShowcasePage() {
  const params = useParams()
  const { currentFarm } = useSimpleAuth()
  const [tree, setTree] = useState<Tree | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTree() {
      if (!currentFarm?.id) {
        setError('Vui lòng chọn trang trại')
        setLoading(false)
        return
      }
      const id = params?.id as string | undefined
      if (!id) return
      try {
        const ref = doc(db, 'farms', currentFarm.id, 'trees', id)
        const snap = await getDoc(ref)
        if (!snap.exists()) {
          setError('Không tìm thấy cây')
        } else {
          const data = snap.data() as any
          // Basic normalization
          const t: Tree = {
            id: snap.id,
            farmId: currentFarm.id,
            name: data.name,
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            gpsAccuracy: data.gpsAccuracy,
            plantingDate: data.plantingDate?.toDate ? data.plantingDate.toDate() : data.plantingDate,
            variety: data.variety,
            treeStatus: data.treeStatus,
            healthStatus: data.healthStatus,
            notes: data.notes,
            qrCode: data.qrCode,
            zoneCode: data.zoneCode,
            zoneName: data.zoneName,
            manualFruitCount: data.manualFruitCount || 0,
            lastCountDate: data.lastCountDate?.toDate ? data.lastCountDate.toDate() : data.lastCountDate,
            treeHeight: data.treeHeight,
            trunkDiameter: data.trunkDiameter,
            healthNotes: data.healthNotes,
            fertilizedDate: data.fertilizedDate?.toDate ? data.fertilizedDate.toDate() : data.fertilizedDate,
            prunedDate: data.prunedDate?.toDate ? data.prunedDate.toDate() : data.prunedDate,
            diseaseNotes: data.diseaseNotes,
            needsSync: data.needsSync,
            lastSyncDate: data.lastSyncDate?.toDate ? data.lastSyncDate.toDate() : data.lastSyncDate,
            aiFruitCount: data.aiFruitCount || 0,
            lastAIAnalysisDate: data.lastAIAnalysisDate?.toDate ? data.lastAIAnalysisDate.toDate() : data.lastAIAnalysisDate,
            aiAccuracy: data.aiAccuracy,
            needsAttention: data.needsAttention || false,
            customFields: data.customFields,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
          }
          setTree(t)
        }
      } catch (e) {
        setError('Lỗi tải dữ liệu cây')
      } finally {
        setLoading(false)
      }
    }
    fetchTree()
  }, [params?.id, currentFarm?.id])

  return (
    <AuthGuard requiredPermission="read" requireFarmAccess={true}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="px-4 pt-4">
            <LargeTitleHeader title="Thông tin cây" subtitle={tree?.name || (tree ? tree.id : '')} />
          </div>

          {loading && (
            <div className="p-6 text-center text-gray-500">Đang tải…</div>
          )}
          {error && (
            <div className="p-6 text-center text-red-600">{error}</div>
          )}

          {!loading && !error && (
            <TreeShowcase tree={tree} onSaved={setTree} />
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
