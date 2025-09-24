# Tree Note System Documentation

## Overview

The Tree Note System is a real-time collaborative tool that enables team members to communicate and coordinate work on individual trees. It provides a timeline-based interface for quick notes, observations, and task tracking directly within the tree showcase view.

## Features

### 🌟 Core Functionality

- **Real-time collaboration** with live updates
- **Timeline-based note history** with chronological ordering
- **Multiple note types** for different contexts
- **@Mention system** for team member notifications
- **Mobile-optimized interface** with responsive design
- **Persistent data storage** in Firebase Firestore

### 📝 Note Types

| Type | Icon | Use Case | Example |
|------|------|----------|---------|
| **Info** 📘 | Information | General observations | "Cây phát triển tốt, lá xanh đều" |
| **Warning** ⚠️ | Warning Triangle | Issues needing attention | "Phát hiện sâu bệnh ở lá dưới" |
| **Success** ✅ | Check Circle | Completed tasks | "Đã bón phân xong, cây khỏe mạnh" |
| **Urgent** 🚨 | Alert Triangle | Critical issues | "Cây bị gãy cành, cần xử lý ngay!" |

## User Interface

### Collapsed State
```
📝 Ghi chú nhóm                    [5] [+]
   12 ghi chú • Cộng tác nhóm
```

### Expanded State
```
┌─────────────────────────────────────────────┐
│ 📝 Ghi chú nhóm                    [5] [+] │
│    12 ghi chú • Cộng tác nhóm              │
├─────────────────────────────────────────────┤
│ [📘] [⚠️] [✅] [🚨] Note Type Selector     │
│ ┌─────────────────────────────────────────┐ │
│ │ Nhập ghi chú... (@tên để mention)      │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│              [Hủy] [Thêm ghi chú]          │
├─────────────────────────────────────────────┤
│ 📘 Bạn • 2 phút trước                      │
│    Cây này cần tưới nước thêm @manager     │
│                                             │
│ ⚠️ Minh • 1 giờ trước                      │
│    Phát hiện sâu bệnh, cần xử lý           │
└─────────────────────────────────────────────┘
```

## Integration

### Location
The TreeNoteSystem is integrated into the **FullScreenTreeShowcase** component, positioned directly under the ImageGallery for immediate visibility and easy access.

### Component Hierarchy
```
FullScreenTreeShowcase
├── Header (Fixed)
├── ImageGallery
├── TreeNoteSystem ← **HERE**
├── DurianSeasonStatus
├── FruitCountCard
└── TreeInfoCard
```

## Technical Implementation

### Database Structure

```
Firestore Collection Path:
farms/{farmId}/trees/{treeId}/notes/{noteId}
```

### Document Schema
```typescript
interface TreeNote {
  id: string                    // Auto-generated document ID
  content: string               // Note text content
  author: {
    uid: string                 // Firebase user ID
    name: string                // Display name
    email: string               // User email
  }
  timestamp: Date               // When note was created
  type: 'info' | 'warning' | 'success' | 'urgent'
  mentions?: string[]           // Array of @mentioned usernames
  attachments?: {               // Future: file attachments
    type: 'image' | 'document'
    url: string
    name: string
  }[]
  isEdited?: boolean           // Whether note was modified
  editedAt?: Date              // When note was last edited
}
```

### Real-Time Updates
```typescript
// Firebase Firestore real-time listener
const notesRef = collection(db, 'farms', farmId, 'trees', treeId, 'notes')
const q = query(notesRef, orderBy('timestamp', 'desc'))

onSnapshot(q, (snapshot) => {
  const notes = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp?.toDate()
  }))
  setNotes(notes)
})
```

## Usage Guide

### Adding a Note

1. **Open Tree Showcase** - Navigate to any tree's detail view
2. **Expand Notes** - Click on "Ghi chú nhóm" section under images
3. **Select Type** - Choose note type (📘 Info, ⚠️ Warning, ✅ Success, 🚨 Urgent)
4. **Write Content** - Type your note in the text area
5. **Mention Team** - Use @username to notify specific team members
6. **Save Note** - Click "Thêm ghi chú" to save

