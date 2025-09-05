'use client'

import { useEffect, useState } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/solid'

export type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  type: ToastType
  title: string
  message?: string
  duration?: number
  onClose: () => void
}

export function Toast({ type, title, message, duration = 4000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Show toast with animation
    setTimeout(() => setIsVisible(true), 100)
    
    // Auto hide after duration
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for animation to complete
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600 text-white'
      case 'error':
        return 'bg-red-600 text-white'
      case 'info':
        return 'bg-blue-600 text-white'
      default:
        return 'bg-gray-600 text-white'
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 mr-3 flex-shrink-0" />
      case 'error':
        return <ExclamationTriangleIcon className="h-6 w-6 mr-3 flex-shrink-0" />
      default:
        return null
    }
  }

  return (
    <div 
      className={`
        fixed top-4 left-4 right-4 p-4 rounded-xl shadow-lg z-[10000] 
        transform transition-all duration-300 ease-out
        ${getToastStyles()}
        ${isVisible 
          ? 'translate-y-0 opacity-100' 
          : '-translate-y-2 opacity-0'
        }
      `}
      style={{ 
        paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 16px))',
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))'
      }}
    >
      <div className="flex items-start">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <div className="text-lg font-semibold">{title}</div>
          {message && (
            <div className="text-sm opacity-90 mt-1">{message}</div>
          )}
        </div>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onClose, 300)
          }}
          className="ml-3 p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

// Toast manager hook
interface ToastData {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const showToast = (type: ToastType, title: string, message?: string, duration?: number) => {
    const id = Date.now().toString()
    const newToast: ToastData = { id, type, title, message, duration }
    setToasts(prev => [...prev, newToast])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const showSuccess = (title: string, message?: string) => showToast('success', title, message)
  const showError = (title: string, message?: string) => showToast('error', title, message)
  const showInfo = (title: string, message?: string) => showToast('info', title, message)

  const ToastContainer = () => (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  )

  return {
    showSuccess,
    showError,
    showInfo,
    ToastContainer
  }
}