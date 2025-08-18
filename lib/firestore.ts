import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy
} from 'firebase/firestore'
import { db } from './firebase'
import { Tree, DashboardStats } from './types'

// Real-time listener for trees
export function subscribeToTrees(userId: string, callback: (trees: Tree[]) => void) {
  const treesRef = collection(db, 'trees')
  const q = query(
    treesRef, 
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  
  return onSnapshot(q, (snapshot) => {
    const trees: Tree[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      trees.push({
        id: doc.id,
        ...data,
        plantingDate: data.plantingDate?.toDate() || new Date(),
        lastInspectionDate: data.lastInspectionDate?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Tree)
    })
    callback(trees)
  })
}

// Calculate dashboard statistics
export function calculateDashboardStats(trees: Tree[]): DashboardStats {
  const totalTrees = trees.length
  const healthyTrees = trees.filter(tree => 
    tree.healthStatus === 'Excellent' || tree.healthStatus === 'Good'
  ).length
  const treesNeedingAttention = trees.filter(tree => tree.needsAttention).length
  const totalFruits = trees.reduce((sum, tree) => sum + (tree.currentFruitCount || 0), 0)
  
  return {
    totalTrees,
    healthyTrees,
    treesNeedingAttention,
    totalFruits
  }
}

// Get trees that need attention
export function getTreesNeedingAttention(trees: Tree[]): Tree[] {
  return trees.filter(tree => tree.needsAttention)
}