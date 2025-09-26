# Enhanced Authentication System - Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Farm Management Platform                      │
├─────────────────────────────────────────────────────────────────┤
│                      Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  Enhanced Auth Context  │  Components  │  Pages  │  Services    │
├─────────────────────────────────────────────────────────────────┤
│                   Enhanced Auth Services                        │
├─────────────────────────────────────────────────────────────────┤
│    Firebase Auth    │   Firestore   │   Storage   │   Functions │
├─────────────────────────────────────────────────────────────────┤
│                      Firebase Platform                          │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Core Services Layer

```
Enhanced Authentication Services
├── EnhancedAuthService
│   ├── User Authentication (signIn, signUp, signOut)
│   ├── Profile Management (loadUserProfile, updateProfile)
│   ├── Role Management (grantUserRole, revokeUserRole)
│   ├── Permission Checking (hasPermission, hasRole, isSuperAdmin)
│   └── Data Migration (migrateUserProfile, migrateLegacyFarmData)
│
├── SuperAdminService
│   ├── Organization Management (CRUD operations)
│   ├── Farm Management (CRUD operations)
│   ├── User Management (getAllUsers, deleteUser)
│   ├── System Analytics (getSystemStats)
│   └── Data Migration (migrateLegacyData)
│
└── InvitationService
    ├── Invitation Management (invite, accept, decline)
    ├── Invitation Queries (getSent, getReceived)
    ├── User Management (removeUserFromFarm)
    └── Email Integration (sendInvitationEmail)
```

### React Context Layer

```
Enhanced Auth Context
├── Authentication State
│   ├── user: EnhancedUser | null
│   ├── firebaseUser: FirebaseUser | null
│   └── loading: boolean
│
├── Authorization State
│   ├── roles: UserRole[]
│   ├── permissions: Permission[]
│   └── organizations: Organization[]
│
├── Resource State
│   ├── farms: EnhancedFarm[]
│   └── currentFarm: EnhancedFarm | null
│
└── Action Methods
    ├── signIn, signUp, signOut
    ├── hasPermission, hasRole, isSuperAdmin
    ├── setCurrentFarm, refreshUserData
    └── updateProfile, sendEmailVerification
```

## Database Schema

### Collections Overview

```
Firestore Database
├── users/                          # Enhanced user profiles
├── organizations/                  # Organization management
├── farms/                         # Enhanced farm information
│   └── {farmId}/
│       ├── trees/                 # Farm-specific trees
│       ├── photos/                # Farm-specific photos
│       ├── zones/                 # Farm zones
│       ├── investments/           # Investment records
│       └── manualEntries/         # Manual data entries
├── userRoles/                     # Role-based access control
├── userFarmAccess/               # Legacy compatibility
├── farmInvitations/              # Invitation system
├── activityLogs/                 # Audit trail
└── systemConfig/                 # System configuration
```

### Data Relationships

```mermaid
erDiagram
    User ||--o{ UserRole : has
    User ||--o{ Organization : owns
    Organization ||--o{ Farm : contains
    User ||--o{ UserFarmAccess : accesses
    Farm ||--o{ Tree : contains
    Farm ||--o{ Photo : contains
    Farm ||--o{ Zone : has
    User ||--o{ FarmInvitation : sends
    User ||--o{ FarmInvitation : receives
    User ||--o{ ActivityLog : creates
    
    User {
        string uid PK
        string email
        string displayName
        string language
        string timezone
        date lastLoginAt
        number loginCount
        boolean isEmailVerified
        object preferences
    }
    
    Organization {
        string id PK
        string name
        string subscriptionType
        string subscriptionStatus
        number maxFarms
        number maxUsersPerFarm
        object settings
        date createdAt
    }
    
    Farm {
        string id PK
        string organizationId FK
        string name
        string farmType
        string status
        object settings
        array contacts
        date createdDate
    }
    
    UserRole {
        string id PK
        string userId FK
        string roleType
        string scopeType
        string scopeId
        array permissions
        string grantedBy
        date grantedAt
        boolean isActive
    }
    
    FarmInvitation {
        string id PK
        string farmId FK
        string organizationId FK
        string inviterUserId FK
        string inviteeEmail
        string proposedRole
        array proposedPermissions
        string invitationCode
        string status
        date sentAt
        date expiresAt
    }
```

