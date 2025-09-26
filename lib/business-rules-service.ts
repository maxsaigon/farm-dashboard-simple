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
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { AdminService } from './admin-service'

// Business Rule Types
export interface BusinessRule {
  id: string
  name: string
  description: string
  category: 'validation' | 'automation' | 'notification' | 'access_control' | 'data_processing'
  isActive: boolean
  priority: number
  conditions: RuleCondition[]
  actions: RuleAction[]
  createdAt: Date
  updatedAt: Date
  createdBy: string
  lastTriggered?: Date
  triggerCount: number
  successCount: number
  failureCount: number
}

export interface RuleCondition {
  id: string
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'starts_with' | 'ends_with' | 'in' | 'not_in'
  value: any
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'array'
  logicalOperator?: 'AND' | 'OR'
}

export interface RuleAction {
  id: string
  type: 'update_field' | 'send_notification' | 'create_task' | 'log_event' | 'call_webhook' | 'assign_user'
  parameters: Record<string, any>
  order: number
}

export interface RuleExecution {
  id: string
  ruleId: string
  ruleName: string
  triggeredAt: Date
  triggeredBy: string
  context: Record<string, any>
  status: 'success' | 'failure' | 'partial'
  result: {
    conditionsMet: boolean
    actionsExecuted: number
    actionsFailed: number
    errors: string[]
    changes: Record<string, any>
  }
}

export interface RuleTemplate {
  id: string
  name: string
  description: string
  category: BusinessRule['category']
  conditions: Omit<RuleCondition, 'id'>[]
  actions: Omit<RuleAction, 'id'>[]
  isBuiltIn: boolean
}

export class BusinessRulesService {
  
  // Get all business rules
  static async getBusinessRules(): Promise<BusinessRule[]> {
    try {
      const rulesRef = collection(db, 'businessRules')
      const q = query(rulesRef, orderBy('priority', 'desc'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      const rules: BusinessRule[] = []
      
      snapshot.forEach(doc => {
        const data = doc.data()
        rules.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastTriggered: data.lastTriggered?.toDate()
        } as BusinessRule)
      })

      return rules
    } catch (error) {
      return []
    }
  }

  // Create a new business rule
  static async createBusinessRule(
    rule: Omit<BusinessRule, 'id' | 'createdAt' | 'updatedAt' | 'triggerCount' | 'successCount' | 'failureCount'>
  ): Promise<string> {
    try {
      const rulesRef = collection(db, 'businessRules')
      const doc = await addDoc(rulesRef, {
        ...rule,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        triggerCount: 0,
        successCount: 0,
        failureCount: 0,
        conditions: rule.conditions.map((cond, index) => ({
          ...cond,
          id: `condition_${index + 1}`
        })),
        actions: rule.actions.map((action, index) => ({
          ...action,
          id: `action_${index + 1}`
        }))
      })

      return doc.id
    } catch (error) {
      throw error
    }
  }

  // Update a business rule
  static async updateBusinessRule(
    ruleId: string, 
    updates: Partial<BusinessRule>
  ): Promise<void> {
    try {
      const ruleRef = doc(db, 'businessRules', ruleId)
      await updateDoc(ruleRef, {
        ...updates,
        updatedAt: Timestamp.now()
      })
    } catch (error) {
      throw error
    }
  }

  // Delete a business rule
  static async deleteBusinessRule(ruleId: string): Promise<void> {
    try {
      const ruleRef = doc(db, 'businessRules', ruleId)
      await deleteDoc(ruleRef)
    } catch (error) {
      throw error
    }
  }

