'use client'

import { useRouter } from 'next/navigation'
import { useSimpleAuth } from '@/lib/optimized-auth-context'

export default function NoAccessPage() {
  const router = useRouter()
  const { user, signOut } = useSimpleAuth()

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m12-5a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Không có quyền truy cập
        </h1>
        <p className="text-gray-600 mb-6">
          Tài khoản của bạn không có quyền truy cập trang này hoặc quyền hiện tại chưa phù hợp.
        </p>

        {/* User Info */}
        {user && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Tên:</strong> {user.displayName || 'Chưa cập nhật'}</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            💡 Để truy cập hệ thống
          </h3>
          <div className="text-sm text-blue-700 space-y-1 text-left">
            <p>• Liên hệ quản trị viên trang trại</p>
            <p>• Yêu cầu cấp quyền truy cập</p>
            <p>• Hoặc tạo trang trại mới nếu được phép</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 transform active:scale-95"
          >
            Đăng xuất
          </button>
          
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-all duration-200"
          >
            Đăng nhập tài khoản khác
          </button>
        </div>
      </div>
    </div>
  )
}
