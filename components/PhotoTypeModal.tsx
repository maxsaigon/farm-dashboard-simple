'use client'

import React from 'react'
import { CameraIcon } from '@heroicons/react/24/outline'
import { getModalZClass } from '@/lib/modal-z-index'

interface PhotoTypeModalProps {
  isOpen: boolean
  onClose: () => void
  pendingFile: File | null
  treeNameOrQr: string
  compressionInfo: {
    currentSizeKB: number
    targetSizeKB: number
    needsCompression: boolean
    estimatedReduction: number
  } | null
  uploading: boolean
  compressing: boolean
  onUpload: (photoType: 'general' | 'health' | 'fruit_count') => void
}

export function PhotoTypeModal({
  isOpen,
  onClose,
  pendingFile,
  treeNameOrQr,
  compressionInfo,
  uploading,
  compressing,
  onUpload
}: PhotoTypeModalProps) {
  if (!isOpen || !pendingFile) return null

  const isProcessing = uploading || compressing

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center ${getModalZClass('MANAGEMENT_MODAL')} z-[60000]`}>
      <div className="bg-white rounded-2xl max-w-md w-full m-4 shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
              <CameraIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Chọn loại ảnh</h3>
              <p className="text-sm text-gray-600">Phân loại ảnh cho cây {treeNameOrQr}</p>
            </div>
          </div>
        </div>

        {/* Photo Type Options */}
        <div className="p-6 space-y-4">
          {/* Compression Info */}
          {compressionInfo && (
            <div className={`p-4 rounded-xl border ${
              compressionInfo.needsCompression 
                ? 'bg-orange-50 border-orange-200 text-orange-800' 
                : 'bg-green-50 border-green-200 text-green-800'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">{compressionInfo.needsCompression ? '📐' : '✅'}</span>
                <div className="font-semibold text-gray-900">
                  {compressionInfo.needsCompression ? 'Sẽ nén ảnh' : 'Kích thước phù hợp'}
                </div>
              </div>
              <div className="text-sm space-y-1">
                <div>Kích thước hiện tại: <span className="font-medium text-gray-900">{compressionInfo.currentSizeKB}KB</span></div>
                {compressionInfo.needsCompression && (
                  <>
                    <div>Kích thước sau nén: <span className="font-medium text-gray-900">~{compressionInfo.targetSizeKB}KB</span></div>
                    <div>Giảm khoảng: <span className="font-medium text-orange-600 font-semibold">{compressionInfo.estimatedReduction}%</span></div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-3">
            <button
              onClick={() => onUpload('general')}
              disabled={isProcessing}
              className="flex items-center space-x-4 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 text-left w-full group active:scale-[0.98]"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                📸
              </div>
              <div>
                <div className="font-bold text-gray-900">Ảnh chung</div>
                <div className="text-sm text-gray-600 mt-0.5">Ảnh tổng quát về cây</div>
              </div>
            </button>

            <button
              onClick={() => onUpload('health')}
              disabled={isProcessing}
              className="flex items-center space-x-4 p-4 border-2 border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all disabled:opacity-50 text-left w-full group active:scale-[0.98]"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🏥
              </div>
              <div>
                <div className="font-bold text-gray-900">Ảnh sức khỏe</div>
                <div className="text-sm text-gray-600 mt-0.5">Ảnh bệnh tật, sâu bệnh</div>
              </div>
            </button>

            <button
              onClick={() => onUpload('fruit_count')}
              disabled={isProcessing}
              className="flex items-center space-x-4 p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all disabled:opacity-50 text-left w-full group active:scale-[0.98]"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🍎
              </div>
              <div>
                <div className="font-bold text-gray-900">Ảnh đếm trái</div>
                <div className="text-sm text-gray-600 mt-0.5">Ảnh để đếm số lượng trái</div>
              </div>
            </button>
          </div>

          {/* Progress States */}
          {isProcessing && (
            <div className={`rounded-xl p-4 border ${
              compressing 
                ? 'bg-orange-50 border-orange-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`animate-spin rounded-full h-6 w-6 border-2 border-t-transparent ${
                  compressing ? 'border-orange-600' : 'border-blue-600'
                }`}></div>
                <div>
                  <div className={`font-semibold ${
                    compressing ? 'text-orange-950' : 'text-blue-950'
                  }`}>
                    {compressing ? 'Đang nén ảnh...' : 'Đang tải ảnh lên...'}
                  </div>
                  <div className={`text-sm mt-0.5 ${
                    compressing ? 'text-orange-700' : 'text-blue-700'
                  }`}>
                    {compressing 
                      ? 'Giảm kích thước file để tải nhanh hơn' 
                      : 'Vui lòng chờ trong giây lát'
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cancel Button */}
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-full px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 rounded-xl font-medium transition-colors"
          >
            {isProcessing ? 'Đang xử lý...' : 'Hủy'}
          </button>
        </div>
      </div>
    </div>
  )
}
