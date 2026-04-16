# DACORIS Admin Dashboard Guide

## Overview

Professional admin dashboards with sidebar navigation for managing the DACORIS platform.

## Features Implemented

### Global Admin Dashboard (`/global-admin`)

**Sidebar Navigation:**
- Dashboard - Platform overview with key metrics
- Institutions - Manage all institutions
- All Users - View users across all tenants
- Analytics - Platform-wide analytics

**Key Features:**

1. **Dashboard View**
   - Total institutions count
   - Total users count
   - Active users count
   - Pending users count
   - Quick action buttons

2. **Institutions Management**
   - View all institutions in a table
   - Create new institutions with dialog
   - Add institution admins
   - Toggle institution active/inactive status
   - See institution details (name, domain, status, created date)

3. **Create Institution Dialog**
   - Institution name
   - Primary domain
   - Verified domains (comma-separated)
   - Auto-approval for verified domains

4. **Create Institution Admin Dialog**
   - Email address
   - Full name
   - Password
   - Automatically linked to selected institution

### Institution Admin Dashboard (`/institution-admin`)

**Sidebar Navigation:**
- Dashboard - Institution overview
- Pending Users - Users awaiting approval (with badge count)
- All Users - Manage institution users
- Analytics - Institution-specific analytics
- Settings - Institution configuration

**Key Features:**

1. **Dashboard View**
   - Total users in institution
   - Active users count
   - Pending users count
   - Total roles assigned
   - Warning alert for pending users

2. **Pending Users Management**
   - View all pending users
   - Approve users (one-click)
   - Reject users (one-click)
   - See user details (name, email, ORCID ID, registration date)

3. **All Users Management**
   - View all institution users
   - Filter by status
   - Manage user roles (for ORCID users)
   - See account types and statuses

4. **Role Assignment**
   - Multi-select role assignment dialog
   - 7 research roles available:
     - Principal Investigator
     - Grant Officer
     - Ethics Reviewer
     - Data Steward
     - Data Engineer
     - Institutional Lead
     - System Admin
   - Visual role chips display

5. **Settings Management**
   - Update verified domains
   - Configure ORCID credentials
   - Update ORCID redirect URI

## User Flow

### Global Admin Workflow

1. **Login**
   ```
   Navigate to: http://localhost:3000/login
   Enter: Global admin email/password
   Auto-redirect to: /global-admin
   ```

2. **Create Institution**
   ```
   Click: "Create Institution" button
   Fill form:
     - Name: "University of Example"
     - Domain: "example.edu"
     - Verified Domains: "example.edu, example.org"
   Click: "Create"
   ```

3. **Create Institution Admin**
   ```
   In Institutions table:
     - Find institution row
     - Click: "Add Admin" button
   Fill form:
     - Email: "admin@example.edu"
     - Name: "Admin Name"
     - Password: "secure_password"
   Click: "Create Admin"
   ```

4. **Manage Institution Status**
   ```
   In Institutions table:
     - Click: "Deactivate" or "Activate" button
   ```

### Institution Admin Workflow

1. **Login**
   ```
   Navigate to: http://localhost:3000/login
   Enter: Institution admin email/password
   Auto-redirect to: /institution-admin
   ```

2. **Approve Pending Users**
   ```
   Navigate to: "Pending Users" in sidebar
   For each user:
     - Review user details
     - Click: "Approve" (green button)
     - OR Click: "Reject" (red button)
   ```

3. **Assign Roles to Users**
   ```
   Navigate to: "All Users" in sidebar
   Find ORCID user:
     - Click: "Manage Roles" button
   In dialog:
     - Select multiple roles from dropdown
     - Click: "Assign Roles"
   ```

4. **Update Institution Settings**
   ```
   Navigate to: "Settings" in sidebar
   Update fields:
     - Verified Domains
     - ORCID Client ID
     - ORCID Client Secret
     - ORCID Redirect URI
   Click: "Save Settings"
   ```

## UI Components

### Sidebar Navigation
- Fixed width: 240px
- Responsive: Drawer on mobile, permanent on desktop
- Active state highlighting
- Icon + text labels
- Badge for pending users count

### Dashboard Cards
- Material-UI Card components
- Color-coded metrics (success, warning)
- Responsive grid layout
- Clear typography hierarchy

### Data Tables
- Sortable columns
- Action buttons per row
- Status chips (color-coded)
- Responsive scrolling

### Dialogs/Modals
- Form validation
- Clear cancel/submit actions
- Helpful placeholder text
- Error handling

### Alerts
- Success messages (green)
- Error messages (red)
- Warning messages (yellow)
- Auto-dismissible

## Access Control

### Global Admin
- Can access: `/global-admin`
- Cannot access: `/institution-admin` (unless also institution admin)
- Auto-redirected from `/dashboard` to `/global-admin`

### Institution Admin
- Can access: `/institution-admin`
- Cannot access: `/global-admin`
- Auto-redirected from `/dashboard` to `/institution-admin`

### ORCID Users
- Can access: `/dashboard`
- Cannot access: `/global-admin` or `/institution-admin`
- See researcher-focused dashboard

## API Integration

All dashboards use the API client from `lib/api.js`:

**Global Admin APIs:**
- `globalAdminAPI.listInstitutions()`
- `globalAdminAPI.createInstitution(data)`
- `globalAdminAPI.createInstitutionAdmin(institutionId, data)`
- `globalAdminAPI.toggleInstitutionStatus(id)`
- `globalAdminAPI.getAnalytics()`

**Institution Admin APIs:**
- `institutionAdminAPI.listUsers()`
- `institutionAdminAPI.listPendingUsers()`
- `institutionAdminAPI.approveUser(userId, status)`
- `institutionAdminAPI.assignRoles(userId, roles)`
- `institutionAdminAPI.getUserRoles(userId)`
- `institutionAdminAPI.getSettings()`
- `institutionAdminAPI.updateSettings(data)`
- `institutionAdminAPI.getAnalytics()`

## Styling

- **Framework**: Material-UI (MUI)
- **Theme**: Default MUI theme
- **Colors**:
  - Primary: Blue
  - Success: Green
  - Warning: Orange
  - Error: Red
- **Typography**: Roboto font family
- **Spacing**: Consistent 8px grid system
- **Elevation**: Subtle shadows for depth

## Responsive Design

- **Desktop (>960px)**: Permanent sidebar, full layout
- **Tablet (600-960px)**: Permanent sidebar, adjusted spacing
- **Mobile (<600px)**: Temporary drawer, hamburger menu

## Error Handling

- Network errors: Display error alert
- Validation errors: Show field-specific errors
- Success feedback: Green alert with auto-dismiss
- Loading states: Circular progress indicators

## Next Steps

1. **Install frontend dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Access dashboards**:
   - Login: http://localhost:3000/login
   - Global Admin: http://localhost:3000/global-admin
   - Institution Admin: http://localhost:3000/institution-admin

## Testing Checklist

- [ ] Global admin can login and see dashboard
- [ ] Global admin can create institutions
- [ ] Global admin can create institution admins
- [ ] Global admin can toggle institution status
- [ ] Institution admin can login and see dashboard
- [ ] Institution admin can see pending users
- [ ] Institution admin can approve/reject users
- [ ] Institution admin can assign roles
- [ ] Institution admin can update settings
- [ ] Sidebar navigation works on mobile
- [ ] All dialogs open and close properly
- [ ] Success/error messages display correctly
- [ ] Auto-redirect works for admin users
