'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Tree } from '@/lib/types'
import { MagnifyingGlassIcon, MapPinIcon, ClockIcon, XMarkIcon, MicrophoneIcon } from '@heroicons/react/24/outline'
import { MapPinIcon as MapPinSolidIcon } from '@heroicons/react/24/solid'

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

interface SearchResult {
  id: string
  type: 'tree' | 'zone' | 'location'
  title: string
  subtitle?: string
  distance?: number
  coordinates?: [number, number]
  data: Tree | Zone | any
}

interface EnhancedSearchProps {
  trees: Tree[]
  zones: Zone[]
  userLocation?: { lat: number; lng: number } | null
  onResultSelect: (result: SearchResult) => void
  onSearchFocus?: () => void
  onSearchBlur?: () => void
  placeholder?: string
  className?: string
}

export default function EnhancedSearch({
  trees,
  zones,
  userLocation,
  onResultSelect,
  onSearchFocus,
  onSearchBlur,
  placeholder = "Tìm cây, khu vực, hoặc vị trí...",
  className = ""
}: EnhancedSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [isListening, setIsListening] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('farm-search-history')
    if (history) {
      try {
        setSearchHistory(JSON.parse(history))
      } catch (e) {
        console.warn('Failed to parse search history')
      }
    }
  }, [])

  // Save search history to localStorage
  const saveToHistory = useCallback((searchTerm: string) => {
    const newHistory = [searchTerm, ...searchHistory.filter(h => h !== searchTerm)].slice(0, 10)
    setSearchHistory(newHistory)
    localStorage.setItem('farm-search-history', JSON.stringify(newHistory))
  }, [searchHistory])

  // Calculate distance between two points
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000 // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lng2 - lng1) * Math.PI / 180

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c // Distance in meters
  }, [])

  // Perform search
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    const query = searchQuery.toLowerCase().trim()
    const searchResults: SearchResult[] = []

    // Search trees
    trees.forEach(tree => {
      if (tree.latitude && tree.longitude) {
        const title = tree.name || tree.variety || `Tree ${tree.id}`
        const subtitle = tree.variety ? `${tree.variety} - ${tree.healthStatus || 'Unknown'}` : tree.healthStatus || 'Unknown'

        // Check if query matches
        if (title.toLowerCase().includes(query) ||
            subtitle.toLowerCase().includes(query) ||
            tree.id.toLowerCase().includes(query)) {

          let distance: number | undefined
          if (userLocation) {
            distance = calculateDistance(
              userLocation.lat, userLocation.lng,
              tree.latitude, tree.longitude
            )
          }

          searchResults.push({
            id: tree.id,
            type: 'tree',
            title,
            subtitle,
            distance,
            coordinates: [tree.latitude, tree.longitude],
            data: tree
          })
        }
      }
    })

    // Search zones
    zones.forEach(zone => {
      const title = zone.name
      const subtitle = `Khu vực • ${zone.treeCount} cây • ${zone.area.toFixed(1)} ha`

      if (title.toLowerCase().includes(query) ||
          subtitle.toLowerCase().includes(query) ||
          zone.id.toLowerCase().includes(query)) {

        let distance: number | undefined
        if (userLocation && zone.boundaries.length > 0) {
          // Calculate distance to zone center
          const centerLat = zone.boundaries.reduce((sum, p) => sum + p.latitude, 0) / zone.boundaries.length
          const centerLng = zone.boundaries.reduce((sum, p) => sum + p.longitude, 0) / zone.boundaries.length
          distance = calculateDistance(userLocation.lat, userLocation.lng, centerLat, centerLng)
        }

        searchResults.push({
          id: zone.id,
          type: 'zone',
          title,
          subtitle,
          distance,
          coordinates: zone.boundaries.length > 0 ? [zone.boundaries[0].latitude, zone.boundaries[0].longitude] : undefined,
          data: zone
        })
      }
    })

    // Special location queries
    if (query.includes('gần tôi') || query.includes('near me') || query.includes('gần đây')) {
      if (userLocation) {
        searchResults.unshift({
          id: 'near-me',
          type: 'location',
          title: 'Vị trí hiện tại',
          subtitle: 'Các cây gần bạn',
          coordinates: [userLocation.lat, userLocation.lng],
          data: { type: 'near-me' }
        })
      }
    }

    // Sort by distance if user location is available
    if (userLocation) {
      searchResults.sort((a, b) => {
        const aDist = a.distance || Infinity
        const bDist = b.distance || Infinity
        return aDist - bDist
      })
    }

    setResults(searchResults.slice(0, 10)) // Limit to 10 results
  }, [trees, zones, userLocation, calculateDistance])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, performSearch])

  // Voice recognition
  const startVoiceSearch = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Trình duyệt không hỗ trợ tìm kiếm bằng giọng nói')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()

    recognitionRef.current.lang = 'vi-VN' // Vietnamese
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = false

    recognitionRef.current.onstart = () => {
      setIsListening(true)
    }

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setQuery(transcript)
      setIsOpen(true)
      inputRef.current?.focus()
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current.onerror = (event: any) => {
      console.error('Voice recognition error:', event.error)
      setIsListening(false)
    }

    recognitionRef.current.start()
  }, [])

  const stopVoiceSearch = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => prev < results.length - 1 ? prev + 1 : prev)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleResultSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }, [isOpen, results, selectedIndex])

  const handleResultSelect = useCallback((result: SearchResult) => {
    setQuery(result.title)
    setIsOpen(false)
    setSelectedIndex(-1)
    saveToHistory(result.title)
    onResultSelect(result)
  }, [onResultSelect, saveToHistory])

  const handleInputFocus = useCallback(() => {
    setIsOpen(true)
    onSearchFocus?.()
  }, [onSearchFocus])

  const handleInputBlur = useCallback(() => {
    // Delay closing to allow for result clicks
    setTimeout(() => {
      setIsOpen(false)
      setSelectedIndex(-1)
      onSearchBlur?.()
    }, 200)
  }, [onSearchBlur])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }, [])

  const clearHistory = useCallback(() => {
    setSearchHistory([])
    localStorage.removeItem('farm-search-history')
  }, [])

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500"
        />

        {/* Voice Search Button */}
        <button
          onClick={isListening ? stopVoiceSearch : startVoiceSearch}
          className={`absolute right-12 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-colors ${
            isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <MicrophoneIcon className="h-5 w-5" />
        </button>

        {/* Clear Button */}
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-96 overflow-y-auto z-50"
        >
          {/* Search Results */}
          {results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultSelect(result)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors ${
                    index === selectedIndex ? 'bg-green-50' : ''
                  }`}
                >
                  {/* Icon based on type */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    result.type === 'tree' ? 'bg-green-100 text-green-600' :
                    result.type === 'zone' ? 'bg-blue-100 text-blue-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    {result.type === 'tree' ? '🌳' :
                     result.type === 'zone' ? '📍' :
                     <MapPinSolidIcon className="w-4 h-4" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{result.title}</div>
                    {result.subtitle && (
                      <div className="text-sm text-gray-500 truncate">{result.subtitle}</div>
                    )}
                  </div>

                  {/* Distance */}
                  {result.distance !== undefined && (
                    <div className="flex-shrink-0 text-sm text-gray-500">
                      {result.distance < 1000
                        ? `${Math.round(result.distance)}m`
                        : `${(result.distance / 1000).toFixed(1)}km`
                      }
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Search History */}
          {results.length === 0 && query === '' && searchHistory.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">
                Lịch sử tìm kiếm
              </div>
              {searchHistory.map((historyItem, index) => (
                <button
                  key={`history-${index}`}
                  onClick={() => setQuery(historyItem)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3"
                >
                  <ClockIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">{historyItem}</span>
                </button>
              ))}
              <div className="border-t border-gray-200 px-4 py-2">
                <button
                  onClick={clearHistory}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Xóa lịch sử
                </button>
              </div>
            </div>
          )}

          {/* No Results */}
          {results.length === 0 && query && (
            <div className="px-4 py-8 text-center text-gray-500">
              <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <div className="text-sm">Không tìm thấy kết quả cho "{query}"</div>
              <div className="text-xs mt-1">Thử tìm với từ khóa khác</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}