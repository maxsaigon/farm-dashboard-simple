# 🧪 Testing Guide for TreeList and TreeDetail Components

**Document status:** Current testing guide; automated core with additional manual coverage

**Baseline:** Repository state verified on 2026-07-15

**Review date:** 2026-07-15

**Current notice:** This guide describes the current commands and known gaps. A successful build is not equivalent to passing unit, integration, E2E, security, or production-readiness validation.

## Current Automated-Test Baseline

| Check | Current state |
|---|---|
| Unit | `npm test` runs Jest; 5 access-control tests pass. |
| Firestore Rules | `npm run test:rules:emulator` runs 8 cross-farm/role/escalation/deny-by-default tests. |
| Playwright | `npm run test:e2e:emulator` seeds Auth/Firestore/Storage emulators, logs in through UI, persists IndexedDB auth state, and passes 3 mobile setup/critical-path tests. |
| Build | `npm run build` passed on 2026-07-15. Next.js skipped lint during this build and performed its type validation. |
| Standalone typecheck | `npx tsc --noEmit` passed on 2026-07-15. Run it after the build if `.next/types` has not yet been generated. |
| Lint | `npm run lint` completed on 2026-07-15 with many warnings, including unused values, explicit `any`, hook dependency, unescaped entity, and raw `<img>` warnings. |

Historical reports in this directory are retained for traceability. They do not prove the current application is production ready.

Emulators require Java 21 or newer. On this workstation, use the Homebrew OpenJDK runtime if the system Java is older.

## 🚀 Quick Test Setup

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open the application:**
   - Navigate to: http://localhost:3000
   - Click "Quản Lý Cây" or go directly to: http://localhost:3000/trees

## 📋 Manual Testing Checklist

### 🌳 TreeList Component Tests

#### ✅ Basic Functionality
- [ ] **Page Load**: Trees page loads without errors
- [ ] **Loading State**: Shows loading spinner when fetching data
- [ ] **Empty State**: Shows appropriate message when no trees exist
- [ ] **Tree Display**: Shows tree cards with basic information
- [ ] **Real-time Updates**: Data updates automatically when changed

#### ✅ Search & Filter Features
- [ ] **Search Bar**: 
  - Search by tree name works
  - Search by QR code works
  - Search by zone code works
  - Search by variety works
  - Search is case-insensitive
- [ ] **Health Status Filter**:
  - "Tất cả trạng thái" shows all trees
  - "Khỏe mạnh" shows only Excellent/Good trees
  - "Cần chú ý" shows only trees with needsAttention=true
  - "Yếu" shows only Fair/Poor health trees
- [ ] **Variety Filter**:
  - Shows all unique varieties from trees
  - Filters correctly by selected variety
- [ ] **Sorting**:
  - Sort by name (A-Z, Z-A)
  - Sort by planting date (newest, oldest)
  - Sort by health status (best, worst)
  - Sort by fruit count (most, least)

#### ✅ Tree Selection
- [ ] **Click to Select**: Clicking a tree selects it
- [ ] **Visual Feedback**: Selected tree has green border/background
- [ ] **Selection Persistence**: Selection maintained during filters/search

#### ✅ Tree Actions
- [ ] **View Button**: Eye icon opens tree detail
- [ ] **Edit Button**: Pencil icon triggers edit mode
- [ ] **Action Tooltips**: Hover shows "Xem chi tiết" and "Chỉnh sửa"

### 📊 TreeDetail Component Tests

#### ✅ Display Functionality
- [ ] **Empty State**: Shows placeholder when no tree selected
- [ ] **Tree Information**: Displays all tree data correctly
- [ ] **Health Icons**: Shows appropriate health status icons
- [ ] **Health Colors**: Uses correct colors for health status badges
- [ ] **Date Formatting**: Dates display in Vietnamese format (DD/MM/YYYY)

#### ✅ Basic Information Section
- [ ] **Tree Name**: Displays name or fallback to QR code/ID
- [ ] **Variety**: Shows tree variety with proper selection
- [ ] **Zone Code**: Displays and edits zone information
- [ ] **Planting Date**: Shows formatted planting date
- [ ] **QR Code**: Displays QR code in monospace font

#### ✅ Growth Metrics Section
- [ ] **Health Status**: Shows current health with proper badge
- [ ] **Tree Height**: Displays height in meters
- [ ] **Trunk Diameter**: Shows diameter in centimeters
- [ ] **Manual Fruit Count**: Displays manual count
- [ ] **AI Fruit Count**: Shows AI-detected count (read-only)
- [ ] **Total Fruits**: Calculates and displays total with highlight

#### ✅ Care History Section
- [ ] **Fertilized Date**: Shows last fertilizing date
- [ ] **Pruned Date**: Shows last pruning date
- [ ] **AI Analysis Date**: Shows last AI analysis date
- [ ] **Color Coding**: Each care type has distinct colors

#### ✅ Notes Section
- [ ] **General Notes**: Displays and edits general notes
- [ ] **Health Notes**: Shows health-specific notes
- [ ] **Disease Notes**: Displays disease-related notes
- [ ] **Needs Attention**: Checkbox for attention flag

#### ✅ System Information
- [ ] **GPS Coordinates**: Shows latitude/longitude with precision
- [ ] **GPS Accuracy**: Displays accuracy in meters
- [ ] **Created Date**: Shows creation timestamp
- [ ] **Updated Date**: Shows last update timestamp
- [ ] **Last Sync**: Shows last sync with server
- [ ] **Last Count**: Shows last fruit count date

