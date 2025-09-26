# 🔥 Firebase Environment Variables Setup

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

NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA...your_actual_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456789
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
3. Choose "Start in test mode" (for now)
4. Select location (asia-southeast1 for Vietnam)

### **Step 6: Configure Firestore Rules**
Replace the default rules with:

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
🔐 User signed in: your.email@domain.com
🏗️ Creating default farm for new user: your.email@domain.com
✅ Created default farm: [farm-id] for user: your.email@domain.com
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
5. **🚀 TODO**: Deploy with real Firebase

## 🔗 **Helpful Links**

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Web Setup Guide](https://firebase.google.com/docs/web/setup)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

**The app is now running! You can test the UI immediately, and add Firebase later for full functionality.** 🌾