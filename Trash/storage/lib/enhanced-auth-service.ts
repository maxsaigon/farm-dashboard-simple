// Enhanced authentication service with multi-tenant support
import { auth, db } from '@/lib/firebase'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth'
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  writeBatch,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore'
import { 
  EnhancedUser, 
  UserRole, 
  Organization, 
  EnhancedFarm, 
  Permission, 
  RoleType,
  ROLE_PERMISSIONS,
  ActivityLog,
  UserPreferences,
  NotificationSettings,
  DashboardSettings,
  PrivacySettings
} from '@/lib/types-enhanced'

export class EnhancedAuthService {
  private currentUser: EnhancedUser | null = null
  private currentRoles: UserRole[] = []
  private currentOrganizations: Organization[] = []
  private currentFarms: EnhancedFarm[] = []

  // User Authentication
  async signIn(email: string, password: string): Promise<EnhancedUser> {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const user = await this.loadUserProfile(credential.user.uid)
      
      // Update login tracking
      await this.updateLoginTracking(user.uid)
      
      // Load user roles and permissions
      await this.loadUserRoles(user.uid)
      
      // Log activity
      await this.logActivity(user.uid, 'auth:login', 'user', user.uid)
      
      this.currentUser = user
      return user
    } catch (error) {
      await this.logActivity('', 'auth:login_failed', 'user', '', { 
        email, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      throw error
    }
  }

  async signUp(userData: {
    email: string
    password: string
    displayName: string
    phoneNumber?: string
    organizationName?: string
    farmName?: string
  }): Promise<EnhancedUser> {
    try {
      const credential = await createUserWithEmailAndPassword(auth, userData.email, userData.password)
      const firebaseUser = credential.user

      // Update Firebase profile
      await updateProfile(firebaseUser, {
        displayName: userData.displayName
      })

      // Send email verification
      await sendEmailVerification(firebaseUser)

      // Create enhanced user profile
      const enhancedUser: EnhancedUser = {
        uid: firebaseUser.uid,
        email: userData.email,
        displayName: userData.displayName,
        phoneNumber: userData.phoneNumber,
        createdAt: new Date(),
        language: 'vi-VN',
        timezone: 'Asia/Ho_Chi_Minh',
        lastLoginAt: new Date(),
        loginCount: 1,
        isEmailVerified: false,
        isPhoneVerified: false,
        accountStatus: 'pending_verification',
        twoFactorEnabled: false,
        preferences: this.getDefaultUserPreferences()
      }

      // Save user profile
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...enhancedUser,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      })

      // Create organization if requested
      if (userData.organizationName) {
        const organization = await this.createOrganization(firebaseUser.uid, userData.organizationName)
        
        // Create farm if requested
        if (userData.farmName) {
          await this.createFarmForUser(firebaseUser.uid, userData.farmName, organization.id)
        }
      } else if (userData.farmName) {
        // Create farm without organization
        await this.createFarmForUser(firebaseUser.uid, userData.farmName)
      }

      // Grant default user role
      await this.grantUserRole(firebaseUser.uid, 'farm_owner', 'system', undefined, firebaseUser.uid)

      await this.logActivity(firebaseUser.uid, 'auth:signup', 'user', firebaseUser.uid)

      this.currentUser = enhancedUser
      return enhancedUser
    } catch (error) {
      await this.logActivity('', 'auth:signup_failed', 'user', '', { 
        email: userData.email, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      throw error
    }
  }

  async signOut(): Promise<void> {
    if (this.currentUser) {
      await this.logActivity(this.currentUser.uid, 'auth:logout', 'user', this.currentUser.uid)
    }
    
    await firebaseSignOut(auth)
    this.currentUser = null
    this.currentRoles = []
    this.currentOrganizations = []
    this.currentFarms = []
  }

  // User Profile Management
  async loadUserProfile(uid: string): Promise<EnhancedUser> {
    const userDoc = await getDoc(doc(db, 'users', uid))
    
    if (!userDoc.exists()) {
      // Handle migration from old user system
      return await this.migrateUserProfile(uid)
    }

    const userData = userDoc.data()
    return {
      ...userData,
      createdAt: userData.createdAt?.toDate() || new Date(),
      lastLoginAt: userData.lastLoginAt?.toDate(),
    } as EnhancedUser
  }

  private async migrateUserProfile(uid: string): Promise<EnhancedUser> {
    // Check if this is an existing user from Firebase Auth
    const firebaseUser = auth.currentUser
    if (!firebaseUser || firebaseUser.uid !== uid) {
      throw new Error('User not found')
    }

    // Check if this is the super admin
    const isSuperAdmin = uid === 'O6aFgoNhDigSIXk6zdYSDrFWhWG2'
    
    const enhancedUser: EnhancedUser = {
      uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || 'User',
      createdAt: new Date(),
      language: 'vi-VN',
      timezone: 'Asia/Ho_Chi_Minh',
      lastLoginAt: new Date(),
      loginCount: 1,
      isEmailVerified: firebaseUser.emailVerified,
      isPhoneVerified: false,
      accountStatus: 'active',
      twoFactorEnabled: false,
      preferences: this.getDefaultUserPreferences()
    }

    // Save migrated user profile
    await setDoc(doc(db, 'users', uid), {
      ...enhancedUser,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    })

    // Grant appropriate roles
    if (isSuperAdmin) {
      await this.grantUserRole(uid, 'super_admin', 'system', undefined, uid)
    }

    // Migrate existing farm data if any
    await this.migrateLegacyFarmData(uid)

    return enhancedUser
  }

  private async migrateLegacyFarmData(userId: string): Promise<void> {
    // Check for existing farm access
    const farmAccessQuery = query(
      collection(db, 'userFarmAccess'),
      where('userId', '==', userId)
    )
    const farmAccessDocs = await getDocs(farmAccessQuery)

    for (const farmAccessDoc of farmAccessDocs.docs) {
      const farmAccess = farmAccessDoc.data()
      
      // Grant role based on existing farm access
      const roleType: RoleType = farmAccess.role === 'owner' ? 'farm_owner' :
                                 farmAccess.role === 'manager' ? 'farm_manager' : 'farm_viewer'
      
      await this.grantUserRole(
        userId,
        roleType,
        'farm',
        farmAccess.farmId,
        userId
      )
    }
  }

  // Role and Permission Management
  async loadUserRoles(userId: string): Promise<UserRole[]> {
    const rolesQuery = query(
      collection(db, 'userRoles'),
      where('userId', '==', userId),
      where('isActive', '==', true)
    )
    
    const rolesDocs = await getDocs(rolesQuery)
    this.currentRoles = rolesDocs.docs.map(doc => {
      const data = doc.data()
      const role = {
        id: doc.id,
        ...data,
        grantedAt: data.grantedAt?.toDate() || new Date(),
        expiresAt: data.expiresAt?.toDate(),
      } as UserRole
      
      // Ensure permissions are populated from ROLE_PERMISSIONS if not already set
      if (!role.permissions || role.permissions.length === 0) {
        role.permissions = ROLE_PERMISSIONS[role.roleType] || []
      }
      
      return role
    })

    return this.currentRoles
  }

  async grantUserRole(
    userId: string,
    roleType: RoleType,
    scopeType: 'system' | 'organization' | 'farm',
    scopeId?: string,
    grantedBy?: string
  ): Promise<UserRole> {
    const roleId = `${userId}_${roleType}_${scopeType}_${scopeId || 'system'}`

    // Ensure permissions are always populated from ROLE_PERMISSIONS
    const permissions = ROLE_PERMISSIONS[roleType] || []
    
    const userRole: UserRole = {
      id: roleId,
      userId,
      roleType,
      scopeType,
      scopeId,
      permissions,
      grantedBy: grantedBy || userId,
      grantedAt: new Date(),
      isActive: true
    }

    await setDoc(doc(db, 'userRoles', roleId), {
      ...userRole,
      grantedAt: serverTimestamp()
    })

    await this.logActivity(grantedBy || userId, 'role:granted', 'user_role', roleId, { 
      targetUserId: userId,
      roleType,
      scopeType,
      scopeId 
    })

    return userRole
  }

  async revokeUserRole(roleId: string, revokedBy: string): Promise<void> {
    const roleDoc = doc(db, 'userRoles', roleId)
    const roleData = await getDoc(roleDoc)
    
    if (roleData.exists()) {
      await updateDoc(roleDoc, {
        isActive: false,
        revokedAt: serverTimestamp(),
        revokedBy
      })

      await this.logActivity(revokedBy, 'role:revoked', 'user_role', roleId, { 
        roleData: roleData.data() 
      })
    }
  }

  // Permission Checking
  hasPermission(permission: Permission, scopeId?: string): boolean {
    if (!this.currentRoles.length) {
      return false
    }

    // Super admin has all permissions
    const hasSuperAdmin = this.currentRoles.some(role => role.roleType === 'super_admin')
    if (hasSuperAdmin) {
      return true
    }

    // Check specific permissions
    const hasAccess = this.currentRoles.some(role => {
      // Check if role is active and not expired
      if (!role.isActive || (role.expiresAt && role.expiresAt < new Date())) {
        return false
      }

      // Check if scope matches (if specified)
      if (scopeId && role.scopeId && role.scopeId !== scopeId) {
        return false
      }

      // Check if permission is granted
      return role.permissions.includes(permission)
    })

    return hasAccess
  }

  hasRole(roleType: RoleType, scopeId?: string): boolean {
    return this.currentRoles.some(role => {
      if (!role.isActive || (role.expiresAt && role.expiresAt < new Date())) {
        return false
      }

      if (role.roleType !== roleType) return false
      
      if (scopeId && role.scopeId && role.scopeId !== scopeId) {
        return false
      }

      return true
    })
  }

  isSuperAdmin(): boolean {
    return this.hasRole('super_admin')
  }

  // Organization Management
  private async createOrganization(ownerId: string, name: string): Promise<Organization> {
    const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const organization: Organization = {
      id: orgId,
      name,
      displayName: name,
      subscriptionType: 'free',
      subscriptionStatus: 'active',
      maxFarms: 5,
      maxUsersPerFarm: 10,
      maxUsersTotal: 20,
      features: [],
      settings: {
        allowSelfRegistration: false,
        requireEmailVerification: true,
        requireAdminApproval: true,
        defaultUserRole: 'viewer',
        sessionTimeout: 480,
        enableAuditLogging: true,
        enableAPIAccess: false
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    }

    await setDoc(doc(db, 'organizations', orgId), {
      ...organization,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    // Grant organization admin role to creator
    await this.grantUserRole(ownerId, 'organization_admin', 'organization', orgId, ownerId)

    await this.logActivity(ownerId, 'organization:created', 'organization', orgId)

    return organization
  }

  // Farm Management
  private async createFarmForUser(userId: string, farmName: string, organizationId?: string): Promise<EnhancedFarm> {
    const farmId = `farm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const enhancedFarm: EnhancedFarm = {
      id: farmId,
      name: farmName,
      organizationId,
      farmType: 'personal',
      status: 'active',
      createdDate: new Date(),
      settings: {
        timezone: 'Asia/Ho_Chi_Minh',
        currency: 'VND',
        units: 'metric',
        language: 'vi-VN',
        enableGPSTracking: true,
        enablePhotoGeotagging: true,
        dataRetentionDays: 365,
        backupFrequency: 'daily'
      },
      contacts: [],
      certifications: [],
      metadata: {}
    }

    await setDoc(doc(db, 'farms', farmId), {
      ...enhancedFarm,
      createdDate: serverTimestamp()
    })

    // Grant farm owner role
    await this.grantUserRole(userId, 'farm_owner', 'farm', farmId, userId)

    // Create legacy UserFarmAccess for backward compatibility
    await setDoc(doc(db, 'userFarmAccess', `${userId}_${farmId}`), {
      userId,
      farmId,
      role: 'owner',
      permissions: ROLE_PERMISSIONS.farm_owner,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    await this.logActivity(userId, 'farm:created', 'farm', farmId)

    return enhancedFarm
  }

  // Activity Logging
  private async logActivity(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    try {
      const activityLog: ActivityLog = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action,
        resource,
        resourceId,
        details,
        timestamp: new Date(),
        status: 'success'
      }

      await setDoc(doc(db, 'activityLogs', activityLog.id), {
        ...activityLog,
        timestamp: serverTimestamp()
      })
    } catch (error) {
      // Failed to log activity
    }
  }

  private async updateLoginTracking(userId: string): Promise<void> {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      loginCount: (this.currentUser?.loginCount || 0) + 1
    })
  }

  // Utility Methods
  private getDefaultUserPreferences(): UserPreferences {
    return {
      theme: 'light',
      language: 'vi-VN',
      notifications: {
        email: true,
        push: true,
        sms: false,
        harvestReminders: true,
        healthAlerts: true,
        systemUpdates: true
      },
      dashboard: {
        widgetLayout: ['trees', 'health', 'harvest', 'weather'],
        chartPreferences: {}
      },
      privacy: {
        profileVisibility: 'organization',
        shareActivityData: true,
        allowDataExport: true
      }
    }
  }

  // Internal state management
  setCurrentUserAndRoles(user: EnhancedUser, roles: UserRole[]): void {
    this.currentUser = user
    this.currentRoles = roles
  }

  // Getters
  getCurrentUser(): EnhancedUser | null {
    return this.currentUser
  }

  getCurrentRoles(): UserRole[] {
    return this.currentRoles
  }

  getCurrentPermissions(): Permission[] {
    const allPermissions = new Set<Permission>()
    
    this.currentRoles.forEach(role => {
      if (role.isActive && (!role.expiresAt || role.expiresAt > new Date())) {
        role.permissions.forEach(permission => allPermissions.add(permission))
      }
    })

    return Array.from(allPermissions)
  }

  // Password Reset
  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email)
    await this.logActivity('', 'auth:password_reset_requested', 'user', '', { email })
  }

  // Email Verification
  async sendVerificationEmail(): Promise<void> {
    const user = auth.currentUser
    if (user && !user.emailVerified) {
      await sendEmailVerification(user)
      await this.logActivity(user.uid, 'auth:verification_email_sent', 'user', user.uid)
    }
  }
}

// Export singleton instance
export const enhancedAuthService = new EnhancedAuthService()