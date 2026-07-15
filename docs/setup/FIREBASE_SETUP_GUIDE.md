# 🔥 Firebase Setup Guide

**Document status:** Current local/staging setup guide; production deployment blocked

**Baseline:** Repository state verified on 2026-07-15

**Review date:** 2026-07-15

**Current notice:** The active application runtime uses Firebase Auth, Firestore, and Storage. PocketBase packages and scripts exist but PocketBase is not imported by the application runtime. Use project-specific values from Firebase Console without placing passwords, service-account keys, or private credentials in documentation.

> Security warning: current `../../firestore.rules` allows broad authenticated access, while `../../firebase.json` has no Storage rules entry and the repository has no `storage.rules`. Do not deploy production with current rules, Firebase test mode, or the illustrative rule snippets below. See [Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md).

## Quick Setup Steps

### 1. **Get Firebase Configuration**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click the **gear icon** ⚙️ → **Project settings**
4. Scroll down to **"Your apps"** section
5. Click on your web app or **"Add app"** → **Web** if you don't have one
6. Copy the configuration values

### 2. **Update Environment Variables**

Open `.env.local` and replace the empty values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=<firebase-web-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<firebase-auth-domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<firebase-project-id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<firebase-storage-bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<firebase-messaging-sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<firebase-web-app-id>
```

### 3. **Enable Firebase Services**

In your Firebase Console, enable these services:

#### **Authentication**
1. Go to **Authentication** → **Sign-in method**
2. Enable **Email/Password**
3. Enable **Google** (optional)

#### **Firestore Database**
1. Go to **Firestore Database**
2. Click **"Create database"**
3. For isolated local/staging development only, choose temporary test mode if required, then replace it immediately with reviewed rules before adding real data
4. Select your preferred location

#### **Storage**
1. Go to **Storage**
2. Click **"Get started"**
3. For isolated local/staging development only, choose temporary test mode if required; never use it with production or sensitive data

### 4. **Security Rules (Development)**

The following historical permissive examples are suitable only for a disposable Firebase project with no real data. Prefer Firebase Emulator Suite. Never deploy them to production:

#### **Firestore Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // DEVELOPMENT ONLY
    }
  }
}
```

#### **Storage Rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true; // DEVELOPMENT ONLY
    }
  }
}
```

⚠️ **Important:** Change these rules for production!

### 5. **Test Your Setup**

1. Save your `.env.local` file
2. Restart your development server:
   ```bash
   npm run dev
   ```
3. Check the browser console - the Firebase error should be gone
4. Try logging in to test authentication

## 🔒 Production Security Rules

The following samples are illustrative only and are not validated production rules. Build and emulator-test rules against the current schema instead:

#### **Firestore Rules (Production):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Farm access based on userFarmAccess collection
    match /farms/{farmId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/userFarmAccess/$(request.auth.uid + '_' + farmId));
    }
    
    // Admin-only collections
    match /auditLogs/{document} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

#### **Storage Rules (Production):**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Only authenticated users can upload
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 🛠️ Troubleshooting

### **Common Issues:**

1. **"Missing environment variables"**
   - Make sure `.env.local` exists and has all required variables
   - Restart your dev server after adding variables

2. **"Failed to connect to Firebase"**
   - Check your project ID is correct
   - Verify your API key is valid
   - Make sure your domain is authorized in Firebase Console

3. **"Permission denied"**
   - Check your Firestore security rules
   - Make sure authentication is working
   - Verify user has proper permissions

### **Need Help?**
- Check [Firebase Documentation](https://firebase.google.com/docs)
- Visit [Firebase Console](https://console.firebase.google.com/)
- Review the browser console for detailed error messages

## ✅ You're Ready!

Once configured, your admin system will have:
- ✅ Real-time user authentication
- ✅ Live data from Firestore
- ✅ File storage capabilities
- ✅ Audit logging
- ✅ System monitoring
- ✅ Analytics and reporting
