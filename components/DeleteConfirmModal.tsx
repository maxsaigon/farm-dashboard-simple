'use client'

import React from 'react'
import Image from 'next/image'
import { TrashIcon } from '@heroicons/react/24/outline'
import { PhotoWithUrls } from '@/lib/photo-service'
import { getModalZClass } from '@/lib/modal-z-index'
import { formatDate } from '@/lib/photo-utils'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  photoToDelete: PhotoWithUrls | null
  deletingPhotoId: string | null
  onDelete: () => void
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  photoToDelete,
  deletingPhotoId,
  onDelete
}: DeleteConfirmModalProps) {
  if (!isOpen || !photoToDelete) return null

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center ${getModalZClass('MANAGEMENT_MODAL')} z-[60000]`}>
      <div className="bg-white rounded-2xl max-w-md w-full m-4 shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-md">
              <TrashIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Xóa ảnh</h3>
              <p className="text-sm text-gray-600">Bạn có chắc chắn muốn xóa ảnh này?</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Photo preview */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 relative shadow-inner">
                {photoToDelete.imageUrl && (
                  <Image
                    src={photoToDelete.thumbnailUrl || photoToDelete.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    fill
                    sizes="64px"
                    unoptimized
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 capitalize">
                  Ảnh {photoToDelete.photoType === 'health' ? 'sức khỏe' :
                       photoToDelete.photoType === 'fruit_count' ? 'đếm trái' : 'chung'}
                </div>
                {photoToDelete.timestamp && (
                  <div className="text-sm text-gray-600">
                    {formatDate(photoToDelete.timestamp)}
                  </div>
                )}
                {photoToDelete.userNotes && (
                  <div className="text-sm text-gray-500 truncate mt-0.5" title={photoToDelete.userNotes}>
                    {photoToDelete.userNotes}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <span className="text-yellow-600 text-lg">⚠️</span>
              <div className="text-sm text-yellow-800">
                <div className="font-semibold mb-1">Hành động này không thể hoàn tác</div>
                <div className="leading-relaxed">Ảnh sẽ bị xóa vĩnh viễn khỏi hệ thống và không thể khôi phục.</div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              onClick={onClose}
              disabled={deletingPhotoId !== null}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 rounded-xl font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={onDelete}
              disabled={deletingPhotoId !== null}
              className="flex-1 px-4 py-3 text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl active:scale-95"
            >
              {deletingPhotoId === photoToDelete.id ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Đang xóa...</span>
                </>
              ) : (
                <>
                  <TrashIcon className="h-5 w-5" />
                  <span>Xóa ảnh</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
