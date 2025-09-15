# 🌾 Manual Testing Scenarios for Farmers

## Real User Testing Guide for Simplified Auth System

This guide provides step-by-step scenarios to test the auth system with real farmer workflows.

---

## 📋 **Test Setup**

### **Test Environment:**
- **URL**: `http://localhost:3001` (dev) or your production URL
- **Test Devices**: Mobile phone (primary), tablet, desktop
- **Browsers**: Chrome, Safari (mobile), Firefox
- **Network**: Test with good WiFi and poor mobile data

### **Test Users to Create:**
```
1. Farm Owner: owner@testfarm.com / password123
2. Farm Manager: manager@testfarm.com / password123  
3. Farm Worker: worker@testfarm.com / password123
4. New Farmer: newfarm@test.com / password123
```

---

## 🧪 **Scenario 1: New Farmer Registration**

**Goal**: Verify a new farmer can easily register and start using the system.

### **Steps:**
1. **Open app on mobile device**
   - Navigate to login page
   - ✅ Should see clean, Vietnamese interface
   - ✅ Large touch targets (60px+)

2. **Register new account**
   - Click "Đăng ký mới" (Sign Up)
   - Enter: `newfarm@test.com`, `password123`, `Nông dân Test`
   - ✅ Form should be easy to use on mobile
   - ✅ Submit button should be large and clear

3. **Email verification**
   - Check email for verification link
   - ✅ Should receive verification email
   - Click verification link

4. **First login**
   - Return to app
   - Sign in with new credentials
   - ✅ Should login successfully
   - ✅ Should see onboarding or farm setup

### **Expected Results:**
- ✅ Registration completes without errors
- ✅ UI is mobile-friendly throughout
- ✅ Vietnamese text displays correctly
- ✅ User can navigate without confusion

---

## 🌳 **Scenario 2: Daily Farm Worker Tasks**

**Goal**: Test typical daily workflow for a farm worker.

### **Setup:**
- Login as: `worker@testfarm.com`
- Role: Viewer (read-only access)

### **Steps:**
1. **Morning Login**
   - Open app on mobile
   - Enter credentials
   - ✅ Should login quickly (< 3 seconds)
   - ✅ Should see farm overview

2. **View Tree Information**
   - Navigate to "Cây trồng" (Trees)
   - ✅ Should see list of trees
   - ✅ Can scroll and search easily
   - Tap on a tree
   - ✅ Should see tree details in bottom sheet

3. **Check Tree Health Status**
   - Look for trees marked as "Cần chú ý" (Need attention)
   - ✅ Should see visual indicators (🟠 🔴)
   - ✅ Problem trees should be easy to identify

4. **View Map Location**
   - Navigate to "Bản đồ" (Map)
   - ✅ Should see trees on map
   - ✅ Can zoom and pan easily
   - Tap on tree markers
   - ✅ Should show tree info popup

5. **Try to Edit (Should Fail)**
   - Try to edit tree information
   - ✅ Should not have edit buttons/options
   - ✅ Should see read-only interface

### **Expected Results:**
- ✅ Worker can view all information
- ✅ Cannot modify any data (viewer role)
- ✅ Interface is intuitive and fast
- ✅ Visual indicators are clear

---

## 📸 **Scenario 3: Farm Manager Daily Tasks**

**Goal**: Test manager workflow for tree management and photo capture.

### **Setup:**
- Login as: `manager@testfarm.com`
- Role: Manager (read/write access)

### **Steps:**
1. **Morning Check**
   - Login on mobile device
   - Navigate to map view
   - ✅ Should see overview of farm status
   - ✅ Can identify problem areas quickly

2. **Tree Photo Capture**
   - Navigate to a tree needing attention
   - Tap "📸 Chụp ảnh" (Take Photo)
   - ✅ Camera should open
   - Take photo of tree
   - ✅ Photo should save successfully
   - ✅ Should see confirmation message

3. **Update Tree Status**
   - Find tree with health issues
   - Tap "✏️ Cập nhật" (Update)
   - Change health status
   - Add notes in Vietnamese
   - ✅ Should save changes successfully
   - ✅ Changes should reflect immediately

4. **Zone Management**
   - Navigate to "Khu vực" (Zones)
   - View zone statistics
   - ✅ Should see tree counts and health summary
   - ✅ Data should be accurate

5. **Try Admin Features (Should Fail)**
   - Try to access user management
   - ✅ Should not see admin options
   - ✅ Should be blocked from admin features

### **Expected Results:**
- ✅ Manager can edit trees and take photos
- ✅ Cannot access admin functions
- ✅ Mobile photo capture works smoothly
- ✅ Updates save reliably

---

## 🏆 **Scenario 4: Farm Owner Full Access**

**Goal**: Test full admin capabilities for farm owner.

### **Setup:**
- Login as: `owner@testfarm.com`
- Role: Owner (full access)

### **Steps:**
1. **Dashboard Access**
   - Login and check dashboard
   - ✅ Should see comprehensive farm overview
   - ✅ Should have admin options visible

2. **User Management**
   - Navigate to admin section
   - ✅ Should see user management options
   - Try to add new user
   - ✅ Should be able to invite workers
   - ✅ Should be able to set roles

3. **Farm Settings**
   - Access farm configuration
   - ✅ Should be able to modify farm settings
   - ✅ Should see all administrative options

