'use client'

import { io, Socket } from 'socket.io-client'
import { Tree } from './types'

interface Zone {
  id: string
  name: string
  code?: string
  description?: string
  color?: string
  boundaries: Array<{ latitude: number; longitude: number }>
  treeCount: number
  area: number
  isActive: boolean
  createdAt: Date
}

interface UserLocation {
  userId: string
  farmId: string
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
  heading?: number
  speed?: number
}

interface RealTimeEvent {
  type: 'tree-updated' | 'tree-created' | 'tree-deleted' |
        'zone-updated' | 'zone-created' | 'zone-deleted' |
        'user-location' | 'farm-alert' | 'system-notification'
  data: any
  timestamp: number
  farmId: string
  userId?: string
}

class WebSocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map()

  constructor() {
    this.initializeSocket()
  }

  private initializeSocket() {
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL

      // Don't initialize if no WebSocket URL is provided or if explicitly disabled
      if (!wsUrl || wsUrl === '/' || wsUrl.trim() === '') {
        console.log('WebSocket disabled - no server URL provided')
        return
      }

      // Connect to WebSocket server (will fallback to HTTP polling if WS not available)
      this.socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay
      })

      this.setupEventHandlers()
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error)
    }
  }


  private setupEventHandlers() {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      this.reconnectAttempts = 0
      this.emit('connection-status', { connected: true, id: this.socket?.id })
    })

    this.socket.on('disconnect', (reason) => {
      this.emit('connection-status', { connected: false, reason })
    })

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.emit('connection-status', { connected: false, error: 'max_retries_exceeded' })
      }
    })

    // Real-time data events
    this.socket.on('tree-updated', (data) => this.emit('tree-updated', data))
    this.socket.on('tree-created', (data) => this.emit('tree-created', data))
    this.socket.on('tree-deleted', (data) => this.emit('tree-deleted', data))

    this.socket.on('zone-updated', (data) => this.emit('zone-updated', data))
    this.socket.on('zone-created', (data) => this.emit('zone-created', data))
    this.socket.on('zone-deleted', (data) => this.emit('zone-deleted', data))

    this.socket.on('user-location', (data) => this.emit('user-location', data))
    this.socket.on('farm-alert', (data) => this.emit('farm-alert', data))
    this.socket.on('system-notification', (data) => this.emit('system-notification', data))
  }

  // Join a farm room for real-time updates
  joinFarm(farmId: string, userId?: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join-farm', { farmId, userId })
    }
  }

  // Leave a farm room
  leaveFarm(farmId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave-farm', { farmId })
    }
  }

  // Send location updates
  sendLocation(location: UserLocation) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('update-location', location)
    }
  }

  // Send tree updates (for collaborative editing)
  sendTreeUpdate(treeId: string, updates: Partial<Tree>) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('tree-update', { treeId, updates })
    }
  }

  // Send zone updates
  sendZoneUpdate(zoneId: string, updates: Partial<Zone>) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('zone-update', { zoneId, updates })
    }
  }

  // Event subscription system
  on(event: string, callback: (data: any) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
  }

  off(event: string, callback: (data: any) => void) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          // Error in event listener
        }
      })
    }
  }

  // Connection status
  get isConnected(): boolean {
    return this.socket?.connected || false
  }

  // Check if WebSocket is enabled
  get isEnabled(): boolean {
    return this.socket !== null
  }

  // Cleanup
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.eventListeners.clear()
  }
}

// Singleton instance
let websocketService: WebSocketService | null = null

export const getWebSocketService = (): WebSocketService => {
  if (!websocketService) {
    websocketService = new WebSocketService()
  }
  return websocketService
}

// React hook for using WebSocket
export const useWebSocket = () => {
  const ws = getWebSocketService()

  return {
    isConnected: ws.isConnected,
    isEnabled: ws.isEnabled,
    joinFarm: (farmId: string, userId?: string) => ws.joinFarm(farmId, userId),
    leaveFarm: (farmId: string) => ws.leaveFarm(farmId),
    sendLocation: (location: UserLocation) => ws.sendLocation(location),
    sendTreeUpdate: (treeId: string, updates: Partial<Tree>) => ws.sendTreeUpdate(treeId, updates),
    sendZoneUpdate: (zoneId: string, updates: Partial<Zone>) => ws.sendZoneUpdate(zoneId, updates),
    on: (event: string, callback: (data: any) => void) => ws.on(event, callback),
    off: (event: string, callback: (data: any) => void) => ws.off(event, callback)
  }
}

// Hook for real-time data updates
export const useRealTimeUpdates = (farmId?: string) => {
  const { isConnected, isEnabled, joinFarm, leaveFarm, on, off } = useWebSocket()
  const [connectionStatus, setConnectionStatus] = React.useState<{
    connected: boolean
    error?: string
  }>({ connected: false })

  React.useEffect(() => {
    // Listen for connection status changes
    const handleConnectionStatus = (status: { connected: boolean; error?: string }) => {
      setConnectionStatus(status)
    }

    on('connection-status', handleConnectionStatus)

    return () => {
      off('connection-status', handleConnectionStatus)
    }
  }, [on, off])

  React.useEffect(() => {
    if (farmId && isEnabled) {
      joinFarm(farmId)
      return () => leaveFarm(farmId)
    }
  }, [farmId, joinFarm, leaveFarm, isEnabled])

  return {
    isConnected,
    isEnabled,
    connectionStatus,
    on,
    off
  }
}

// Import React for hooks
import React from 'react'