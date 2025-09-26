# Database Migration Guide: Unified iOS & Web Platform

## Overview

This guide documents the migration from the old userId-based web system to the new unified farmId-based system that is compatible with the iOS app.

## Migration Summary

### Before Migration
- **Web**: Used `userId` for data scoping
- **iOS**: Used `farmId` for multi-farm support
- **Problem**: Incompatible database schemas, no data sharing

### After Migration
- **Both platforms**: Use `farmId` for data scoping
- **Unified schema**: Same Firestore structure across platforms
- **Multi-farm support**: Users can manage multiple farms
- **Data compatibility**: Web and iOS share the same database

## Database Schema Changes

### Old Web Schema (userId-based)
```
/trees/{treeId}
  - userId: string
  - currentFruitCount: number
  - lastInspectionDate: Date

/photos/{photoId}
  - userId: string
  - imageUrl: string
  - uploadStatus: string
```

### New Unified Schema (farmId-based)
```
/farms/{farmId}/
  ├── trees/{treeId}
  │   ├── farmId: string
  │   ├── manualFruitCount: number
  │   ├── aiFruitCount: number
  │   ├── lastCountDate: Date
  │   └── [all iOS Core Data fields]
  │
  ├── photos/{photoId}
  │   ├── farmId: string
  │   ├── localPath: string
  │   ├── uploadedToServer: boolean
  │   └── [all iOS Core Data fields]
  │
  └── manualEntries/{entryId}
      ├── farmId: string
      ├── fruitCount: number
      └── entryDate: Date

/userFarmAccess/{accessId}
  ├── userId: string
  ├── farmId: string
  ├── role: 'owner' | 'manager' | 'viewer'
  └── permissions: string[]
```

## Migration Process

### Automatic Migration
When a user logs into the web app:

1. **Check for legacy data**: System checks if user has old userId-scoped data
2. **Migration prompt**: User is shown a migration prompt if legacy data exists
3. **Create default farm**: A default farm is created for the user
4. **Migrate data**: Trees and photos are moved to the new farm-based structure
5. **Grant access**: User is given owner access to the new farm

### Manual Migration (Admin)
```typescript
import { MigrationService } from '@/lib/migration-service'

// Check migration status
const status = await MigrationService.getMigrationStatus(userId)

// Migrate single user
const farmId = await MigrationService.migrateLegacyData(userId, userData)

// Batch migrate multiple users
const results = await MigrationService.batchMigrate([userId1, userId2, userId3])
```

## Field Mapping

### Tree Fields
| Old Web Field | New Unified Field | Notes |
|---------------|-------------------|-------|
| `userId` | `farmId` | Changed to farm-based scoping |
| `currentFruitCount` | `manualFruitCount` | Renamed to match iOS |
| `lastInspectionDate` | `lastCountDate` | Renamed to match iOS |
| `estimatedYield` | `aiFruitCount` | Separated manual vs AI counts |
| - | `needsSync` | New field for iOS sync |
| - | `treeHeight` | New field from iOS |
| - | `trunkDiameter` | New field from iOS |

### Photo Fields
| Old Web Field | New Unified Field | Notes |
|---------------|-------------------|-------|
| `userId` | `farmId` | Changed to farm-based scoping |
| `imageUrl` | `localPath` | Renamed to match iOS |
| `uploadStatus` | `uploadedToServer` | Boolean instead of string |
| - | `needsAIAnalysis` | New field from iOS |
| - | `thumbnailPath` | New field from iOS |

## User Access Control

### Farm Permissions
- **Owner**: Full access, can delete farm, manage users
- **Manager**: Can read/write data, manage zones and investments
- **Viewer**: Read-only access

### Permission Matrix
| Action | Owner | Manager | Viewer |
|--------|-------|---------|--------|
| View trees/photos | ✅ | ✅ | ✅ |
| Add/edit trees | ✅ | ✅ | ❌ |
| Delete trees | ✅ | ✅ | ❌ |
| Manage zones | ✅ | ✅ | ❌ |
| View investments | ✅ | ✅ | ✅ |
| Add investments | ✅ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| Delete farm | ✅ | ❌ | ❌ |

## Testing the Migration

### 1. Test Data Setup
```typescript
// Create test user with legacy data
const testUserId = 'test-user-123'
await createLegacyTestData(testUserId)

// Check migration status
const status = await MigrationService.getMigrationStatus(testUserId)
console.log('Migration needed:', status.migrationNeeded)
```

### 2. Verify Migration
```typescript
// After migration
const userFarms = await FarmService.getUserFarms(testUserId)
console.log('User farms:', userFarms)

// Check migrated trees
if (userFarms.length > 0) {
  const trees = await getDocs(collection(db, 'farms', userFarms[0].id, 'trees'))
  console.log('Migrated trees:', trees.size)
}
```

### 3. iOS Compatibility Test
1. Create data in web app
2. Open iOS app with same Firebase project
3. Verify data appears in iOS app
4. Add data in iOS app
5. Verify data appears in web app

## Rollback Plan

### Emergency Rollback
If migration causes issues:

1. **Keep legacy data**: Original data is preserved during migration
2. **Revert web app**: Switch back to userId-based queries
3. **Clean up**: Remove farm-based data if needed

```typescript
// Emergency: Clean up new data and revert to legacy
await MigrationService.cleanupLegacyData(userId) // DANGER: Deletes old data
```

### Gradual Rollback
1. Switch web app back to legacy mode
2. Keep new farm data for future retry
3. Fix issues and retry migration

## Common Issues

### Migration Fails
- **Cause**: Network issues, permission errors
- **Solution**: Retry migration, check Firebase rules
- **Prevention**: Validate user permissions before migration

### Data Inconsistency
- **Cause**: Concurrent modifications during migration
- **Solution**: Lock user account during migration
- **Prevention**: Show migration in progress UI

### Performance Issues
- **Cause**: Large datasets
- **Solution**: Batch operations, add delays
- **Prevention**: Migrate in smaller chunks

## Monitoring

### Migration Metrics
- Total users migrated
- Migration success rate
- Average migration time
- Common error types

### Health Checks
```typescript
// Daily health check
const totalUsers = await getUserCount()
const migratedUsers = await getMigratedUserCount()
const migrationRate = migratedUsers / totalUsers

console.log(`Migration progress: ${migrationRate * 100}%`)
```

## Next Steps

1. **Test with real data**: Use a copy of production data for testing
2. **Performance optimization**: Optimize queries for large datasets
3. **Feature parity**: Implement remaining iOS features in web app
4. **User communication**: Notify users about the migration and new features

## Support

For issues or questions about the migration:
1. Check this guide first
2. Review error logs in Firebase Console
3. Test with sample data
4. Contact development team

---

**⚠️ Important**: Always backup data before running migration in production!