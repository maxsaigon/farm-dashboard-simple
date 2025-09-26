// Farm invitation service for multi-tenant collaboration
import { db } from './firebase'
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  updateDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { 
  FarmInvitation, 
  InvitationStatus, 
  RoleType, 
  Permission,
  ROLE_PERMISSIONS,
  EnhancedUser,
  EnhancedFarm
} from './types-enhanced'
import { enhancedAuthService } from './enhanced-auth-service'

export class InvitationService {
  
  // Send farm invitation
  async inviteUserToFarm(data: {
    farmId: string
    inviteeEmail: string
    inviteeName?: string
    proposedRole: RoleType
    customPermissions?: Permission[]
    message?: string
  }): Promise<FarmInvitation> {
    const currentUser = enhancedAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('Authentication required')
    }

    // Check if current user has permission to invite
    if (!enhancedAuthService.hasPermission('users:invite', data.farmId)) {
      throw new Error('Insufficient permissions to invite users to this farm')
    }

    // Check if farm exists
    const farmDoc = await getDoc(doc(db, 'farms', data.farmId))
    if (!farmDoc.exists()) {
      throw new Error('Farm not found')
    }

    const farm = farmDoc.data() as EnhancedFarm

    // Check if user is already invited or has access
    const existingInvitation = await this.findExistingInvitation(data.farmId, data.inviteeEmail)
    if (existingInvitation && existingInvitation.status === 'pending') {
      throw new Error('User already has a pending invitation to this farm')
    }

    const existingAccess = await this.checkExistingAccess(data.farmId, data.inviteeEmail)
    if (existingAccess) {
      throw new Error('User already has access to this farm')
    }

    // Create invitation
    const invitationId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const invitationCode = this.generateInvitationCode()
    
    const invitation: FarmInvitation = {
      id: invitationId,
      farmId: data.farmId,
      organizationId: farm.organizationId,
      inviterUserId: currentUser.uid,
      inviteeEmail: data.inviteeEmail.toLowerCase(),
      inviteeName: data.inviteeName,
      proposedRole: data.proposedRole,
      proposedPermissions: data.customPermissions || ROLE_PERMISSIONS[data.proposedRole] || [],
      invitationCode,
      message: data.message,
      status: 'pending',
      sentAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      metadata: {
        farmName: farm.name,
        inviterName: currentUser.displayName
      }
    }

    await setDoc(doc(db, 'farmInvitations', invitationId), {
      ...invitation,
      sentAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    })

    // Send invitation email (implement email service integration)
    await this.sendInvitationEmail(invitation, farm, currentUser)

    // Log activity
    await this.logInvitationActivity(currentUser.uid, 'invitation:sent', invitationId, {
      farmId: data.farmId,
      inviteeEmail: data.inviteeEmail,
      proposedRole: data.proposedRole
    })

