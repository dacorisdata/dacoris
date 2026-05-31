# Notification System Documentation

## Overview

The DACORIS notification system provides real-time notifications to users throughout the application. It includes a notification bell in the navbar, admin notifications for new registrations, and role assignment notifications.

## Features

### 1. **Notification Types**
- `NEW_REGISTRATION` - Notify admins when a new user registers
- `ACCOUNT_APPROVED` - Notify user when their account is approved
- `ACCOUNT_REJECTED` - Notify user when their account is rejected
- `ROLE_ASSIGNED` - Notify user when a role is assigned
- `ROLE_REMOVED` - Notify user when a role is removed
- `PROPOSAL_SUBMITTED` - Notify relevant parties about proposal submissions
- `PROPOSAL_APPROVED` - Notify user about proposal approval
- `PROPOSAL_REJECTED` - Notify user about proposal rejection
- `REVIEW_ASSIGNED` - Notify reviewer about assignment
- `COMMENT_ADDED` - Notify about new comments
- `SYSTEM_ANNOUNCEMENT` - System-wide announcements

### 2. **Priority Levels**
- `URGENT` - Critical notifications (red)
- `HIGH` - Important notifications (orange)
- `MEDIUM` - Standard notifications (blue)
- `LOW` - Informational notifications (gray)

## Backend Components

### Database Schema

**Notification Table:**
```sql
- id: Integer (Primary Key)
- recipient_id: Integer (Foreign Key to users)
- type: NotificationType (Enum)
- priority: NotificationPriority (Enum)
- title: String
- message: Text
- action_url: String (Optional - URL to navigate when clicked)
- related_entity_type: String (Optional - e.g., "user", "proposal")
- related_entity_id: Integer (Optional)
- is_read: Boolean (Default: False)
- read_at: DateTime (Nullable)
- created_at: DateTime
- expires_at: DateTime (Nullable)
```

### API Endpoints

#### Get Notifications
```
GET /api/notifications/
Query Parameters:
  - unread_only: boolean (default: false)
  - limit: integer (default: 50)
Headers:
  - Authorization: Bearer <token>
Response: List of notifications
```

#### Get Unread Count
```
GET /api/notifications/unread-count
Headers:
  - Authorization: Bearer <token>
Response: { "count": number }
```

#### Mark as Read
```
POST /api/notifications/{notification_id}/read
Headers:
  - Authorization: Bearer <token>
Response: { "success": true, "message": "..." }
```

#### Mark All as Read
```
POST /api/notifications/mark-all-read
Headers:
  - Authorization: Bearer <token>
Response: { "success": true, "count": number }
```

#### Delete Notification
```
DELETE /api/notifications/{notification_id}
Headers:
  - Authorization: Bearer <token>
Response: { "success": true, "message": "..." }
```

### Notification Service

**NotificationService Methods:**

1. `create_notification()` - Create a new notification
2. `notify_admins_new_registration()` - Notify admins about new user registration
3. `notify_account_approved()` - Notify user about account approval
4. `notify_account_rejected()` - Notify user about account rejection
5. `notify_role_assigned()` - Notify user about role assignment
6. `get_user_notifications()` - Get notifications for a user
7. `get_unread_count()` - Get unread notification count
8. `mark_as_read()` - Mark notification as read
9. `mark_all_as_read()` - Mark all notifications as read
10. `delete_notification()` - Delete a notification

## Institution Admin Dashboard

### Pending Users Management

**URL:** `/institution-admin/pending-users`

**Features:**
- View all pending user registrations
- Approve user accounts (requires email verification)
- Reject user registrations with optional reason
- Assign roles to users
- Real-time status updates

**API Endpoints:**

#### Get Pending Users
```
GET /api/institution-admin/pending-users/
Headers:
  - Authorization: Bearer <token>
Response: List of pending users
```

#### Approve User
```
POST /api/institution-admin/pending-users/approve
Body: { "user_id": number, "roles": string[] (optional) }
Headers:
  - Authorization: Bearer <token>
Response: { "success": true, "message": "...", "user_id": number }
```

#### Reject User
```
POST /api/institution-admin/pending-users/reject
Body: { "user_id": number, "reason": string (optional) }
Headers:
  - Authorization: Bearer <token>
Response: { "success": true, "message": "..." }
```

#### Assign Role
```
POST /api/institution-admin/pending-users/assign-role
Body: { "user_id": number, "role": string }
Headers:
  - Authorization: Bearer <token>
Response: { "success": true, "message": "...", "user_id": number }
```

