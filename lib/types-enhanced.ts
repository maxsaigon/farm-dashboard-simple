// Enhanced types for multi-tenant farm management system
// Extends existing types while maintaining backward compatibility

import { Tree, Photo, Farm, User, UserFarmAccess, ManualEntry, Investment, FarmZone } from './types'

// Organization-level multi-tenancy
export interface Organization {
  id: string
  name: string
  displayName?: string
  subscriptionType: 'free' | 'pro' | 'enterprise'
  subscriptionStatus: 'active' | 'suspended' | 'cancelled'
  maxFarms: number
  maxUsersPerFarm: number
  maxUsersTotal: number
  features: OrganizationFeature[]
  settings: OrganizationSettings
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  billingInfo?: BillingInfo
}

export interface OrganizationSettings {
  allowSelfRegistration: boolean
  requireEmailVerification: boolean
  requireAdminApproval: boolean
  defaultUserRole: 'viewer' | 'manager'
  sessionTimeout: number // minutes
  enableAuditLogging: boolean
  enableAPIAccess: boolean
}

export interface BillingInfo {
  customerId?: string
  subscriptionId?: string
  paymentMethod?: string
  nextBillingDate?: Date
  billingEmail: string
  billingAddress?: Address
}

export interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

export type OrganizationFeature = 
  | 'advanced_analytics' 
  | 'api_access' 
  | 'custom_roles' 
  | 'bulk_operations'
  | 'data_export' 
  | 'integrations' 
  | 'white_labeling'
  | 'priority_support'

// Enhanced User System with Organizations
export interface EnhancedUser extends User {
  phoneNumber?: string
  profilePicture?: string
  photoURL?: string
  language: string
  timezone: string
  lastLoginAt?: Date
  loginCount: number
  isEmailVerified: boolean
  isPhoneVerified: boolean
  accountStatus: 'active' | 'suspended' | 'pending_verification'
  twoFactorEnabled: boolean
  preferences: UserPreferences
  currentFarmId?: string
  roles?: string[]
  isActive?: boolean
  updatedAt?: Date
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  notifications: NotificationSettings
  dashboard: DashboardSettings
  privacy: PrivacySettings
}

export interface NotificationSettings {
  email: boolean
  push: boolean
  sms: boolean
  harvestReminders: boolean
  healthAlerts: boolean
  systemUpdates: boolean
}

export interface DashboardSettings {
  defaultFarm?: string
  widgetLayout: string[]
  chartPreferences: Record<string, any>
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'organization' | 'private'
  shareActivityData: boolean
  allowDataExport: boolean
}

// Enhanced Role System
export interface UserRole {
  id: string
  userId: string
  roleType: RoleType
  scopeType: 'system' | 'organization' | 'farm'
  scopeId?: string // organizationId or farmId
  permissions: Permission[]
  grantedBy: string // userId who granted this role
  grantedAt: Date
  expiresAt?: Date
  isActive: boolean
  metadata?: Record<string, any>
}

export type RoleType = 
  | 'super_admin'       // Platform-wide admin
  | 'organization_admin' // Organization-level admin
  | 'organization_member' // Organization member
  | 'farm_owner'        // Farm owner
  | 'farm_manager'      // Farm manager
  | 'farm_viewer'       // Read-only farm access
  | 'seasonal_worker'   // Temporary farm access
  | 'api_user'          // API-only access

export type Permission = 
  // Tree management
  | 'trees:read' | 'trees:write' | 'trees:delete' | 'trees:bulk'
  // Photo management  
  | 'photos:read' | 'photos:write' | 'photos:delete' | 'photos:bulk'
  // Investment tracking
  | 'investments:read' | 'investments:write' | 'investments:delete'
  // Zone management
  | 'zones:read' | 'zones:write' | 'zones:delete'
  // User management
  | 'users:read' | 'users:invite' | 'users:manage' | 'users:remove'
  // Farm management
  | 'farms:read' | 'farms:write' | 'farms:delete' | 'farms:create'
  // Analytics and reporting
  | 'analytics:view' | 'analytics:export' | 'reports:generate'
  // System administration
  | 'system:admin' | 'system:audit' | 'system:backup'
  // API access
  | 'api:read' | 'api:write' | 'api:manage'
  // Organization management
  | 'org:admin' | 'org:settings' | 'org:billing' | 'org:users'

// Enhanced Farm with Organization
export interface EnhancedFarm extends Farm {
  organizationId?: string
  farmType: 'personal' | 'commercial' | 'cooperative' | 'research'
  status: 'active' | 'inactive' | 'archived'
  settings: FarmSettings
  contacts: FarmContact[]
  certifications: Certification[]
  metadata: Record<string, any>
}

export interface FarmSettings {
  timezone: string
  currency: string
  units: 'metric' | 'imperial'
  language: string
  enableGPSTracking: boolean
  enablePhotoGeotagging: boolean
  dataRetentionDays: number
  backupFrequency: 'daily' | 'weekly' | 'monthly'
}

export interface FarmContact {
  id: string
  type: 'primary' | 'secondary' | 'emergency'
  name: string
  phone?: string
  email?: string
  role: string
}

export interface Certification {
  id: string
  name: string
  issuingBody: string
  certificateNumber: string
  issuedDate: Date
  expiresDate?: Date
  documentUrl?: string
  isActive: boolean
}

// Farm Invitation System
export interface FarmInvitation {
  id: string
  farmId: string
  organizationId?: string
  inviterUserId: string
  inviteeEmail: string
  inviteeName?: string
  proposedRole: RoleType
  proposedPermissions: Permission[]
  invitationCode: string
  message?: string
  status: InvitationStatus
  sentAt: Date
  respondedAt?: Date
  expiresAt: Date
  metadata?: Record<string, any>
}

