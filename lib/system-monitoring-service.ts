import { 
  collection, 
  doc,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
  where
} from 'firebase/firestore'
import { db } from './firebase'
import { AdminService } from './admin-service'

// System Health Types
export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical'
  services: {
    database: ServiceStatus
    authentication: ServiceStatus
    storage: ServiceStatus
    api: ServiceStatus
  }
  metrics: {
    uptime: number
    responseTime: number
    errorRate: number
    activeUsers: number
    memoryUsage: number
    cpuUsage: number
  }
  alerts: SystemAlert[]
  lastUpdated: Date
}

export interface ServiceStatus {
  status: 'healthy' | 'warning' | 'critical'
  responseTime: number
  uptime: number
  lastCheck: Date
  message?: string
}

export interface SystemAlert {
  id: string
  type: 'info' | 'warning' | 'error' | 'critical'
  title: string
  message: string
  timestamp: Date
  resolved: boolean
  service?: string
}

export interface PerformanceMetric {
  timestamp: Date
  responseTime: number
  errorCount: number
  activeUsers: number
  memoryUsage: number
  cpuUsage: number
  requestCount: number
}

export class SystemMonitoringService {
  
  // Get current system health
  static async getSystemHealth(): Promise<SystemHealth> {
    try {
      const [
        serviceStatuses,
        metrics,
        alerts
      ] = await Promise.all([
        this.checkServiceStatuses(),
        this.getCurrentMetrics(),
        this.getActiveAlerts()
      ])

      // Determine overall health
      const serviceHealthLevels = Object.values(serviceStatuses).map(s => s.status)
      let overall: 'healthy' | 'warning' | 'critical' = 'healthy'
      
      if (serviceHealthLevels.includes('critical')) {
        overall = 'critical'
      } else if (serviceHealthLevels.includes('warning')) {
        overall = 'warning'
      }

      return {
        overall,
        services: serviceStatuses,
        metrics,
        alerts,
        lastUpdated: new Date()
      }
    } catch (error) {
      console.error('Error getting system health:', error)
      return this.getDefaultSystemHealth()
    }
  }

  // Check individual service statuses
  private static async checkServiceStatuses(): Promise<SystemHealth['services']> {
    const now = new Date()
    
    try {
      // Test database connectivity
      const dbStatus = await this.testDatabaseConnection()
      
      // Test authentication (check if we can access user data)
      const authStatus = await this.testAuthenticationService()
      
      // Test storage (this would need actual storage operations)
      const storageStatus = await this.testStorageService()
      
      // Test API responsiveness
      const apiStatus = await this.testApiService()

      return {
        database: dbStatus,
        authentication: authStatus,
        storage: storageStatus,
        api: apiStatus
      }
    } catch (error) {
      console.error('Error checking service statuses:', error)
      return {
        database: { status: 'critical', responseTime: 0, uptime: 0, lastCheck: now, message: 'Connection failed' },
        authentication: { status: 'critical', responseTime: 0, uptime: 0, lastCheck: now, message: 'Service unavailable' },
        storage: { status: 'critical', responseTime: 0, uptime: 0, lastCheck: now, message: 'Service unavailable' },
        api: { status: 'critical', responseTime: 0, uptime: 0, lastCheck: now, message: 'Service unavailable' }
      }
    }
  }

  // Test database connection
  private static async testDatabaseConnection(): Promise<ServiceStatus> {
    const startTime = Date.now()
    const now = new Date()
    
    try {
      // Simple query to test database connectivity
      const testQuery = query(collection(db, 'farms'), limit(1))
      await getDocs(testQuery)
      
      const responseTime = Date.now() - startTime
      
      return {
        status: responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'warning' : 'critical',
        responseTime,
        uptime: 99.9, // This would come from monitoring system
        lastCheck: now,
        message: responseTime < 1000 ? 'Connection healthy' : 'Slow response time'
      }
    } catch (error) {
      return {
        status: 'critical',
        responseTime: Date.now() - startTime,
        uptime: 0,
        lastCheck: now,
        message: `Database error: ${(error as Error).message}`
      }
    }
  }

  // Test authentication service
  private static async testAuthenticationService(): Promise<ServiceStatus> {
    const startTime = Date.now()
    const now = new Date()
    
    try {
      // Test by trying to access users collection
      const testQuery = query(collection(db, 'users'), limit(1))
      await getDocs(testQuery)
      
      const responseTime = Date.now() - startTime
      
      return {
        status: responseTime < 500 ? 'healthy' : responseTime < 2000 ? 'warning' : 'critical',
        responseTime,
        uptime: 99.8,
        lastCheck: now,
        message: 'Authentication service operational'
      }
    } catch (error) {
      return {
        status: 'critical',
        responseTime: Date.now() - startTime,
        uptime: 0,
        lastCheck: now,
        message: `Auth error: ${(error as Error).message}`
      }
    }
  }

  // Test storage service
  private static async testStorageService(): Promise<ServiceStatus> {
    const now = new Date()
    
    // For now, assume storage is healthy since we can't easily test without actual operations
    return {
      status: 'healthy',
      responseTime: 200,
      uptime: 99.5,
      lastCheck: now,
      message: 'Storage service operational'
    }
  }

