'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  PlusIcon, 
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useSimpleAuth } from '@/lib/simple-auth-context'
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useToast } from './Toast'

interface TreeNote {
  id: string
  content: string
  author: {
    uid: string
    name: string
    email: string
  }
  timestamp: Date
  type: 'info' | 'warning' | 'success' | 'urgent'
  mentions?: string[] // Array of user IDs mentioned in the note
  attachments?: {
    type: 'image' | 'document'
    url: string
    name: string
  }[]
  isEdited?: boolean
  editedAt?: Date
}

interface TreeNoteSystemProps {
  treeId: string
  farmId: string
  className?: string
}

const NOTE_TYPES = {
  info: {
    icon: InformationCircleIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Thông tin'
  },
  warning: {
    icon: ExclamationTriangleIcon,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Cảnh báo'
  },
  success: {
    icon: CheckCircleIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Hoàn thành'
  },
  urgent: {
    icon: ExclamationTriangleIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Khẩn cấp'
  }
}

export default function TreeNoteSystem({ treeId, farmId, className = '' }: TreeNoteSystemProps) {
  const { user } = useSimpleAuth()
  const { showSuccess, showError } = useToast()
  const [notes, setNotes] = useState<TreeNote[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState<keyof typeof NOTE_TYPES>('info')
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load notes in real-time
  useEffect(() => {
    if (!farmId || !treeId) {
      return
    }

    const notesRef = collection(db, 'farms', farmId, 'trees', treeId, 'notes')
    const q = query(notesRef, orderBy('timestamp', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        } as TreeNote
      })

      setNotes(notesData)
    }, (error) => {
      showError('Lỗi', 'Không thể tải ghi chú')
    })

    return () => {
      unsubscribe()
    }
  }, [farmId, treeId])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [newNote])

  const handleAddNote = async () => {
    if (!user || !newNote.trim()) {
      return
    }

    setLoading(true)
    try {
      const notesRef = collection(db, 'farms', farmId, 'trees', treeId, 'notes')

      const noteData = {
        content: newNote.trim(),
        author: {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Người dùng',
          email: user.email || ''
        },
        timestamp: serverTimestamp(),
        type: noteType,
        mentions: extractMentions(newNote),
        isEdited: false
      }

      const docRef = await addDoc(notesRef, noteData)

      setNewNote('')
      setIsAddingNote(false)
      showSuccess('Đã thêm', 'Ghi chú đã được thêm thành công')
    } catch (error) {
      showError('Lỗi', `Không thể thêm ghi chú: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`)
    } finally {
      setLoading(false)
    }
  }

  const extractMentions = (content: string): string[] => {
    const mentionPattern = /@(\w+)/g
    const mentions = []
    let match
    while ((match = mentionPattern.exec(content)) !== null) {
      mentions.push(match[1])
    }
    return mentions
  }

  const formatRelativeTime = (date: Date): string => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Vừa xong'
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} giờ trước`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} ngày trước`
    
    return date.toLocaleDateString('vi-VN')
  }

  const unreadCount = notes.filter(note => 
    note.author.uid !== user?.uid && 
    note.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
  ).length

  if (!user) return null

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Ghi chú</h3>
            <p className="text-sm text-gray-500">
              {notes.length} ghi chú • Cộng tác nhóm
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
              {unreadCount}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsAddingNote(true)
              setIsExpanded(true)
            }}
            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
            title="Thêm ghi chú nhanh"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Add Note Form */}
          {isAddingNote && (
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="space-y-3">
                {/* Note Type Selector */}
                <div className="flex space-x-2">
                  {Object.entries(NOTE_TYPES).map(([type, config]) => {
                    const Icon = config.icon
                    return (
                      <button
                        key={type}
                        onClick={() => setNoteType(type as keyof typeof NOTE_TYPES)}
                        className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          noteType === type
                            ? `${config.bgColor} ${config.color} ${config.borderColor} border`
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{config.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Note Input */}
                <textarea
                  ref={textareaRef}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Nhập ghi chú... (sử dụng @tên để mention thành viên)"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none min-h-[80px]"
                  disabled={loading}
                />

                {/* Action Buttons */}
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    <span>💡 Mẹo: Sử dụng @tên để nhắc thành viên khác</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setIsAddingNote(false)
                        setNewNote('')
                      }}
                      className="px-3 py-1 text-gray-600 hover:text-gray-800 transition-colors"
                      disabled={loading}
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || loading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {loading ? 'Đang lưu...' : 'Thêm ghi chú'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes Timeline */}
          <div className="max-h-96 overflow-y-auto">
            {notes.length === 0 ? (
              <div className="p-8 text-center">
                <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Chưa có ghi chú nào</h4>
                <p className="text-gray-500 mb-4">Hãy thêm ghi chú đầu tiên để bắt đầu cộng tác với nhóm</p>
                <button
                  onClick={() => setIsAddingNote(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Thêm ghi chú đầu tiên
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {notes.map((note) => {
                  const noteConfig = NOTE_TYPES[note.type]
                  const Icon = noteConfig.icon
                  const isOwnNote = note.author.uid === user?.uid

                  return (
                    <div
                      key={note.id}
                      className={`p-4 border-l-4 ${noteConfig.borderColor} ${noteConfig.bgColor} hover:bg-opacity-80 transition-colors`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-1 rounded-full ${noteConfig.bgColor}`}>
                          <Icon className={`w-4 h-4 ${noteConfig.color}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`text-sm font-medium ${isOwnNote ? 'text-blue-600' : 'text-gray-900'}`}>
                              {isOwnNote ? 'Bạn' : note.author.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatRelativeTime(note.timestamp)}
                            </span>
                            {note.isEdited && (
                              <span className="text-xs text-gray-400">(đã chỉnh sửa)</span>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-800 whitespace-pre-wrap">
                            {note.content}
                          </div>
                          
                          {note.mentions && note.mentions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {note.mentions.map((mention, index) => (
                                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                  @{mention}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}