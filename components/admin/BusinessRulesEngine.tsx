'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { BusinessRulesService, BusinessRule, RuleTemplate } from '@/lib/business-rules-service'
import { 
  CogIcon,
  PlusIcon, 
  PencilIcon,
  TrashIcon,
  EyeIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  BoltIcon,
  CodeBracketIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

// Types are now imported from business-rules-service

// Condition and Action types are also imported from business-rules-service

interface RuleStats {
  totalRules: number
  activeRules: number
  draftRules: number
  totalExecutions: number
}

export default function BusinessRulesEngine() {
  const { user } = useSimpleAuth()
  const [rules, setRules] = useState<BusinessRule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRule, setSelectedRule] = useState<BusinessRule | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const [stats, setStats] = useState<RuleStats>({
    totalRules: 0,
    activeRules: 0,
    draftRules: 0,
    totalExecutions: 0
  })

  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    category: 'automation' as const,
    isActive: false,
    priority: 1,
    conditions: [] as any[],
    actions: [] as any[]
  })

  useEffect(() => {
    loadRules()
  }, [])

  useEffect(() => {
    calculateStats()
  }, [rules])

  const loadRules = async () => {
    try {
      setLoading(true)
      // Load real business rules from Firebase
      const realRules = await BusinessRulesService.getBusinessRules()
      
      // Use the real rules directly since they already match the BusinessRule interface
      setRules(realRules)
      
    } catch (error) {
      console.error('Error loading rules:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to map service categories to component categories  
  const mapServiceCategoryToComponent = (serviceCategory: string): BusinessRule['category'] => {
    switch (serviceCategory) {
      case 'validation': return 'validation'
      case 'automation': return 'automation'
      case 'notification': return 'notification'
      case 'access_control': return 'access_control'
      case 'data_processing': return 'data_processing'
      default: return 'automation'
    }
  }

  const calculateStats = () => {
    const totalRules = rules.length
    const activeRules = rules.filter(r => r.isActive).length
    const draftRules = rules.filter(r => !r.isActive).length
    const totalExecutions = rules.reduce((sum, rule) => sum + rule.triggerCount, 0)

    setStats({
      totalRules,
      activeRules,
      draftRules,
      totalExecutions
    })
  }

  const createRule = async () => {
    try {
      if (!newRule.name?.trim()) return
      if (!user?.uid) return

      const ruleData = {
        name: newRule.name.trim(),
        description: newRule.description || '',
        category: mapComponentCategoryToService(newRule.category || 'automation'),
        isActive: newRule.isActive || false,
        priority: newRule.priority || 1,
        conditions: newRule.conditions || [],
        actions: newRule.actions || [],
        createdBy: user.uid
      }

      await BusinessRulesService.createBusinessRule(ruleData)
      
      // Refresh rules list
      await loadRules()
      
      // Reset form
      setNewRule({
        name: '',
        description: '',
        category: 'automation',
        isActive: false,
        priority: 1,
        conditions: [],
        actions: []
      })
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating rule:', error)
      alert('Failed to create rule. Please try again.')
    }
  }

  // Helper function to map component categories to service categories
  const mapComponentCategoryToService = (componentCategory: string): BusinessRule['category'] => {
    switch (componentCategory) {
      case 'data_validation': return 'validation'
      case 'automation': return 'automation'
      case 'notification': return 'notification'
      case 'access_control': return 'access_control'
      case 'data_processing': return 'data_processing'
      default: return 'automation'
    }
  }

  const updateRule = async () => {
    try {
      if (!selectedRule) return

      setRules(prev => prev.map(rule => 
        rule.id === selectedRule.id 
          ? { ...selectedRule, updatedAt: new Date() }
          : rule
      ))

      setShowEditModal(false)
      setSelectedRule(null)
    } catch (error) {
      console.error('Error updating rule:', error)
    }
  }

  const deleteRule = async (ruleId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this rule?')) {
        return
      }

      setRules(prev => prev.filter(rule => rule.id !== ruleId))
    } catch (error) {
      console.error('Error deleting rule:', error)
    }
  }

  const toggleRuleStatus = async (ruleId: string) => {
    try {
      setRules(prev => prev.map(rule => 
        rule.id === ruleId 
          ? { 
              ...rule, 
              isActive: !rule.isActive,
              updatedAt: new Date()
            }
          : rule
      ))
    } catch (error) {
      console.error('Error toggling rule status:', error)
    }
  }

  const testRule = async (ruleId: string) => {
    try {
      const rule = rules.find(r => r.id === ruleId)
      if (!rule) return

      // Convert component rule back to service format for testing
      const serviceRule = {
        ...rule,
        category: mapComponentCategoryToService(rule.category)
      }

      // Test rule with sample data
      const testData = {
        user: {
          accountStatus: 'active',
          isEmailVerified: true,
          email: 'test@example.com'
        },
        assignment: {
          farmId: 'test-farm-123'
        }
      }

      const testResult = await BusinessRulesService.testRule(serviceRule, testData)
      
      if (testResult.conditionsMet) {
        alert(`Rule "${rule.name}" test passed! Conditions were met.`)
      } else {
        alert(`Rule "${rule.name}" test completed. Conditions were not met.`)
      }

      // Refresh rules to get updated stats
      await loadRules()
    } catch (error) {
      console.error('Error testing rule:', error)
      alert('Failed to test rule. Please try again.')
    }
  }

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || rule.category === filterCategory
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && rule.isActive) ||
                         (filterStatus === 'inactive' && !rule.isActive)
    return matchesSearch && matchesCategory && matchesStatus
  })

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'user_onboarding': return 'bg-blue-100 text-blue-800'
      case 'farm_assignment': return 'bg-green-100 text-green-800'
      case 'permission_management': return 'bg-purple-100 text-purple-800'
      case 'data_validation': return 'bg-yellow-100 text-yellow-800'
      case 'notification': return 'bg-indigo-100 text-indigo-800'
      case 'custom': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    if (diffInMinutes < 43200) return `${Math.floor(diffInMinutes / 1440)}d ago`
    return date.toLocaleDateString()
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Business Rules Engine</h1>
          <p className="text-gray-600">Automate business logic and workflows</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Rule
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CogIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Rules</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalRules}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Rules</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeRules}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Draft Rules</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.draftRules}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BoltIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Executions</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalExecutions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-64 pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Search rules..."
            />
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Categories</option>
              <option value="user_onboarding">User Onboarding</option>
              <option value="farm_assignment">Farm Assignment</option>
              <option value="permission_management">Permission Management</option>
              <option value="data_validation">Data Validation</option>
              <option value="notification">Notification</option>
              <option value="custom">Custom</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Business Rules</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredRules.map((rule) => (
            <div key={rule.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-lg font-medium text-gray-900">{rule.name}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(rule.category)}`}>
                      {rule.category.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(rule.isActive)}`}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <p className="mt-1 text-sm text-gray-600">{rule.description}</p>
                  
                  <div className="mt-3 flex items-center space-x-6 text-sm text-gray-500">
                    <span>Priority: {rule.priority}</span>
                    <span>Conditions: {rule.conditions.length}</span>
                    <span>Actions: {rule.actions.length}</span>
                    <span>Executions: {rule.triggerCount}</span>
                    {rule.lastTriggered && (
                      <span>Last run: {formatTimeAgo(rule.lastTriggered)}</span>
                    )}
                  </div>

                  {rule.triggerCount > 0 && (
                    <div className="mt-3 flex items-center space-x-4 text-sm">
                      <div className="flex items-center text-green-600">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        <span>{rule.successCount} successful</span>
                      </div>
                      {rule.failureCount > 0 && (
                        <div className="flex items-center text-red-600">
                          <XCircleIcon className="h-4 w-4 mr-1" />
                          <span>{rule.failureCount} failed</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => testRule(rule.id)}
                    className="p-2 text-gray-400 hover:text-blue-600"
                    title="Test rule"
                  >
                    <PlayIcon className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedRule(rule)
                      setShowEditModal(true)
                    }}
                    className="p-2 text-gray-400 hover:text-green-600"
                    title="Edit rule"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => toggleRuleStatus(rule.id)}
                    className={`p-2 text-gray-400 hover:${rule.isActive ? 'text-red-600' : 'text-green-600'}`}
                    title={rule.isActive ? 'Deactivate rule' : 'Activate rule'}
                  >
                    {rule.isActive ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                  </button>
                  
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                    title="Delete rule"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Rule</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rule Name</label>
                    <input
                      type="text"
                      value={newRule.name || ''}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter rule name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={newRule.description || ''}
                      onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Describe what this rule does"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={newRule.category || 'custom'}
                      onChange={(e) => setNewRule(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="user_onboarding">User Onboarding</option>
                      <option value="farm_assignment">Farm Assignment</option>
                      <option value="permission_management">Permission Management</option>
                      <option value="data_validation">Data Validation</option>
                      <option value="notification">Notification</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newRule.priority || 1}
                      onChange={(e) => setNewRule(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={createRule}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Create Rule
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