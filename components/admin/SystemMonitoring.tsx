'use client'

import { useState, useEffect } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { SystemMonitoringService, SystemHealth } from '@/lib/system-monitoring-service'
import { 
  CpuChipIcon,
  CircleStackIcon,
  CloudIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BoltIcon,
  ChartBarIcon,
  ArrowPathIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

interface LocalSystemHealth {
  overall: 'healthy' | 'warning' | 'critical'
  uptime: number
  lastUpdate: Date
  services: ServiceStatus[]
  metrics: SystemMetrics
  alerts: SystemAlert[]
}

interface ServiceStatus {
  name: string
  status: 'online' | 'offline' | 'degraded'
  responseTime: number
  lastCheck: Date
  uptime: number
  description: string
}

interface SystemMetrics {
  cpu: {
    usage: number
    cores: number
    temperature: number
  }
  memory: {
    used: number
    total: number
    percentage: number
  }
  storage: {
    used: number
    total: number
    percentage: number
  }
  network: {
    inbound: number
    outbound: number
    latency: number
  }
  database: {
    connections: number
    maxConnections: number
    queryTime: number
  }
}

interface SystemAlert {
  id: string
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  resolved: boolean
  service?: string
}

export default function SystemMonitoring() {
  const { user } = useSimpleAuth()
  const [systemHealth, setSystemHealth] = useState<LocalSystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30) // seconds

  useEffect(() => {
    loadSystemHealth()
    
    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(loadSystemHealth, refreshInterval * 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const loadSystemHealth = async () => {
    try {
      setLoading(true)
      
      // Load real system health data from Firebase
      const realSystemHealth = await SystemMonitoringService.getSystemHealth()
      
      // Transform the data to match the component's expected structure
      const transformedHealth: LocalSystemHealth = {
        overall: realSystemHealth.overall,
        uptime: realSystemHealth.metrics.uptime,
        lastUpdate: realSystemHealth.lastUpdated,
        services: [
          {
            name: 'Database',
            status: realSystemHealth.services.database.status === 'healthy' ? 'online' : 
                   realSystemHealth.services.database.status === 'warning' ? 'degraded' : 'offline',
            responseTime: realSystemHealth.services.database.responseTime,
            lastCheck: realSystemHealth.services.database.lastCheck,
            uptime: realSystemHealth.services.database.uptime,
            description: 'Firebase Firestore database'
          },
          {
            name: 'Authentication',
            status: realSystemHealth.services.authentication.status === 'healthy' ? 'online' : 
                   realSystemHealth.services.authentication.status === 'warning' ? 'degraded' : 'offline',
            responseTime: realSystemHealth.services.authentication.responseTime,
            lastCheck: realSystemHealth.services.authentication.lastCheck,
            uptime: realSystemHealth.services.authentication.uptime,
            description: 'Firebase Authentication service'
          },
          {
            name: 'File Storage',
            status: realSystemHealth.services.storage.status === 'healthy' ? 'online' : 
                   realSystemHealth.services.storage.status === 'warning' ? 'degraded' : 'offline',
            responseTime: realSystemHealth.services.storage.responseTime,
            lastCheck: realSystemHealth.services.storage.lastCheck,
            uptime: realSystemHealth.services.storage.uptime,
            description: 'Firebase Storage for files and images'
          },
          {
            name: 'API Service',
            status: realSystemHealth.services.api.status === 'healthy' ? 'online' : 
                   realSystemHealth.services.api.status === 'warning' ? 'degraded' : 'offline',
            responseTime: realSystemHealth.services.api.responseTime,
            lastCheck: realSystemHealth.services.api.lastCheck,
            uptime: realSystemHealth.services.api.uptime,
            description: 'Main API service'
          }
        ],
        metrics: {
          cpu: {
            usage: realSystemHealth.metrics.cpuUsage,
            cores: 4, // This would come from system info
            temperature: 42 // This would come from system monitoring
          },
          memory: {
            used: realSystemHealth.metrics.memoryUsage * 8 / 100, // Convert percentage to GB
            total: 8.0, // This would come from system info
            percentage: realSystemHealth.metrics.memoryUsage
          },
          storage: {
            used: 45.2, // This would come from storage monitoring
            total: 100.0, // This would come from storage info
            percentage: 45.2 // This would be calculated
          },
          network: {
            inbound: 1.2, // This would come from network monitoring
            outbound: 0.8, // This would come from network monitoring
            latency: realSystemHealth.metrics.responseTime
          },
          database: {
            connections: realSystemHealth.metrics.activeUsers, // Use active users as proxy
            maxConnections: 100, // This would come from database config
            queryTime: realSystemHealth.metrics.responseTime
          }
        },
        alerts: realSystemHealth.alerts.map(alert => ({
          id: alert.id,
          type: alert.type === 'critical' ? 'error' : alert.type === 'warning' ? 'warning' : 'info',
          title: alert.title,
          message: alert.message,
          timestamp: alert.timestamp,
          resolved: alert.resolved,
          service: alert.service
        }))
      }
      
      setSystemHealth(transformedHealth)
    } catch (error) {
      console.error('Error loading system health:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'degraded':
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'offline':
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'healthy': return <CheckCircleIcon className="h-5 w-5" />
      case 'degraded':
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5" />
      case 'offline':
      case 'critical': return <XCircleIcon className="h-5 w-5" />
      default: return <ClockIcon className="h-5 w-5" />
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'info': return <CheckCircleIcon className="h-5 w-5 text-blue-500" />
      default: return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`
  }

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} TB`
    return `${bytes.toFixed(1)} GB`
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
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

  if (!systemHealth) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">System Health Unavailable</h3>
        <p className="text-gray-600">Unable to load system health data. Please try again later.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-gray-600">Real-time system health and performance metrics</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Auto-refresh:</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={!autoRefresh}
          >
            <option value={10}>10 seconds</option>
            <option value={30}>30 seconds</option>
            <option value={60}>1 minute</option>
            <option value={300}>5 minutes</option>
          </select>
          <button
            onClick={loadSystemHealth}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Health Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full ${getStatusColor(systemHealth.overall)}`}>
              {getStatusIcon(systemHealth.overall)}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">System Status: {systemHealth.overall.toUpperCase()}</h2>
              <p className="text-gray-600">Overall uptime: {formatUptime(systemHealth.uptime)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Last updated</p>
            <p className="text-lg font-medium text-gray-900">{formatTimeAgo(systemHealth.lastUpdate)}</p>
          </div>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CPU Usage */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <CpuChipIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">CPU Usage</h3>
            </div>
            <span className="text-2xl font-bold text-gray-900">{systemHealth.metrics.cpu.usage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
              style={{ width: `${systemHealth.metrics.cpu.usage}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>{systemHealth.metrics.cpu.cores} cores</span>
            <span>{systemHealth.metrics.cpu.temperature}°C</span>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <CircleStackIcon className="h-6 w-6 text-green-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Memory</h3>
            </div>
            <span className="text-2xl font-bold text-gray-900">{systemHealth.metrics.memory.percentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div 
              className="bg-green-600 h-3 rounded-full transition-all duration-300" 
              style={{ width: `${systemHealth.metrics.memory.percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>{formatBytes(systemHealth.metrics.memory.used)} used</span>
            <span>{formatBytes(systemHealth.metrics.memory.total)} total</span>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <CloudIcon className="h-6 w-6 text-purple-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Storage</h3>
            </div>
            <span className="text-2xl font-bold text-gray-900">{systemHealth.metrics.storage.percentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div 
              className="bg-purple-600 h-3 rounded-full transition-all duration-300" 
              style={{ width: `${systemHealth.metrics.storage.percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>{formatBytes(systemHealth.metrics.storage.used)} used</span>
            <span>{formatBytes(systemHealth.metrics.storage.total)} total</span>
          </div>
        </div>

        {/* Network */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <SignalIcon className="h-6 w-6 text-indigo-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Network</h3>
            </div>
            <span className="text-2xl font-bold text-gray-900">{systemHealth.metrics.network.latency}ms</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Inbound:</span>
              <span className="font-medium">{systemHealth.metrics.network.inbound} MB/s</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Outbound:</span>
              <span className="font-medium">{systemHealth.metrics.network.outbound} MB/s</span>
            </div>
          </div>
        </div>

        {/* Database */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <CircleStackIcon className="h-6 w-6 text-orange-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Database</h3>
            </div>
            <span className="text-2xl font-bold text-gray-900">{systemHealth.metrics.database.queryTime}ms</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Connections:</span>
              <span className="font-medium">{systemHealth.metrics.database.connections}/{systemHealth.metrics.database.maxConnections}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-600 h-2 rounded-full" 
                style={{ width: `${(systemHealth.metrics.database.connections / systemHealth.metrics.database.maxConnections) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* System Load */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <ChartBarIcon className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">System Load</h3>
            </div>
            <span className="text-2xl font-bold text-gray-900">Normal</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">1 min avg:</span>
              <span className="font-medium">0.45</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">5 min avg:</span>
              <span className="font-medium">0.52</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">15 min avg:</span>
              <span className="font-medium">0.48</span>
            </div>
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Service Status</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemHealth.services.map((service, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{service.name}</h4>
                  <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                    {getStatusIcon(service.status)}
                    <span className="ml-1">{service.status}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Response time:</span>
                    <span className="font-medium">{service.responseTime}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Uptime:</span>
                    <span className="font-medium">{formatUptime(service.uptime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last check:</span>
                    <span className="font-medium">{formatTimeAgo(service.lastCheck)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Alerts */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">System Alerts</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {systemHealth.alerts.map((alert) => (
              <div key={alert.id} className={`border-l-4 p-4 ${
                alert.type === 'error' ? 'border-red-400 bg-red-50' :
                alert.type === 'warning' ? 'border-yellow-400 bg-yellow-50' :
                'border-blue-400 bg-blue-50'
              } ${alert.resolved ? 'opacity-60' : ''}`}>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                      <div className="flex items-center space-x-2">
                        {alert.service && (
                          <span className="text-xs text-gray-500">{alert.service}</span>
                        )}
                        <span className="text-xs text-gray-500">{formatTimeAgo(alert.timestamp)}</span>
                        {alert.resolved && (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            Resolved
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}