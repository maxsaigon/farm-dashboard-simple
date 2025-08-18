'use client'

import { useState, useEffect } from 'react'
import { onAuthStateChange } from '../lib/auth'
import { User as FirebaseUser } from 'firebase/auth'

export default function UserInfo() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
      console.log('Auth state changed:', firebaseUser ? {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName
      } : 'Not authenticated')
    })

    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600 text-sm">Đang kiểm tra trạng thái đăng nhập...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-green-800 mb-2">
        ✅ Đã kết nối Firebase
      </h3>
      <div className="text-sm text-green-700 space-y-1">
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>User ID:</strong> {user.uid}</p>
        {user.displayName && <p><strong>Tên:</strong> {user.displayName}</p>}
        <p><strong>Đăng nhập lần cuối:</strong> {user.metadata.lastSignInTime}</p>
      </div>
    </div>
  )
}