    return invitation
  }

  // Accept invitation
  async acceptInvitation(invitationCode: string): Promise<{ success: boolean; farmId: string; role: RoleType }> {
    const currentUser = enhancedAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('Authentication required')
    }

    // Find invitation by code
    const invitationsQuery = query(
      collection(db, 'farmInvitations'),
      where('invitationCode', '==', invitationCode),
      where('status', '==', 'pending')
    )
    
    const invitationsSnapshot = await getDocs(invitationsQuery)
    if (invitationsSnapshot.empty) {
      throw new Error('Invalid or expired invitation code')
    }

    const invitationDoc = invitationsSnapshot.docs[0]
    const invitation = {
      id: invitationDoc.id,
      ...invitationDoc.data(),
      sentAt: invitationDoc.data().sentAt?.toDate() || new Date(),
      expiresAt: invitationDoc.data().expiresAt?.toDate() || new Date(),
      respondedAt: invitationDoc.data().respondedAt?.toDate()
    } as FarmInvitation

    // Check if invitation is for current user
    if (invitation.inviteeEmail !== currentUser.email?.toLowerCase()) {
      throw new Error('This invitation is not for your email address')
    }

    // Check if invitation is expired
    if (invitation.expiresAt < new Date()) {
      await this.updateInvitationStatus(invitation.id, 'expired')
      throw new Error('This invitation has expired')
    }

    const batch = writeBatch(db)

    // Grant user role
    await enhancedAuthService.grantUserRole(
      currentUser.uid,
      invitation.proposedRole,
      'farm',
      invitation.farmId,
      invitation.inviterUserId
    )

    // Create legacy UserFarmAccess for backward compatibility
    const legacyAccessId = `${currentUser.uid}_${invitation.farmId}`
    batch.set(doc(db, 'userFarmAccess', legacyAccessId), {
      userId: currentUser.uid,
      farmId: invitation.farmId,
      role: this.mapRoleToLegacyRole(invitation.proposedRole),
      permissions: invitation.proposedPermissions,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      invitationId: invitation.id
    })

    // Update invitation status
    batch.update(doc(db, 'farmInvitations', invitation.id), {
      status: 'accepted',
      respondedAt: serverTimestamp(),
      acceptedByUserId: currentUser.uid
    })

    await batch.commit()

    // Log activity
    await this.logInvitationActivity(currentUser.uid, 'invitation:accepted', invitation.id, {
      farmId: invitation.farmId,
      role: invitation.proposedRole
    })

    return {
      success: true,
      farmId: invitation.farmId,
      role: invitation.proposedRole
    }
  }

  // Decline invitation
  async declineInvitation(invitationCode: string, reason?: string): Promise<void> {
    const currentUser = enhancedAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('Authentication required')
    }

    const invitationsQuery = query(
      collection(db, 'farmInvitations'),
      where('invitationCode', '==', invitationCode),
      where('status', '==', 'pending')
    )
    
    const invitationsSnapshot = await getDocs(invitationsQuery)
    if (invitationsSnapshot.empty) {
      throw new Error('Invalid or expired invitation code')
    }

    const invitationDoc = invitationsSnapshot.docs[0]
    const invitation = invitationDoc.data() as FarmInvitation

    if (invitation.inviteeEmail !== currentUser.email?.toLowerCase()) {
      throw new Error('This invitation is not for your email address')
    }

    await updateDoc(doc(db, 'farmInvitations', invitationDoc.id), {
      status: 'declined',
      respondedAt: serverTimestamp(),
      declineReason: reason,
      declinedByUserId: currentUser.uid
    })

    // Log activity
    await this.logInvitationActivity(currentUser.uid, 'invitation:declined', invitationDoc.id, {
      farmId: invitation.farmId,
      reason
    })
  }

  // Get invitations sent by current user
  async getSentInvitations(farmId?: string): Promise<FarmInvitation[]> {
    const currentUser = enhancedAuthService.getCurrentUser()
    if (!currentUser) return []

    let invitationsQuery = query(
      collection(db, 'farmInvitations'),
      where('inviterUserId', '==', currentUser.uid),
      orderBy('sentAt', 'desc')
    )

    if (farmId) {
      invitationsQuery = query(
        collection(db, 'farmInvitations'),
        where('inviterUserId', '==', currentUser.uid),
        where('farmId', '==', farmId),
        orderBy('sentAt', 'desc')
      )
    }

    const snapshot = await getDocs(invitationsQuery)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      sentAt: doc.data().sentAt?.toDate() || new Date(),
      expiresAt: doc.data().expiresAt?.toDate() || new Date(),
      respondedAt: doc.data().respondedAt?.toDate()
    })) as FarmInvitation[]
  }

  // Get invitations received by current user
  async getReceivedInvitations(): Promise<FarmInvitation[]> {
    const currentUser = enhancedAuthService.getCurrentUser()
    if (!currentUser?.email) return []

    const invitationsQuery = query(
      collection(db, 'farmInvitations'),
      where('inviteeEmail', '==', currentUser.email.toLowerCase()),
      orderBy('sentAt', 'desc')
    )

    const snapshot = await getDocs(invitationsQuery)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      sentAt: doc.data().sentAt?.toDate() || new Date(),
      expiresAt: doc.data().expiresAt?.toDate() || new Date(),
      respondedAt: doc.data().respondedAt?.toDate()
    })) as FarmInvitation[]
  }

  // Cancel invitation
  async cancelInvitation(invitationId: string): Promise<void> {
    const currentUser = enhancedAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('Authentication required')
    }

    const invitationDoc = await getDoc(doc(db, 'farmInvitations', invitationId))
    if (!invitationDoc.exists()) {
      throw new Error('Invitation not found')
    }

    const invitation = invitationDoc.data() as FarmInvitation

    // Check if current user is the inviter or has farm management permissions
    const canCancel = invitation.inviterUserId === currentUser.uid ||
                     enhancedAuthService.hasPermission('users:manage', invitation.farmId) ||
                     enhancedAuthService.isSuperAdmin()

    if (!canCancel) {
      throw new Error('Insufficient permissions to cancel this invitation')
    }

    await updateDoc(doc(db, 'farmInvitations', invitationId), {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancelledByUserId: currentUser.uid
    })

    await this.logInvitationActivity(currentUser.uid, 'invitation:cancelled', invitationId, {
      farmId: invitation.farmId
    })
  }

  // Resend invitation
  async resendInvitation(invitationId: string): Promise<void> {
    const currentUser = enhancedAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('Authentication required')
    }

    const invitationDoc = await getDoc(doc(db, 'farmInvitations', invitationId))
    if (!invitationDoc.exists()) {
      throw new Error('Invitation not found')
    }

    const invitation = {
      ...invitationDoc.data(),
      sentAt: invitationDoc.data().sentAt?.toDate() || new Date(),
      expiresAt: invitationDoc.data().expiresAt?.toDate() || new Date()
    } as FarmInvitation

    // Check permissions
    const canResend = invitation.inviterUserId === currentUser.uid ||
                     enhancedAuthService.hasPermission('users:invite', invitation.farmId)

    if (!canResend) {
      throw new Error('Insufficient permissions to resend this invitation')
    }

    // Update invitation with new expiry
    const newExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await updateDoc(doc(db, 'farmInvitations', invitationId), {
      status: 'pending',
      resentAt: serverTimestamp(),
      expiresAt: newExpiryDate,
      resentCount: (invitation.metadata?.resentCount || 0) + 1
    })

    // Get farm and resend email
    const farmDoc = await getDoc(doc(db, 'farms', invitation.farmId))
    if (farmDoc.exists()) {
      const farm = farmDoc.data() as EnhancedFarm
      await this.sendInvitationEmail(invitation, farm, currentUser)
    }

    await this.logInvitationActivity(currentUser.uid, 'invitation:resent', invitationId, {
      farmId: invitation.farmId
    })
  }

  // Get invitation by code (for public invitation page)
  async getInvitationByCode(invitationCode: string): Promise<{
    invitation: FarmInvitation
    farm: EnhancedFarm
    inviter: EnhancedUser
  } | null> {
    const invitationsQuery = query(
      collection(db, 'farmInvitations'),
      where('invitationCode', '==', invitationCode)
    )
    
    const snapshot = await getDocs(invitationsQuery)
    if (snapshot.empty) return null

    const invitationDoc = snapshot.docs[0]
    const invitation = {
      id: invitationDoc.id,
      ...invitationDoc.data(),
      sentAt: invitationDoc.data().sentAt?.toDate() || new Date(),
      expiresAt: invitationDoc.data().expiresAt?.toDate() || new Date(),
      respondedAt: invitationDoc.data().respondedAt?.toDate()
    } as FarmInvitation

    // Get farm details
    const farmDoc = await getDoc(doc(db, 'farms', invitation.farmId))
    if (!farmDoc.exists()) return null
    
    const farm = {
      id: farmDoc.id,
      ...farmDoc.data(),
      createdDate: farmDoc.data().createdDate?.toDate() || new Date()
    } as EnhancedFarm

    // Get inviter details
    const inviterDoc = await getDoc(doc(db, 'users', invitation.inviterUserId))
    if (!inviterDoc.exists()) return null

    const inviter = {
      ...inviterDoc.data(),
      createdAt: inviterDoc.data().createdAt?.toDate() || new Date(),
      lastLoginAt: inviterDoc.data().lastLoginAt?.toDate()
    } as EnhancedUser

    return { invitation, farm, inviter }
  }

  // Remove user from farm
  async removeUserFromFarm(farmId: string, userId: string): Promise<void> {
    const currentUser = enhancedAuthService.getCurrentUser()
    if (!currentUser) {
      throw new Error('Authentication required')
    }

    // Check permissions
    if (!enhancedAuthService.hasPermission('users:remove', farmId) && !enhancedAuthService.isSuperAdmin()) {
      throw new Error('Insufficient permissions to remove users from this farm')
    }

    const batch = writeBatch(db)

    // Remove user roles for this farm
    const rolesQuery = query(
      collection(db, 'userRoles'),
      where('userId', '==', userId),
      where('scopeType', '==', 'farm'),
      where('scopeId', '==', farmId)
    )
    
    const rolesSnapshot = await getDocs(rolesQuery)
    rolesSnapshot.docs.forEach(roleDoc => {
      batch.update(roleDoc.ref, {
        isActive: false,
        revokedAt: serverTimestamp(),
        revokedByUserId: currentUser.uid
      })
    })

    // Remove legacy farm access
    const accessDoc = doc(db, 'userFarmAccess', `${userId}_${farmId}`)
    const accessSnapshot = await getDoc(accessDoc)
    if (accessSnapshot.exists()) {
      batch.delete(accessDoc)
    }

    await batch.commit()

    await this.logInvitationActivity(currentUser.uid, 'user:removed_from_farm', farmId, {
      removedUserId: userId
    })
  }

  // Private helper methods
  private async findExistingInvitation(farmId: string, email: string): Promise<FarmInvitation | null> {
    const query_ = query(
      collection(db, 'farmInvitations'),
      where('farmId', '==', farmId),
      where('inviteeEmail', '==', email.toLowerCase()),
      where('status', '==', 'pending')
    )
    
    const snapshot = await getDocs(query_)
    if (snapshot.empty) return null

    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
      sentAt: snapshot.docs[0].data().sentAt?.toDate() || new Date(),
      expiresAt: snapshot.docs[0].data().expiresAt?.toDate() || new Date()
    } as FarmInvitation
  }

  private async checkExistingAccess(farmId: string, email: string): Promise<boolean> {
    // Check if user already has access via UserFarmAccess
    const accessQuery = query(
      collection(db, 'userFarmAccess'),
      where('farmId', '==', farmId)
    )
    
    const accessSnapshot = await getDocs(accessQuery)
    
    // Check if any of these access records belong to a user with this email
    for (const accessDoc of accessSnapshot.docs) {
      const accessData = accessDoc.data()
      const userDoc = await getDoc(doc(db, 'users', accessData.userId))
      
      if (userDoc.exists() && userDoc.data().email?.toLowerCase() === email.toLowerCase()) {
        return true
      }
    }

    return false
  }

  private generateInvitationCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
  }

  private async updateInvitationStatus(invitationId: string, status: InvitationStatus): Promise<void> {
    await updateDoc(doc(db, 'farmInvitations', invitationId), {
      status,
      statusUpdatedAt: serverTimestamp()
    })
  }

  private mapRoleToLegacyRole(roleType: RoleType): 'owner' | 'manager' | 'viewer' {
    switch (roleType) {
      case 'farm_owner': return 'owner'
      case 'farm_manager': return 'manager'
      default: return 'viewer'
    }
  }

  private async sendInvitationEmail(
    invitation: FarmInvitation,
    farm: EnhancedFarm,
    inviter: EnhancedUser
  ): Promise<void> {
    // TODO: Implement email service integration
    // This would integrate with SendGrid, AWS SES, or similar service
  }

  private async logInvitationActivity(
    userId: string,
    action: string,
    resourceId: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    try {
      const activityId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await setDoc(doc(db, 'activityLogs', activityId), {
        id: activityId,
        userId,
        action,
        resource: 'invitation',
        resourceId,
        details,
        timestamp: serverTimestamp(),
        status: 'success'
      })
    } catch (error) {
      // Failed to log invitation activity
    }
  }
}

// Export singleton instance
export const invitationService = new InvitationService()