  // Test a rule against sample data
  static async testRule(
    rule: BusinessRule, 
    testData: Record<string, any>
  ): Promise<{ conditionsMet: boolean; result: any; errors: string[] }> {
    try {
      const result = await this.evaluateConditions(rule.conditions, testData)
      
      return {
        conditionsMet: result.passed,
        result: result.details,
        errors: result.errors
      }
    } catch (error) {
      return {
        conditionsMet: false,
        result: null,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Evaluate rule conditions
  private static async evaluateConditions(
    conditions: RuleCondition[], 
    data: Record<string, any>
  ): Promise<{ passed: boolean; details: any; errors: string[] }> {
    const errors: string[] = []
    const results: boolean[] = []

    for (const condition of conditions) {
      try {
        const fieldValue = this.getFieldValue(data, condition.field)
        const conditionResult = this.evaluateCondition(condition, fieldValue)
        results.push(conditionResult)
      } catch (error) {
        errors.push(`Condition ${condition.id}: ${error}`)
        results.push(false)
      }
    }

    // Apply logical operators
    let finalResult = results[0] || false
    for (let i = 1; i < conditions.length; i++) {
      const operator = conditions[i].logicalOperator || 'AND'
      if (operator === 'AND') {
        finalResult = finalResult && results[i]
      } else if (operator === 'OR') {
        finalResult = finalResult || results[i]
      }
    }

    return {
      passed: finalResult,
      details: { conditionResults: results, finalResult },
      errors
    }
  }

  // Evaluate a single condition
  private static evaluateCondition(condition: RuleCondition, fieldValue: any): boolean {
    const { operator, value, dataType } = condition

    // Convert values based on data type
    const convertedFieldValue = this.convertValue(fieldValue, dataType)
    const convertedConditionValue = this.convertValue(value, dataType)

    switch (operator) {
      case 'equals':
        return convertedFieldValue === convertedConditionValue
      case 'not_equals':
        return convertedFieldValue !== convertedConditionValue
      case 'greater_than':
        return convertedFieldValue > convertedConditionValue
      case 'less_than':
        return convertedFieldValue < convertedConditionValue
      case 'contains':
        return String(convertedFieldValue).includes(String(convertedConditionValue))
      case 'starts_with':
        return String(convertedFieldValue).startsWith(String(convertedConditionValue))
      case 'ends_with':
        return String(convertedFieldValue).endsWith(String(convertedConditionValue))
      case 'in':
        return Array.isArray(convertedConditionValue) && 
               convertedConditionValue.includes(convertedFieldValue)
      case 'not_in':
        return Array.isArray(convertedConditionValue) && 
               !convertedConditionValue.includes(convertedFieldValue)
      default:
        throw new Error(`Unsupported operator: ${operator}`)
    }
  }

  // Get field value from data object (supports nested fields)
  private static getFieldValue(data: Record<string, any>, fieldPath: string): any {
    const keys = fieldPath.split('.')
    let value = data
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key]
      } else {
        return undefined
      }
    }
    
    return value
  }

  // Convert value to specified data type
  private static convertValue(value: any, dataType: string): any {
    switch (dataType) {
      case 'string':
        return String(value)
      case 'number':
        return Number(value)
      case 'boolean':
        return Boolean(value)
      case 'date':
        return value instanceof Date ? value : new Date(value)
      case 'array':
        return Array.isArray(value) ? value : [value]
      default:
        return value
    }
  }

  // Execute rule actions
  static async executeActions(
    actions: RuleAction[], 
    context: Record<string, any>
  ): Promise<{ executed: number; failed: number; errors: string[] }> {
    const result = { executed: 0, failed: 0, errors: [] as string[] }

    // Sort actions by order
    const sortedActions = [...actions].sort((a, b) => a.order - b.order)

    for (const action of sortedActions) {
      try {
        await this.executeAction(action, context)
        result.executed++
      } catch (error) {
        result.failed++
        result.errors.push(`Action ${action.id}: ${error}`)
      }
    }

    return result
  }

  // Execute a single action
  private static async executeAction(action: RuleAction, context: Record<string, any>): Promise<void> {
    switch (action.type) {
      case 'update_field':
        await this.executeUpdateFieldAction(action, context)
        break
      case 'send_notification':
        await this.executeSendNotificationAction(action, context)
        break
      case 'create_task':
        await this.executeCreateTaskAction(action, context)
        break
      case 'log_event':
        await this.executeLogEventAction(action, context)
        break
      case 'call_webhook':
        await this.executeCallWebhookAction(action, context)
        break
      case 'assign_user':
        await this.executeAssignUserAction(action, context)
        break
      default:
        throw new Error(`Unsupported action type: ${action.type}`)
    }
  }

  // Action implementations
  private static async executeUpdateFieldAction(action: RuleAction, context: Record<string, any>): Promise<void> {
    const { field, value, target } = action.parameters
    
    if (target === 'tree' && context.treeId && context.farmId) {
      const treeRef = doc(db, 'farms', context.farmId, 'trees', context.treeId)
      await updateDoc(treeRef, { [field]: value, updatedAt: Timestamp.now() })
    }
    // Add more targets as needed
  }

  private static async executeSendNotificationAction(action: RuleAction, context: Record<string, any>): Promise<void> {
    const { message, recipients, priority } = action.parameters
    
    // Create notification record
    const notificationsRef = collection(db, 'notifications')
    await addDoc(notificationsRef, {
      message,
      recipients: Array.isArray(recipients) ? recipients : [recipients],
      priority: priority || 'medium',
      type: 'rule_triggered',
      context,
      createdAt: Timestamp.now(),
      read: false
    })
  }

  private static async executeCreateTaskAction(action: RuleAction, context: Record<string, any>): Promise<void> {
    const { title, description, assignedTo, dueDate, priority } = action.parameters
    
    const tasksRef = collection(db, 'tasks')
    await addDoc(tasksRef, {
      title,
      description,
      assignedTo,
      dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
      priority: priority || 'medium',
      status: 'pending',
      context,
      createdAt: Timestamp.now()
    })
  }