### Available Roles for Assignment
- `GRANT_MANAGER` - Grant Manager
- `FINANCE_OFFICER` - Finance Officer
- `DATA_STEWARD` - Data Steward
- `DATA_ENGINEER` - Data Engineer
- `ETHICS_COMMITTEE_MEMBER` - Ethics Committee Member
- `INSTITUTIONAL_LEADERSHIP` - Institutional Leadership

## Frontend Components

### NotificationBell Component

**Location:** `frontend/components/notifications/NotificationBell.js`

**Features:**
- Badge showing unread notification count
- Dropdown menu with recent notifications
- Click to navigate to related content
- Mark individual notifications as read
- Mark all notifications as read
- Auto-refresh every 30 seconds
- Visual indicators for priority and read status

**Usage:**
```jsx
import NotificationBell from '@/components/notifications/NotificationBell';

// In navbar or header
<NotificationBell />
```

### Pending Users Page

**Location:** `frontend/app/institution-admin/pending-users/page.js`

**Features:**
- Table view of all pending registrations
- User details (name, email, department, role, status)
- Email verification status indicator
- Approve/Reject/Assign Role actions
- Confirmation dialogs for all actions
- Success/Error notifications

## Workflow

### New Registration Flow

1. **User Registers** → Admin staff completes registration form
2. **Email Sent** → Verification email sent to user
3. **Notification Created** → All institution admins receive notification
4. **Admin Views** → Admin sees notification in bell and on dashboard
5. **User Verifies Email** → User clicks verification link
6. **Admin Approves** → Admin approves account from `/institution-admin/pending-users` dashboard
7. **User Notified** → User receives approval notification
8. **Account Active** → User can now log in

### Role Assignment Flow

1. **Admin Opens Dashboard** → Views pending or active users at `/institution-admin/pending-users`
2. **Selects User** → Clicks "Assign Role" button
3. **Chooses Role** → Selects from available roles
4. **Confirms** → Submits role assignment
5. **User Notified** → User receives role assignment notification
6. **Role Active** → User gains permissions for assigned role

## Integration Points

### Adding Notifications to New Features

```python
from services.notification_service import NotificationService
from models import NotificationType, NotificationPriority

# Example: Notify user about proposal approval
await NotificationService.create_notification(
    db=db,
    recipient_id=user_id,
    type=NotificationType.PROPOSAL_APPROVED,
    title="Proposal Approved",
    message=f"Your proposal '{proposal_title}' has been approved!",
    priority=NotificationPriority.HIGH,
    action_url=f"/proposals/{proposal_id}",
    related_entity_type="proposal",
    related_entity_id=proposal_id
)
```

## Testing

### Manual Testing Steps

1. **Register New Admin Staff Account**
   - Go to `/register`
   - Select "Administrative Staff"
   - Complete registration form
   - Check email for verification link

2. **Verify Admin Receives Notification**
   - Log in as institution admin
   - Check notification bell for new registration alert
   - Verify unread count badge appears

3. **View Pending Users Dashboard**
   - Navigate to `/institution-admin/pending-users`
   - Verify new registration appears in table
   - Check email verification status

4. **Approve User**
   - Click approve button
   - Confirm in dialog
   - Verify success message
   - Check user receives approval notification

5. **Assign Role**
   - Click assign role button
   - Select role from dropdown
   - Confirm assignment
   - Verify user receives role notification

## Database Migration

To add notification tables to existing database:

```sql
-- Create notification type enum
CREATE TYPE notificationtype AS ENUM (
    'new_registration',
    'account_approved',
    'account_rejected',
    'role_assigned',
    'role_removed',
    'proposal_submitted',
    'proposal_approved',
    'proposal_rejected',
    'review_assigned',
    'comment_added',
    'system_announcement'
);

-- Create notification priority enum
CREATE TYPE notificationpriority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);

-- Create notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    recipient_id INTEGER NOT NULL REFERENCES users(id),
    type notificationtype NOT NULL,
    priority notificationpriority DEFAULT 'medium',
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR,
    related_entity_type VARCHAR,
    related_entity_id INTEGER,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
```

## Future Enhancements

1. **Real-time Notifications** - WebSocket support for instant notifications
2. **Email Digests** - Daily/weekly email summaries of notifications
3. **Notification Preferences** - User settings for notification types
4. **Push Notifications** - Browser push notifications
5. **Notification Templates** - Customizable notification templates
6. **Notification History** - Archive of all notifications
7. **Bulk Actions** - Delete multiple notifications at once