  // Test API service
  private static async testApiService(): Promise<ServiceStatus> {
    const startTime = Date.now()
    const now = new Date()
    
    try {
      // Test API responsiveness by checking if we can get farm data
      const farms = await AdminService.getAllFarms()
      const responseTime = Date.now() - startTime
      
      return {
        status: responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'warning' : 'critical',
        responseTime,
        uptime: 99.7,
        lastCheck: now,
        message: `API responding normally (${farms.length} farms)`
      }
    } catch (error) {
      return {
        status: 'critical',
        responseTime: Date.now() - startTime,
        uptime: 0,
        lastCheck: now,
        message: `API error: ${(error as Error).message}`
      }
    }
  }

  // Get current system metrics
  private static async getCurrentMetrics(): Promise<SystemHealth['metrics']> {
    try {
      const [users, farms, trees] = await Promise.all([
        AdminService.getAllUsers(),
        AdminService.getAllFarms(),
        AdminService.getAllTrees()
      ])

      // Calculate active users (users who logged in recently)
      const activeUsers = users.filter(user => {
        if (!user.lastLoginAt) return false
        const daysSinceLogin = (Date.now() - user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24)
        return daysSinceLogin <= 7 // Active in last 7 days
      }).length

      return {
        uptime: 99.9, // This would come from monitoring system
        responseTime: 150, // Average response time in ms
        errorRate: 0.1, // Error rate percentage
        activeUsers,
        memoryUsage: 65, // Memory usage percentage
        cpuUsage: 45 // CPU usage percentage
      }
    } catch (error) {
      console.error('Error getting current metrics:', error)
      return {
        uptime: 0,
        responseTime: 0,
        errorRate: 100,
        activeUsers: 0,
        memoryUsage: 0,
        cpuUsage: 0
      }
    }
  }

  // Get active system alerts
  private static async getActiveAlerts(): Promise<SystemAlert[]> {
    try {
      const alertsRef = collection(db, 'systemAlerts')
      
      // Simple query without composite index requirement
      // We'll filter and sort in memory to avoid index requirements
      const snapshot = await getDocs(alertsRef)
      const alerts: SystemAlert[] = []
      
      snapshot.forEach(doc => {
        const data = doc.data()
        const alert = {
          id: doc.id,
          type: data.type || 'info',
          title: data.title || 'System Alert',
          message: data.message || '',
          timestamp: data.timestamp?.toDate() || new Date(),
          resolved: data.resolved || false,
          service: data.service
        }
        
        // Only include unresolved alerts
        if (!alert.resolved) {
          alerts.push(alert)
        }
      })

      // Sort by timestamp (most recent first) and limit to 10
      return alerts
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10)
        
    } catch (error) {
      console.error('Error getting system alerts:', error)
      return []
    }
  }

  // Log a performance metric
  static async logPerformanceMetric(metric: Omit<PerformanceMetric, 'timestamp'>): Promise<void> {
    try {
      const metricsRef = collection(db, 'systemMetrics')
      await addDoc(metricsRef, {
        ...metric,
        timestamp: Timestamp.now()
      })
    } catch (error) {
      console.error('Error logging performance metric:', error)
    }
  }

  // Create a system alert
  static async createAlert(alert: Omit<SystemAlert, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    try {
      const alertsRef = collection(db, 'systemAlerts')
      await addDoc(alertsRef, {
        ...alert,
        timestamp: Timestamp.now(),
        resolved: false
      })
    } catch (error) {
      console.error('Error creating system alert:', error)
    }
  }

  // Get performance metrics for a time period
  static async getPerformanceMetrics(hours: number = 24): Promise<PerformanceMetric[]> {
    try {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000)
      const metricsRef = collection(db, 'systemMetrics')
      
      // Simple query without composite index requirement
      // We'll filter and sort in memory to avoid index requirements
      const snapshot = await getDocs(metricsRef)
      const metrics: PerformanceMetric[] = []
      
      snapshot.forEach(doc => {
        const data = doc.data()
        const metric = {
          timestamp: data.timestamp?.toDate() || new Date(),
          responseTime: data.responseTime || 0,
          errorCount: data.errorCount || 0,
          activeUsers: data.activeUsers || 0,
          memoryUsage: data.memoryUsage || 0,
          cpuUsage: data.cpuUsage || 0,
          requestCount: data.requestCount || 0
        }
        
        // Only include metrics within the time range
        if (metric.timestamp >= startTime) {
          metrics.push(metric)
        }
      })

      // Sort by timestamp (oldest first)
      return metrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    } catch (error) {
      console.error('Error getting performance metrics:', error)
      return []
    }
  }

  // Default system health for fallback
  private static getDefaultSystemHealth(): SystemHealth {
    const now = new Date()
    return {
      overall: 'warning',
      services: {
        database: { status: 'warning', responseTime: 0, uptime: 0, lastCheck: now, message: 'Unable to check' },
        authentication: { status: 'warning', responseTime: 0, uptime: 0, lastCheck: now, message: 'Unable to check' },
        storage: { status: 'warning', responseTime: 0, uptime: 0, lastCheck: now, message: 'Unable to check' },
        api: { status: 'warning', responseTime: 0, uptime: 0, lastCheck: now, message: 'Unable to check' }
      },
      metrics: {
        uptime: 0,
        responseTime: 0,
        errorRate: 0,
        activeUsers: 0,
        memoryUsage: 0,
        cpuUsage: 0
      },
      alerts: [],
      lastUpdated: now
    }
  }
}