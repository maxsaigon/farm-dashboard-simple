'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/enhanced-auth-context'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { user, signIn } = useAuth()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signIn(email, password)
      router.push('/')
    } catch (err: unknown) {
      console.error('Login error:', err)
      let errorMessage = 'Đăng nhập thất bại. Vui lòng thử lại.'
      
      if (err && typeof err === 'object' && 'code' in err) {
        const firebaseError = err as { code: string }
        if (firebaseError.code === 'auth/user-not-found') {
          errorMessage = 'Không tìm thấy tài khoản với email này.'
        } else if (firebaseError.code === 'auth/wrong-password') {
          errorMessage = 'Mật khẩu không đúng.'
        } else if (firebaseError.code === 'auth/invalid-email') {
          errorMessage = 'Email không hợp lệ.'
        } else if (firebaseError.code === 'auth/too-many-requests') {
          errorMessage = 'Quá nhiều lần thử. Vui lòng đợi và thử lại.'
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Đăng Nhập FarmManager
          </h1>
          <p className="text-gray-600">
            Truy cập dashboard nông trại sầu riêng
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              placeholder="your-email@example.com"
              style={{ minHeight: '44px' }}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              placeholder="••••••••"
              style={{ minHeight: '44px' }}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 transform active:scale-95 disabled:transform-none"
            style={{ minHeight: '44px' }}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Đang đăng nhập...
              </div>
            ) : (
              'Đăng Nhập'
            )}
          </button>
        </form>


        {/* Info */}
        <div className="mt-6 text-center">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h3 className="text-sm font-medium text-green-800 mb-2">
              💡 Hướng dẫn đăng nhập
            </h3>
            <div className="text-sm text-green-700 space-y-1">
              <p>• Sử dụng tài khoản Firebase của bạn</p>
              <p>• Dữ liệu sẽ đồng bộ thời gian thực</p>
              <p>• Nếu chưa có tài khoản, vui lòng liên hệ quản trị viên</p>
            </div>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            ← Quay lại Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}