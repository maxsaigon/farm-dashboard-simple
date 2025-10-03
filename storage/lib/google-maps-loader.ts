// Google Maps API Loader for Next.js

declare global {
  interface Window {
    google: any
    initGoogleMaps: () => void
  }
}

interface GoogleMapsConfig {
  apiKey: string
  libraries?: string[]
  version?: string
  region?: string
  language?: string
}

class GoogleMapsLoader {
  private static instance: GoogleMapsLoader
  private isLoading = false
  private isLoaded = false
  private loadPromise: Promise<void> | null = null
  private config: GoogleMapsConfig

  constructor(config: GoogleMapsConfig) {
    this.config = {
      libraries: ['geometry', 'drawing', 'places'],
      version: 'weekly',
      region: 'VN',
      language: 'vi',
      ...config
    }
  }

  static getInstance(config?: GoogleMapsConfig): GoogleMapsLoader {
    if (!GoogleMapsLoader.instance) {
      if (!config) {
        throw new Error('GoogleMapsLoader must be initialized with config first')
      }
      GoogleMapsLoader.instance = new GoogleMapsLoader(config)
    }
    return GoogleMapsLoader.instance
  }

  async load(): Promise<void> {
    if (this.isLoaded) {
      return Promise.resolve()
    }

    if (this.isLoading && this.loadPromise) {
      return this.loadPromise
    }

    this.isLoading = true
    this.loadPromise = this.loadGoogleMapsScript()

    try {
      await this.loadPromise
      this.isLoaded = true
    } catch (error) {
      console.error('Failed to load Google Maps:', error)
      throw error
    } finally {
      this.isLoading = false
    }
  }

  private loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        resolve()
        return
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve())
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')))
        return
      }

      // Create callback function name
      const callbackName = 'initGoogleMaps'
      
      // Set up global callback
      window[callbackName] = () => {
        resolve()
        delete (window as any)[callbackName]
      }

      // Create script element
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.async = true
      script.defer = true
      
      // Build URL with parameters
      const params = new URLSearchParams({
        key: this.config.apiKey,
        callback: callbackName,
        libraries: this.config.libraries?.join(',') || '',
        v: this.config.version || 'weekly',
        region: this.config.region || 'VN',
        language: this.config.language || 'vi'
      })

      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps script'))
        delete (window as any)[callbackName]
      }

      // Add script to document head
      document.head.appendChild(script)
    })
  }

  isGoogleMapsLoaded(): boolean {
    return this.isLoaded && window.google && window.google.maps
  }

  getGoogleMaps(): any {
    if (!this.isGoogleMapsLoaded()) {
      throw new Error('Google Maps is not loaded yet. Call load() first.')
    }
    return window.google.maps
  }
}

// Default instance with environment configuration
export const googleMapsLoader = (() => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  
  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    console.warn('Google Maps API key not configured. Map features will not work.')
    return null
  }

  return GoogleMapsLoader.getInstance({
    apiKey,
    libraries: ['geometry', 'drawing', 'places'],
    version: 'weekly',
    region: 'VN',
    language: 'vi'
  })
})()

// Hook for React components
import { useEffect, useState } from 'react'

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!googleMapsLoader) {
      setError(new Error('Google Maps API key not configured'))
      return
    }

    if (googleMapsLoader.isGoogleMapsLoaded()) {
      setIsLoaded(true)
      return
    }

    setIsLoading(true)
    setError(null)

    googleMapsLoader.load()
      .then(() => {
        setIsLoaded(true)
        setIsLoading(false)
      })
      .catch((err) => {
        setError(err)
        setIsLoading(false)
      })
  }, [])

  return {
    isLoaded,
    isLoading,
    error,
    google: isLoaded ? googleMapsLoader?.getGoogleMaps() : null
  }
}

export default GoogleMapsLoader