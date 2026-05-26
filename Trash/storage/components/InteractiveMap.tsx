'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { useGoogleMaps } from '@/storage/lib/google-maps-loader'
import { subscribeToTrees } from '@/lib/firestore'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { MobileInput, MobileSelect } from '@/components/MobileCards'
import { 
  MapPinIcon,
  ViewfinderCircleIcon,
  AdjustmentsHorizontalIcon,
  RectangleGroupIcon,
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowsPointingOutIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CameraIcon,
  PencilIcon
} from '@heroicons/react/24/outline'

interface TreeMarker {
  id: string
  name: string
  latitude: number
  longitude: number
  healthStatus: 'Good' | 'Fair' | 'Poor' | 'Disease'
  treeStatus: 'Young Tree' | 'Mature' | 'Old Tree' | 'Dead'
  variety?: string
  photoCount: number
  lastPhotoDate?: Date
  needsAttention: boolean
  zoneId?: string
}

interface Zone {
  id: string
  name: string
  description?: string
  color: string
  boundaries: Array<{ lat: number; lng: number }>
  soilType?: string
  drainageLevel?: 'poor' | 'fair' | 'good' | 'excellent'
  treeCount: number
  area: number // in hectares
  isActive: boolean
  createdAt: Date
}

interface MapViewport {
  center: { lat: number; lng: number }
  zoom: number
  bounds?: {
    north: number
    south: number
    east: number
    west: number
  }
}

interface MapFilters {
  showTrees: boolean
  showZones: boolean
  showHealthIssues: boolean
  selectedZone?: string
  healthStatus?: string
  treeStatus?: string
}

