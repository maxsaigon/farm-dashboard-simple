import { 
  collection, 
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { AdminService } from './admin-service'

// Analytics Types
export interface AnalyticsData {
  userGrowth: {
    labels: string[]
    datasets: Array<{
      label: string
      data: number[]
      borderColor: string
      backgroundColor: string
    }>
  }
  farmActivity: {
    labels: string[]
    datasets: Array<{
      label: string
      data: number[]
      backgroundColor: string[]
    }>
  }
  treeHealth: {
    labels: string[]
    datasets: Array<{
      data: number[]
      backgroundColor: string[]
    }>
  }
  systemPerformance: {
    labels: string[]
    datasets: Array<{
      label: string
      data: number[]
      borderColor: string
      backgroundColor: string
      fill: boolean
    }>
  }
  keyMetrics: {
    totalUsers: number
    activeFarms: number
    totalTrees: number
    systemUptime: number
    avgResponseTime: number
    errorRate: number
  }
}

export interface SystemMetrics {
  timestamp: Date
  responseTime: number
  errorCount: number
  activeUsers: number
  memoryUsage: number
  cpuUsage: number
}

export class AnalyticsService {
  
  // Get comprehensive analytics data
  static async getAnalyticsData(): Promise<AnalyticsData> {
    try {
      const [
        userGrowthData,
        farmActivityData,
        treeHealthData,
        systemPerformanceData,
        keyMetrics
      ] = await Promise.all([
        this.getUserGrowthData(),
        this.getFarmActivityData(),
        this.getTreeHealthData(),
        this.getSystemPerformanceData(),
        this.getKeyMetrics()
      ])

      return {
        userGrowth: userGrowthData,
        farmActivity: farmActivityData,
        treeHealth: treeHealthData,
        systemPerformance: systemPerformanceData,
        keyMetrics
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error)
      return this.getDefaultAnalyticsData()
    }
  }

  // Get user growth data from Firebase
  private static async getUserGrowthData() {
    try {
      const users = await AdminService.getAllUsers()
      
      // Group users by month for the last 6 months
      const months = []
      const userCounts = []
      const now = new Date()
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        months.push(monthName)
        
        const usersInMonth = users.filter(user => {
          const userDate = user.createdAt
          return userDate && 
                 userDate.getFullYear() === date.getFullYear() && 
                 userDate.getMonth() === date.getMonth()
        }).length
        
        userCounts.push(usersInMonth)
      }

      return {
        labels: months,
        datasets: [{
          label: 'New Users',
          data: userCounts,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)'
        }]
      }
    } catch (error) {
      console.error('Error getting user growth data:', error)
      return this.getDefaultUserGrowthData()
    }
  }

  // Get farm activity data
  private static async getFarmActivityData() {
    try {
      const farms = await AdminService.getAllFarms()
      const trees = await AdminService.getAllTrees()
      
      // Calculate activity by farm
      const farmActivity = farms.map(farm => {
        const farmTrees = trees.filter(tree => tree.farmId === farm.id)
        return {
          name: farm.name,
          treeCount: farmTrees.length,
          recentActivity: farmTrees.filter(tree => {
            const lastUpdate = tree.updatedAt
            if (!lastUpdate) return false
            const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
            return daysSinceUpdate <= 7 // Active in last 7 days
          }).length
        }
      })

      const labels = farmActivity.map(f => f.name)
      const data = farmActivity.map(f => f.recentActivity)
      const colors = this.generateColors(labels.length)

      return {
        labels,
        datasets: [{
          label: 'Recent Activity',
          data,
          backgroundColor: colors
        }]
      }
    } catch (error) {
      console.error('Error getting farm activity data:', error)
      return this.getDefaultFarmActivityData()
    }
  }

  // Get tree health distribution
  private static async getTreeHealthData() {
    try {
      const trees = await AdminService.getAllTrees()
      
      const healthCounts = {
        'Excellent': 0,
        'Good': 0,
        'Fair': 0,
        'Poor': 0,
        'Unknown': 0
      }

      trees.forEach(tree => {
        const health = tree.healthStatus || 'Unknown'
        if (health in healthCounts) {
          healthCounts[health as keyof typeof healthCounts]++
        } else {
          healthCounts.Unknown++
        }
      })

      return {
        labels: Object.keys(healthCounts),
        datasets: [{
          data: Object.values(healthCounts),
          backgroundColor: [
            '#10b981', // Excellent - green
            '#3b82f6', // Good - blue
            '#f59e0b', // Fair - yellow
            '#ef4444', // Poor - red
            '#6b7280'  // Unknown - gray
          ]
        }]
      }
    } catch (error) {
      console.error('Error getting tree health data:', error)
      return this.getDefaultTreeHealthData()
    }
  }

  // Get system performance data
  private static async getSystemPerformanceData() {
    try {
      // Try to get real system metrics from Firebase
      const metricsRef = collection(db, 'systemMetrics')
      const q = query(
        metricsRef, 
        orderBy('timestamp', 'desc'),
        // limit to last 24 hours of data points
      )
      const snapshot = await getDocs(q)
      
      if (snapshot.empty) {
        return this.getDefaultSystemPerformanceData()
      }

      const metrics: SystemMetrics[] = []
      snapshot.forEach(doc => {
        const data = doc.data()
        metrics.push({
          timestamp: data.timestamp?.toDate() || new Date(),
          responseTime: data.responseTime || 0,
          errorCount: data.errorCount || 0,
          activeUsers: data.activeUsers || 0,
          memoryUsage: data.memoryUsage || 0,
          cpuUsage: data.cpuUsage || 0
        })
      })

      // Sort by timestamp
      metrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

      const labels = metrics.map(m => m.timestamp.toLocaleTimeString())
      const responseTimeData = metrics.map(m => m.responseTime)

      return {
        labels,
        datasets: [{
          label: 'Response Time (ms)',
          data: responseTimeData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true
        }]
      }
    } catch (error) {
      console.error('Error getting system performance data:', error)
      return this.getDefaultSystemPerformanceData()
    }
  }

  // Get key metrics
  private static async getKeyMetrics() {
    try {
      const [users, farms, trees] = await Promise.all([
        AdminService.getAllUsers(),
        AdminService.getAllFarms(),
        AdminService.getAllTrees()
      ])

      // Calculate active farms (farms with recent tree updates)
      const activeFarms = farms.filter(farm => {
        const farmTrees = trees.filter(tree => tree.farmId === farm.id)
        return farmTrees.some(tree => {
          const lastUpdate = tree.updatedAt
          if (!lastUpdate) return false
          const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
          return daysSinceUpdate <= 30 // Active in last 30 days
        })
      }).length

      return {
        totalUsers: users.length,
        activeFarms,
        totalTrees: trees.length,
        systemUptime: 99.9, // This would come from monitoring system
        avgResponseTime: 150, // This would come from monitoring system
        errorRate: 0.1 // This would come from monitoring system
      }
    } catch (error) {
      console.error('Error getting key metrics:', error)
      return {
        totalUsers: 0,
        activeFarms: 0,
        totalTrees: 0,
        systemUptime: 0,
        avgResponseTime: 0,
        errorRate: 0
      }
    }
  }

  // Helper function to generate colors
  private static generateColors(count: number): string[] {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ]
    
    const result = []
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length])
    }
    return result
  }

  // Default/fallback data methods
  private static getDefaultAnalyticsData(): AnalyticsData {
    return {
      userGrowth: this.getDefaultUserGrowthData(),
      farmActivity: this.getDefaultFarmActivityData(),
      treeHealth: this.getDefaultTreeHealthData(),
      systemPerformance: this.getDefaultSystemPerformanceData(),
      keyMetrics: {
        totalUsers: 0,
        activeFarms: 0,
        totalTrees: 0,
        systemUptime: 0,
        avgResponseTime: 0,
        errorRate: 0
      }
    }
  }

  private static getDefaultUserGrowthData() {
    const months = ['Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024', 'Jun 2024']
    return {
      labels: months,
      datasets: [{
        label: 'New Users',
        data: [0, 0, 0, 0, 0, 0],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)'
      }]
    }
  }

  private static getDefaultFarmActivityData() {
    return {
      labels: ['No Data'],
      datasets: [{
        label: 'Recent Activity',
        data: [0],
        backgroundColor: ['#6b7280']
      }]
    }
  }

  private static getDefaultTreeHealthData() {
    return {
      labels: ['No Data'],
      datasets: [{
        data: [1],
        backgroundColor: ['#6b7280']
      }]
    }
  }

  private static getDefaultSystemPerformanceData() {
    const hours = Array.from({length: 24}, (_, i) => `${i}:00`)
    return {
      labels: hours,
      datasets: [{
        label: 'Response Time (ms)',
        data: Array(24).fill(0),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true
      }]
    }
  }
}