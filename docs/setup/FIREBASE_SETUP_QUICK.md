# 🔥 Firebase Environment Variables Setup

**Document status:** Current quick setup for local/staging use; production deployment blocked

**Baseline:** Repository state verified on 2026-07-15

**Review date:** 2026-07-15

**Current notice:** Firebase Auth, Firestore, and Storage are the active application runtime. PocketBase dependencies and migration scripts exist, but PocketBase is inactive in the application runtime. Use placeholders in documentation and obtain project-specific Firebase web configuration directly from Firebase Console.

> Do not deploy production from this quick guide. Current `../../firestore.rules` grants broad authenticated access, and `../../firebase.json` has no Storage rules entry or hosting configuration. There is no `storage.rules` file or CI deployment workflow. See [Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md).

## 🚨 **Quick Fix Applied**

I've added fallback configuration so the app will run without Firebase environment variables, but **you'll need to set up your Firebase project** for authentication to work properly.

## ⚡ **Immediate Solution**

The app now uses demo configuration and will show:
```
⚠️ Missing Firebase environment variables: (5) [...]
⚠️ Using fallback demo configuration. Please set up .env.local for production.
```

**This allows you to test the UI, but authentication won't work until you configure Firebase.**

## 🔧 **Proper Firebase Setup**

### **Step 1: Create Firebase Project**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or select existing project
3. Enable Authentication and Firestore

### **Step 2: Get Firebase Config**
1. In Firebase Console, click ⚙️ **Project Settings**
2. Scroll to "Your apps" section
3. Click "Web app" icon (</>) or "Add app"
4. Register your app (name: "Farm Management")
5. **Copy the config object**

### **Step 3: Create .env.local File**
Create a file named `.env.local` in your project root:

```bash
# Copy this to .env.local and replace with your Firebase values

NEXT_PUBLIC_FIREBASE_API_KEY=<firebase-web-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<firebase-auth-domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<firebase-project-id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<firebase-storage-bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<firebase-messaging-sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<firebase-web-app-id>
```

### **Step 4: Enable Authentication**
1. In Firebase Console → **Authentication**
2. Click "Get started"
3. Go to **Sign-in method** tab
4. Enable **Email/Password** provider
5. Save

### **Step 5: Set up Firestore**
1. In Firebase Console → **Firestore Database**
2. Click "Create database"
3. Use temporary test mode only in a disposable project with no real data; prefer the Firebase Emulator Suite
4. Select location (asia-southeast1 for Vietnam)

### **Step 6: Configure Firestore Rules**
The following broad authenticated-access rule is an unsafe historical sample. Do not deploy it to production; use it only in a disposable environment if unavoidable:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🧪 **Testing After Setup**

### **With Proper Firebase Config:**
```
✅ Firebase initialized successfully
✅ Firestore initialized with custom settings
🔐 User signed in: [test-user-email]
🏗️ Creating default farm for new user: [test-user-email]
✅ Created default farm: [farm-id] for user: [test-user-email]
```

### **Expected Flow:**
1. **Environment variables loaded** ✅
2. **Firebase connects** ✅  
3. **User can login** ✅
4. **Default farm created** ✅
5. **Redirect to map page** ✅

## 🎯 **Current Status**

### **✅ Working Now (Demo Mode):**
- App starts without errors
- UI components load
- Navigation works
- Mobile menu functional

### **❌ Not Working Yet (Need Firebase):**
- User authentication
- Data persistence  
- Farm creation
- Real functionality

## 🚀 **Quick Start Options**

### **Option A: Test UI Only (Current)**
- Continue testing without Firebase
- UI and navigation work perfectly
- Authentication will show errors

### **Option B: Full Firebase Setup (Recommended)**
- Follow the steps above
- Get full authentication working
- Test complete farmer workflow

### **Option C: Use Existing Firebase Project**
- If you have an existing Firebase project
- Copy the config values to `.env.local`
- Enable Authentication and Firestore

## 📋 **Next Steps**

1. **✅ DONE**: Fallback config added, app runs
2. **🔧 TODO**: Set up Firebase project (5-10 minutes)
3. **📝 TODO**: Create `.env.local` with your config
4. **🧪 TODO**: Test authentication flow
5. **🚀 TODO**: Complete the security and release gates in the [Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md) before any production deployment

## 🔗 **Helpful Links**

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Web Setup Guide](https://firebase.google.com/docs/web/setup)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

**The app is now running! You can test the UI immediately, and add Firebase later for full functionality.** 🌾
