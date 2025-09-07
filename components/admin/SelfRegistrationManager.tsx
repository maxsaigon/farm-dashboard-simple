'use client'

import { useState, useEffect } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import { EnhancedUser } from '@/lib/types-enhanced'
import { 
  UserIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface PendingRegistration extends EnhancedUser {
  registrationDate: Date
  approvalStatus: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  requestedAccess?: {
    farmName?: string
    organizationName?: string
    reason?: string
  }
}

export default function SelfRegistrationManager() {
  const { user, isSuperAdmin, isOrganizationAdmin } = useEnhancedAuth()
  const [pendingUsers, setPendingUsers] = useState<PendingRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<PendingRegistration | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    if (isSuperAdmin() || isOrganizationAdmin()) {
      loadPendingRegistrations()
    }
  }, [isSuperAdmin, isOrganizationAdmin])

  const loadPendingRegistrations = async () => {
    try {
      setLoading(true)
      const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      const pendingQuery = query(
        collection(db, 'pendingRegistrations'),
        where('approvalStatus', '==', 'pending'),
        orderBy('registrationDate', 'desc')
      )

      const snapshot = await getDocs(pendingQuery)
      const pendingData = snapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id,
        registrationDate: doc.data().registrationDate?.toDate() || new Date()
      })) as PendingRegistration[]

      setPendingUsers(pendingData)
    } catch (error) {
      console.error('Error loading pending registrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const approveRegistration = async (pendingUser: PendingRegistration) => {
    if (!user) return

    try {
      setLoading(true)
      const { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')
      const { enhancedAuthService } = await import('@/lib/enhanced-auth-service')

      // Create user in main users collection
      const approvedUser: EnhancedUser = {
        ...pendingUser,
        accountStatus: 'active',
        isEmailVerified: true,
        updatedAt: new Date()
      }

      await setDoc(doc(db, 'users', pendingUser.uid), {
        ...approvedUser,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      // Grant appropriate role based on request
      if (pendingUser.requestedAccess?.farmName) {
        // If they requested farm access, grant farm_viewer role initially
        await enhancedAuthService.grantUserRole(
          pendingUser.uid,
          'farm_viewer',
          'farm',
          undefined, // Will need to be set by farm owner later
          user.uid
        )
      } else {
        // Grant basic organization member role
        await enhancedAuthService.grantUserRole(
          pendingUser.uid,
          'organization_member',
          'organization',
          undefined, // Will need organization context
          user.uid
        )
      }

      // Update pending registration status
      await updateDoc(doc(db, 'pendingRegistrations', pendingUser.uid), {
        approvalStatus: 'approved',
        approvedBy: user.uid,
        approvedAt: serverTimestamp()
      })

      // Send approval notification email
      await sendApprovalNotification(pendingUser, 'approved')

      await loadPendingRegistrations()
      alert(`User ${pendingUser.email} has been approved!`)
    } catch (error) {
      console.error('Error approving registration:', error)
      alert('Failed to approve registration. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const rejectRegistration = async (pendingUser: PendingRegistration, reason: string) => {
    if (!user || !reason.trim()) return

    try {
      setLoading(true)
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      await updateDoc(doc(db, 'pendingRegistrations', pendingUser.uid), {
        approvalStatus: 'rejected',
        rejectionReason: reason.trim(),
        rejectedBy: user.uid,
        rejectedAt: serverTimestamp()
      })

      // Send rejection notification email
      await sendApprovalNotification(pendingUser, 'rejected', reason)

      await loadPendingRegistrations()
      setRejectionReason('')
      setSelectedUser(null)
      setShowDetailsModal(false)
      alert(`Registration for ${pendingUser.email} has been rejected.`)
    } catch (error) {
      console.error('Error rejecting registration:', error)
      alert('Failed to reject registration. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const sendApprovalNotification = async (
    user: PendingRegistration, 
    status: 'approved' | 'rejected', 
    reason?: string
  ) => {
    // TODO: Implement email notification
    console.log(`Sending ${status} notification to ${user.email}`, { reason })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
  }

  if (!isSuperAdmin() && !isOrganizationAdmin()) {
    return (
      <div className="text-center py-8">
        <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">You need admin access to manage user registrations.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pending User Registrations</h2>
          <p className="text-gray-600">Review and approve new user registration requests</p>
        </div>
        <button
          onClick={loadPendingRegistrations}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Pending Registrations List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Pending Approvals ({pendingUsers.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            <span className="ml-2">Loading registrations...</span>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="text-center py-8">
            <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No pending registrations.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {pendingUsers.map((pendingUser) => (
              <div key={pendingUser.uid} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(pendingUser.approvalStatus)}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {pendingUser.displayName || 'No name provided'}
                      </h4>
                      <p className="text-sm text-gray-500">{pendingUser.email}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-400">
                          Registered: {pendingUser.registrationDate.toLocaleDateString()}
                        </span>
                        {pendingUser.phoneNumber && (
                          <span className="text-xs text-gray-400">
                            Phone: {pendingUser.phoneNumber}
                          </span>
                        )}
                      </div>
                      {pendingUser.requestedAccess && (
                        <div className="mt-2 text-xs text-blue-600">
                          {pendingUser.requestedAccess.farmName && (
                            <span>Requested farm: {pendingUser.requestedAccess.farmName}</span>
                          )}
                          {pendingUser.requestedAccess.organizationName && (
                            <span>Requested org: {pendingUser.requestedAccess.organizationName}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                      {pendingUser.approvalStatus}
                    </span>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(pendingUser)
                          setShowDetailsModal(true)
                        }}
                        className="p-2 text-blue-600 hover:text-blue-800"
                        title="View details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => approveRegistration(pendingUser)}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(pendingUser)
                          setShowDetailsModal(true)
                        }}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Registration Details
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-sm text-gray-900">{selectedUser.displayName || 'Not provided'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">{selectedUser.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="text-sm text-gray-900">{selectedUser.phoneNumber || 'Not provided'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Registration Date</label>
                <p className="text-sm text-gray-900">{selectedUser.registrationDate.toLocaleDateString()}</p>
              </div>

              {selectedUser.requestedAccess && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Access Request</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded text-sm">
                    {selectedUser.requestedAccess.farmName && (
                      <p><strong>Farm:</strong> {selectedUser.requestedAccess.farmName}</p>
                    )}
                    {selectedUser.requestedAccess.organizationName && (
                      <p><strong>Organization:</strong> {selectedUser.requestedAccess.organizationName}</p>
                    )}
                    {selectedUser.requestedAccess.reason && (
                      <p><strong>Reason:</strong> {selectedUser.requestedAccess.reason}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Rejection Reason Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (if rejecting)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={() => approveRegistration(selectedUser)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Approve User
              </button>
              <button
                onClick={() => rejectRegistration(selectedUser, rejectionReason)}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Reject User
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedUser(null)
                  setRejectionReason('')
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}