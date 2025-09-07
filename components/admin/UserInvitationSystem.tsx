'use client'

import { useState, useEffect } from 'react'
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'
import { FarmInvitation, RoleType, ROLE_PERMISSIONS, InvitationStatus } from '@/lib/types-enhanced'
import { 
  EnvelopeIcon, 
  UserPlusIcon, 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

export default function UserInvitationSystem() {
  const { user, isSuperAdmin, isOrganizationAdmin, isFarmOwner, currentFarm } = useEnhancedAuth()
  const [invitations, setInvitations] = useState<FarmInvitation[]>([])
  const [loading, setLoading] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [newInvitation, setNewInvitation] = useState({
    email: '',
    name: '',
    role: 'farm_viewer' as RoleType,
    message: ''
  })

  useEffect(() => {
    loadInvitations()
  }, [currentFarm])

  const loadInvitations = async () => {
    if (!currentFarm) return

    try {
      setLoading(true)
      const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      const invitationsQuery = query(
        collection(db, 'farmInvitations'),
        where('farmId', '==', currentFarm.id),
        orderBy('sentAt', 'desc')
      )

      const snapshot = await getDocs(invitationsQuery)
      const invitationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate() || new Date(),
        respondedAt: doc.data().respondedAt?.toDate(),
        expiresAt: doc.data().expiresAt?.toDate() || new Date()
      })) as FarmInvitation[]

      setInvitations(invitationsData)
    } catch (error) {
      console.error('Error loading invitations:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendInvitation = async () => {
    if (!user || !currentFarm || !newInvitation.email.trim()) return

    try {
      setLoading(true)
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      const invitationId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const invitationCode = Math.random().toString(36).substr(2, 12).toUpperCase()

      const invitation: FarmInvitation = {
        id: invitationId,
        farmId: currentFarm.id,
        organizationId: currentFarm.organizationId,
        inviterUserId: user.uid,
        inviteeEmail: newInvitation.email.trim(),
        inviteeName: newInvitation.name.trim() || undefined,
        proposedRole: newInvitation.role,
        proposedPermissions: ROLE_PERMISSIONS[newInvitation.role] || [],
        invitationCode,
        message: newInvitation.message.trim() || undefined,
        status: 'pending',
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }

      await setDoc(doc(db, 'farmInvitations', invitationId), {
        ...invitation,
        sentAt: serverTimestamp(),
        expiresAt: serverTimestamp()
      })

      // Send email invitation (you'll need to implement this with your email service)
      await sendInvitationEmail(invitation)

      // Reset form and refresh
      setNewInvitation({ email: '', name: '', role: 'farm_viewer', message: '' })
      setShowInviteModal(false)
      await loadInvitations()

      alert('Invitation sent successfully!')
    } catch (error) {
      console.error('Error sending invitation:', error)
      alert('Failed to send invitation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const sendInvitationEmail = async (invitation: FarmInvitation) => {
    // TODO: Implement email sending logic
    // This would typically call your email service (SendGrid, AWS SES, etc.)
    console.log('Sending invitation email:', invitation)
    
    // For now, just log the invitation details
    const inviteUrl = `${window.location.origin}/invite/${invitation.invitationCode}`
    console.log('Invitation URL:', inviteUrl)
  }

  const resendInvitation = async (invitationId: string) => {
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      await updateDoc(doc(db, 'farmInvitations', invitationId), {
        status: 'resent',
        sentAt: serverTimestamp()
      })

      await loadInvitations()
      alert('Invitation resent successfully!')
    } catch (error) {
      console.error('Error resending invitation:', error)
      alert('Failed to resend invitation.')
    }
  }

  const cancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return

    try {
      const { doc, updateDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      await updateDoc(doc(db, 'farmInvitations', invitationId), {
        status: 'cancelled'
      })

      await loadInvitations()
      alert('Invitation cancelled.')
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      alert('Failed to cancel invitation.')
    }
  }

  const getStatusIcon = (status: InvitationStatus) => {
    switch (status) {
      case 'pending':
      case 'resent':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      case 'accepted':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'declined':
      case 'cancelled':
      case 'expired':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: InvitationStatus) => {
    switch (status) {
      case 'pending':
      case 'resent':
        return 'bg-yellow-100 text-yellow-800'
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'declined':
      case 'cancelled':
      case 'expired':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const canManageInvitations = isSuperAdmin() || isOrganizationAdmin() || isFarmOwner()

  if (!canManageInvitations) {
    return (
      <div className="text-center py-8">
        <UserPlusIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">You need admin or farm owner access to manage invitations.</p>
      </div>
    )
  }

  if (!currentFarm) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please select a farm to manage invitations.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Invitations</h2>
          <p className="text-gray-600">Invite users to join {currentFarm.name}</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadInvitations}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-4 w-4 inline mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <UserPlusIcon className="h-4 w-4 inline mr-2" />
            Send Invitation
          </button>
        </div>
      </div>

      {/* Invitations List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Farm Invitations ({invitations.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            <span className="ml-2">Loading invitations...</span>
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-8">
            <EnvelopeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No invitations sent yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(invitation.status)}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {invitation.inviteeName || invitation.inviteeEmail}
                      </h4>
                      <p className="text-sm text-gray-500">{invitation.inviteeEmail}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-400">
                          Role: {invitation.proposedRole}
                        </span>
                        <span className="text-xs text-gray-400">
                          Sent: {invitation.sentAt.toLocaleDateString()}
                        </span>
                        <span className="text-xs text-gray-400">
                          Expires: {invitation.expiresAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invitation.status)}`}>
                      {invitation.status}
                    </span>

                    {invitation.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => resendInvitation(invitation.id)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Resend
                        </button>
                        <button
                          onClick={() => cancelInvitation(invitation.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {invitation.message && (
                  <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {invitation.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invitation Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Invite User to {currentFarm.name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newInvitation.email}
                  onChange={(e) => setNewInvitation(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={newInvitation.name}
                  onChange={(e) => setNewInvitation(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={newInvitation.role}
                  onChange={(e) => setNewInvitation(prev => ({ ...prev, role: e.target.value as RoleType }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="farm_viewer">Farm Viewer (Read-only)</option>
                  <option value="farm_manager">Farm Manager</option>
                  <option value="seasonal_worker">Seasonal Worker</option>
                  {(isSuperAdmin() || isOrganizationAdmin()) && (
                    <option value="farm_owner">Farm Owner</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personal Message (Optional)
                </label>
                <textarea
                  value={newInvitation.message}
                  onChange={(e) => setNewInvitation(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Welcome to our farm! Looking forward to working with you."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Role Permissions Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions for {newInvitation.role}
                </label>
                <div className="max-h-24 overflow-y-auto bg-gray-50 p-2 rounded text-xs">
                  {ROLE_PERMISSIONS[newInvitation.role]?.map(permission => (
                    <div key={permission} className="text-gray-600">{permission}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={sendInvitation}
                disabled={loading || !newInvitation.email.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Invitation'}
              </button>
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}