#### ✅ Edit Functionality
- [ ] **Edit Mode Toggle**: "Chỉnh sửa" button enables editing
- [ ] **Form Fields**: All editable fields become inputs
- [ ] **Input Validation**: Proper validation for numbers/dates
- [ ] **Save Changes**: "Lưu" button saves to Firestore
- [ ] **Cancel Changes**: "Hủy" button discards changes
- [ ] **Loading State**: Shows "Đang lưu..." during save

#### ✅ Delete Functionality
- [ ] **Delete Button**: "Xóa" button is visible
- [ ] **Confirmation Dialog**: Shows confirmation before delete
- [ ] **Delete Success**: Tree removed from list after deletion
- [ ] **Navigation**: Returns to list view after deletion

### 📱 Responsive Design Tests

#### ✅ Desktop Layout (≥1024px)
- [ ] **Split View**: List on left (2 cols), detail on right (3 cols)
- [ ] **Navigation**: Top navigation bar visible
- [ ] **Spacing**: Proper spacing between components
- [ ] **Typography**: Text sizes appropriate for desktop

#### ✅ Mobile Layout (<1024px)
- [ ] **Single View**: Either list OR detail visible
- [ ] **Navigation**: Mobile hamburger menu works
- [ ] **Back Button**: Arrow button returns from detail to list
- [ ] **Touch Targets**: Buttons are finger-friendly (min 44px)
- [ ] **Scrolling**: Content scrolls properly on small screens

### 🔐 Authentication & Authorization Tests

#### ✅ Admin User Tests
- [ ] **Admin Login**: Login with a dedicated, non-production test admin account works
- [ ] **Admin Banner**: Purple "Admin Mode" banner appears
- [ ] **Cross-Farm Access**: Can see trees from all farms
- [ ] **Full Permissions**: Can edit and delete any tree

#### ✅ Regular User Tests
- [ ] **Farm Access**: Only sees trees from accessible farms
- [ ] **Permission Checks**: Edit/delete based on farm permissions
- [ ] **Farm Selection**: Can switch between accessible farms

### 🔄 Real-time Synchronization Tests

#### ✅ Data Updates
- [ ] **Live Updates**: Changes reflect immediately
- [ ] **Cross-Platform Sync**: Changes from iOS app appear in web
- [ ] **Conflict Resolution**: Handles concurrent edits gracefully
- [ ] **Connection Loss**: Handles offline/online transitions

## 🐛 Error Testing

### ✅ Network Issues
- [ ] **Offline Mode**: Shows appropriate error messages
- [ ] **Slow Connection**: Loading states work properly
- [ ] **Failed Requests**: Error handling for save/delete failures

### ✅ Data Issues
- [ ] **Missing Data**: Handles trees with missing fields
- [ ] **Invalid Dates**: Gracefully handles invalid date values
- [ ] **Large Numbers**: Handles large fruit counts properly

### ✅ Permission Issues
- [ ] **Unauthorized Access**: Proper error messages
- [ ] **Insufficient Permissions**: Disabled edit/delete buttons
- [ ] **Session Expiry**: Redirects to login when needed

## 📊 Performance Tests

### ✅ Large Data Sets
- [ ] **Many Trees**: Performance with 100+ trees
- [ ] **Search Performance**: Fast search with large datasets
- [ ] **Filter Performance**: Quick filtering operations
- [ ] **Memory Usage**: No memory leaks during navigation

### ✅ Browser Compatibility
- [ ] **Chrome**: Full functionality works
- [ ] **Safari**: All features operational
- [ ] **Firefox**: Complete compatibility
- [ ] **Mobile Browsers**: Touch interactions work

## 🎯 User Experience Tests

### ✅ Usability
- [ ] **Intuitive Navigation**: Easy to understand interface
- [ ] **Clear Labels**: All Vietnamese labels are accurate
- [ ] **Helpful Feedback**: Success/error messages are clear
- [ ] **Consistent Design**: UI follows design system

### ✅ Accessibility
- [ ] **Keyboard Navigation**: Tab navigation works
- [ ] **Screen Reader**: Proper ARIA labels
- [ ] **Color Contrast**: Sufficient contrast ratios
- [ ] **Focus Indicators**: Clear focus states

## 🚨 Critical Path Tests

These are the most important flows to test:

1. **View Trees**: Home → Quản Lý Cây → See tree list
2. **Tree Details**: Click tree → View detailed information
3. **Edit Tree**: Select tree → Chỉnh sửa → Modify → Lưu
4. **Search Trees**: Use search box → Find specific tree
5. **Filter Trees**: Use filters → See filtered results
6. **Mobile Navigation**: Open on mobile → Navigate between views

## 📝 Test Report Template

After testing, document results:

```
## Test Results - [Date]

### ✅ Passed Tests
- [List successful tests]

### ❌ Failed Tests
- [List failed tests with details]

### 🐛 Bugs Found
- [Description, steps to reproduce, expected vs actual]

### 💡 Improvement Suggestions
- [UX improvements, performance optimizations]

### 📊 Browser/Device Testing
- Chrome: ✅/❌
- Safari: ✅/❌  
- Mobile: ✅/❌
```

## 🔧 Developer Testing Tools

You can also use browser dev tools:

1. **Console**: Check for JavaScript errors
2. **Network**: Monitor API requests and responses
3. **Performance**: Analyze loading times
4. **Mobile Simulation**: Test responsive design
5. **React DevTools**: Inspect component state

## Automated Commands

```bash
npm run build
npx tsc --noEmit
npm run lint
npx playwright test
```

Run Playwright only against an isolated test Firebase project with disposable data and test accounts. Record the command, environment, commit, failures, and artifacts; do not replace a failed result with a narrative success claim.

---

Happy Testing! 🧪✨

For any issues found, please document them with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/device information
- Screenshots if applicable