export type InvitationStatus = 
  | 'pending' 
  | 'accepted' 
  | 'declined' 
  | 'expired' 
  | 'cancelled'
  | 'resent'

// Audit and Activity Tracking
export interface ActivityLog {
  id: string
  userId: string
  organizationId?: string
  farmId?: string
  action: string
  resource: string
  resourceId?: string
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
  status: 'success' | 'failure'
  errorMessage?: string
}

export interface AccessLog {
  id: string
  userId: string
  sessionId: string
  loginAt: Date
  logoutAt?: Date
  ipAddress: string
  userAgent: string
  deviceType: 'web' | 'mobile' | 'api'
  location?: GeoLocation
  isActive: boolean
}

export interface GeoLocation {
  country: string
  region: string
  city: string
  latitude?: number
  longitude?: number
}

// API Access Management
export interface APIKey {
  id: string
  userId: string
  organizationId?: string
  farmId?: string
  name: string
  keyHash: string
  permissions: Permission[]
  rateLimit: number
  usageCount: number
  lastUsedAt?: Date
  createdAt: Date
  expiresAt?: Date
  isActive: boolean
  restrictions: APIRestrictions
}

export interface APIRestrictions {
  ipWhitelist?: string[]
  allowedDomains?: string[]
  allowedMethods: ('GET' | 'POST' | 'PUT' | 'DELETE')[]
  maxRequestsPerHour: number
}

// System Configuration
export interface SystemConfig {
  id: string
  version: string
  environment: 'development' | 'staging' | 'production'
  features: SystemFeature[]
  maintenance: MaintenanceInfo
  limits: SystemLimits
  security: SecurityConfig
  updatedAt: Date
  updatedBy: string
}

export interface SystemFeature {
  name: string
  enabled: boolean
  config?: Record<string, any>
}

export interface MaintenanceInfo {
  isEnabled: boolean
  message?: string
  scheduledStart?: Date
  scheduledEnd?: Date
}

export interface SystemLimits {
  maxOrganizations: number
  maxFarmsPerOrg: number
  maxUsersPerOrg: number
  maxTreesPerFarm: number
  maxPhotosPerTree: number
  maxStoragePerOrg: number // MB
}

export interface SecurityConfig {
  passwordMinLength: number
  passwordRequireSpecialChars: boolean
  sessionTimeoutMinutes: number
  maxLoginAttempts: number
  lockoutDurationMinutes: number
  enableTwoFactor: boolean
  enableAuditLogging: boolean
}

// Migration and Data Management
export interface MigrationJob {
  id: string
  type: 'user_data' | 'farm_data' | 'organization_setup' | 'permission_update'
  userId?: string
  organizationId?: string
  farmId?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number // 0-100
  totalRecords: number
  processedRecords: number
  failedRecords: number
  startedAt?: Date
  completedAt?: Date
  errorMessage?: string
  metadata: Record<string, any>
}

// Default Role Configurations
export const ROLE_PERMISSIONS: Record<RoleType, Permission[]> = {
  super_admin: [
    'system:admin', 'system:audit', 'system:backup',
    'org:admin', 'org:settings', 'org:billing', 'org:users',
    'farms:read', 'farms:write', 'farms:delete', 'farms:create',
    'trees:read', 'trees:write', 'trees:delete', 'trees:bulk',
    'photos:read', 'photos:write', 'photos:delete', 'photos:bulk',
    'users:read', 'users:invite', 'users:manage', 'users:remove',
    'analytics:view', 'analytics:export', 'reports:generate',
    'api:read', 'api:write', 'api:manage'
  ],
  organization_admin: [
    'org:admin', 'org:settings', 'org:users',
    'farms:read', 'farms:write', 'farms:create',
    'users:read', 'users:invite', 'users:manage',
    'analytics:view', 'analytics:export', 'reports:generate'
  ],
  organization_member: [
    'farms:read', 'users:read'
  ],
  farm_owner: [
    'farms:read', 'farms:write',
    'trees:read', 'trees:write', 'trees:delete', 'trees:bulk',
    'photos:read', 'photos:write', 'photos:delete', 'photos:bulk',
    'investments:read', 'investments:write', 'investments:delete',
    'zones:read', 'zones:write', 'zones:delete',
    'users:read', 'users:invite', 'users:manage',
    'analytics:view', 'analytics:export', 'reports:generate'
  ],
  farm_manager: [
    'farms:read',
    'trees:read', 'trees:write', 'trees:bulk',
    'photos:read', 'photos:write', 'photos:bulk',
    'investments:read', 'investments:write',
    'zones:read', 'zones:write',
    'users:read',
    'analytics:view'
  ],
  farm_viewer: [
    'farms:read',
    'trees:read',
    'photos:read',
    'investments:read',
    'zones:read',
    'users:read',
    'analytics:view'
  ],
  seasonal_worker: [
    'trees:read', 'trees:write',
    'photos:read', 'photos:write'
  ],
  api_user: [
    'api:read', 'api:write'
  ]
}

// Permission Groups for easier management
export const PERMISSION_GROUPS = {
  'Tree Management': ['trees:read', 'trees:write', 'trees:delete', 'trees:bulk'],
  'Photo Management': ['photos:read', 'photos:write', 'photos:delete', 'photos:bulk'],
  'Farm Management': ['farms:read', 'farms:write', 'farms:delete', 'farms:create'],
  'User Management': ['users:read', 'users:invite', 'users:manage', 'users:remove'],
  'Analytics': ['analytics:view', 'analytics:export', 'reports:generate'],
  'System Admin': ['system:admin', 'system:audit', 'system:backup'],
  'Organization': ['org:admin', 'org:settings', 'org:billing', 'org:users'],
  'API Access': ['api:read', 'api:write', 'api:manage']
} as const