### Collaboration Features

#### @Mentions
```
Example: "Cây này cần kiểm tra @manager @technician"
Result: Creates mention tags for easy team coordination
```

#### Note Types for Workflow
- **📘 Info**: Daily observations, progress updates
- **⚠️ Warning**: Issues that need monitoring
- **✅ Success**: Completed tasks, achievements
- **🚨 Urgent**: Critical problems requiring immediate action

### Team Coordination Scenarios

#### Daily Inspection
```
📘 "Kiểm tra ngày 15/01 - cây phát triển tốt"
⚠️ "Lá hơi vàng ở tầng dưới, cần theo dõi"
✅ "Đã tưới nước và bón phân xong"
```

#### Problem Tracking
```
🚨 "KHẨN CẤP: Cây bị sâu đục thân @team_leader"
⚠️ "Đã phun thuốc trừ sâu, theo dõi 3 ngày @monitor_team"
✅ "Sâu bệnh đã hết, cây phục hồi tốt"
```

## Permissions & Security

### Access Control
- **Authentication Required**: Only logged-in users can add notes
- **Farm-based Access**: Users can only see notes for trees in their assigned farms
- **Real-time Sync**: All team members see updates instantly

### Data Privacy
- Notes are farm-specific and not visible across different farms
- User information is limited to name and email
- All communication is logged with timestamps for accountability

## Performance Considerations

### Optimization Features
- **Lazy Loading**: Notes load only when section is expanded
- **Efficient Queries**: Limited to 50 most recent notes per tree
- **Real-time Throttling**: Updates batched to prevent spam
- **Mobile Optimization**: Touch-friendly interface with smooth animations

### Scalability
- **Indexed Queries**: Timestamp-based ordering for fast retrieval
- **Pagination Ready**: Can implement infinite scroll for large note counts
- **Caching Strategy**: Firebase automatically caches recent data

## Future Enhancements

### Planned Features
- [ ] **File Attachments**: Images and documents in notes
- [ ] **Note Editing**: Ability to modify existing notes
- [ ] **Note Reactions**: Like/acknowledge system
- [ ] **Push Notifications**: Real-time alerts for @mentions
- [ ] **Note Templates**: Pre-defined note formats for common tasks
- [ ] **Search & Filter**: Find specific notes by content or author
- [ ] **Export Function**: Download note history as PDF/CSV

### Advanced Features
- [ ] **Voice Notes**: Audio recording for field work
- [ ] **Photo Annotations**: Draw on images with notes
- [ ] **Task Assignment**: Convert notes to actionable tasks
- [ ] **Integration**: Connect with calendar and task management
- [ ] **Analytics**: Note patterns and team activity insights

## Troubleshooting

### Common Issues

#### Notes Not Saving
```
Check Console Logs:
🔥 Adding note to database: { farmId, treeId, userId }
✅ Note saved successfully with ID: "note-doc-id"

Common Causes:
- User not authenticated
- No farm selected
- Network connectivity issues
- Firebase permissions
```

#### Notes Not Loading
```
Check Console Logs:
🔥 Setting up real-time listener for notes
🔥 Notes snapshot received: { empty: false, size: 3 }

Common Causes:
- Missing farmId or treeId
- Firestore rules blocking read access
- Network connectivity issues
```

#### Real-time Updates Not Working
```
Troubleshooting Steps:
1. Check internet connection
2. Verify Firebase configuration
3. Confirm user authentication
4. Check browser console for errors
```

### Debug Mode
Enable detailed logging by checking browser console:
- `🔥` = Normal operations
- `✅` = Successful operations  
- `❌` = Errors and failures

## Support

### Technical Requirements
- **Firebase Authentication**: User must be logged in
- **Firestore Database**: Real-time database access
- **Modern Browser**: ES6+ support required
- **Internet Connection**: Required for real-time updates

### Browser Compatibility
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

**Last Updated**: January 2024  
**Version**: 1.0.0  
**Component**: `TreeNoteSystem.tsx`  
**Integration**: `FullscreenTreeShowcase.tsx`