  private static async executeLogEventAction(action: RuleAction, context: Record<string, any>): Promise<void> {
    const { event, level, data } = action.parameters
    
    const logsRef = collection(db, 'ruleLogs')
    await addDoc(logsRef, {
      event,
      level: level || 'info',
      data: { ...data, context },
      timestamp: Timestamp.now()
    })
  }

  private static async executeCallWebhookAction(action: RuleAction, context: Record<string, any>): Promise<void> {
    const { url, method, headers, payload } = action.parameters

    // This would typically be handled by a cloud function
  }

  private static async executeAssignUserAction(action: RuleAction, context: Record<string, any>): Promise<void> {
    const { userId, role, farmId } = action.parameters
    
    if (farmId && userId && role) {
      await AdminService.assignUserToFarm(userId, farmId, role)
    }
  }

  // Get rule templates
  static async getRuleTemplates(): Promise<RuleTemplate[]> {
    try {
      const templatesRef = collection(db, 'ruleTemplates')
      const snapshot = await getDocs(templatesRef)
      const templates: RuleTemplate[] = []
      
      snapshot.forEach(doc => {
        templates.push({
          id: doc.id,
          ...doc.data()
        } as RuleTemplate)
      })

      // Return default templates if none exist
      if (templates.length === 0) {
        return this.getDefaultTemplates()
      }

      return templates
    } catch (error) {
      return this.getDefaultTemplates()
    }
  }

  // Get default rule templates
  private static getDefaultTemplates(): RuleTemplate[] {
    return [
      {
        id: 'auto-health-check',
        name: 'Automatic Health Status Update',
        description: 'Automatically update tree health status based on age and conditions',
        category: 'automation',
        isBuiltIn: true,
        conditions: [
          {
            field: 'plantingDate',
            operator: 'less_than',
            value: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
            dataType: 'date'
          }
        ],
        actions: [
          {
            type: 'update_field',
            parameters: { field: 'healthStatus', value: 'Mature', target: 'tree' },
            order: 1
          }
        ]
      },
      {
        id: 'low-fruit-count-alert',
        name: 'Low Fruit Count Alert',
        description: 'Send notification when fruit count is below threshold',
        category: 'notification',
        isBuiltIn: true,
        conditions: [
          {
            field: 'manualFruitCount',
            operator: 'less_than',
            value: 10,
            dataType: 'number'
          }
        ],
        actions: [
          {
            type: 'send_notification',
            parameters: { 
              message: 'Tree has low fruit count and may need attention',
              priority: 'medium'
            },
            order: 1
          }
        ]
      },
      {
        id: 'new-user-validation',
        name: 'New User Validation',
        description: 'Validate new user registrations',
        category: 'validation',
        isBuiltIn: true,
        conditions: [
          {
            field: 'email',
            operator: 'contains',
            value: '@',
            dataType: 'string'
          }
        ],
        actions: [
          {
            type: 'log_event',
            parameters: { event: 'user_validated', level: 'info' },
            order: 1
          }
        ]
      }
    ]
  }

  // Create rule from template
  static async createRuleFromTemplate(
    templateId: string,
    customParameters: Partial<BusinessRule>,
    userId: string
  ): Promise<string> {
    try {
      const templates = await this.getRuleTemplates()
      const template = templates.find(t => t.id === templateId)
      
      if (!template) {
        throw new Error(`Template not found: ${templateId}`)
      }

      const rule: Omit<BusinessRule, 'id' | 'createdAt' | 'updatedAt' | 'triggerCount' | 'successCount' | 'failureCount'> = {
        name: customParameters.name || template.name,
        description: customParameters.description || template.description,
        category: template.category,
        isActive: customParameters.isActive !== undefined ? customParameters.isActive : true,
        priority: customParameters.priority || 1,
        conditions: template.conditions.map((cond, index) => ({
          ...cond,
          id: `condition_${index + 1}`
        })),
        actions: template.actions.map((action, index) => ({
          ...action,
          id: `action_${index + 1}`
        })),
        createdBy: userId
      }

      return await this.createBusinessRule(rule)
    } catch (error) {
      throw error
    }
  }

  // Get rule execution history
  static async getRuleExecutions(ruleId?: string, limit: number = 50): Promise<RuleExecution[]> {
    try {
      let q = query(
        collection(db, 'ruleExecutions'),
        orderBy('triggeredAt', 'desc')
      )

      if (ruleId) {
        q = query(q, where('ruleId', '==', ruleId))
      }

      const snapshot = await getDocs(q)
      const executions: RuleExecution[] = []
      
      snapshot.forEach(doc => {
        const data = doc.data()
        executions.push({
          id: doc.id,
          ...data,
          triggeredAt: data.triggeredAt?.toDate() || new Date()
        } as RuleExecution)
      })

      return executions.slice(0, limit)
    } catch (error) {
      return []
    }
  }
}