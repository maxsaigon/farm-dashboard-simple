import { 
  collection, 
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from './firebase'
import { AdminService } from './admin-service'

// Bulk Operation Types
export interface BulkOperation {
  id: string
  type: 'export' | 'import' | 'update' | 'delete' | 'backup' | 'migration'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  target: 'users' | 'farms' | 'trees' | 'photos' | 'zones' | 'all'
  progress: number
  totalItems: number
  processedItems: number
  failedItems: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  createdBy: string
  createdByEmail: string
  parameters: Record<string, any>
  results?: {
    successCount: number
    errorCount: number
    errors: string[]
    downloadUrl?: string
  }
  estimatedDuration?: number
  priority: 'low' | 'medium' | 'high'
}

export interface BulkOperationTemplate {
  id: string
  name: string
  description: string
  type: BulkOperation['type']
  target: BulkOperation['target']
  parameters: Record<string, any>
  isActive: boolean
}

export class BulkOperationsService {
  
  // Get all bulk operations with pagination
  static async getBulkOperations(
    pageSize: number = 50,
    status?: BulkOperation['status'],
    type?: BulkOperation['type']
  ): Promise<BulkOperation[]> {
    try {
      let q = query(
        collection(db, 'bulkOperations'),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      )

      if (status) {
        q = query(q, where('status', '==', status))
      }
      if (type) {
        q = query(q, where('type', '==', type))
      }

      const snapshot = await getDocs(q)
      const operations: BulkOperation[] = []
      
      snapshot.forEach(doc => {
        const data = doc.data()
        operations.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          startedAt: data.startedAt?.toDate(),
          completedAt: data.completedAt?.toDate()
        } as BulkOperation)
      })

      return operations
    } catch (error) {
      console.error('Error fetching bulk operations:', error)
      return []
    }
  }

  // Create a new bulk operation
  static async createBulkOperation(
    operation: Omit<BulkOperation, 'id' | 'createdAt' | 'progress' | 'processedItems' | 'failedItems'>
  ): Promise<string> {
    try {
      const operationRef = collection(db, 'bulkOperations')
      const doc = await addDoc(operationRef, {
        ...operation,
        createdAt: Timestamp.now(),
        progress: 0,
        processedItems: 0,
        failedItems: 0,
        status: 'pending'
      })

      // Start processing the operation
      this.processOperation(doc.id)
      
      return doc.id
    } catch (error) {
      console.error('Error creating bulk operation:', error)
      throw error
    }
  }

  // Update operation status and progress
  static async updateOperationProgress(
    operationId: string, 
    updates: Partial<Pick<BulkOperation, 'status' | 'progress' | 'processedItems' | 'failedItems' | 'results'>>
  ): Promise<void> {
    try {
      const operationRef = doc(db, 'bulkOperations', operationId)
      const updateData: any = { ...updates }
      
      if (updates.status === 'running' && !updates.processedItems) {
        updateData.startedAt = Timestamp.now()
      }
      if (updates.status === 'completed' || updates.status === 'failed') {
        updateData.completedAt = Timestamp.now()
      }

      await updateDoc(operationRef, updateData)
    } catch (error) {
      console.error('Error updating operation progress:', error)
    }
  }

  // Process a bulk operation
  static async processOperation(operationId: string): Promise<void> {
    try {
      // This would typically run in a background worker/cloud function
      // For now, we'll simulate the process
      
      await this.updateOperationProgress(operationId, { 
        status: 'running',
        startedAt: new Date()
      })

      // Simulate processing time
      const simulateProgress = async () => {
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 500))
          await this.updateOperationProgress(operationId, {
            progress: i,
            processedItems: Math.floor(i * 10 / 100)
          })
        }
      }

      await simulateProgress()

      await this.updateOperationProgress(operationId, {
        status: 'completed',
        progress: 100,
        results: {
          successCount: 100,
          errorCount: 0,
          errors: []
        }
      })

    } catch (error) {
      console.error('Error processing operation:', error)
      await this.updateOperationProgress(operationId, {
        status: 'failed',
        results: {
          successCount: 0,
          errorCount: 1,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        }
      })
    }
  }

  // Cancel a running operation
  static async cancelOperation(operationId: string): Promise<void> {
    try {
      await this.updateOperationProgress(operationId, {
        status: 'cancelled'
      })
    } catch (error) {
      console.error('Error cancelling operation:', error)
      throw error
    }
  }

  // Export data based on operation parameters
  static async exportData(target: BulkOperation['target'], parameters: Record<string, any>): Promise<any[]> {
    try {
      switch (target) {
        case 'users':
          return await AdminService.getAllUsers()
        case 'farms':
          return await AdminService.getAllFarms()
        case 'trees':
          return await AdminService.getAllTrees()
        case 'photos':
          return await AdminService.getAllPhotos()
        case 'zones':
          return await AdminService.getAllZones()
        default:
          throw new Error(`Unsupported export target: ${target}`)
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      throw error
    }
  }

  // Bulk update operations
  static async bulkUpdateTrees(
    farmId: string, 
    updates: Record<string, any>, 
    treeIds?: string[]
  ): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
    try {
      const batch = writeBatch(db)
      const results = { successCount: 0, errorCount: 0, errors: [] as string[] }

      // Get trees to update
      const treesToUpdate = treeIds || []
      if (!treeIds) {
        // Get all trees in farm if no specific IDs provided
        const trees = await AdminService.getAllTrees()
        treesToUpdate.push(...trees.filter(t => t.farmId === farmId).map(t => t.id))
      }

      treesToUpdate.forEach(treeId => {
        try {
          const treeRef = doc(db, 'farms', farmId, 'trees', treeId)
          batch.update(treeRef, {
            ...updates,
            updatedAt: Timestamp.now()
          })
          results.successCount++
        } catch (error) {
          results.errorCount++
          results.errors.push(`Failed to update tree ${treeId}: ${error}`)
        }
      })

      await batch.commit()
      return results
    } catch (error) {
      console.error('Error in bulk update:', error)
      throw error
    }
  }

  // Bulk delete operations
  static async bulkDeleteItems(
    target: BulkOperation['target'],
    itemIds: string[],
    farmId?: string
  ): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
    try {
      const batch = writeBatch(db)
      const results = { successCount: 0, errorCount: 0, errors: [] as string[] }

      itemIds.forEach(itemId => {
        try {
          let itemRef
          switch (target) {
            case 'trees':
              if (!farmId) throw new Error('Farm ID required for tree deletion')
              itemRef = doc(db, 'farms', farmId, 'trees', itemId)
              break
            case 'farms':
              itemRef = doc(db, 'farms', itemId)
              break
            case 'users':
              itemRef = doc(db, 'users', itemId)
              break
            case 'zones':
              itemRef = doc(db, 'zones', itemId)
              break
            default:
              throw new Error(`Unsupported delete target: ${target}`)
          }
          
          batch.delete(itemRef)
          results.successCount++
        } catch (error) {
          results.errorCount++
          results.errors.push(`Failed to delete ${target} ${itemId}: ${error}`)
        }
      })

      await batch.commit()
      return results
    } catch (error) {
      console.error('Error in bulk delete:', error)
      throw error
    }
  }

  // Get operation templates
  static async getOperationTemplates(): Promise<BulkOperationTemplate[]> {
    try {
      const templatesRef = collection(db, 'bulkOperationTemplates')
      const snapshot = await getDocs(templatesRef)
      const templates: BulkOperationTemplate[] = []
      
      snapshot.forEach(doc => {
        templates.push({
          id: doc.id,
          ...doc.data()
        } as BulkOperationTemplate)
      })

      // Return default templates if none exist
      if (templates.length === 0) {
        return this.getDefaultTemplates()
      }

      return templates
    } catch (error) {
      console.error('Error fetching operation templates:', error)
      return this.getDefaultTemplates()
    }
  }

  // Get default operation templates
  private static getDefaultTemplates(): BulkOperationTemplate[] {
    return [
      {
        id: 'export-all-trees',
        name: 'Export All Trees',
        description: 'Export all trees data to CSV format',
        type: 'export',
        target: 'trees',
        parameters: { format: 'csv', includePhotos: false },
        isActive: true
      },
      {
        id: 'backup-farm-data',
        name: 'Backup Farm Data',
        description: 'Create a complete backup of farm data',
        type: 'backup',
        target: 'farms',
        parameters: { includePhotos: true, compression: true },
        isActive: true
      },
      {
        id: 'update-tree-status',
        name: 'Bulk Update Tree Status',
        description: 'Update health status for multiple trees',
        type: 'update',
        target: 'trees',
        parameters: { field: 'healthStatus', value: '' },
        isActive: true
      },
      {
        id: 'cleanup-old-photos',
        name: 'Cleanup Old Photos',
        description: 'Remove photos older than specified date',
        type: 'delete',
        target: 'photos',
        parameters: { olderThan: '90d', backup: true },
        isActive: true
      }
    ]
  }

  // Execute a template operation
  static async executeTemplate(
    templateId: string, 
    parameters: Record<string, any>,
    userId: string,
    userEmail: string
  ): Promise<string> {
    try {
      const templates = await this.getOperationTemplates()
      const template = templates.find(t => t.id === templateId)
      
      if (!template) {
        throw new Error(`Template not found: ${templateId}`)
      }

      const operation: Omit<BulkOperation, 'id' | 'createdAt' | 'progress' | 'processedItems' | 'failedItems'> = {
        type: template.type,
        target: template.target,
        status: 'pending',
        totalItems: 0, // Will be calculated during processing
        createdBy: userId,
        createdByEmail: userEmail,
        parameters: { ...template.parameters, ...parameters },
        priority: 'medium'
      }

      return await this.createBulkOperation(operation)
    } catch (error) {
      console.error('Error executing template:', error)
      throw error
    }
  }
}