## Permission System Architecture

### Role Hierarchy

```
Permission Hierarchy
└── super_admin (System Level)
    ├── system:admin, system:audit, system:backup
    ├── org:admin, org:settings, org:billing
    └── ALL lower-level permissions
    
    └── organization_admin (Organization Level)
        ├── org:admin, org:settings, org:users
        ├── farms:read, farms:write, farms:create
        └── users:read, users:invite, users:manage
        
        └── farm_owner (Farm Level)
            ├── farms:read, farms:write
            ├── trees:*, photos:*, investments:*, zones:*
            ├── users:read, users:invite, users:manage
            └── analytics:view, analytics:export
            
            └── farm_manager (Operations Level)
                ├── farms:read
                ├── trees:read, trees:write, trees:bulk
                ├── photos:read, photos:write, photos:bulk
                ├── investments:read, investments:write
                └── analytics:view
                
                └── farm_viewer (Read-only Level)
                    ├── farms:read
                    ├── trees:read
                    ├── photos:read
                    ├── investments:read
                    └── analytics:view
```

### Permission Checking Flow

```mermaid
graph TD
    A[Permission Check Request] --> B{User Authenticated?}
    B -->|No| C[Return False]
    B -->|Yes| D{Super Admin?}
    D -->|Yes| E[Return True]
    D -->|No| F[Load User Roles]
    F --> G{Role Found for Scope?}
    G -->|No| H[Return False]
    G -->|Yes| I{Role Active & Not Expired?}
    I -->|No| H
    I -->|Yes| J{Permission in Role?}
    J -->|No| H
    J -->|Yes| K[Return True]
```

## Authentication Flow

### User Sign-In Process

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant A as Auth Service
    participant F as Firebase
    participant D as Firestore
    
    U->>C: Enter credentials
    C->>A: signIn(email, password)
    A->>F: signInWithEmailAndPassword()
    F-->>A: Firebase User
    A->>D: Load user profile
    D-->>A: Enhanced User data
    A->>D: Load user roles
    D-->>A: User roles array
    A->>A: Calculate permissions
    A->>D: Update login tracking
    A-->>C: Enhanced User + roles + permissions
    C-->>U: Dashboard with role-based UI
```

### Farm Invitation Flow

```mermaid
sequenceDiagram
    participant O as Farm Owner
    participant I as Invitation Service
    participant E as Email Service
    participant N as New User
    participant A as Auth Service
    
    O->>I: inviteUserToFarm()
    I->>I: Generate invitation code
    I->>I: Create invitation record
    I->>E: Send invitation email
    E->>N: Email with invitation link
    N->>A: Accept invitation
    A->>I: acceptInvitation(code)
    I->>A: Grant farm role to user
    A->>A: Update user permissions
    I-->>N: Access granted to farm
```

## Data Migration Architecture

### Legacy to Enhanced Migration

```mermaid
graph TD
    A[Legacy System] --> B[Migration Service]
    B --> C{Check Legacy Collections}
    C --> D[trees collection]
    C --> E[photos collection]
    C --> F[users collection]
    
    D --> G[Create User Farms]
    E --> G
    F --> H[Create Enhanced Users]
    
    G --> I[Move to Farm Subcollections]
    H --> J[Grant Appropriate Roles]
    I --> K[Create Legacy Access Records]
    J --> K
    K --> L[Migration Complete]
```

### Data Transformation

```
Legacy Structure → Enhanced Structure

trees/                          farms/{farmId}/trees/
├── {treeId}                   ├── {treeId}
│   ├── userId: "user123"      │   ├── farmId: "farm123"
│   ├── qrCode: "T001"         │   ├── qrCode: "T001"
│   └── ...                    │   └── ...
                               
photos/                        farms/{farmId}/photos/
├── {photoId}                  ├── {photoId}
│   ├── userId: "user123"      │   ├── farmId: "farm123"
│   ├── treeId: "tree001"      │   ├── treeId: "tree001"
│   └── ...                    │   └── ...

