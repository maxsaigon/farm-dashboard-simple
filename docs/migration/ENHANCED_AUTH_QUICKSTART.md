# Enhanced Auth System - Quick Start Guide

## 🚀 Quick Overview

The Enhanced Authentication System transforms your farm management app from a single-admin system into a scalable multi-tenant platform supporting organizations, role-based permissions, and collaborative farm management.

## ⚡ Key Benefits

- ✅ **No More Hardcoded Admin** - Dynamic admin management
- ✅ **Role-Based Permissions** - Granular access control
- ✅ **Multi-Tenant Ready** - Support unlimited farmers & organizations
- ✅ **Farm Invitations** - Collaborative farm management
- ✅ **Backward Compatible** - Existing code continues to work
- ✅ **Data Preservation** - All trees, photos, and farm data preserved

## 🔧 Installation Status

✅ **Already Integrated** - The system is fully integrated and ready to use!

## 📖 Basic Usage

### 1. Using Enhanced Auth in Components

```typescript
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'

function MyFarmComponent() {
  const { 
    user,                    // Current user
    currentFarm,            // Selected farm
    hasPermission,          // Permission checker
    isSuperAdmin,           // Super admin check
    organizations,          // User's organizations
    farms                   // User's accessible farms
  } = useEnhancedAuth()

  // Permission-based rendering
  if (hasPermission('trees:write', currentFarm?.id)) {
    return <TreeManagementUI />
  }
  
  // Role-based features
  if (isSuperAdmin()) {
    return <SuperAdminDashboard />
  }
  
  return <ReadOnlyView />
}
```

### 2. Backward Compatibility (Existing Components)

```typescript
import { useAuth } from '@/lib/enhanced-auth-context'

function ExistingComponent() {
  // This continues to work exactly as before
  const { user, currentFarm, loading, isAdmin } = useAuth()
  
  if (loading) return <Loading />
  if (!user) return <LoginPrompt />
  
  return <Dashboard />
}
```

### 3. Super Admin Operations

```typescript
import { createSuperAdminService } from '@/lib/super-admin-service'

// Only works for super admins
const superAdmin = createSuperAdminService()

// Create new organization
const org = await superAdmin.createOrganization({
  name: 'Acme Farms Ltd',
  ownerId: userId
})

// Migrate legacy data (one-time operation)
const migration = await superAdmin.migrateLegacyData()
console.log(`Migrated ${migration.migrated} items`)

// Get system statistics
const stats = await superAdmin.getSystemStats()
```

### 4. Farm Invitations

```typescript
import { invitationService } from '@/lib/invitation-service'

// Send invitation
const invitation = await invitationService.inviteUserToFarm({
  farmId: 'farm123',
  inviteeEmail: 'farmer@example.com',
  proposedRole: 'farm_manager',
  message: 'Join our durian farm!'
})

// Accept invitation (by invitee)
const result = await invitationService.acceptInvitation('ABC12345')
```

## 🎯 Common Use Cases

### Case 1: Check if User Can Manage Trees
```typescript
const { hasPermission, currentFarm } = useEnhancedAuth()

if (hasPermission('trees:write', currentFarm?.id)) {
  // Show tree management buttons
  return <TreeActions />
}
```

### Case 2: Super Admin Dashboard
```typescript
const { isSuperAdmin } = useEnhancedAuth()

if (isSuperAdmin()) {
  return (
    <div>
      <h1>System Administration</h1>
      <CreateOrganization />
      <ManageUsers />
      <SystemStats />
    </div>
  )
}
```

### Case 3: Organization Admin Features
```typescript
const { hasRole, organizations } = useEnhancedAuth()

if (hasRole('organization_admin')) {
  return (
    <div>
      <h1>Organization Management</h1>
      {organizations.map(org => (
        <OrganizationCard key={org.id} org={org} />
      ))}
    </div>
  )
}
```

## 🔐 Role & Permission Quick Reference

