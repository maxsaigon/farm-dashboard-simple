import { 
  collection, 
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  startAfter,
  DocumentSnapshot
} from 'firebase/firestore'
import { db } from './firebase'

// Audit Log Types
export interface AuditLog {
  id: string
  timestamp: Date
  userId: string
  userEmail: string
  action: string
  resource: string
  resourceId: string
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'authentication' | 'data_modification' | 'system_access' | 'configuration'
  status: 'success' | 'failure' | 'pending'
}

export interface ComplianceRule {
  id: string
  name: string
  description: string
  category: string
  status: 'compliant' | 'warning' | 'violation'
  lastChecked: Date
  nextCheck: Date
  requirements: string[]
  violations: string[]
}

export interface AuditStats {
  totalLogs: number
  criticalEvents: number
  failedAttempts: number
  complianceScore: number
}

export class AuditService {
  
  // Log an audit event
  static async logEvent(event: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditRef = collection(db, 'auditLogs')
      await addDoc(auditRef, {
        ...event,
        timestamp: Timestamp.now()
      })
    } catch (error) {
      // Don't throw error to avoid breaking the main operation
    }
  }

  // Get audit logs with pagination
  static async getAuditLogs(
    pageSize: number = 50,
    lastDoc?: DocumentSnapshot,
    filters?: {
      userId?: string
      action?: string
      severity?: string
      category?: string
      dateFrom?: Date
      dateTo?: Date
    }
  ): Promise<{ logs: AuditLog[], lastDoc?: DocumentSnapshot }> {
    try {
      let q = query(
        collection(db, 'auditLogs'),
        orderBy('timestamp', 'desc'),
        limit(pageSize)
      )

      // Apply filters
      if (filters) {
        if (filters.userId) {
          q = query(q, where('userId', '==', filters.userId))
        }
        if (filters.action) {
          q = query(q, where('action', '==', filters.action))
        }
        if (filters.severity) {
          q = query(q, where('severity', '==', filters.severity))
        }
        if (filters.category) {
          q = query(q, where('category', '==', filters.category))
        }
        if (filters.dateFrom) {
          q = query(q, where('timestamp', '>=', Timestamp.fromDate(filters.dateFrom)))
        }
        if (filters.dateTo) {
          q = query(q, where('timestamp', '<=', Timestamp.fromDate(filters.dateTo)))
        }
      }

      // Add pagination
      if (lastDoc) {
        q = query(q, startAfter(lastDoc))
      }

      const snapshot = await getDocs(q)
      const logs: AuditLog[] = []
      
      snapshot.forEach(doc => {
        const data = doc.data()
        logs.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        } as AuditLog)
      })

      return {
        logs,
        lastDoc: snapshot.docs[snapshot.docs.length - 1]
      }
    } catch (error) {
      return { logs: [] }
    }
  }

  // Get audit statistics
  static async getAuditStats(dateFrom?: Date, dateTo?: Date): Promise<AuditStats> {
    try {
      let q = query(collection(db, 'auditLogs'))

      if (dateFrom) {
        q = query(q, where('timestamp', '>=', Timestamp.fromDate(dateFrom)))
      }
      if (dateTo) {
        q = query(q, where('timestamp', '<=', Timestamp.fromDate(dateTo)))
      }

      const snapshot = await getDocs(q)
      const logs: AuditLog[] = []
      
      snapshot.forEach(doc => {
        const data = doc.data()
        logs.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        } as AuditLog)
      })

      const totalLogs = logs.length
      const criticalEvents = logs.filter(log => log.severity === 'critical').length
      const failedAttempts = logs.filter(log => log.status === 'failure').length
      
      // Get compliance rules to calculate score
      const complianceRules = await this.getComplianceRules()
      const compliantRules = complianceRules.filter(rule => rule.status === 'compliant').length
      const complianceScore = complianceRules.length > 0 ? (compliantRules / complianceRules.length) * 100 : 100

      return {
        totalLogs,
        criticalEvents,
        failedAttempts,
        complianceScore
      }
    } catch (error) {
      return {
        totalLogs: 0,
        criticalEvents: 0,
        failedAttempts: 0,
        complianceScore: 0
      }
    }
  }

  // Get compliance rules
  static async getComplianceRules(): Promise<ComplianceRule[]> {
    try {
      const rulesRef = collection(db, 'complianceRules')
      const snapshot = await getDocs(rulesRef)
      const rules: ComplianceRule[] = []
      
      snapshot.forEach(doc => {
        const data = doc.data()
        rules.push({
          id: doc.id,
          ...data,
          lastChecked: data.lastChecked?.toDate() || new Date(),
          nextCheck: data.nextCheck?.toDate() || new Date()
        } as ComplianceRule)
      })

      return rules
    } catch (error) {
      return []
    }
  }

  // Initialize default compliance rules if none exist
  static async initializeComplianceRules(): Promise<void> {
    try {
      const existingRules = await this.getComplianceRules()
      if (existingRules.length > 0) return

      const defaultRules: Omit<ComplianceRule, 'id'>[] = [
        {
          name: 'Data Retention Policy',
          description: 'Ensure data is retained according to policy requirements',
          category: 'data_retention',
          status: 'compliant',
          lastChecked: new Date(),
          nextCheck: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          requirements: ['Retain user data for 7 years', 'Archive inactive data after 2 years'],
          violations: []
        },
        {
          name: 'Access Control',
          description: 'Verify proper access controls are in place',
          category: 'access_control',
          status: 'compliant',
          lastChecked: new Date(),
          nextCheck: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
          requirements: ['Role-based access control', 'Regular access reviews'],
          violations: []
        },
        {
          name: 'Audit Logging',
          description: 'Ensure comprehensive audit logging is enabled',
          category: 'audit_logging',
          status: 'compliant',
          lastChecked: new Date(),
          nextCheck: new Date(Date.now() + 18 * 60 * 60 * 1000), // 18 hours
          requirements: ['Log all admin actions', 'Retain logs for 1 year'],
          violations: []
        }
      ]

      const rulesRef = collection(db, 'complianceRules')
      for (const rule of defaultRules) {
        await addDoc(rulesRef, {
          ...rule,
          lastChecked: Timestamp.fromDate(rule.lastChecked),
          nextCheck: Timestamp.fromDate(rule.nextCheck)
        })
      }

    } catch (error) {
      // Error initializing compliance rules
    }
  }

  // Log common audit events
  static async logUserLogin(userId: string, userEmail: string, success: boolean, details?: any): Promise<void> {
    await this.logEvent({
      userId,
      userEmail,
      action: success ? 'USER_LOGIN' : 'LOGIN_FAILED',
      resource: 'authentication',
      resourceId: `login_${Date.now()}`,
      details: details || {},
      severity: success ? 'low' : 'medium',
      category: 'authentication',
      status: success ? 'success' : 'failure'
    })
  }

  static async logDataModification(userId: string, userEmail: string, resource: string, resourceId: string, action: string, details?: any): Promise<void> {
    await this.logEvent({
      userId,
      userEmail,
      action,
      resource,
      resourceId,
      details: details || {},
      severity: 'medium',
      category: 'data_modification',
      status: 'success'
    })
  }

  static async logSystemAccess(userId: string, userEmail: string, resource: string, details?: any): Promise<void> {
    await this.logEvent({
      userId,
      userEmail,
      action: 'SYSTEM_ACCESS',
      resource,
      resourceId: `access_${Date.now()}`,
      details: details || {},
      severity: 'low',
      category: 'system_access',
      status: 'success'
    })
  }

  // Log tree-specific changes
  static async logTreeUpdate(
    userId: string,
    userEmail: string,
    treeId: string,
    farmId: string,
    field: string,
    oldValue: any,
    newValue: any,
    note?: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      userEmail,
      action: 'TREE_UPDATE',
      resource: 'tree',
      resourceId: treeId,
      details: {
        farmId,
        field,
        oldValue,
        newValue,
        note
      },
      severity: 'low',
      category: 'data_modification',
      status: 'success'
    })
  }

  // Log tree creation
  static async logTreeCreation(userId: string, userEmail: string, treeId: string, farmId: string, details?: any): Promise<void> {
    await this.logEvent({
      userId,
      userEmail,
      action: 'TREE_CREATED',
      resource: 'tree',
      resourceId: treeId,
      details: { farmId, ...details },
      severity: 'low',
      category: 'data_modification',
      status: 'success'
    })
  }

  // Log tree deletion
  static async logTreeDeletion(userId: string, userEmail: string, treeId: string, farmId: string, details?: any): Promise<void> {
    await this.logEvent({
      userId,
      userEmail,
      action: 'TREE_DELETED',
      resource: 'tree',
      resourceId: treeId,
      details: { farmId, ...details },
      severity: 'medium',
      category: 'data_modification',
      status: 'success'
    })
  }
}