users/                         users/
├── {userId}                   ├── {userId}
│   ├── email: "..."           │   ├── email: "..." (unchanged)
│   └── displayName: "..."     │   ├── displayName: "..." (unchanged)
                               │   ├── language: "vi-VN" (new)
                               │   ├── timezone: "Asia/Ho_Chi_Minh" (new)
                               │   ├── preferences: {...} (new)
                               │   └── ...

                               userRoles/ (new)
                               ├── {userId}_farm_owner_farm_{farmId}
                               │   ├── userId: "user123"
                               │   ├── roleType: "farm_owner"
                               │   ├── scopeType: "farm"
                               │   ├── scopeId: "farm123"
                               │   └── permissions: [...]
```

## Security Architecture

### Multi-Layer Security Model

```
Security Layers
├── Frontend Security
│   ├── Role-based UI rendering
│   ├── Permission-based feature access
│   └── Client-side validation
│
├── Service Layer Security
│   ├── Permission validation before operations
│   ├── Scope-based access control
│   ├── Role hierarchy enforcement
│   └── Activity logging
│
├── Database Security
│   ├── Firestore security rules
│   ├── User authentication required
│   ├── Document-level access control
│   └── Field-level permissions
│
└── Infrastructure Security
    ├── Firebase Authentication
    ├── HTTPS enforcement
    ├── API rate limiting
    └── Environment variable protection
```

### Permission Validation Chain

```
Request → Authentication Check → Role Validation → Permission Check → Scope Verification → Action Execution
    ↓               ↓                    ↓                ↓                   ↓              ↓
Firebase       User Profile         User Roles       Permission       Scope Match     Execute &
  Auth         Exists & Active      Are Active       Exists           (farm/org)       Log
```

## Scalability Considerations

### Horizontal Scaling Strategy

```
Scaling Dimensions
├── Organizations
│   ├── Unlimited organizations supported
│   ├── Subscription-based feature gating
│   └── Isolated data per organization
│
├── Farms per Organization
│   ├── Configurable limits by subscription
│   ├── Independent farm data
│   └── Cross-farm analytics capability
│
├── Users per Farm
│   ├── Role-based user limits
│   ├── Invitation-based growth
│   └── Permission inheritance
│
└── Data per Farm
    ├── Firestore subcollection structure
    ├── Efficient querying patterns
    └── Automatic data partitioning
```

### Performance Optimization

```
Optimization Strategies
├── Data Structure
│   ├── Denormalized for read performance
│   ├── Indexed fields for queries
│   └── Compound indexes for complex queries
│
├── Caching Strategy
│   ├── User roles cached in context
│   ├── Permissions calculated once
│   ├── Farm data lazy loaded
│   └── Organization data cached
│
├── Query Optimization
│   ├── Paginated large datasets
│   ├── Real-time subscriptions for live data
│   ├── Batch operations for bulk updates
│   └── Composite queries for efficiency
│
└── Code Splitting
    ├── Lazy-loaded admin features
    ├── Dynamic imports for large components
    ├── Service workers for caching
    └── Optimistic UI updates
```

## Monitoring & Observability

### Activity Logging System

```
Activity Logs Structure
├── Authentication Events
│   ├── Login attempts (success/failure)
│   ├── Logout events
│   └── Password resets
│
├── Authorization Events
│   ├── Role grants/revokes
│   ├── Permission changes
│   └── Access denials
│
├── Business Logic Events
│   ├── Farm creation/updates
│   ├── Tree management
│   ├── Photo uploads
│   └── Invitation activities
│
└── System Events
    ├── Migration operations
    ├── Configuration changes
    ├── Error conditions
    └── Performance metrics
```

### Error Handling Strategy

```
Error Handling Layers
├── Frontend Error Boundary
│   ├── React error boundaries
│   ├── User-friendly error messages
│   └── Fallback UI components
│
├── Service Layer Errors
│   ├── Proper error typing
│   ├── Contextual error messages
│   ├── Error logging
│   └── Graceful degradation
│
├── Database Errors
│   ├── Connection error handling
│   ├── Permission error translation
│   ├── Query timeout handling
│   └── Retry mechanisms
│
└── Infrastructure Errors
    ├── Firebase service errors
    ├── Network connectivity issues
    ├── Authentication failures
    └── Storage errors
```

This architecture provides a solid foundation for a scalable, secure, and maintainable multi-tenant farm management platform.