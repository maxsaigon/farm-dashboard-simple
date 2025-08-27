'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MobileInput, MobileSelect } from './MobileCards'
import MobileLayout from './MobileLayout'
import { 
  CameraIcon,
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon,
  SunIcon,
  MoonIcon,
  ViewfinderCircleIcon,
  MapPinIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface CaptureLocation {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: Date
}

interface PhotoMetadata {
  treeId?: string
  location?: CaptureLocation
  timestamp: Date
  weather?: {
    temperature: number
    humidity: number
    condition: string
  }
  notes: string
  category: 'health_check' | 'fruit_count' | 'disease' | 'growth' | 'general'
  qualityScore?: number
}

interface CameraError {
  type: 'permission' | 'device' | 'network' | 'storage'
  message: string
}

export default function MobileCameraCapture() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isInitialized, setIsInitialized] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('auto')
  const [location, setLocation] = useState<CaptureLocation | null>(null)
  const [error, setError] = useState<CameraError | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form data
  const [metadata, setMetadata] = useState<PhotoMetadata>({
    timestamp: new Date(),
    notes: '',
    category: 'health_check'
  })

  // Initialize camera
  useEffect(() => {
    initializeCamera()
    getCurrentLocation()
  }, [facingMode])

  const initializeCamera = async () => {
    try {
      setError(null)
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsInitialized(true)
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError({
        type: 'permission',
        message: 'Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.'
      })
    }
  }

  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date()
          })
        },
        (error) => {
          console.error('Error getting location:', error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      )
    }
  }

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return

    try {
      setIsCapturing(true)
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (!context) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          setCapturedPhoto(url)
          setMetadata(prev => ({
            ...prev,
            timestamp: new Date(),
            location: location || undefined
          }))
        }
      }, 'image/jpeg', 0.9)
      
    } catch (err) {
      console.error('Error capturing photo:', err)
      setError({
        type: 'device',
        message: 'Không thể chụp ảnh. Vui lòng thử lại.'
      })
    } finally {
      setIsCapturing(false)
    }
  }

  const retakePhoto = () => {
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto)
      setCapturedPhoto(null)
    }
  }

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setCapturedPhoto(url)
      setMetadata(prev => ({
        ...prev,
        timestamp: new Date()
      }))
    }
  }

  const savePhoto = async () => {
    if (!capturedPhoto) return

    setIsSaving(true)
    try {
      // Convert captured photo to blob for upload
      const response = await fetch(capturedPhoto)
      const blob = await response.blob()
      
      // Create form data
      const formData = new FormData()
      formData.append('photo', blob, `photo_${Date.now()}.jpg`)
      formData.append('metadata', JSON.stringify({
        ...metadata,
        location: location || undefined
      }))
      
      // Upload photo (replace with actual API call)
      console.log('Uploading photo...', { metadata, location })
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Navigate back to trees or photos page
      window.location.href = '/photos'
      
    } catch (err) {
      console.error('Error saving photo:', err)
      setError({
        type: 'network',
        message: 'Không thể lưu ảnh. Vui lòng kiểm tra kết nối mạng.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const cleanup = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
    }
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto)
    }
  }

  useEffect(() => {
    return cleanup
  }, [capturedPhoto])

  if (error?.type === 'permission') {
    return (
      <MobileLayout currentTab="photos">
        <div className="h-full flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Cần quyền truy cập camera
            </h2>
            <p className="text-gray-600 mb-6">
              Để chụp ảnh cây trồng, vui lòng cho phép ứng dụng truy cập camera của bạn.
            </p>
            <div className="space-y-3">
              <button
                onClick={initializeCamera}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-green-700 active:bg-green-800 transition-colors"
              >
                Cho phép truy cập camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                Chọn ảnh từ thư viện
              </button>
            </div>
          </div>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout currentTab="photos">
      <div className="h-full flex flex-col bg-black">
        {/* Camera View or Captured Photo */}
        <div className="flex-1 relative overflow-hidden">
          {capturedPhoto ? (
            // Show captured photo
            <div className="h-full flex items-center justify-center bg-black">
              <img
                src={capturedPhoto}
                alt="Captured"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            // Show camera feed
            <div className="h-full relative">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              
              {!isInitialized && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                    <p>Đang khởi động camera...</p>
                  </div>
                </div>
              )}

              {/* Camera overlay guides */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Center focus guide */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-48 h-48 border-2 border-white border-opacity-50 rounded-lg"></div>
                  <p className="text-white text-center mt-2 text-sm opacity-75">
                    Đưa cây vào khung hình
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Control Bar */}
        <div className="bg-black bg-opacity-75 p-4">
          {capturedPhoto ? (
            // Photo review controls
            <div className="flex items-center justify-between">
              <button
                onClick={retakePhoto}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 active:bg-gray-800 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
                <span>Chụp lại</span>
              </button>
              
              <div className="flex items-center space-x-3">
                {location && (
                  <div className="flex items-center space-x-1 text-white text-sm">
                    <MapPinIcon className="h-4 w-4" />
                    <span>GPS</span>
                  </div>
                )}
                <span className="text-white text-sm">
                  {metadata.timestamp.toLocaleTimeString('vi-VN')}
                </span>
              </div>
              
              <button
                onClick={() => setMetadata(prev => ({ ...prev, timestamp: new Date() }))}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors"
              >
                <CheckIcon className="h-5 w-5" />
                <span>Tiếp tục</span>
              </button>
            </div>
          ) : (
            // Camera controls
            <div className="flex items-center justify-between">
              {/* Flash toggle */}
              <button
                onClick={() => setFlashMode(prev => 
                  prev === 'off' ? 'auto' : prev === 'auto' ? 'on' : 'off'
                )}
                className="p-3 text-white hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                {flashMode === 'on' ? <SunIcon className="h-6 w-6" /> : 
                 flashMode === 'auto' ? <SunIcon className="h-6 w-6 opacity-50" /> :
                 <MoonIcon className="h-6 w-6" />}
              </button>
              
              {/* Capture button */}
              <button
                onClick={capturePhoto}
                disabled={!isInitialized || isCapturing}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-16 h-16 bg-white border-4 border-gray-300 rounded-full flex items-center justify-center">
                  <CameraIcon className="h-8 w-8 text-gray-600" />
                </div>
              </button>
              
              {/* Camera switch */}
              <button
                onClick={switchCamera}
                className="p-3 text-white hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <ArrowPathIcon className="h-6 w-6" />
              </button>
            </div>
          )}
        </div>

        {/* Metadata Form (shown after capture) */}
        {capturedPhoto && (
          <div className="bg-white max-h-96 overflow-y-auto">
            <div className="p-4 space-y-4">
              <h3 className="font-semibold text-gray-900">Thông tin ảnh</h3>
              
              <MobileSelect
                label="Danh mục"
                value={metadata.category}
                onChange={(value) => setMetadata(prev => ({ 
                  ...prev, 
                  category: value as PhotoMetadata['category']
                }))}
                options={[
                  { value: 'health_check', label: 'Kiểm tra sức khỏe' },
                  { value: 'fruit_count', label: 'Đếm quả' },
                  { value: 'disease', label: 'Bệnh tật' },
                  { value: 'growth', label: 'Theo dõi sinh trưởng' },
                  { value: 'general', label: 'Tổng quát' }
                ]}
                required
              />
              
              <MobileInput
                label="Ghi chú"
                value={metadata.notes}
                onChange={(value) => setMetadata(prev => ({ ...prev, notes: value }))}
                placeholder="Mô tả về ảnh này..."
                type="text"
              />
              
              {location && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPinIcon className="h-4 w-4" />
                    <span>
                      Vị trí: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                    <ClockIcon className="h-4 w-4" />
                    <span>Độ chính xác: ±{Math.round(location.accuracy)}m</span>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={retakePhoto}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  Chụp lại
                </button>
                <button
                  onClick={savePhoto}
                  disabled={isSaving}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu ảnh</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden file input for gallery selection */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Error display */}
        {error && error.type !== 'permission' && (
          <div className="absolute top-4 left-4 right-4 bg-red-600 text-white p-3 rounded-lg">
            <p className="text-sm">{error.message}</p>
          </div>
        )}
      </div>
    </MobileLayout>
  )
}