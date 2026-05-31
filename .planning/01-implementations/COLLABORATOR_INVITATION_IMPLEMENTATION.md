# Collaborator Invitation System Implementation

## Overview
Enhanced the proposal collaborator invitation system to support both ORCID and institutional (Dacoris) searches, with improved fields for affiliation and email, plus automatic invitation linking after user signup.

## Features Implemented

### 1. Database Changes
- **Added to `proposal_collaborators` table:**
  - `invited_affiliation` (VARCHAR(500)) - Store affiliation for invited collaborators
  - `invitation_token` (VARCHAR(100), UNIQUE) - Unique token for invitation links
  
- **Added notification type:**
  - `PROPOSAL_INVITATION` - For proposal collaboration invitations

### 2. Backend API Endpoints

#### `/api/grants/proposals/collaborators/search`
- **Method:** GET
- **Purpose:** Search for institutional researchers (Dacoris)
- **Query Parameters:**
  - `query` (min 2 chars) - Search by name, email, or department
- **Returns:** List of users from the same institution
- **Response:**
  ```json
  [{
    "user_id": "uuid",
    "name": "John Doe",
    "email": "john@institution.edu",
    "department": "Computer Science",
    "job_title": "Professor",
    "orcid": "0000-0000-0000-0000",
    "affiliation": "Computer Science",
    "source": "dacoris"
  }]
  ```

#### `/api/grants/proposals/invitations/link`
- **Method:** POST
- **Purpose:** Link invitation to user account after signup
- **Query Parameters:**
  - `invitation_token` - Token from invitation email
- **Returns:** Linked invitation details
- **Behavior:**
  - Automatically called when user registers with invitation token
  - Links pending invitation to user account
  - Creates in-app notification for the user
  - Keeps status as "pending" until user explicitly accepts

#### `/api/grants/proposals/{proposal_id}/collaborators/{collaborator_id}/accept`
- **Method:** POST
- **Purpose:** Accept a collaboration invitation
- **Returns:** Acceptance confirmation
- **Behavior:**
  - Updates collaborator status to "accepted"
  - Sets responded_at timestamp

### 3. Enhanced Email Service

#### `send_collaboration_invite_email()`
- **Purpose:** Send invitation email to registered users
- **Parameters:**
  - `email` - Recipient email
  - `inviter_name` - Name of inviter
  - `proposal_title` - Title of proposal
  - `role` - Collaborator role
  - `proposal_url` - Direct link to proposal
- **Email Content:**
  - Professional HTML template
  - Direct link to proposal
  - Role information
  - Login prompt

#### `send_new_user_invitation_email()`
- **Purpose:** Send invitation email to unregistered users
- **Parameters:**
  - `email` - Recipient email
  - `inviter_name` - Name of inviter
  - `proposal_title` - Title of proposal
  - `role` - Collaborator role
  - `invitation_token` - Unique token for linking after signup
- **Email Content:**
  - Professional HTML template
  - Registration link with embedded token
  - Automatic linking after signup
  - Role information

### 4. Updated Collaboration Invite Model

```python
class CollaboratorInvite(BaseModel):
    orcid: Optional[str] = None
    user_id: Optional[str] = None  # For Dacoris users
    name: str
    email: Optional[str] = None
    affiliation: Optional[str] = None
    role: str = "Co-Investigator"
```

### 5. Frontend UI Enhancements

#### Search Mode Toggle
- Two-tab interface:
  - **Search from ORCID** - Global ORCID registry search
  - **Search from Dacoris** - Institutional researcher search
- Seamless switching between modes
- Separate search UIs for each mode

