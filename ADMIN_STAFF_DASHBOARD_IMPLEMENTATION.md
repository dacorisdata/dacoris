# Admin Staff Dashboard Implementation

## Overview

This document details the implementation of the comprehensive institutional metrics dashboard for the admin staff overview page at `https://rims.dacoris.com/admin-staff/overview`.

## Implementation Date
May 22, 2026

## Objective

Provide admin staff with a bird's-eye view of all institutional outputs through stat cards and tables displaying key metrics including:
- Total Proposals and their statuses
- Active Projects
- Submissions for review (Proposals, Projects, Ethics Applications, Data Management Plans)
- Proposal success rates (Awarded Proposals)

## Backend Implementation

### New API Endpoint

**File**: `backend/routes/admin_staff.py`

#### Main Endpoint: `/admin-staff/analytics/overview`

**Method**: GET

**Authentication**: Requires authenticated user with institution association

**Response Structure**:

```json
{
  "proposals": {
    "total": number,
    "draft": number,
    "in_review": number,
    "awarded": number,
    "declined": number,
    "success_rate": number (percentage),
    "by_status": {
      "draft": number,
      "internal_review": number,
      "submitted": number,
      "under_review": number,
      "awarded": number,
      "declined": number
    }
  },
  "projects": {
    "total": number,
    "active": number,
    "proposed": number,
    "completed": number
  },
  "ethics": {
    "total": number,
    "pending_review": number,
    "approved": number
  },
  "dmps": {
    "total": number,
    "pending_review": number
  },
  "awards": {
    "total": number,
    "active": number,
    "total_amount": number
  },
  "submissions_for_review": {
    "total": number,
    "proposals": number,
    "projects": number,
    "ethics": number,
    "dmps": number
  },
  "recent_activity": {
    "proposals": number,
    "projects": number,
    "ethics": number
  }
}
```

#### Additional Endpoints

1. **`/admin-staff/analytics/proposals`**
   - Returns detailed proposal analytics with recent proposal list
   - Includes top 50 recent proposals ordered by creation date

2. **`/admin-staff/analytics/projects`**
   - Returns detailed project analytics with recent project list
   - Includes top 50 recent projects ordered by creation date

### Key Metrics Calculated

#### 1. Proposal Metrics
- **Total Proposals**: Count of all proposals for the institution
- **Proposals by Status**: Breakdown by draft, internal_review, submitted, under_review, awarded, declined
- **Proposals in Review**: Sum of internal_review, submitted, and under_review
- **Success Rate**: (Awarded / Total Submitted) × 100

#### 2. Project Metrics
- **Total Projects**: Count of all research projects
- **Active Projects**: Projects with status = "active"
- **Proposed Projects**: Projects with status = "proposed" (pending approval)
- **Completed Projects**: Projects with status = "completed"

#### 3. Ethics Applications
- **Total Ethics Applications**: Count of all ethics applications
- **Pending Review**: Applications with status in [submitted, under_review]
- **Approved**: Applications with status in [approved, approved_with_modifications]

#### 4. Data Management Plans (DMPs)
- **Total DMPs**: Count of ethics documents with type = 'data_management_plan'
- **Pending Review**: DMPs associated with pending ethics applications

#### 5. Awards
- **Total Awards**: Count of all awards linked to institutional proposals
- **Active Awards**: Awards with status = "active"
- **Total Awarded Amount**: Sum of all awarded amounts

#### 6. Submissions for Review
- Aggregated count of:
  - Proposals in review
  - Proposed projects
  - Pending ethics applications
  - Pending DMPs

#### 7. Recent Activity (Last 30 Days)
- New proposals created in last 30 days
- New projects created in last 30 days
- New ethics applications created in last 30 days

### Database Queries

The implementation uses SQLAlchemy async queries with efficient aggregation:
- Utilizes `func.count()` for counting records
- Applies appropriate `WHERE` clauses for institution filtering
- Groups by status for breakdown metrics
- Uses subqueries for related entity filtering (e.g., DMPs via ethics applications)

## Frontend Implementation

### Updated File

**File**: `frontend/app/admin-staff/overview/page.js`

### New UI Components

#### 1. Institutional Overview Section

Added a new section visible to all admin staff users displaying:

**Key Metrics Cards (Grid Layout)**:
- **Total Proposals Card**
  - Large number display
  - Subtitle showing awarded count
  - Click navigates to proposals page
  
- **Active Projects Card**
  - Large number display
  - Subtitle showing "of X total"
  - Click navigates to projects page
  
- **Pending Reviews Card**
  - Aggregated count from all modules
  - Shows total across proposals, projects, ethics, DMPs
  
- **Success Rate Card**
  - Percentage display
  - Subtitle "proposals awarded"

#### 2. Detailed Breakdown Tables

**Four comprehensive tables**:

1. **Proposals by Status Table**
   - Columns: Status, Count, Percentage
   - Rows: Draft, In Review, Awarded, Declined
   - Color-coded status indicators

2. **Submissions for Review Table**
   - Columns: Type, Count, Percentage
   - Rows: Proposals, Projects, Ethics Applications, DMPs
   - Icon indicators for each type