4. **Data Export/Import**
   - Try to export farm data
   - ✅ Should have export options
   - ✅ Data should download successfully

5. **System Administration**
   - Check system settings
   - ✅ Should see advanced options
   - ✅ Should be able to manage farm structure

### **Expected Results:**
- ✅ Owner has complete access
- ✅ All admin features work
- ✅ Can manage users and permissions
- ✅ System responds reliably

---

## 📱 **Scenario 5: Mobile Field Usage**

**Goal**: Test real field conditions and mobile usability.

### **Setup:**
- Use actual mobile device (phone)
- Test in bright sunlight (if possible)
- Use mobile data connection

### **Steps:**
1. **Field Navigation**
   - Walk around with mobile device
   - Open map while moving
   - ✅ GPS should track location accurately
   - ✅ Map should update in real-time

2. **Quick Tree Updates**
   - Find tree that needs attention
   - Update status quickly on mobile
   - ✅ Interface should be thumb-friendly
   - ✅ Should save even with poor signal

3. **Photo Capture in Field**
   - Take multiple tree photos
   - ✅ Camera should work in bright sun
   - ✅ Photos should be high quality
   - ✅ Should upload when connection available

4. **Offline Capability**
   - Turn off mobile data
   - Try to use app
   - ✅ Should show offline indicator
   - ✅ Should still show cached data
   - ✅ Should sync when connection returns

### **Expected Results:**
- ✅ Works reliably in field conditions
- ✅ GPS tracking is accurate
- ✅ Camera performs well outdoors
- ✅ Handles poor network gracefully

---

## 🔒 **Scenario 6: Security & Permissions**

**Goal**: Verify security and permission boundaries work correctly.

### **Steps:**
1. **URL Manipulation Test**
   - Login as worker (viewer role)
   - Try to access `/admin` directly
   - ✅ Should redirect to "no access" page
   - ✅ Should not show admin content

2. **Session Security**
   - Login and close browser
   - Reopen browser and return to app
   - ✅ Should require login again (if configured)
   - ✅ Should remember user preferences

3. **Multiple Device Test**
   - Login on phone
   - Login on computer with same account
   - ✅ Should work on both devices
   - ✅ Should sync data between devices

4. **Role Change Test**
   - Have admin change user role
   - Refresh page
   - ✅ Should reflect new permissions
   - ✅ Should update interface accordingly

### **Expected Results:**
- ✅ Security boundaries enforced
- ✅ Role changes take effect
- ✅ Multi-device access works
- ✅ No unauthorized access possible

---

## 🚨 **Scenario 7: Error Handling**

**Goal**: Test how system handles errors and edge cases.

### **Steps:**
1. **Network Disconnection**
   - Start using app
   - Disconnect internet
   - Try various actions
   - ✅ Should show clear error messages
   - ✅ Should suggest solutions

2. **Invalid Credentials**
   - Try login with wrong password
   - ✅ Should show clear error message
   - ✅ Should not lock account immediately

3. **Session Timeout**
   - Leave app open for extended time
   - Return and try to use
   - ✅ Should handle expired sessions
   - ✅ Should prompt for re-login if needed

4. **Form Validation**
   - Try to submit forms with invalid data
   - ✅ Should show helpful validation messages
   - ✅ Should guide user to fix issues

### **Expected Results:**
- ✅ Clear, helpful error messages
- ✅ System recovers gracefully
- ✅ User is guided to solutions
- ✅ No system crashes or freezes

---

## 📊 **Success Criteria**

### **Must Pass (Critical):**
- [ ] All user roles can login successfully
- [ ] Permissions are correctly enforced
- [ ] Mobile interface is fully functional
- [ ] Vietnamese text displays correctly
- [ ] Core features work without errors

### **Should Pass (Important):**
- [ ] App loads in < 3 seconds
- [ ] Forms are easy to use on mobile
- [ ] Error messages are helpful
- [ ] Offline indicators work
- [ ] Photo capture quality is good

### **Nice to Have (Bonus):**
- [ ] GPS tracking is highly accurate
- [ ] Animations are smooth
- [ ] Handles poor network well
- [ ] Multi-device sync is instant
- [ ] Voice notes work (if implemented)

---

## 📝 **Bug Reporting Template**

When you find issues, report them with this format:

```
**Bug Title**: Clear description of the issue
**Scenario**: Which test scenario
**Steps**: Exact steps to reproduce
**Expected**: What should happen
**Actual**: What actually happened  
**Device**: Phone model, browser, OS
**Network**: WiFi/Mobile data, speed
**User Role**: Owner/Manager/Worker
**Screenshots**: If applicable
**Severity**: Critical/High/Medium/Low
```

---

## 🎯 **Testing Completion Checklist**

- [ ] Scenario 1: New Farmer Registration
- [ ] Scenario 2: Daily Farm Worker Tasks  
- [ ] Scenario 3: Farm Manager Daily Tasks
- [ ] Scenario 4: Farm Owner Full Access
- [ ] Scenario 5: Mobile Field Usage
- [ ] Scenario 6: Security & Permissions
- [ ] Scenario 7: Error Handling

**Overall Assessment:**
- [ ] Ready for production
- [ ] Needs minor fixes
- [ ] Needs major improvements
- [ ] Not ready for farmers

**Notes:**
_Add any additional observations or recommendations here..._