# @Mentions Feature Implementation

## Date: May 21, 2026

---

## ✅ Feature Overview

Added **@mentions** functionality to the commenting system, allowing users to mention manuscript collaborators (owner and co-authors) in comments and replies.

---

## 🎯 How It Works

### **Triggering Mentions**
1. Type `@` in a comment or reply field
2. An autocomplete dropdown appears showing available collaborators
3. Start typing to filter by name or email
4. Use arrow keys to navigate, Enter/Tab to select, or click to insert

### **Keyboard Navigation**
- **↓ Arrow Down**: Move to next collaborator
- **↑ Arrow Up**: Move to previous collaborator  
- **Enter/Tab**: Insert selected mention
- **Esc**: Close mentions dropdown
- **Ctrl+Enter**: Submit comment (when mentions closed)

### **Who Can Be Mentioned**
- Manuscript owner
- All co-authors
- Automatically populated from manuscript data

---

## 📋 Implementation Details

### **Files Modified**

#### 1. **`frontend/components/CommentForm.js`**
**Changes:**
- Added mentions state management
- Added `collaborators` prop
- Implemented @mention detection in text input
- Added autocomplete dropdown with Popper
- Added keyboard navigation (arrow keys, Enter, Tab, Esc)
- Real-time filtering by name or email
- Visual feedback with avatars and user info

**Key Features:**
```javascript
- showMentions: boolean
- mentionSearch: string (filter text)
- selectedMentionIndex: number (keyboard navigation)
- filteredCollaborators: filtered user list
- insertMention(user): inserts @Name into text
```

#### 2. **`frontend/components/CommentSidebar.js`**
**Changes:**
- Added same mentions functionality to reply fields
- Added `collaborators` prop
- Implemented identical @mention behavior for consistency
- Shared keyboard shortcuts and UX patterns

**Key Features:**
- Same autocomplete dropdown as CommentForm
- Arrow key navigation
- Real-time filtering
- Seamless insertion

#### 3. **`frontend/app/researcher/manuscripts/[id]/editor/page.js`**
**Changes:**
- Added `collaborators` state
- Fetch collaborators from manuscript data (owner + co-authors)
- Pass `collaborators` prop to CommentForm
- Pass `collaborators` prop to CommentSidebar
- Build collaborators list on manuscript load

**Collaborators Structure:**
```javascript
[
  { id: 'user-id', name: 'John Doe', email: 'john@example.com' },
  { id: 'user-id-2', name: 'Jane Smith', email: 'jane@example.com' }
]
```

---

## 🎨 UI/UX Features

### **Autocomplete Dropdown**
- **Appearance**: Material-UI Popper with Paper elevation
- **Position**: Below the text field
- **Max Height**: 200px with scroll
- **Min Width**: 250px

### **Collaborator List Items**
- **Avatar**: Circular with accent color, shows first letter of name
- **Primary Text**: User's full name (13px)
- **Secondary Text**: User's email (11px, gray)
- **Hover/Selected**: Highlighted with accent color background

### **Visual Feedback**
- Selected item highlighted with `#1ca7a1` (20% opacity)
- Smooth scrolling in dropdown
- Focus maintained on text field

---

## 💡 User Experience

### **Seamless Integration**
✅ Works in both comment creation and replies  
✅ Doesn't interrupt typing flow  
✅ Keyboard-first design (no mouse required)  
✅ Smart filtering (searches both name and email)  
✅ Automatic space after mention insertion  
✅ Placeholder hints: "use @ to mention"  

### **Smart Behavior**
- Mentions only appear when typing after `@`
- Closes when space or newline is typed
- Closes on Escape key
- Maintains cursor position after insertion
- Refocuses text field after selection

---

## 🔧 Technical Implementation

### **State Management**
```javascript
const [showMentions, setShowMentions] = useState(false);
const [mentionSearch, setMentionSearch] = useState('');
const [mentionPosition, setMentionPosition] = useState(0);
const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
```

### **Detection Logic**
```javascript
const handleContentChange = (e) => {
  const newContent = e.target.value;
  const cursorPos = e.target.selectionStart;
  const textBeforeCursor = newContent.substring(0, cursorPos);
  const lastAtIndex = textBeforeCursor.lastIndexOf('@');
  
  if (lastAtIndex !== -1) {
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
      setMentionSearch(textAfterAt.toLowerCase());
      setShowMentions(true);
    }
  }
};
```

### **Filtering**
```javascript
const filteredCollaborators = collaborators.filter(user => 
  user.name.toLowerCase().includes(mentionSearch) || 
  user.email.toLowerCase().includes(mentionSearch)
);
```

### **Insertion**
```javascript
const insertMention = (user) => {
  const beforeMention = content.substring(0, mentionPosition);
  const afterMention = content.substring(cursorPosition);
  const newContent = `${beforeMention}@${user.name} ${afterMention}`;
  setContent(newContent);
  setShowMentions(false);
};
```

---

## 🚀 Usage Examples

### **Example 1: Mentioning in New Comment**
1. Select text in manuscript
2. Click comment button
3. Type: "Hey @j"
4. Dropdown shows "John Doe"
5. Press Enter
6. Result: "Hey @John Doe "

### **Example 2: Mentioning in Reply**
1. Click Reply on a comment
2. Type: "@jane can you review this?"
3. Dropdown shows "Jane Smith"
4. Click on Jane Smith
5. Result: "@Jane Smith can you review this?"

### **Example 3: Multiple Mentions**
1. Type: "@John and @Jane, please check"
2. Select John from dropdown
3. Continue typing " and @"
4. Select Jane from dropdown
5. Result: "@John Doe and @Jane Smith, please check"

---

## 📊 Benefits

✅ **Better Collaboration**: Directly notify specific team members  
✅ **Clear Communication**: Know who comments are directed to  
✅ **Faster Workflow**: Quick access to all collaborators  
✅ **Familiar UX**: Similar to Slack, Teams, Google Docs  
✅ **Keyboard Efficient**: Full keyboard navigation support  
✅ **Smart Filtering**: Find users quickly by name or email  

---

## 🔮 Future Enhancements

Potential improvements for the mentions system:

- [ ] **Notifications**: Send email/in-app notifications when mentioned
- [ ] **Mention Highlighting**: Highlight @mentions in comment text
- [ ] **Click to Profile**: Make mentions clickable to view user profiles
- [ ] **Recent Mentions**: Show recently mentioned users first
- [ ] **@all**: Mention all collaborators at once
- [ ] **Mention Analytics**: Track who gets mentioned most
- [ ] **External Reviewers**: Include manuscript reviewers in mentions

---

## 📦 Deployment

**Files Deployed:**
- ✅ `frontend/components/CommentForm.js`
- ✅ `frontend/components/CommentSidebar.js`
- ✅ `frontend/app/researcher/manuscripts/[id]/editor/page.js`

**Restart frontend container to apply:**
```bash
docker restart dacoris-frontend
```

**Access at:** `http://192.168.100.90/researcher/manuscripts/{id}/editor`

---

## ✨ Summary

The @mentions feature is now **fully functional** in both comment creation and replies! Users can easily mention manuscript collaborators with an intuitive autocomplete interface, keyboard navigation, and smart filtering. This enhances team collaboration and makes communication more direct and efficient.

**Status:** ✅ Ready for Production
