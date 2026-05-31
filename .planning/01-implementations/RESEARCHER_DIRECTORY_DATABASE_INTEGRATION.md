# Researcher Directory - Database Integration

## Overview
Updated the Researcher Directory page (`/admin-staff/research/directory`) to fetch real data from the database, showing only researchers from the current institution, replacing the mock data that was previously used.

## Changes Made

### Backend: New API Endpoint

**File Created**: `backend/routes/research/directory.py`

#### Endpoint: `GET /api/research/directory`

**Authentication**: Required - Must have one of these roles:
- GRANT_OFFICER
- INSTITUTIONAL_LEAD
- DATA_STEWARD
- PRINCIPAL_INVESTIGATOR

**Features**:
- Filters users by current institution
- Only shows users with `primary_account_type = RESEARCHER`
- Only includes users with status `ACTIVE` or `PENDING`
- Counts projects where user is the Principal Investigator
- Returns researcher profile data (name, email, department, job title, ORCID, expertise)
- Ordered by name

**Response Schema**:
```json
[
  {
    "id": "uuid",
    "name": "Dr. John Doe",
    "email": "john.doe@institution.edu",
    "job_title": "Senior Research Fellow",
    "department": "Epidemiology & Biostatistics",
    "orcid_id": "0000-0002-1234-5678",
    "expertise_keywords": "[\"Machine Learning\", \"Malaria\"]",
    "primary_account_type": "researcher",
    "status": "active",
    "projects_count": 4,
    "publications_count": 0
  }
]
```

**Query Logic**:
```python
# Filter by institution and researcher account type
select(User).where(
    User.primary_institution_id == current_user.primary_institution_id,
    User.status.in_([UserStatus.ACTIVE, UserStatus.PENDING]),
    User.primary_account_type == PrimaryAccountType.RESEARCHER
)

# Count projects per researcher
select(func.count(ResearchProject.id)).where(
    ResearchProject.pi_id == user.id
)
```

### Backend: Router Registration

**Files Modified**: `backend/main.py`

Added router import and registration:
```python
from routes.research.directory import router as research_directory_router
app.include_router(research_directory_router)
```

### Frontend: Database Integration

**File Modified**: `frontend/app/admin-staff/research/directory/page.js`

#### Key Changes:

**1. Removed Mock Data**
- Removed `MOCK_RESEARCHERS` constant
- Added API call to fetch real data

**2. Added Data Fetching**
```javascript
const loadResearchers = async () => {
  const res = await axios.get(`${API_URL}/research/directory`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  // Transform data to match UI expectations
  const transformedData = (res.data || []).map(r => ({
    id: r.id,
    name: r.name || r.email,
    title: r.job_title || 'Researcher',
    dept: r.department || 'Not specified',
    expertise: r.expertise_keywords ? JSON.parse(r.expertise_keywords) : [],
    orcid: r.orcid_id,
    projects: r.projects_count || 0,
    publications: r.publications_count || 0,
    status: r.status || 'active',
    email: r.email,
  }));
  
  setResearchers(transformedData);
};
```

**3. Added Features**
- **Refresh button**: Allows manual data reload
- **Error handling**: Shows error alerts with retry option
- **Empty state**: Appropriate messages when no researchers exist
- **Better status display**: Maps database statuses (active, pending, suspended)
- **ORCID links**: Click on ORCID ID to open ORCID profile in new tab
- **Safe data handling**: Null checks for all optional fields

**4. Updated UI Components**
- Status colors now map to database values: active (green), pending (orange), suspended (red)
- Expertise tags are limited to 5 with "+X more" indicator
- Avatar fallback to "R" if name is missing
- Safe array handling for expertise keywords

## Database Schema

### User Model Fields Used:
- `id` - User UUID
- `name` - Full name
- `email` - Email address (fallback for name display)
- `job_title` - Professional title (e.g., "Senior Research Fellow")
- `department` - Academic/Research department
- `orcid_id` - ORCID identifier
- `expertise_keywords` - JSON array of research areas
- `primary_account_type` - Must be "RESEARCHER"
- `status` - User status (active, pending, suspended, inactive)
- `primary_institution_id` - Institution affiliation

