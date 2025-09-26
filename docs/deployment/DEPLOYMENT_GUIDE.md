# Enhanced Auth System - Deployment & Maintenance Guide

## 🚀 Production Deployment Checklist

### Pre-Deployment Requirements

#### 1. Firebase Configuration
- [ ] Firebase project configured for production
- [ ] Authentication providers enabled (Email/Password)
- [ ] Firestore database in production mode
- [ ] Storage bucket configured
- [ ] Security rules updated (see below)

#### 2. Environment Variables
```env
# Production environment (.env.production)
NEXT_PUBLIC_FIREBASE_API_KEY=prod-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Optional: Analytics
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

#### 3. Build and Deployment
```bash
# Install dependencies
npm ci

# Build for production
npm run build

# Test the build locally
npm start

# Deploy to your platform (Vercel, Netlify, etc.)
npm run deploy
```

## 🔒 Firestore Security Rules

### Complete Production Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isSuperAdmin() {
      return isAuthenticated() && 
        request.auth.uid == 'O6aFgoNhDigSIXk6zdYSDrFWhWG2';
    }
    
    function hasRole(roleType, scopeType, scopeId) {
      return isAuthenticated() &&
        exists(/databases/$(database)/documents/userRoles/$(
          request.auth.uid + '_' + roleType + '_' + scopeType + '_' + scopeId
        ));
    }
    
    function hasFarmAccess(farmId) {
      return isAuthenticated() &&
        exists(/databases/$(database)/documents/userFarmAccess/$(
          request.auth.uid + '_' + farmId
        ));
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isOwner(userId) || isSuperAdmin();
      allow write: if isOwner(userId) || isSuperAdmin();
      allow create: if isOwner(userId);
    }
    
    // User roles (read-only for users, managed by system)
    match /userRoles/{roleId} {
      allow read: if isAuthenticated();
      allow write: if false; // Managed by Cloud Functions or super admin
    }
    
    // Organizations
    match /organizations/{orgId} {
      allow read: if hasRole('organization_admin', 'organization', orgId) ||
                     hasRole('organization_member', 'organization', orgId) ||
                     isSuperAdmin();
      allow write: if hasRole('organization_admin', 'organization', orgId) ||
                      isSuperAdmin();
      allow create: if isSuperAdmin();
      allow delete: if isSuperAdmin();
    }
    
    // Farms
    match /farms/{farmId} {
      allow read: if hasFarmAccess(farmId) || isSuperAdmin();
      allow write: if hasFarmAccess(farmId) || isSuperAdmin();
      allow create: if isAuthenticated(); // Will be validated by application
      allow delete: if hasRole('farm_owner', 'farm', farmId) || isSuperAdmin();
      
      // Farm subcollections
      match /trees/{treeId} {
        allow read, write: if hasFarmAccess(farmId) || isSuperAdmin();
        allow create, delete: if hasFarmAccess(farmId) || isSuperAdmin();
      }
      
      match /photos/{photoId} {
        allow read, write: if hasFarmAccess(farmId) || isSuperAdmin();
        allow create, delete: if hasFarmAccess(farmId) || isSuperAdmin();
      }
      
      match /zones/{zoneId} {
        allow read, write: if hasFarmAccess(farmId) || isSuperAdmin();
        allow create, delete: if hasFarmAccess(farmId) || isSuperAdmin();
      }
      
      match /investments/{investmentId} {
        allow read, write: if hasFarmAccess(farmId) || isSuperAdmin();
        allow create, delete: if hasFarmAccess(farmId) || isSuperAdmin();
      }
      
      match /manualEntries/{entryId} {
        allow read, write: if hasFarmAccess(farmId) || isSuperAdmin();
        allow create, delete: if hasFarmAccess(farmId) || isSuperAdmin();
      }
    }
    
    // User farm access (compatibility)
    match /userFarmAccess/{accessId} {
      allow read: if isAuthenticated();
      allow write: if false; // Managed by system
    }
    
    // Farm invitations
    match /farmInvitations/{invitationId} {
      allow read: if isAuthenticated(); // Users can read invitations they're involved in
      allow write: if false; // Managed by system
    }
    
    // Activity logs (read-only for users)
    match /activityLogs/{logId} {
      allow read: if isSuperAdmin();
      allow write: if false; // Managed by system
    }
    
    // System configuration (super admin only)
    match /systemConfig/{configId} {
      allow read, write: if isSuperAdmin();
    }
  }
}
```

### Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Farm photos
    match /farms/{farmId}/photos/{photoId} {
      allow read: if request.auth != null &&
        exists(/databases/$(firebase.database)/documents/userFarmAccess/$(
          request.auth.uid + '_' + farmId
        ));
      allow write: if request.auth != null &&
        exists(/databases/$(firebase.database)/documents/userFarmAccess/$(
          request.auth.uid + '_' + farmId
        )) &&
        resource.size < 10 * 1024 * 1024 && // 10MB limit
        resource.contentType.matches('image/.*');
    }
    
    // User profile pictures
    match /users/{userId}/profile/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId &&
        resource.size < 2 * 1024 * 1024 && // 2MB limit
        resource.contentType.matches('image/.*');
    }
  }
}
```

## 📊 Database Indexes

### Required Firestore Indexes

Create these indexes in the Firebase Console:

```javascript
// Collection: userRoles
// Fields: userId (Ascending), isActive (Ascending)
// Query scope: Collection

// Collection: userFarmAccess  
// Fields: userId (Ascending)
// Query scope: Collection

// Collection: farmInvitations
// Fields: inviteeEmail (Ascending), status (Ascending)
// Query scope: Collection

// Collection: farmInvitations
// Fields: inviterUserId (Ascending), farmId (Ascending), sentAt (Descending)
// Query scope: Collection

// Collection: farmInvitations
// Fields: invitationCode (Ascending), status (Ascending)
// Query scope: Collection

// Collection: activityLogs
// Fields: userId (Ascending), timestamp (Descending)
// Query scope: Collection

// Collection: farms/{farmId}/trees
// Fields: userId (Ascending), healthStatus (Ascending)
// Query scope: Collection group

// Collection: farms/{farmId}/photos
// Fields: treeId (Ascending), timestamp (Descending)
// Query scope: Collection group
```

## 🔄 Data Migration Process

### Production Migration Steps

#### Step 1: Backup Existing Data
```bash
# Export existing Firestore data
gcloud firestore export gs://your-backup-bucket/backup-$(date +%Y%m%d)

# Export Firebase Authentication users
firebase auth:export users-backup.json --project your-project-id
```

#### Step 2: Run Migration Script
```typescript
// migration-script.ts
import { createSuperAdminService } from './lib/super-admin-service'