### Roles (Hierarchical)
- `super_admin` - Platform-wide control
- `organization_admin` - Organization management
- `farm_owner` - Full farm control
- `farm_manager` - Farm operations
- `farm_viewer` - Read-only access

### Key Permissions
- `trees:write` - Can add/edit trees
- `photos:write` - Can upload/edit photos
- `users:invite` - Can invite users to farm
- `farms:create` - Can create new farms
- `system:admin` - Full system access

## 🛠 Configuration & Setup

### Environment Variables (Already Set)
```env
# Firebase configuration (already in your .env.local)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket
```

### Firestore Security Rules (Update Required)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // User roles are managed by the system
    match /userRoles/{roleId} {
      allow read: if request.auth != null;
      allow write: if false; // Managed by server-side functions
    }
    
    // Organizations accessible to members
    match /organizations/{orgId} {
      allow read: if request.auth != null && 
        exists(/databases/$(database)/documents/userRoles/$(request.auth.uid + '_organization_admin_organization_' + orgId));
    }
    
    // Farms accessible based on roles
    match /farms/{farmId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        exists(/databases/$(database)/documents/userFarmAccess/$(request.auth.uid + '_' + farmId));
        
      // Farm subcollections
      match /trees/{treeId} {
        allow read, write: if request.auth != null &&
          exists(/databases/$(database)/documents/userFarmAccess/$(request.auth.uid + '_' + farmId));
      }
      
      match /photos/{photoId} {
        allow read, write: if request.auth != null &&
          exists(/databases/$(database)/documents/userFarmAccess/$(request.auth.uid + '_' + farmId));
      }
    }
  }
}
```

## 🚨 Migration Checklist

### For Existing Users
- [x] ✅ Enhanced auth system integrated
- [x] ✅ Backward compatibility maintained
- [x] ✅ Existing components updated
- [ ] 🔄 Run data migration (super admin only)
- [ ] 🔄 Update Firestore security rules
- [ ] 🔄 Test all existing functionality

### Post-Migration Tasks
1. **Run Migration** (one-time, super admin only):
```typescript
const result = await superAdminService.migrateLegacyData()
```

2. **Verify Data Integrity**:
   - Check trees are in farm subcollections
   - Verify photos are properly linked
   - Confirm user access is maintained

3. **Update Security Rules** in Firebase Console

## 🐛 Common Issues & Solutions

### Issue: "Unauthorized: Super admin access required"
**Solution**: You're trying to use super admin features. Only the original admin can access these initially.

### Issue: "User not found" after login
**Solution**: Run the migration service to create enhanced user profiles.

### Issue: "Permission denied" for existing features
**Solution**: The migration process grants appropriate roles. Check that `migrateLegacyData()` has been run.

### Issue: Can't see farms/trees
**Solution**: Ensure `userFarmAccess` records exist. The migration creates these automatically.

## 📞 Support

### Debug Commands
```typescript
// Check current user roles
console.log(enhancedAuthService.getCurrentRoles())

// Check current permissions
console.log(enhancedAuthService.getCurrentPermissions())

// Check if user is super admin
console.log(enhancedAuthService.isSuperAdmin())
```

### Useful Queries for Debugging
```typescript
// Get all user's farm access
const farmAccess = await getDocs(
  query(collection(db, 'userFarmAccess'), where('userId', '==', userId))
)

// Get all user's roles
const userRoles = await getDocs(
  query(collection(db, 'userRoles'), where('userId', '==', userId))
)
```

## 🎉 What's Next?

Now that the enhanced auth system is integrated, you can:

1. **Create Organizations**: Group multiple farms under organizations
2. **Invite Collaborators**: Add team members to farms with specific roles
3. **Scale Globally**: Support unlimited farmers and farms
4. **Fine-tune Permissions**: Control exactly what each user can do
5. **Monitor Activity**: Track all user actions with audit logs

The system is designed to grow with your needs while maintaining simplicity for basic use cases.

---

**Need Help?** Check the full documentation in `ENHANCED_AUTH_SYSTEM.md` for detailed technical information.