### ResearchProject Model:
- `pi_id` - Principal Investigator user ID (used for counting projects)

## Features

### 1. Institution Filtering
- Automatically filters to show only researchers from the logged-in user's institution
- Uses `primary_institution_id` for filtering
- Ensures data privacy and security

### 2. Role-Based Access
Only users with these roles can access the directory:
- Grant Officers
- Institutional Leadership
- Data Stewards
- Principal Investigators (can view colleagues)

### 3. Statistics Dashboard
- **Total Researchers**: Count of all researchers in institution
- **Active**: Researchers with active status
- **Pending**: Researchers awaiting approval
- **Suspended**: Researchers whose access is suspended
- **Total Publications**: Sum of all publications (placeholder for now)

### 4. Search Functionality
Search across:
- Researcher name
- Email address
- Department
- Expertise keywords

### 5. Researcher Cards Display
Each card shows:
- Name and professional title
- Department
- Status badge (active/pending/suspended)
- ORCID badge (if available)
- Expertise tags (up to 5, with "+X more")
- Project count
- Publication count
- Clickable ORCID link

## Data Flow

```
1. User accesses /admin-staff/research/directory
2. Frontend calls GET /api/research/directory
3. Backend authenticates user and checks role
4. Backend queries User table:
   - Filters by institution_id
   - Filters by primary_account_type = RESEARCHER
   - Filters by status IN (active, pending)
5. For each user, count projects where user is PI
6. Return enriched researcher data
7. Frontend transforms and displays data
```

## Future Enhancements

### 1. Publications Count
Currently returns 0. To implement:
- Add ResearchOutput or Publication model
- Count publications where user is author
- Update query in directory.py

### 2. Expertise Keywords Improvement
- Currently stored as JSON string in text field
- Consider creating separate ExpertiseArea model
- Enable tag-based filtering and analytics

### 3. Enhanced Search
- Full-text search across all fields
- Filters by status, department, expertise
- Sort options (name, project count, etc.)

### 4. Researcher Profiles
- Click researcher card to view detailed profile
- Show all projects and publications
- Display collaborations and co-authors

### 5. Export Functionality
- Export directory to CSV/Excel
- Include all researcher data and statistics
- Useful for institutional reporting

## Testing

### Backend Testing
```bash
# Test the endpoint
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/research/directory
```

### Expected Response:
- 200 OK with array of researchers
- Empty array if no researchers in institution
- 401 if not authenticated
- 403 if user doesn't have required role

### Frontend Testing
1. Navigate to `/admin-staff/research/directory`
2. Verify researchers load from database
3. Test search functionality
4. Click refresh button
5. Test ORCID link opens correctly
6. Verify status badges show correct colors
7. Check empty state if no researchers

## Notes

- Publications count is currently set to 0 (waiting for publications model)
- Expertise keywords are stored as JSON strings and parsed on the frontend
- Only users with `primary_account_type = RESEARCHER` appear in the directory
- Users in other account types (Admin Staff, Grant Manager, etc.) are excluded
- The directory is read-only; no editing functionality
- Project count reflects only projects where the user is listed as PI

## Related Files

- **Backend Route**: `backend/routes/research/directory.py`
- **Backend Main**: `backend/main.py` (router registration)
- **Backend Models**: `backend/models.py` (User, ResearchProject)
- **Frontend Page**: `frontend/app/admin-staff/research/directory/page.js`
- **Auth**: `backend/auth.py` (role-based access control)

## Migration Notes

If deploying to production:
1. Backend will automatically pick up the new router
2. No database migrations required (uses existing User table)
3. Existing users with `primary_account_type = RESEARCHER` will appear
4. Consider populating `job_title`, `department`, and `expertise_keywords` for existing users