3. **Projects Overview Table**
   - Columns: Status, Count, Percentage
   - Rows: Active, Proposed, Completed
   - Color-coded status indicators

4. **Recent Activity Table**
   - Shows activity from last 30 days
   - Columns: Type, New Items
   - Rows: Proposals, Projects, Ethics Applications

### UI Features

- **Responsive Grid Layout**: Uses Material-UI Grid system for responsive design
- **Interactive Cards**: Hover effects and click navigation
- **Color Coding**: Consistent color scheme across different metrics
- **Icon Integration**: Material-UI icons for visual context
- **Loading States**: Shows loading indicator while fetching metrics
- **Error Handling**: Displays error messages if metrics fail to load

### State Management

New state variables:
```javascript
const [institutionalMetrics, setInstitutionalMetrics] = useState(null);
const [loadingMetrics, setLoadingMetrics] = useState(false);
```

New function:
```javascript
const loadInstitutionalMetrics = async () => {
  setLoadingMetrics(true);
  try {
    const response = await api.get('/admin-staff/analytics/overview');
    setInstitutionalMetrics(response.data);
  } catch (e) {
    console.error('Failed to load institutional metrics:', e);
    setError('Failed to load institutional metrics');
  } finally {
    setLoadingMetrics(false);
  }
};
```

## Data Flow

1. **User loads admin staff overview page**
   → Frontend calls `loadInstitutionalMetrics()`
   
2. **Frontend makes API request**
   → `GET /admin-staff/analytics/overview`
   
3. **Backend authenticates user**
   → Verifies user has institution association
   
4. **Backend queries database**
   → Aggregates metrics across multiple tables
   → Filters by user's institution
   
5. **Backend returns metrics**
   → JSON response with all computed metrics
   
6. **Frontend displays data**
   → Renders stat cards and tables
   → Applies formatting and styling

## Security Considerations

1. **Authentication Required**: All endpoints require authenticated user
2. **Institution Filtering**: All queries filter by user's primary institution
3. **No Cross-Institution Data**: Users can only see their own institution's metrics
4. **Error Handling**: Proper error messages without exposing sensitive information

## Performance Optimizations

1. **Efficient Queries**: Uses database-level aggregation (COUNT, SUM)
2. **Single API Call**: All metrics fetched in one request
3. **Caching Potential**: Response can be cached with appropriate TTL
4. **Pagination**: Detail endpoints limit to 50 records
5. **Async Operations**: Backend uses async database queries

## Testing Checklist

✅ Backend endpoint created and registered
✅ Frontend components updated
✅ Docker image rebuilt
✅ Backend container restarted successfully
✅ Uvicorn server running

**Pending User Testing**:
- [ ] Verify stat cards display correctly
- [ ] Confirm tables show accurate data
- [ ] Test click navigation from cards
- [ ] Verify responsive layout on different screen sizes
- [ ] Test with different admin staff roles
- [ ] Confirm proper error handling

## Files Changed

### Backend
1. `backend/routes/admin_staff.py` (NEW) - Analytics endpoints
2. `backend/main.py` - Registered admin_staff router

### Frontend
1. `frontend/app/admin-staff/overview/page.js` - Added institutional metrics section

## Usage

### Accessing the Dashboard

1. Log in as any admin staff user
2. Navigate to: `https://rims.dacoris.com/admin-staff/overview`
3. View institutional metrics in the "Institutional Overview" section
4. Click on stat cards to navigate to detailed pages
5. Review breakdown tables for detailed insights

### Permissions

Available to all admin staff account types:
- ADMIN_STAFF
- GRANT_MANAGER
- FINANCE_OFFICER
- ETHICS_COMMITTEE_MEMBER
- DATA_STEWARD
- DATA_ENGINEER
- INSTITUTIONAL_LEADERSHIP
- EXTERNAL_REVIEWER
- MOU_ADMIN
- LEGAL_OFFICER
- PARTNERSHIP_COORDINATOR

## Future Enhancements

1. **Date Range Filtering**: Allow users to filter metrics by custom date ranges
2. **Export Functionality**: Enable CSV/PDF export of metrics
3. **Drill-Down Views**: Click on table rows to see detailed listings
4. **Comparative Analytics**: Show trends over time with charts
5. **Budget Tracking**: Integrate financial metrics with proposals/awards
6. **Real-time Updates**: WebSocket integration for live metric updates
7. **Customizable Dashboards**: Allow users to configure which metrics to display
8. **Additional Metrics**: 
   - Researcher productivity
   - Grant submission timelines
   - Ethics review turnaround times
   - Project completion rates

## Notes

- All date/time values use ISO 8601 format
- Monetary amounts are in the institution's base currency
- Percentages are rounded to 2 decimal places
- The success rate excludes draft proposals from the calculation
- Recent activity window is fixed at 30 days

## Support

For issues or questions regarding this implementation, refer to:
- Backend logs: `docker logs dacoris-backend`
- Frontend console: Browser developer tools
- API documentation: Available at backend `/docs` endpoint
