# Admin User Setup Guide

**Document status:** Historical admin setup notes; current security guidance added

**Baseline:** Repository state verified on 2026-07-15

**Review date:** 2026-07-15

**Current notice:** The account-specific details below have been redacted. Use a disposable test account and never place passwords, real email addresses, UIDs, service-account keys, or other credentials in documentation. Firebase is the active runtime; PocketBase is inactive in the application runtime.

> `NEXT_PUBLIC_ADMIN_EMAIL` and `NEXT_PUBLIC_ADMIN_UID` are exposed to every browser. They are not secrets and must not be used as backend authorization. The current client-side admin comparison and broad `../../firestore.rules` are not a production-safe admin model. Use trusted server-side role assignment or verified Firebase custom claims and enforce authorization in reviewed Security Rules. See [Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md).

## Quick Setup for Testing

A historical test account was configured as an admin user. Its identifying values are intentionally omitted; create a new disposable account in an isolated test project instead.

### What's Been Set Up

1. **Admin User Configuration**
   - User ID: `[redacted-test-uid]`
   - Email: `[redacted-test-email]`
   - Role: Admin with full permissions
   - Auto-setup on login

2. **Admin Permissions**
   - `read` - View all data
   - `write` - Modify all data
   - `delete` - Delete trees, photos, etc.
   - `manage_users` - Add/remove farm access
   - `manage_zones` - Create/edit farm zones
   - `manage_investments` - Track investments
   - `admin_access` - Admin panel access
   - `full_control` - All operations

3. **Auto-Setup Features**
   - Automatic admin detection on login
   - Auto-access to main farm from iOS app
   - Auto-creation of main farm if none exists
   - Seamless integration with iOS data

### How It Works

1. **On Login**: The system automatically detects if the user is the admin
2. **Auto-Setup**: Creates necessary permissions and farm access
3. **Main Farm Access**: Automatically grants access to the main farm from your iOS app
4. **Full Permissions**: Admin can read/write/delete all data across all farms

### Testing the Setup

1. **Start the Web App**:
   ```bash
   npm run dev
   ```

2. **Login with Admin Account**:
   - Go to `http://localhost:3000`
   - Click "Đăng Nhập" (Login)
   - Login with a disposable test admin account; do not document its credentials

3. **Verify Admin Access**:
   - Should see "Admin Mode" banner
   - Should see main farm automatically selected
   - Should see iOS app data (trees, photos, etc.)

### Admin Features Visible

- **Purple Admin Banner**: Shows you're in admin mode
- **Admin Dashboard**: Comprehensive view of all system data
- **Cross-Farm Access**: Can see trees, photos, entries from ALL farms
- **Farm Auto-Selection**: Main farm is automatically selected
- **Full Data Access**: Can see all trees, photos, investments from iOS app
- **Management Controls**: Access to all farm management features

### Admin Dashboard Features

1. **System Overview**:
   - Total farms, trees, manual entries, photos across entire system
   - Per-farm statistics and breakdowns
   - Real-time data aggregation

2. **All Trees Access**:
   - View trees from every farm in the system
   - See tree health, fruit counts, variety, location
   - Access trees regardless of farm ownership

3. **All Manual Entries**:
   - Access manual fruit count entries from all farms
   - View historical data and trends
   - Filter by farm, date, or entry type

4. **All Photos**:
   - See photos from every farm in the database
   - Track upload status and processing
   - Access photo metadata and notes

5. **Farm Management**:
   - Overview of all farms in the system
   - Farm details, owners, creation dates
   - Cross-farm data comparison

### Manual Setup (if needed)

If auto-setup doesn't work, you can manually run the admin setup:

```javascript
// In browser console after logging in
import { AdminService } from './lib/admin-service'
AdminService.setupAdminUser().then(result => {
  console.log('Admin setup result:', result)
})
```

### Security Note

⚠️ **This is for testing only**. In production:
- Remove hardcoded admin user ID
- Implement proper role-based authentication
- Add admin invitation system
- Do not treat `NEXT_PUBLIC_*` environment variables as secrets or authorization

### Troubleshooting

1. **No Admin Banner**: Check Firebase authentication
2. **No Farm Data**: Verify Firestore rules and admin permissions
3. **Cannot See iOS Data**: Check if main farm ID matches iOS app
4. **Permission Errors**: Run manual admin setup

### Next Steps

1. Test the web app with your iOS data
2. Verify data synchronization works both ways
3. Test farm management features
4. Implement proper user role system later

The admin user will have full access to manage the main farm and any other farms created in the iOS app. All data will be synchronized in real-time between the web and iOS platforms.
