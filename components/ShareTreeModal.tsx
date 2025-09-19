'use client'

import React, { useState, useEffect } from 'react'
import { Tree } from '@/lib/types'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { XMarkIcon, ClipboardIcon, CheckIcon, UserPlusIcon, ShareIcon } from '@heroicons/react/24/outline'
import { useToast } from './Toast'

interface Props {
  tree: Tree | null
  isOpen: boolean
  onClose: () => void
}

export default function ShareTreeModal({ tree, isOpen, onClose }: Props) {
  const { user, currentFarm } = useSimpleAuth()
  const { showSuccess, showError, ToastContainer } = useToast()
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [farmMembers, setFarmMembers] = useState<Array<{id: string, name: string, email: string}>>([])
  const [loading, setLoading] = useState(false)

  // Generate share URL when modal opens
  useEffect(() => {
    if (isOpen && tree) {
      const baseUrl = window.location.origin
      const url = `${baseUrl}/trees/showcase/${tree.id}?farm=${currentFarm?.id || ''}`
      setShareUrl(url)
    }
  }, [isOpen, tree, currentFarm?.id])

  // Load farm members (mock for now - would connect to real API)
  useEffect(() => {
    if (isOpen && currentFarm) {
      // Mock farm members - in real app would fetch from Firestore
      setFarmMembers([
        { id: '1', name: 'Nguyễn Văn A', email: 'nguyenvana@example.com' },
        { id: '2', name: 'Trần Thị B', email: 'tranthib@example.com' },
        { id: '3', name: 'Lê Văn C', email: 'levanc@example.com' },
      ])
    }
  }, [isOpen, currentFarm])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      showSuccess('Đã sao chép', 'Liên kết đã được sao chép vào clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      showError('Lỗi', 'Không thể sao chép liên kết')
    }
  }

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const handleShareWithMembers = async () => {
    if (selectedMembers.length === 0) {
      showError('Chưa chọn thành viên', 'Vui lòng chọn ít nhất một thành viên để chia sẻ')
      return
    }

    setLoading(true)
    try {
      // Mock sharing logic - in real app would send notifications/emails
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const memberNames = farmMembers
        .filter(member => selectedMembers.includes(member.id))
        .map(member => member.name)
        .join(', ')
      
      showSuccess('Đã chia sẻ', `Cây đã được chia sẻ với ${memberNames}`)
      setSelectedMembers([])
      onClose()
    } catch (error) {
      showError('Lỗi', 'Không thể chia sẻ cây. Vui lòng thử lại')
    } finally {
      setLoading(false)
    }
  }

  const handleWhatsAppShare = () => {
    const message = `Xem cây ${tree?.name || tree?.variety || 'này'} trên trang trại: ${shareUrl}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleEmailShare = () => {
    const subject = `Chia sẻ cây ${tree?.name || tree?.variety || 'trồng'}`
    const body = `Xem thông tin chi tiết về cây này: ${shareUrl}`
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailtoUrl
  }

  if (!isOpen || !tree) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[60000] bg-black bg-opacity-50 flex items-center justify-center p-4">
      <ToastContainer />
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900">Chia sẻ cây trồng</h2>
            <p className="text-sm text-blue-600 mt-1 truncate">
              {tree.name || tree.variety || 'Cây trồng'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 hover:bg-white/60 rounded-xl transition-colors active:scale-95"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Copy Link Section */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <ClipboardIcon className="w-5 h-5 mr-2 text-gray-600" />
              Sao chép liên kết
            </h3>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-3 rounded-xl transition-all font-medium active:scale-95 ${
                  copied 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                }`}
              >
                {copied ? (
                  <CheckIcon className="w-5 h-5" />
                ) : (
                  <ClipboardIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Quick Share Options */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ShareIcon className="w-5 h-5 mr-2 text-gray-600" />
              Chia sẻ nhanh
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center space-x-3 px-4 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl transition-all font-medium shadow-lg active:scale-95"
              >
                <span className="text-2xl">📱</span>
                <span>WhatsApp</span>
              </button>
              <button
                onClick={handleEmailShare}
                className="flex items-center justify-center space-x-3 px-4 py-4 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl transition-all font-medium shadow-lg active:scale-95"
              >
                <span className="text-2xl">📧</span>
                <span>Email</span>
              </button>
            </div>
          </div>

          {/* Farm Members Section */}
          <div className="bg-blue-50 rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <UserPlusIcon className="w-5 h-5 mr-2 text-gray-600" />
              Thành viên trang trại
            </h3>
            {farmMembers.length > 0 ? (
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {farmMembers.map(member => (
                  <label
                    key={member.id}
                    className="flex items-center space-x-3 p-3 bg-white rounded-xl hover:bg-blue-50 cursor-pointer transition-all active:scale-[0.98] border border-transparent hover:border-blue-200"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => handleMemberToggle(member.id)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded-md focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-semibold text-sm">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{member.name}</p>
                        <p className="text-sm text-gray-500 truncate">{member.email}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-white rounded-xl border-2 border-dashed border-gray-200">
                <UserPlusIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">
                  Không có thành viên nào trong trang trại
                </p>
              </div>
            )}
            
            {selectedMembers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <button
                  onClick={handleShareWithMembers}
                  disabled={loading}
                  className="w-full px-4 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all active:scale-95 shadow-lg"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Đang chia sẻ...</span>
                    </div>
                  ) : (
                    <>
                      <UserPlusIcon className="w-5 h-5 inline mr-2" />
                      Chia sẻ với {selectedMembers.length} thành viên
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}