#### ORCID Search Interface
- Given Name and Family Name fields
- Real-time search results
- Display: Name, Affiliation/Email, ORCID ID
- Color: Teal avatar (#16a699)

#### Dacoris Search Interface
- Single search field (name, email, or department)
- Real-time search results
- Display: Name, Department/Email
- Color: Purple avatar (#8b5cf6)

#### Enhanced Collaborator Cards
Each invited collaborator displays:
- Avatar with initial
- Name and source label (ORCID or Institutional Researcher)
- **Email field** (editable text input)
- **Affiliation field** (editable text input)
- **Role dropdown** (Co-Investigator, Consultant, Advisor, Collaborator)
- Remove button

#### Review Step
Shows complete collaborator details:
- Name and role
- Email (if provided)
- Affiliation (if provided)
- Source (ORCID or Dacoris)

## User Flow

### For Registered Users
1. **Invitation Creation:**
   - Lead PI searches for collaborator (ORCID or Dacoris)
   - Selects user and fills in affiliation/email
   - Creates proposal with invited collaborators

2. **Invitation Delivery:**
   - User receives in-app notification
   - User receives email notification
   - Both link directly to proposal

3. **Invitation Acceptance:**
   - User logs in and views notification
   - Clicks through to proposal
   - Status updates to "pending" (awaiting explicit accept)
   - User can accept invitation in proposal view

### For Unregistered Users
1. **Invitation Creation:**
   - Lead PI enters collaborator details (name, email, affiliation)
   - System generates unique invitation token
   - Creates pending collaborator record

2. **Invitation Delivery:**
   - User receives invitation email
   - Email contains registration link with token
   - Token embedded in URL: `/register?invitation={token}`

3. **User Registration:**
   - User clicks invitation link
   - Completes registration process
   - System automatically calls `/invitations/link` endpoint
   - Invitation linked to new user account
   - In-app notification created

4. **Post-Registration:**
   - User sees notification about proposal invitation
   - User navigates to proposal
   - User can accept or decline invitation

## Migration Script

Location: `backend/migrations/add_collaborator_affiliation_and_invitation_token.sql`

Run with:
```bash
psql -U [username] -d [database] -f backend/migrations/add_collaborator_affiliation_and_invitation_token.sql
```

## Configuration

### Environment Variables
The system uses existing SMTP configuration:
- `SMTP_HOST` - SMTP server host (default: smtp.gmail.com)
- `SMTP_PORT` - SMTP server port (default: 587)
- `SMTP_USER` - SMTP username
- `SMTP_PASSWORD` - SMTP password
- `FROM_EMAIL` - Sender email address
- `FRONTEND_URL` - Frontend URL for links (default: http://localhost:3000)

## Testing Checklist

### Backend Tests
- [ ] Search institutional researchers endpoint returns correct results
- [ ] ORCID search continues to work with affiliation field
- [ ] Invitation token generation is unique
- [ ] Email sending for registered users
- [ ] Email sending for unregistered users
- [ ] Invitation linking after signup
- [ ] Invitation acceptance flow

### Frontend Tests
- [ ] Search mode toggle switches correctly
- [ ] ORCID search displays results with affiliation
- [ ] Dacoris search displays institutional users
- [ ] Affiliation and email fields are editable
- [ ] Collaborator cards display all information
- [ ] Review step shows complete details
- [ ] Modal closes and resets all state

### Integration Tests
- [ ] End-to-end: Invite registered user → receives notification and email → accepts
- [ ] End-to-end: Invite unregistered user → receives email → registers → invitation linked → accepts
- [ ] Invitation token uniqueness across multiple proposals
- [ ] Email delivery success/failure handling

## Future Enhancements

1. **Invitation Expiry**
   - Add expiry date to invitations
   - Auto-decline expired invitations

2. **Batch Invitations**
   - Upload CSV of collaborators
   - Bulk invite functionality

3. **Invitation History**
   - Track invitation status changes
   - Show invitation timeline

4. **Reminders**
   - Send reminder emails for pending invitations
   - Configurable reminder intervals

5. **Custom Roles**
   - Allow custom role definitions
   - Role-based permissions in proposals

## Notes

- All email templates use professional HTML formatting
- SMTP errors are logged but don't block proposal creation
- Invitation tokens are URL-safe (using `secrets.token_urlsafe()`)
- Database migration is idempotent (safe to run multiple times)
- Frontend state is properly reset when modal closes
- Search results are limited to 20 users for performance