async function runProductionMigration() {
  try {
    console.log('Starting production migration...')
    
    // Only run if user is super admin
    const superAdminService = createSuperAdminService()
    
    // Run migration
    const result = await superAdminService.migrateLegacyData()
    
    console.log('Migration completed:', result)
    
    if (result.errors.length > 0) {
      console.error('Migration errors:', result.errors)
      throw new Error('Migration had errors')
    }
    
    console.log(`Successfully migrated ${result.migrated} items`)
    
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

// Run migration
runProductionMigration()
  .then(() => console.log('Migration successful'))
  .catch(error => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
```

#### Step 3: Verify Migration
```typescript
// verification-script.ts
import { enhancedAuthService } from './lib/enhanced-auth-service'
import { createSuperAdminService } from './lib/super-admin-service'

async function verifyMigration() {
  const superAdminService = createSuperAdminService()
  
  // Get system statistics
  const stats = await superAdminService.getSystemStats()
  console.log('Post-migration statistics:', stats)
  
  // Verify super admin access
  const isSuperAdmin = enhancedAuthService.isSuperAdmin()
  console.log('Super admin access:', isSuperAdmin)
  
  // Check sample user roles
  const users = await superAdminService.getAllUsers()
  const sampleUser = users[0]
  
  if (sampleUser) {
    const roles = await enhancedAuthService.loadUserRoles(sampleUser.uid)
    console.log('Sample user roles:', roles)
  }
  
  console.log('Migration verification completed')
}
```

## 🛠 Maintenance Tasks

### Daily Monitoring

#### Health Check Script
```typescript
// health-check.ts
import { createSuperAdminService } from './lib/super-admin-service'

async function dailyHealthCheck() {
  try {
    const superAdminService = createSuperAdminService()
    
    // System statistics
    const stats = await superAdminService.getSystemStats()
    
    // Check for anomalies
    const alerts = []
    
    if (stats.activeUsers30Days === 0) {
      alerts.push('No active users in the last 30 days')
    }
    
    if (stats.totalFarms === 0) {
      alerts.push('No farms in the system')
    }
    
    // Log results
    console.log('Daily Health Check:', {
      timestamp: new Date().toISOString(),
      stats,
      alerts,
      status: alerts.length === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION'
    })
    
    // Send alerts if needed
    if (alerts.length > 0) {
      // Implement your alerting mechanism here
      console.warn('System alerts:', alerts)
    }
    
  } catch (error) {
    console.error('Health check failed:', error)
    // Send critical alert
  }
}

// Run daily at 6 AM
setInterval(dailyHealthCheck, 24 * 60 * 60 * 1000)
```

#### Cleanup Expired Invitations
```typescript
// cleanup-invitations.ts
import { invitationService } from './lib/invitation-service'

async function cleanupExpiredInvitations() {
  try {
    // Get all expired invitations
    const now = new Date()
    const expiredInvitations = await getDocs(
      query(
        collection(db, 'farmInvitations'),
        where('status', '==', 'pending'),
        where('expiresAt', '<', now)
      )
    )
    
    // Mark as expired
    const batch = writeBatch(db)
    
    expiredInvitations.docs.forEach(doc => {
      batch.update(doc.ref, { status: 'expired' })
    })
    
    await batch.commit()
    
    console.log(`Cleaned up ${expiredInvitations.size} expired invitations`)
    
  } catch (error) {
    console.error('Invitation cleanup failed:', error)
  }
}

// Run weekly
setInterval(cleanupExpiredInvitations, 7 * 24 * 60 * 60 * 1000)
```

### Weekly Reports

#### User Activity Report
```typescript
// weekly-report.ts
async function generateWeeklyReport() {
  const superAdminService = createSuperAdminService()
  
  // Get system stats
  const stats = await superAdminService.getSystemStats()
  
  // Get activity logs from last week
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  
  const activityQuery = query(
    collection(db, 'activityLogs'),
    where('timestamp', '>=', weekAgo),
    orderBy('timestamp', 'desc')
  )
  
  const activities = await getDocs(activityQuery)
  
  // Analyze activity
  const activitySummary = {}
  activities.docs.forEach(doc => {
    const action = doc.data().action
    activitySummary[action] = (activitySummary[action] || 0) + 1
  })
  
  const report = {
    period: `${weekAgo.toISOString()} to ${new Date().toISOString()}`,
    systemStats: stats,
    activitySummary,
    totalActivities: activities.size,
    generatedAt: new Date().toISOString()
  }
  
  console.log('Weekly Report:', report)
  
  // Save report or send email
  // await saveReport(report)
  // await emailReport(report)
}
```

## 🚨 Monitoring & Alerts

### Error Tracking

#### Setup Error Boundaries
```typescript
// error-boundary.tsx
import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    console.error('Error Boundary caught an error:', error, errorInfo)
    
    // Send to monitoring service (Sentry, LogRocket, etc.)
    // errorMonitoringService.captureException(error, { extra: errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Oops! Something went wrong
            </h1>
            <p className="text-gray-600 mb-4">
              We've been notified and are working on a fix.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

### Performance Monitoring

#### Key Metrics to Track
- User authentication time
- Permission check latency
- Database query performance
- Page load times
- Error rates by component

```typescript
// performance-monitor.ts
class PerformanceMonitor {
  static trackAuthOperation(operation: string, duration: number) {
    console.log(`Auth operation ${operation} took ${duration}ms`)
    
    // Send to analytics
    // analytics.track('auth_performance', {
    //   operation,
    //   duration,
    //   timestamp: new Date().toISOString()
    // })
  }
  
  static trackPermissionCheck(permission: string, duration: number) {
    console.log(`Permission check ${permission} took ${duration}ms`)
    
    if (duration > 100) {
      console.warn(`Slow permission check: ${permission} (${duration}ms)`)
    }
  }
}

// Usage in services
const start = performance.now()
const hasPermission = enhancedAuthService.hasPermission('trees:write', farmId)
const duration = performance.now() - start
PerformanceMonitor.trackPermissionCheck('trees:write', duration)
```

## 🔒 Security Best Practices

### Production Security Checklist

- [ ] Firestore security rules deployed and tested
- [ ] Storage security rules configured
- [ ] Environment variables secured (no secrets in client code)
- [ ] HTTPS enforced for all connections
- [ ] Authentication required for all protected routes
- [ ] Permission checks in place for all operations
- [ ] Input validation and sanitization
- [ ] Rate limiting configured
- [ ] Error messages don't leak sensitive information
- [ ] Activity logging enabled for audit trail
- [ ] Regular security rule testing
- [ ] User session timeout configured
- [ ] Email verification enforced for new users

### Regular Security Audits

#### Monthly Security Check
```bash
#!/bin/bash
echo "Running security audit..."

# Check for hardcoded secrets
echo "Checking for hardcoded secrets..."
grep -r "sk_" . --exclude-dir=node_modules || echo "No hardcoded secrets found"

# Check Firebase security rules
echo "Validating Firebase security rules..."
firebase firestore:rules:list --project your-project-id

# Check for vulnerable dependencies
echo "Checking for vulnerable dependencies..."
npm audit

# Check environment configuration
echo "Validating environment configuration..."
if [ -f .env.local ]; then
  echo "Local env file exists - check it's not committed"
fi

echo "Security audit completed"
```

## 📈 Scaling Considerations

### Database Optimization

#### Query Optimization
- Use composite indexes for complex queries
- Implement pagination for large datasets
- Cache frequently accessed data
- Use Firestore offline persistence

#### Data Archival Strategy
```typescript
// archive-old-data.ts
async function archiveOldActivityLogs() {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  
  const oldLogsQuery = query(
    collection(db, 'activityLogs'),
    where('timestamp', '<', sixMonthsAgo),
    limit(1000) // Process in batches
  )
  
  const oldLogs = await getDocs(oldLogsQuery)
  
  if (oldLogs.empty) {
    console.log('No old logs to archive')
    return
  }
  
  // Archive to cold storage or delete
  const batch = writeBatch(db)
  oldLogs.docs.forEach(doc => {
    // Move to archive collection or delete
    batch.delete(doc.ref)
  })
  
  await batch.commit()
  console.log(`Archived ${oldLogs.size} old activity logs`)
}
```

### Cost Optimization

#### Monitoring Firebase Usage
- Track Firestore read/write operations
- Monitor storage usage
- Optimize image compression
- Implement efficient querying patterns

```typescript
// cost-monitor.ts
function trackFirestoreOperation(operation: 'read' | 'write', count: number = 1) {
  console.log(`Firestore ${operation} operation count: ${count}`)
  
  // Accumulate daily usage
  const dailyUsage = JSON.parse(localStorage.getItem('dailyUsage') || '{}')
  const today = new Date().toISOString().split('T')[0]
  
  dailyUsage[today] = dailyUsage[today] || { reads: 0, writes: 0 }
  dailyUsage[today][`${operation}s`] += count
  
  localStorage.setItem('dailyUsage', JSON.stringify(dailyUsage))
}
```

This comprehensive deployment guide ensures your enhanced authentication system runs smoothly and securely in production.