'use client'

import { useState, useEffect } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import { BulkOperationsService, BulkOperation, BulkOperationTemplate } from '@/lib/bulk-operations-service'
import { 
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  UsersIcon,
  MapIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  PlayIcon,
  PauseIcon,
  StopIcon
} from '@heroicons/react/24/outline'

// Types are now imported from bulk-operations-service

interface BulkStats {
  totalOperations: number
  runningOperations: number
  completedOperations: number
  failedOperations: number
}

// Component-specific interface to avoid conflict with service interface
interface ComponentBulkOperation {
  id: string
  type: 'user_import' | 'user_export' | 'farm_import' | 'farm_export' | 'role_assignment' | 'data_migration'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  totalRecords: number
  processedRecords: number
  failedRecords: number
  startedAt?: Date
  completedAt?: Date
  errorMessage?: string
  createdBy: string
  metadata: Record<string, any>
}

export default function BulkOperationsManager() {
  const { user } = useEnhancedAuth()
  const [operations, setOperations] = useState<ComponentBulkOperation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOperation, setSelectedOperation] = useState<ComponentBulkOperation | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [operationType, setOperationType] = useState<string>('user_import')

  const [stats, setStats] = useState<BulkStats>({
    totalOperations: 0,
    runningOperations: 0,
    completedOperations: 0,
    failedOperations: 0
  })

  const [newOperation, setNewOperation] = useState({
    type: 'user_import' as ComponentBulkOperation['type'],
    description: '',
    options: {} as Record<string, any>
  })

  useEffect(() => {
    loadOperations()
    // Set up polling for running operations
    const interval = setInterval(() => {
      loadOperations()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    calculateStats()
  }, [operations])

  const loadOperations = async () => {
    try {
      setLoading(true)
      // Load real bulk operations from Firebase
      const realOperations = await BulkOperationsService.getBulkOperations(50)
      
      // Transform the data to match component's expected structure
      const transformedOperations: ComponentBulkOperation[] = realOperations.map(op => ({
        id: op.id,
        type: mapOperationType(op.type, op.target),
        status: op.status,
        progress: op.progress,
        totalRecords: op.totalItems,
        processedRecords: op.processedItems,
        failedRecords: op.failedItems,
        startedAt: op.startedAt,
        completedAt: op.completedAt,
        errorMessage: op.results?.errors.join(', '),
        createdBy: op.createdBy,
        metadata: op.parameters
      }))
      
      setOperations(transformedOperations)
    } catch (error) {
      console.error('Error loading operations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to map service types to component types
  const mapOperationType = (serviceType: string, target: string): 'user_import' | 'user_export' | 'farm_import' | 'farm_export' | 'role_assignment' | 'data_migration' => {
    if (serviceType === 'export') {
      return target === 'users' ? 'user_export' : 'farm_export'
    }
    if (serviceType === 'import') {
      return target === 'users' ? 'user_import' : 'farm_import'
    }
    if (serviceType === 'update' && target === 'users') {
      return 'role_assignment'
    }
    return 'data_migration'
  }

  const calculateStats = () => {
    const totalOperations = operations.length
    const runningOperations = operations.filter(op => op.status === 'running').length
    const completedOperations = operations.filter(op => op.status === 'completed').length
    const failedOperations = operations.filter(op => op.status === 'failed').length

    setStats({
      totalOperations,
      runningOperations,
      completedOperations,
      failedOperations
    })
  }

  const createOperation = async () => {
    try {
      if (!uploadFile && ['user_import', 'farm_import'].includes(newOperation.type)) {
        alert('Please select a file to upload')
        return
      }

      if (!user?.uid || !user?.email) {
        alert('User not authenticated')
        return
      }

      // Map component operation type to service operation
      const { serviceType, target } = mapToServiceOperation(newOperation.type)
      
      const operationData = {
        type: serviceType,
        status: 'pending' as const,
        target: target,
        totalItems: 100, // This would be calculated from the file or input
        createdBy: user.uid,
        createdByEmail: user.email,
        parameters: {
          description: newOperation.description,
          filename: uploadFile?.name,
          ...newOperation.options
        },
        priority: 'medium' as const
      }

      await BulkOperationsService.createBulkOperation(operationData)
      
      // Refresh operations list
      await loadOperations()

      // Reset form
      setNewOperation({
        type: 'user_import',
        description: '',
        options: {}
      })
      setUploadFile(null)
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating operation:', error)
      alert('Failed to create operation. Please try again.')
    }
  }

  // Helper function to map component types to service types
  const mapToServiceOperation = (componentType: string) => {
    switch (componentType) {
      case 'user_import':
        return { serviceType: 'import' as const, target: 'users' as const }
      case 'user_export':
        return { serviceType: 'export' as const, target: 'users' as const }
      case 'farm_import':
        return { serviceType: 'import' as const, target: 'farms' as const }
      case 'farm_export':
        return { serviceType: 'export' as const, target: 'farms' as const }
      case 'role_assignment':
        return { serviceType: 'update' as const, target: 'users' as const }
      case 'data_migration':
        return { serviceType: 'migration' as const, target: 'all' as const }
      default:
        return { serviceType: 'export' as const, target: 'trees' as const }
    }
  }

  const cancelOperation = async (operationId: string) => {
    try {
      if (!confirm('Are you sure you want to cancel this operation?')) {
        return
      }

      setOperations(prev => prev.map(op => 
        op.id === operationId 
          ? { ...op, status: 'cancelled', completedAt: new Date() }
          : op
      ))
    } catch (error) {
      console.error('Error cancelling operation:', error)
    }
  }

  const retryOperation = async (operationId: string) => {
    try {
      setOperations(prev => prev.map(op => 
        op.id === operationId 
          ? { 
              ...op, 
              status: 'pending', 
              progress: 0, 
              processedRecords: 0, 
              failedRecords: 0,
              errorMessage: undefined,
              startedAt: undefined,
              completedAt: undefined
            }
          : op
      ))

      // Simulate restarting
      setTimeout(() => {
        setOperations(prev => prev.map(op => 
          op.id === operationId 
            ? { ...op, status: 'running', startedAt: new Date() }
            : op
        ))
      }, 1000)
    } catch (error) {
      console.error('Error retrying operation:', error)
    }
  }

  const downloadResults = async (operationId: string) => {
    try {
      // Mock download
      const operation = operations.find(op => op.id === operationId)
      if (!operation) return

      const data = {
        operationId,
        type: operation.type,
        results: {
          totalRecords: operation.totalRecords,
          processedRecords: operation.processedRecords,
          failedRecords: operation.failedRecords,
          errors: operation.failedRecords > 0 ? ['Sample error 1', 'Sample error 2'] : []
        }
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `operation_${operationId}_results.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading results:', error)
    }
  }

  const getOperationIcon = (type: ComponentBulkOperation['type']) => {
    switch (type) {
      case 'user_import': return <CloudArrowUpIcon className="h-5 w-5" />
      case 'user_export': return <CloudArrowDownIcon className="h-5 w-5" />
      case 'farm_import': return <CloudArrowUpIcon className="h-5 w-5" />
      case 'farm_export': return <CloudArrowDownIcon className="h-5 w-5" />
      case 'role_assignment': return <UsersIcon className="h-5 w-5" />
      case 'data_migration': return <ArrowPathIcon className="h-5 w-5" />
      default: return <DocumentTextIcon className="h-5 w-5" />
    }
  }

  const getStatusIcon = (status: ComponentBulkOperation['status']) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'failed': return <XCircleIcon className="h-5 w-5 text-red-600" />
      case 'running': return <PlayIcon className="h-5 w-5 text-blue-600" />
      case 'cancelled': return <StopIcon className="h-5 w-5 text-gray-600" />
      case 'pending': return <PauseIcon className="h-5 w-5 text-yellow-600" />
      default: return <InformationCircleIcon className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: ComponentBulkOperation['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDuration = (start?: Date, end?: Date) => {
    if (!start) return 'Not started'
    const endTime = end || new Date()
    const diffInSeconds = Math.floor((endTime.getTime() - start.getTime()) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ${diffInSeconds % 60}s`
    return `${Math.floor(diffInSeconds / 3600)}h ${Math.floor((diffInSeconds % 3600) / 60)}m`
  }

  const operationTypes = [
    { value: 'user_import', label: 'Import Users', description: 'Import users from CSV file' },
    { value: 'user_export', label: 'Export Users', description: 'Export users to CSV file' },
    { value: 'farm_import', label: 'Import Farms', description: 'Import farms from CSV file' },
    { value: 'farm_export', label: 'Export Farms', description: 'Export farms to CSV file' },
    { value: 'role_assignment', label: 'Bulk Role Assignment', description: 'Assign roles to multiple users' },
    { value: 'data_migration', label: 'Data Migration', description: 'Migrate data between systems' }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Operations</h1>
          <p className="text-gray-600">Manage large-scale data operations and imports/exports</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <PlayIcon className="h-5 w-5 mr-2" />
          New Operation
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Operations</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalOperations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <PlayIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Running</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.runningOperations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.completedOperations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Failed</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.failedOperations}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Operations List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Operations</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {operations.map((operation) => (
            <div key={operation.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getOperationIcon(operation.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900 capitalize">
                        {operation.type.replace('_', ' ')}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(operation.status)}`}>
                        {operation.status}
                      </span>
                    </div>
                    
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <span>
                        {operation.processedRecords}/{operation.totalRecords} records
                      </span>
                      {operation.failedRecords > 0 && (
                        <span className="text-red-600">
                          {operation.failedRecords} failed
                        </span>
                      )}
                      <span>
                        Duration: {formatDuration(operation.startedAt, operation.completedAt)}
                      </span>
                    </div>

                    {operation.status === 'running' && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${operation.progress}%` }}
                          />
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {operation.progress}% complete
                        </div>
                      </div>
                    )}

                    {operation.errorMessage && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        {operation.errorMessage}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {getStatusIcon(operation.status)}
                  
                  <div className="flex items-center space-x-1">
                    {operation.status === 'running' && (
                      <button
                        onClick={() => cancelOperation(operation.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Cancel operation"
                      >
                        <StopIcon className="h-4 w-4" />
                      </button>
                    )}
                    
                    {operation.status === 'failed' && (
                      <button
                        onClick={() => retryOperation(operation.id)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Retry operation"
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                      </button>
                    )}
                    
                    {['completed', 'failed'].includes(operation.status) && (
                      <button
                        onClick={() => downloadResults(operation.id)}
                        className="p-1 text-gray-400 hover:text-green-600"
                        title="Download results"
                      >
                        <CloudArrowDownIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Operation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Operation</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Operation Type</label>
                    <select
                      value={newOperation.type}
                      onChange={(e) => setNewOperation(prev => ({ ...prev, type: e.target.value as ComponentBulkOperation['type'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {operationTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      {operationTypes.find(t => t.value === newOperation.type)?.description}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      value={newOperation.description}
                      onChange={(e) => setNewOperation(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Optional description for this operation"
                    />
                  </div>

                  {['user_import', 'farm_import'].includes(newOperation.type) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Upload File</label>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.json"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Supported formats: CSV, Excel, JSON
                      </p>
                    </div>
                  )}

                  {newOperation.type === 'role_assignment' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Role Type</label>
                        <select
                          value={newOperation.options.roleType || 'farm_viewer'}
                          onChange={(e) => setNewOperation(prev => ({ 
                            ...prev, 
                            options: { ...prev.options, roleType: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="farm_viewer">Farm Viewer</option>
                          <option value="farm_manager">Farm Manager</option>
                          <option value="farm_owner">Farm Owner</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={createOperation}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Start Operation
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}