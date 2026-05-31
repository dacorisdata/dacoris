# Interactive Collaboration Notifications Implementation

## Overview
Enhanced the collaboration invitation system with interactive Accept/Decline buttons in notifications, automatic proposal visibility for collaborators, and feedback notifications to inviters.

## Backend Changes

### 1. Updated Proposals List Endpoint
**File:** `backend/routes/grants/proposals.py`

- Modified `list_proposals()` to show:
  - Proposals where user is the Lead PI
  - Proposals where user is an **accepted** collaborator
  
```python
query = select(Proposal).where(
    or_(
        Proposal.lead_pi_id == current_user.id,
        Proposal.id.in_(
            select(ProposalCollaborator.proposal_id).where(
                ProposalCollaborator.user_id == current_user.id,
                ProposalCollaborator.status == "accepted"
            )
        )
    )
)
```

### 2. Enhanced Accept Endpoint
**Endpoint:** `POST /api/grants/proposals/{proposal_id}/collaborators/{collaborator_id}/accept`

**New Features:**
- Updates collaborator status to "accepted"
- Sends notification to the Lead PI about acceptance
- Returns proposal_id for navigation

### 3. New Decline Endpoint  
**Endpoint:** `POST /api/grants/proposals/{proposal_id}/collaborators/{collaborator_id}/decline`

**Features:**
- Updates collaborator status to "declined"
- Sends notification to the Lead PI about declination
- Does not show proposal in collaborator's list

### 4. Improved Notification Creation
**Changes:**
- Notifications now include collaborator_id in the action URL
- Format: `/researcher/grants/proposals/{proposal_id}/collab/{collaborator_id}`
- Frontend can parse this to extract IDs for API calls

## API Endpoints

### Accept Collaboration Invite
```http
POST /api/grants/proposals/{proposal_id}/collaborators/{collaborator_id}/accept
Authorization: Bearer {token}

Response:
{
  "message": "Invitation accepted",
  "status": "accepted",
  "proposal_id": "uuid"
}
```

### Decline Collaboration Invite
```http
POST /api/grants/proposals/{proposal_id}/collaborators/{collaborator_id}/decline
Authorization: Bearer {token}

Response:
{
  "message": "Invitation declined",
  "status": "declined"
}
```

## Frontend Implementation Needed

### 1. Notification Component Enhancement
**Location:** Create `frontend/components/NotificationItem.js`

**Features:**
- Detect "Proposal Collaboration Invite" notifications
- Parse action_url to extract proposal_id and collaborator_id
- Show Accept/Decline buttons
- Handle button clicks with API calls
- Show success/error messages

### 2. Notification Actions
```javascript
const handleAccept = async (proposalId, collabId) => {
  const res = await axios.post(
    `${API_URL}/grants/proposals/${proposalId}/collaborators/${collabId}/accept`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  // Mark notification as read
  // Refresh notifications
  // Show success message
  // Optionally navigate to proposal
};

const handleDecline = async (proposalId, collabId) => {
  const res = await axios.post(
    `${API_URL}/grants/proposals/${proposalId}/collaborators/${collabId}/decline`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  // Mark notification as read
  // Refresh notifications
  // Show success message
};
```

### 3. Extract IDs from action_url
```javascript
// Parse: /researcher/grants/proposals/{proposal_id}/collab/{collaborator_id}
const extractIds = (actionUrl) => {
  const match = actionUrl.match(/proposals\/([^/]+)\/collab\/([^/]+)/);
  if (match) {
    return {
      proposalId: match[1],
      collaboratorId: match[2]
    };
  }
  return null;
};
```

## User Flow

### Inviter Creates Proposal with Collaborators
1. Lead PI creates proposal
2. Adds collaborators via ORCID or Dacoris search
3. System creates pending collaboration records
4. Invitees receive:
   - In-app notification with Accept/Decline buttons
   - Email notification (for registered users)
   - Invitation email with signup link (for unregistered users)

### Invitee Receives Notification
1. User sees unread notification badge
2. Opens notifications panel
3. Sees "Proposal Collaboration Invite" with:
   - Inviter name
   - Proposal title
   - Role (Co-Investigator, Consultant, etc.)
   - **Accept button** (green)
   - **Decline button** (red/gray)

### Invitee Accepts Invitation
1. Clicks "Accept" button
2. API updates status to "accepted"
3. Notification sent to Lead PI: "{Name} accepted your invitation..."
4. Proposal immediately appears in invitee's proposals list
5. Success message shown
6. Notification marked as read

### Invitee Declines Invitation
1. Clicks "Decline" button
2. API updates status to "declined"
3. Notification sent to Lead PI: "{Name} declined your invitation..."
4. Proposal does NOT appear in invitee's list
5. Success message shown
6. Notification marked as read

### Lead PI Receives Feedback
1. Sees notification: "{Name} accepted/declined your invitation..."
2. Can click to view proposal
3. Can see updated collaborator status in team management

## Visibility Rules

### Proposals Visibility
A proposal appears in a user's list if:
- User is the Lead PI, OR
- User is a collaborator with `status = "accepted"`

### Collaborator Status Values
- `pending` - Invitation sent, awaiting response
- `accepted` - User accepted, proposal visible
- `declined` - User declined, proposal NOT visible

## Testing Checklist

### Backend
- [x] Proposals list shows only user's and accepted collaborations
- [x] Accept endpoint updates status and notifies inviter
- [x] Decline endpoint updates status and notifies inviter
- [x] Notifications include collaborator_id in action_url

### Frontend (To Implement)
- [ ] Notification component shows Accept/Decline buttons for collab invites
- [ ] Accept button calls API and shows success
- [ ] Decline button calls API and shows success
- [ ] Accepted proposals appear in proposals list
- [ ] Declined proposals do NOT appear in proposals list
- [ ] Inviter receives feedback notifications

## Database Schema

### proposal_collaborators
- `id` - Collaborator record ID
- `proposal_id` - Foreign key to proposal
- `user_id` - Foreign key to user
- `status` - pending | accepted | declined
- `role` - Co-Investigator, Consultant, etc.
- `invited_email` - For pending invites
- `invited_orcid` - For pending invites
- `invited_affiliation` - Affiliation info
- `invitation_token` - For unregistered users
- `responded_at` - Timestamp of accept/decline

## Notes

- Same pattern can be applied to manuscript collaborations
- Notifications use existing notification system
- Status transitions: pending → accepted/declined (one-way)
- Once declined, user must be re-invited to access proposal
- Lead PI can remove collaborators regardless of status

## Future Enhancements

1. **Revoke Invitation** - Lead PI can cancel pending invitations
2. **Leave Proposal** - Collaborators can leave after accepting
3. **Request to Join** - Researchers request to join proposals
4. **Collaboration Analytics** - Track acceptance rates, response times
5. **Reminder Emails** - Auto-remind users with pending invitations
