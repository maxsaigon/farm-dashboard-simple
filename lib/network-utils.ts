// Network utility functions for handling timeouts and retries

export interface NetworkOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public code: 'timeout' | 'network' | 'permission' | 'unknown' = 'unknown',
    public originalError?: Error
  ) {
    super(message)
    this.name = 'NetworkError'
  }
}

/**
 * Wraps a promise with timeout functionality
 */
export function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number = 10000,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new NetworkError(timeoutMessage, 'timeout')), timeoutMs)
    )
  ])
}

/**
 * Retry a network operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: NetworkOptions = {}
): Promise<T> {
  const { timeout = 10000, retries = 3, retryDelay = 1000 } = options
  
  let lastError: Error
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(operation(), timeout)
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on certain error types
      if (error instanceof NetworkError && error.code === 'permission') {
        throw error
      }
      
      // If this was the last attempt, throw the error
      if (attempt === retries) {
        break
      }
      
      // Wait before retrying with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw new NetworkError(
    `Operation failed after ${retries + 1} attempts: ${lastError.message}`,
    'network',
    lastError
  )
}

/**
 * Check if the user is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

/**
 * Wait for network connectivity
 */
export function waitForConnection(timeoutMs: number = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || isOnline()) {
      resolve()
      return
    }
    
    const timeout = setTimeout(() => {
      window.removeEventListener('online', onOnline)
      reject(new NetworkError('Network connection timeout', 'network'))
    }, timeoutMs)
    
    const onOnline = () => {
      clearTimeout(timeout)
      window.removeEventListener('online', onOnline)
      resolve()
    }
    
    window.addEventListener('online', onOnline)
  })
}

/**
 * Create a safe wrapper for Firebase operations
 */
export function safeFirebaseOperation<T>(
  operation: () => Promise<T>,
  fallback?: T,
  options: NetworkOptions = {}
): Promise<T | null> {
  const { timeout = 15000, retries = 2 } = options
  
  return withRetry(operation, { timeout, retries })
    .catch((error) => {
      console.warn('Firebase operation failed:', error)
      
      // Return fallback value if provided
      if (fallback !== undefined) {
        return fallback
      }
      
      // For non-critical operations, return null instead of throwing
      if (error instanceof NetworkError && error.code === 'timeout') {
        return null
      }
      
      throw error
    })
}

/**
 * Handle offline state gracefully
 */
export class OfflineHandler {
  private listeners: Set<() => void> = new Set()
  private isOffline = false
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.setupListeners()
    }
  }
  
  private setupListeners() {
    if (typeof window === 'undefined') return
    
    window.addEventListener('online', () => {
      if (this.isOffline) {
        this.isOffline = false
        this.notifyListeners()
      }
    })
    
    window.addEventListener('offline', () => {
      if (!this.isOffline) {
        this.isOffline = true
        this.notifyListeners()
      }
    })
  }
  
  public onConnectionChange(callback: () => void) {
    this.listeners.add(callback)
    
    return () => {
      this.listeners.delete(callback)
    }
  }
  
  private notifyListeners() {
    this.listeners.forEach(callback => callback())
  }
  
  public get offline() {
    return this.isOffline || (typeof navigator !== 'undefined' ? !navigator.onLine : false)
  }
}

export const offlineHandler = new OfflineHandler()