export default function InteractiveMap() {
  const { currentFarm, hasPermission } = useSimpleAuth()
  const { isLoaded: isGoogleMapsLoaded, isLoading: isGoogleMapsLoading, error: googleMapsError } = useGoogleMaps()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  
  // State management
  const [trees, setTrees] = useState<TreeMarker[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [isMapReady, setIsMapReady] = useState(false)
  const [selectedTree, setSelectedTree] = useState<TreeMarker | null>(null)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  
  // Map controls
  const [viewport, setViewport] = useState<MapViewport>({
    center: { lat: 10.7769, lng: 106.7009 }, // Ho Chi Minh City default
    zoom: 15
  })
  
  const [filters, setFilters] = useState<MapFilters>({
    showTrees: true,
    showZones: true,
    showHealthIssues: true
  })
  
  const [showFilters, setShowFilters] = useState(false)
  const [showTreeDetails, setShowTreeDetails] = useState(false)
  const [showZoneDetails, setShowZoneDetails] = useState(false)

  // Map markers and overlays
  const [treeMarkers, setTreeMarkers] = useState<Map<string, any>>(new Map())
  const [zonePolygons, setZonePolygons] = useState<Map<string, any>>(new Map())
  const [infoWindow, setInfoWindow] = useState<any>(null)

  // Load map data
  useEffect(() => {
    loadMapData()
  }, [currentFarm])

  // Initialize Google Maps when loaded
  useEffect(() => {
    if (isGoogleMapsLoaded && mapContainerRef.current && !mapRef.current) {
      initializeMap()
    }
  }, [isGoogleMapsLoaded])

  // Update map when filters change
  useEffect(() => {
    if (isMapReady) {
      updateMapDisplay()
    }
  }, [filters, trees, zones, isMapReady])

  // Track user location
  useEffect(() => {
    if (isTracking) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
          setCurrentLocation(newLocation)

          // Update user marker on map
          updateUserLocationMarker(newLocation)
        },
        (error) => {
          console.error('Location tracking error:', error)
          setIsTracking(false)
        },
        {
          enableHighAccuracy: true,
          maximumAge: 60000,
          timeout: 10000
        }
      )

      return () => navigator.geolocation.clearWatch(watchId)
    } else {
      // Clear location when tracking is stopped
      setCurrentLocation(null)
      // Remove user marker from map
      if ((window as any).userLocationMarker) {
        (window as any).userLocationMarker.setMap(null)
      }
      if ((window as any).userLocationCircle) {
        (window as any).userLocationCircle.setMap(null)
      }
    }
  }, [isTracking])

  const loadMapData = async () => {
    if (!currentFarm) return

    setLoading(true)
    try {
      // Load trees with GPS coordinates
      const treesData = await loadTreesWithGPS()
      setTrees(treesData)

      // Load zones
      const zonesData = await loadFarmZones()
      setZones(zonesData)

      // Set map bounds to include all trees and zones
      if (treesData.length > 0 || zonesData.length > 0) {
        const bounds = calculateMapBounds(treesData, zonesData)
        setViewport(prev => ({ ...prev, bounds }))
      } else {
        // Default to Vietnam if no data
        const defaultLocation = { lat: 10.7769, lng: 106.7009 } // Ho Chi Minh City
        setViewport(prev => ({ ...prev, center: defaultLocation }))
      }
    } catch (error) {
      console.error('Error loading map data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTreesWithGPS = async (): Promise<TreeMarker[]> => {
    if (!currentFarm?.id) return []

    try {
      const treesRef = collection(db, 'farms', currentFarm.id, 'trees')

      // Try to load all trees first, then filter by GPS coordinates
      const treesSnapshot = await getDocs(treesRef)
      
      const treesWithGPS = treesSnapshot.docs
        .map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            name: data.name || `Tree ${doc.id}`,
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            healthStatus: data.healthStatus || 'Good',
            treeStatus: data.status || 'Young Tree',
            variety: data.variety || 'Unknown',
            photoCount: data.photoCount || 0,
            lastPhotoDate: data.lastPhotoDate?.toDate?.() || data.lastPhotoDate,
            needsAttention: data.needsAttention || false,
            zoneId: data.zoneId || undefined
          }
        })
        .filter(tree => tree.latitude > 0 && tree.longitude > 0)

      return treesWithGPS
    } catch (error) {
      console.error('Error loading trees with GPS:', error)
      return []
    }
  }

  const loadFarmZones = async (): Promise<Zone[]> => {
    if (!currentFarm?.id) return []

    try {
      // Try to load zones from farm-specific collection first
      let zonesRef = collection(db, 'farms', currentFarm.id, 'zones')
      let zonesSnapshot = await getDocs(zonesRef)

      // If no zones found in farm collection, try global zones collection filtered by farmId
      if (zonesSnapshot.empty) {
        zonesRef = collection(db, 'zones')
        zonesSnapshot = await getDocs(query(zonesRef, where('farmId', '==', currentFarm.id)))
      }
      
      const zones = zonesSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name || `Zone ${doc.id}`,
          description: data.description || '',
          color: data.color || '#3b82f6',
          boundaries: data.boundaries || [],
          soilType: data.soilType || 'unknown',
          drainageLevel: data.drainageLevel || 'fair',
          treeCount: data.treeCount || 0,
          area: data.area || 0,
          isActive: data.isActive !== false, // default to true
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date()
        }
      })

      return zones
    } catch (error) {
      console.error('Error loading farm zones:', error)
      return []
    }
  }

  const calculateMapBounds = (trees: TreeMarker[], zones: Zone[]) => {
    const coordinates = [
      ...trees.map(tree => ({ lat: tree.latitude, lng: tree.longitude })),
      ...zones.flatMap(zone => zone.boundaries)
    ]

    if (coordinates.length === 0) return undefined

    const lats = coordinates.map(coord => coord.lat)
    const lngs = coordinates.map(coord => coord.lng)

    return {
      north: Math.max(...lats) + 0.001,
      south: Math.min(...lats) - 0.001,
      east: Math.max(...lngs) + 0.001,
      west: Math.min(...lngs) - 0.001
    }
  }

  const initializeMap = async () => {
    if (!mapContainerRef.current) return

    try {
      // Initialize Google Maps
      const map = (window as any).google.maps.Map(mapContainerRef.current, {
        center: viewport.center,
        zoom: viewport.zoom,
        mapTypeId: (window as any).google.maps.MapTypeId.SATELLITE,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: (window as any).google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: (window as any).google.maps.ControlPosition.TOP_CENTER,
          mapTypeIds: [
            (window as any).google.maps.MapTypeId.ROADMAP,
            (window as any).google.maps.MapTypeId.SATELLITE,
            (window as any).google.maps.MapTypeId.HYBRID,
            (window as any).google.maps.MapTypeId.TERRAIN
          ]
        },
        zoomControl: true,
        zoomControlOptions: {
          position: (window as any).google.maps.ControlPosition.RIGHT_CENTER
        },
        streetViewControl: false,
        fullscreenControl: true,
        fullscreenControlOptions: {
          position: (window as any).google.maps.ControlPosition.RIGHT_TOP
        }
      })

      mapRef.current = map

      // Initialize info window
      const infoWin = (window as any).google.maps.InfoWindow()
      setInfoWindow(infoWin)

      // Fit bounds if available
      if (viewport.bounds) {
        const bounds = (window as any).google.maps.LatLngBounds(
          { lat: viewport.bounds.south, lng: viewport.bounds.west },
          { lat: viewport.bounds.north, lng: viewport.bounds.east }
        )
        map.fitBounds(bounds)
      }

      setIsMapReady(true)
    } catch (error) {
      console.error('Error initializing map:', error)
    }
  }

  const updateMapDisplay = useCallback(() => {
    if (!mapRef.current) return

    // Clear existing markers and polygons
    clearMapOverlays()

    // Add zones if enabled
    if (filters.showZones) {
      addZonePolygons()
    }

    // Add trees if enabled
    if (filters.showTrees) {
      addTreeMarkers()
    }
  }, [filters, trees, zones])

  const clearMapOverlays = () => {
    // Clear tree markers
    treeMarkers.forEach(marker => marker.setMap(null))
    setTreeMarkers(new Map())

    // Clear zone polygons
    zonePolygons.forEach(polygon => polygon.setMap(null))
    setZonePolygons(new Map())
  }

  const addZonePolygons = () => {
    if (!mapRef.current) return

    const newPolygons = new Map<string, any>()

    zones.forEach(zone => {
      if (filters.selectedZone && zone.id !== filters.selectedZone) return

      const polygon = (window as any).google.maps.Polygon({
        paths: zone.boundaries.map(point => ({ lat: point.lat, lng: point.lng })),
        strokeColor: zone.color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: zone.color,
        fillOpacity: zone.isActive ? 0.2 : 0.1,
        clickable: true
      })

      polygon.setMap(mapRef.current!)

      // Add click listener for zone
      polygon.addListener('click', (event: any) => {
        handleZoneClick(zone, event)
      })

      newPolygons.set(zone.id, polygon)
    })

    setZonePolygons(newPolygons)
  }

  const addTreeMarkers = () => {
    if (!mapRef.current) return

    const newMarkers = new Map<string, any>()

    const filteredTrees = trees.filter(tree => {
      if (filters.selectedZone && tree.zoneId !== filters.selectedZone) return false
      if (filters.healthStatus && tree.healthStatus !== filters.healthStatus) return false
      if (filters.treeStatus && tree.treeStatus !== filters.treeStatus) return false
      if (filters.showHealthIssues && !tree.needsAttention) return false
      return true
    })

    filteredTrees.forEach(tree => {
      const marker = (window as any).google.maps.Marker({
        position: { lat: tree.latitude, lng: tree.longitude },
        map: mapRef.current!,
        title: tree.name,
        icon: getTreeMarkerIcon(tree),
        clickable: true
      })

      // Add click listener for tree
      marker.addListener('click', () => {
        handleTreeClick(tree, marker)
      })

      newMarkers.set(tree.id, marker)
    })

    setTreeMarkers(newMarkers)
  }

  const getTreeMarkerIcon = (tree: TreeMarker): any => {
    let color = '#22c55e' // default green
    
    switch (tree.healthStatus) {
      case 'Poor':
        color = '#f59e0b' // orange
        break
      case 'Disease':
        color = '#ef4444' // red
        break
      case 'Fair':
        color = '#eab308' // yellow
        break
      default:
        color = '#22c55e' // green
    }

    return {
      path: (window as any).google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: tree.needsAttention ? 1.0 : 0.8,
      strokeColor: '#ffffff',
      strokeWeight: tree.needsAttention ? 3 : 2,
      scale: tree.needsAttention ? 12 : 8
    }
  }

  const handleTreeClick = (tree: TreeMarker, marker: any) => {
    setSelectedTree(tree)
    setShowTreeDetails(true)

    if (infoWindow) {
      const content = createTreeInfoContent(tree)
      infoWindow.setContent(content)
      infoWindow.open(mapRef.current!, marker)
    }
  }

  const handleZoneClick = (zone: Zone, event: any) => {
    setSelectedZone(zone)
    setShowZoneDetails(true)

    if (infoWindow && event.latLng) {
      const content = createZoneInfoContent(zone)
      infoWindow.setContent(content)
      infoWindow.setPosition(event.latLng)
      infoWindow.open(mapRef.current!)
    }
  }

  const createTreeInfoContent = (tree: TreeMarker): string => {
    const healthColor = tree.healthStatus === 'Good' ? '#22c55e' :
                       tree.healthStatus === 'Fair' ? '#eab308' :
                       tree.healthStatus === 'Poor' ? '#f59e0b' : '#ef4444'
    
    return `
      <div style="padding: 12px; min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${tree.name}</h3>
        <div style="margin-bottom: 8px;">
          <span style="color: ${healthColor}; font-weight: 500;">● ${tree.healthStatus}</span>
          ${tree.needsAttention ? '<span style="color: #ef4444; margin-left: 8px;">⚠️ Cần chú ý</span>' : ''}
        </div>
        <div style="font-size: 14px; color: #666;">
          <div>Loại: ${tree.variety || 'Chưa xác định'}</div>
          <div>Ảnh: ${tree.photoCount}</div>
          <div>Vị trí: ${tree.latitude.toFixed(6)}, ${tree.longitude.toFixed(6)}</div>
        </div>
        <div style="margin-top: 12px; display: flex; gap: 8px;">
          <button onclick="window.location.href='/trees/${tree.id}'" style="
            background: #22c55e; color: white; border: none; padding: 6px 12px; 
            border-radius: 6px; font-size: 12px; cursor: pointer;">
            Chi tiết
          </button>
          <button onclick="window.location.href='/camera?treeId=${tree.id}'" style="
            background: #3b82f6; color: white; border: none; padding: 6px 12px; 
            border-radius: 6px; font-size: 12px; cursor: pointer;">
            Chụp ảnh
          </button>
        </div>
      </div>
    `
  }

  const createZoneInfoContent = (zone: Zone): string => {
    const statusColor = zone.isActive ? '#22c55e' : '#ef4444'
    const statusText = zone.isActive ? 'Hoạt động' : 'Không hoạt động'
    
    return `
      <div style="padding: 12px; min-width: 250px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${zone.name}</h3>
        <div style="margin-bottom: 8px;">
          <span style="color: ${statusColor}; font-weight: 500;">● ${statusText}</span>
        </div>
        <div style="font-size: 14px; color: #666; margin-bottom: 8px;">
          ${zone.description || ''}
        </div>
        <div style="font-size: 14px; color: #666;">
          <div>Diện tích: ${zone.area} ha</div>
          <div>Số cây: ${zone.treeCount}</div>
          <div>Loại đất: ${zone.soilType}</div>
          <div>Thoát nước: ${zone.drainageLevel}</div>
        </div>
        <div style="margin-top: 12px;">
          <button onclick="window.location.href='/zones/${zone.id}'" style="
            background: #3b82f6; color: white; border: none; padding: 6px 12px; 
            border-radius: 6px; font-size: 12px; cursor: pointer;">
            Quản lý khu vực
          </button>
        </div>
      </div>
    `
  }

  const updateUserLocationMarker = (location: { lat: number; lng: number }) => {
    if (!mapRef.current) return

    // Remove existing user marker if it exists
    if ((window as any).userLocationMarker) {
      (window as any).userLocationMarker.setMap(null)
    }

    // Remove existing accuracy circle if it exists
    if ((window as any).userLocationCircle) {
      (window as any).userLocationCircle.setMap(null)
    }

    // Create new user location marker
    const markerConfig = {
      position: { lat: location.lat, lng: location.lng },
      map: mapRef.current!,
      title: 'Vị trí của bạn',
      icon: {
        path: (window as any).google.maps.SymbolPath.CIRCLE,
        fillColor: '#3b82f6',
        fillOpacity: 1.0,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        scale: 12
      },
      zIndex: 9999 // Ensure it's on top
    }

    // For demo purposes, add a 20m accuracy circle
    const circleConfig = {
      center: { lat: location.lat, lng: location.lng },
      radius: 20, // 20 meters accuracy
      map: mapRef.current!,
      fillColor: '#3b82f6',
      fillOpacity: 0.1,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.3,
      strokeWeight: 1
    }

    // Create markers and circles with proper typing
    const userMarker = (window as any).google.maps.Marker(markerConfig) as any
    const accuracyCircle = (window as any).google.maps.Circle(circleConfig) as any

    // Store references for cleanup
    (window as any).userLocationMarker = userMarker
    (window as any).userLocationCircle = accuracyCircle
  }

  const centerOnUser = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.setCenter({ lat: currentLocation.lat, lng: currentLocation.lng })
      mapRef.current.setZoom(18)
    } else if (mapRef.current) {
      // If no current location, try to get current position once
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
          setCurrentLocation(location)
          mapRef.current!.setCenter({ lat: location.lat, lng: location.lng })
          mapRef.current!.setZoom(18)
          updateUserLocationMarker(location)
        },
        (error) => {
          console.error('Error getting current position:', error)
          alert('Không thể lấy vị trí hiện tại. Vui lòng kiểm tra quyền truy cập GPS.')
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      )
    }
  }

  const fitAllMarkers = () => {
    if (!mapRef.current || (trees.length === 0 && zones.length === 0)) return

    const bounds = (window as any).google.maps.LatLngBounds()

    // Include all tree positions
    trees.forEach(tree => {
      bounds.extend({ lat: tree.latitude, lng: tree.longitude })
    })

    // Include all zone boundaries
    zones.forEach(zone => {
      zone.boundaries.forEach(point => {
        bounds.extend({ lat: point.lat, lng: point.lng })
      })
    })

    mapRef.current.fitBounds(bounds)
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'Good': return 'text-green-600'
      case 'Fair': return 'text-yellow-600'
      case 'Poor': return 'text-orange-600'
      case 'Disease': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'Good': return <CheckCircleIcon className="h-5 w-5" />
      case 'Fair': return <ClockIcon className="h-5 w-5" />
      case 'Poor': return <ExclamationTriangleIcon className="h-5 w-5" />
      case 'Disease': return <ExclamationTriangleIcon className="h-5 w-5" />
      default: return <CheckCircleIcon className="h-5 w-5" />
    }
  }

  if (googleMapsError) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Lỗi tải bản đồ</h2>
          <p className="text-gray-600 mb-4">{googleMapsError.message}</p>
          <p className="text-sm text-gray-500">Vui lòng kiểm tra kết nối internet và API key Google Maps.</p>
        </div>
      </div>
    )
  }

  if (loading || isGoogleMapsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isGoogleMapsLoading ? 'Đang tải Google Maps...' : 'Đang tải dữ liệu bản đồ...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Map Controls */}
        <div className="absolute top-4 left-4 space-y-2 z-10">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-white shadow-lg rounded-lg p-3 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
          >
            <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-700" />
          </button>

          <button
            onClick={() => setIsTracking(!isTracking)}
            className={`shadow-lg rounded-lg p-3 hover:bg-opacity-90 active:bg-opacity-80 transition-colors touch-manipulation ${
              isTracking
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            title={isTracking ? 'Tắt GPS tracking' : 'Bật GPS tracking'}
          >
            <MapPinIcon className={`h-5 w-5 ${isTracking ? 'animate-pulse' : ''}`} />
          </button>

          <button
              onClick={centerOnUser}
              className={`shadow-lg rounded-lg p-3 transition-colors touch-manipulation ${
                currentLocation
                  ? 'bg-white hover:bg-gray-50 active:bg-gray-100 text-blue-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!currentLocation}
              title={currentLocation ? 'Về vị trí hiện tại' : 'Không có vị trí GPS'}
            >
              <MapPinIcon className={`h-5 w-5 ${currentLocation ? 'text-blue-600' : 'text-gray-400'}`} />
            </button>

          <button
            onClick={fitAllMarkers}
            className="bg-white shadow-lg rounded-lg p-3 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
          >
            <ArrowsPointingOutIcon className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        {/* Layer Toggle */}
        <div className="absolute top-4 right-4 bg-white shadow-lg rounded-lg p-2 z-10">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilters(prev => ({ ...prev, showTrees: !prev.showTrees }))}
              className={`p-2 rounded-md transition-colors ${filters.showTrees ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <ViewfinderCircleIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, showZones: !prev.showZones }))}
              className={`p-2 rounded-md transition-colors ${filters.showZones ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <RectangleGroupIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* GPS Status */}
        {isTracking && currentLocation && (
          <div className="absolute top-20 right-4 bg-green-600 text-white px-3 py-2 rounded-lg shadow-lg z-10">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <div className="text-sm">
                <div className="font-medium">GPS Active</div>
                <div className="text-xs opacity-90">±{Math.round(currentLocation.accuracy || 0)}m</div>
              </div>
            </div>
          </div>
        )}

        {/* GPS Location Info */}
        {currentLocation && (
          <div className="absolute bottom-20 left-4 bg-white rounded-lg shadow-lg p-3 text-sm z-10 max-w-xs">
            <div className="font-bold text-blue-600 mb-1">📍 Vị trí hiện tại</div>
            <div className="font-mono text-xs space-y-1">
              <div>Vĩ độ: {currentLocation.lat.toFixed(6)}</div>
              <div>Kinh độ: {currentLocation.lng.toFixed(6)}</div>
              <div className="text-gray-500">Độ chính xác: ±{Math.round(currentLocation.accuracy || 0)}m</div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && isMapReady && trees.length === 0 && zones.length === 0 && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
            <div className="text-center max-w-sm p-6">
              <MapPinIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có dữ liệu bản đồ</h3>
              <p className="text-gray-600 mb-4">
                Trang trại này chưa có cây trồng hoặc khu vực nào với tọa độ GPS.
              </p>
              <p className="text-sm text-gray-500">
                Vui lòng thêm cây trồng hoặc khu vực có tọa độ để hiển thị trên bản đồ.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="absolute inset-x-4 top-20 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-20 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Bộ lọc bản đồ</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 hover:bg-gray-100 rounded-md"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Zone Filter */}
            <MobileSelect
              label="Khu vực"
              value={filters.selectedZone || ''}
              onChange={(value) => setFilters(prev => ({ ...prev, selectedZone: value || undefined }))}
              options={[
                { value: '', label: 'Tất cả khu vực' },
                ...zones.map(zone => ({ value: zone.id, label: zone.name }))
              ]}
            />

            {/* Health Status Filter */}
            <MobileSelect
              label="Tình trạng sức khỏe"
              value={filters.healthStatus || ''}
              onChange={(value) => setFilters(prev => ({ ...prev, healthStatus: value || undefined }))}
              options={[
                { value: '', label: 'Tất cả' },
                { value: 'Good', label: 'Khỏe mạnh' },
                { value: 'Fair', label: 'Trung bình' },
                { value: 'Poor', label: 'Yếu' },
                { value: 'Disease', label: 'Bệnh tật' }
              ]}
            />

            {/* Quick Filters */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.showHealthIssues}
                  onChange={(e) => setFilters(prev => ({ ...prev, showHealthIssues: e.target.checked }))}
                  className="mr-3 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Chỉ hiện cây cần chú ý</span>
              </label>
            </div>

            <button
              onClick={() => setFilters({
                showTrees: true,
                showZones: true,
                showHealthIssues: false
              })}
              className="w-full btn-secondary-mobile"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Chú thích</h4>
          <div className="text-sm text-gray-500">
            {trees.filter(t => {
              if (filters.selectedZone && t.zoneId !== filters.selectedZone) return false
              if (filters.healthStatus && t.healthStatus !== filters.healthStatus) return false
              if (filters.showHealthIssues && !t.needsAttention) return false
              return true
            }).length} cây • {zones.filter(z => !filters.selectedZone || z.id === filters.selectedZone).length} khu vực
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Tree Legend */}
          <div>
            <div className="text-xs font-medium text-gray-700 mb-2">Cây trồng</div>
            <div className="space-y-1">
              {['Good', 'Fair', 'Poor', 'Disease'].map(status => (
                <div key={status} className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    status === 'Good' ? 'bg-green-500' :
                    status === 'Fair' ? 'bg-yellow-500' :
                    status === 'Poor' ? 'bg-orange-500' : 'bg-red-500'
                  }`} />
                  <span className="text-xs text-gray-600">
                    {status === 'Good' ? 'Khỏe mạnh' :
                     status === 'Fair' ? 'Trung bình' :
                     status === 'Poor' ? 'Yếu' : 'Bệnh tật'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Zone Legend */}
          <div>
            <div className="text-xs font-medium text-gray-700 mb-2">Khu vực</div>
            <div className="space-y-1">
              {zones.slice(0, 4).map(zone => (
                <div key={zone.id} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: zone.color }}
                  />
                  <span className="text-xs text-gray-600 truncate">
                    {zone.name.replace(/Khu \w+ - /, '')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tree Details Modal */}
      {showTreeDetails && selectedTree && (
        <div className="fixed inset-0 z-[9997] flex items-end justify-center p-4 sm:items-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowTreeDetails(false)} />
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full max-w-md relative max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              {/* Header with health status */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  {getHealthIcon(selectedTree.healthStatus)}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedTree.name}</h3>
                    <p className="text-sm text-gray-500">{selectedTree.variety || 'Chưa xác định'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTreeDetails(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Health Status Badge */}
              <div className="mb-6">
                <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${getHealthStatusColor(selectedTree.healthStatus)}`}>
                  {getHealthIcon(selectedTree.healthStatus)}
                  <span className="ml-2">{selectedTree.healthStatus}</span>
                  {selectedTree.needsAttention && (
                    <span className="ml-2 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                      ⚠️ Cần chú ý
                    </span>
                  )}
                </div>
              </div>

              {/* Tree Information Cards */}
              <div className="space-y-4 mb-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-800 mb-3">📊 Thông tin cơ bản</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-blue-600 font-medium">Trạng thái cây</div>
                      <div className="text-blue-800">{selectedTree.treeStatus}</div>
                    </div>
                    <div>
                      <div className="text-blue-600 font-medium">Số ảnh</div>
                      <div className="text-blue-800">{selectedTree.photoCount} ảnh</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <h4 className="text-sm font-semibold text-green-800 mb-3">📍 Vị trí & GPS</h4>
                  <div className="space-y-2">
                    <div className="text-sm text-green-700">
                      <span className="font-medium">Tọa độ:</span>
                      <div className="font-mono text-xs mt-1">
                        {selectedTree.latitude.toFixed(6)}, {selectedTree.longitude.toFixed(6)}
                      </div>
                    </div>
                    {selectedTree.lastPhotoDate && (
                      <div className="text-sm text-green-700">
                        <span className="font-medium">Ảnh cuối:</span>
                        <div className="mt-1">{selectedTree.lastPhotoDate.toLocaleDateString('vi-VN')}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => window.location.href = `/trees/${selectedTree.id}`}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3 rounded-xl font-medium transition-all active:scale-95 shadow-lg flex items-center justify-center space-x-2"
                >
                  <EyeIcon className="h-5 w-5" />
                  <span>Xem chi tiết</span>
                </button>
                <button
                  onClick={() => window.location.href = `/camera?treeId=${selectedTree.id}`}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-3 rounded-xl font-medium transition-all active:scale-95 shadow-lg flex items-center justify-center space-x-2"
                >
                  <CameraIcon className="h-5 w-5" />
                  <span>Chụp ảnh</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zone Details Modal */}
      {showZoneDetails && selectedZone && (
        <div className="fixed inset-0 z-[9997] flex items-end justify-center p-4 sm:items-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowZoneDetails(false)} />
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full max-w-md relative max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{selectedZone.name}</h3>
                <button
                  onClick={() => setShowZoneDetails(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: selectedZone.color }}
                  />
                  <span className={`font-medium ${selectedZone.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedZone.isActive ? 'Hoạt động' : 'Không hoạt động'}
                  </span>
                </div>

                {selectedZone.description && (
                  <p className="text-gray-600 text-sm">{selectedZone.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Diện tích</div>
                    <div className="font-medium">{selectedZone.area} ha</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Số cây</div>
                    <div className="font-medium">{selectedZone.treeCount}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Loại đất</div>
                    <div className="font-medium">{selectedZone.soilType}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Thoát nước</div>
                    <div className="font-medium">{selectedZone.drainageLevel}</div>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs font-medium text-gray-700 mb-1">Ngày tạo</div>
                  <div className="text-sm text-gray-600">
                    {selectedZone.createdAt.toLocaleDateString('vi-VN')}
                  </div>
                </div>

                <button
                  onClick={() => window.location.href = `/zones/${selectedZone.id}`}
                  className="w-full btn-primary-mobile"
                >
                  Quản lý khu vực
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}