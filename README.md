# 🌱 Farm Manager - Enhanced Multi-Tenant Platform

A comprehensive farm management dashboard built with Next.js and Firebase, featuring an advanced multi-tenant authentication system for scalable agricultural operations.

## 🌟 Features

### Core Farm Management
- **Tree Management**: Track durian trees with QR codes, health monitoring, and photo documentation
- **Photo Gallery**: AI-powered image analysis with Firebase Storage integration
- **Investment Tracking**: Monitor farm expenses and profitability
- **Zone Management**: Organize farms into manageable sections
- **Real-time Data**: Live updates across all connected devices

### Enhanced Multi-Tenant System
- **Dynamic Admin Management**: No more hardcoded admin users
- **Role-Based Access Control**: Granular permissions for different user types
- **Organization Hierarchy**: Support for enterprise-level farm management
- **Farm Invitations**: Collaborative farming with team invitations
- **Activity Logging**: Complete audit trail for all operations
- **Data Migration**: Seamless upgrade from legacy single-user system

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Firebase project with Firestore and Authentication enabled
- Environment variables configured (see `.env.example`)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd farm-dashboard-simple

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Firebase configuration

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your farm dashboard.

### First-Time Setup

1. **Configure Firebase**: Set up your Firebase project with Authentication and Firestore
2. **Run Migration** (if upgrading from legacy system):
   ```typescript
   // As super admin
   const result = await superAdminService.migrateLegacyData()
   ```
3. **Update Security Rules**: Apply the Firestore security rules from `DEPLOYMENT_GUIDE.md`

## 📚 Documentation

### Core Documentation
- **[Enhanced Auth System](./ENHANCED_AUTH_SYSTEM.md)** - Comprehensive technical documentation
- **[Quick Start Guide](./ENHANCED_AUTH_QUICKSTART.md)** - Get up and running quickly
- **[Architecture Overview](./ARCHITECTURE.md)** - System design and data flow
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Production deployment and maintenance

### Key Concepts

#### User Roles & Permissions
```
super_admin (Platform-wide)
├── organization_admin (Organization-level)
│   ├── farm_owner (Farm ownership)
│   ├── farm_manager (Farm operations)
│   ├── farm_viewer (Read-only access)
│   └── seasonal_worker (Temporary access)
```

#### Multi-Tenant Structure
```
Platform
├── Organizations (Enterprise grouping)
│   ├── Farms (Individual farm units)
│   │   ├── Trees (Farm assets)
│   │   ├── Photos (Documentation)
│   │   ├── Zones (Organization)
│   │   └── Investments (Financial tracking)
│   └── Users (Team members with roles)
```

## 🛠 Development

### Project Structure
```
farm-dashboard-simple/
├── app/                    # Next.js app directory
├── components/            # React components
├── lib/                   # Core services and utilities
│   ├── enhanced-auth-service.ts      # Authentication & authorization
│   ├── enhanced-auth-context.tsx     # React context provider
│   ├── super-admin-service.ts        # System administration
│   ├── invitation-service.ts         # Farm invitations
│   ├── types-enhanced.ts             # TypeScript definitions
│   └── firebase.ts                   # Firebase configuration
├── public/               # Static assets
└── docs/                 # Additional documentation
```

### Key Services

#### Enhanced Authentication
```typescript
import { useEnhancedAuth } from '@/lib/enhanced-auth-context'

function MyComponent() {
  const { user, hasPermission, isSuperAdmin } = useEnhancedAuth()
  
  if (hasPermission('trees:write', farmId)) {
    return <TreeManagementUI />
  }
}
```

#### Super Admin Operations
```typescript
import { createSuperAdminService } from '@/lib/super-admin-service'

const superAdmin = createSuperAdminService()
const stats = await superAdmin.getSystemStats()
```

#### Farm Invitations
```typescript
import { invitationService } from '@/lib/invitation-service'

const invitation = await invitationService.inviteUserToFarm({
  farmId: 'farm123',
  inviteeEmail: 'farmer@example.com',
  proposedRole: 'farm_manager'
})
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## 🔒 Security

The application implements multiple security layers:

- **Authentication**: Firebase Auth with email verification
- **Authorization**: Role-based permissions with scope validation  
- **Data Security**: Firestore security rules with user isolation
- **Activity Logging**: Complete audit trail for all operations

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete security configuration.

## 🌐 Deployment

### Supported Platforms
- **Vercel** (Recommended) - Zero configuration deployment
- **Netlify** - JAMstack deployment
- **Firebase Hosting** - Integrated with Firebase services
- **Docker** - Containerized deployment

### Production Checklist
- [ ] Firebase project configured for production
- [ ] Environment variables set
- [ ] Firestore security rules deployed
- [ ] Database indexes created
- [ ] Data migration completed (if applicable)
- [ ] Monitoring and alerts configured

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

## 🔧 Configuration

### Environment Variables
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Firebase Collections
- `users/` - Enhanced user profiles
- `organizations/` - Organization management  
- `farms/` - Farm information and subcollections
- `userRoles/` - Role-based access control
- `farmInvitations/` - Invitation system
- `activityLogs/` - Audit trail

## 🚨 Troubleshooting

### Common Issues

**Permission Denied Errors**
```typescript
// Check user roles and permissions
const roles = enhancedAuthService.getCurrentRoles()
const permissions = enhancedAuthService.getCurrentPermissions()
console.log({ roles, permissions })
```

**Migration Issues**
```typescript
// Run as super admin only
const result = await superAdminService.migrateLegacyData()
console.log(`Migrated ${result.migrated} items, ${result.errors.length} errors`)
```

**Authentication Problems**
- Verify Firebase configuration
- Check environment variables
- Ensure Firestore security rules are deployed

See [ENHANCED_AUTH_SYSTEM.md](./ENHANCED_AUTH_SYSTEM.md) for detailed troubleshooting.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Maintain backward compatibility
- Add comprehensive tests for new features
- Update documentation for API changes
- Follow the existing code style and patterns

## 📱 Mobile Compatibility

The dashboard is fully responsive and works on:
- iOS Safari (iPhone/iPad)
- Android Chrome
- Desktop browsers (Chrome, Firefox, Safari, Edge)

### iOS App Integration
This web dashboard is designed to complement the iOS Core Data farm management app:
- Shared Firebase backend
- Real-time data synchronization
- Consistent data models
- Cross-platform user management

## 📊 Analytics & Monitoring

### Built-in Analytics
- User activity tracking
- Farm operation metrics
- System performance monitoring
- Error logging and reporting

### Integration Ready
- Google Analytics 4
- Firebase Analytics
- Custom dashboard metrics
- Performance monitoring

## 🔮 Future Roadmap

### Planned Features
- [ ] Advanced analytics dashboard
- [ ] Mobile push notifications
- [ ] Bulk operations for large farms
- [ ] API key management
- [ ] Custom role creation
- [ ] Two-factor authentication
- [ ] Email notification system
- [ ] Advanced reporting tools

### Performance Improvements
- [ ] Server-side rendering optimization
- [ ] Image optimization and CDN
- [ ] Database query optimization
- [ ] Caching strategies

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [Firebase](https://firebase.google.com/)
- Designed for Vietnamese durian farmers 🇻🇳
- Inspired by the need for accessible farm management technology
- UI components from [Tailwind CSS](https://tailwindcss.com/) and [Heroicons](https://heroicons.com/)

---

**Need Help?** Check our comprehensive documentation or open an issue for support.

**Ready to Scale?** The enhanced multi-tenant system supports unlimited farmers and organizations while maintaining simplicity for individual users.