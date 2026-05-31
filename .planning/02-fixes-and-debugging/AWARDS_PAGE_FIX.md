# Awards Page Database Integration Fix

## Issue
The researcher awards page (`/researcher/grants/awards`) was displaying all proposals from the database, transforming them into mock awards with random data, instead of showing only proposals that have been officially marked as awarded.

## Solution
Changed the page to fetch data from the proper awards endpoint that only returns proposals marked as "awarded" in the database.

## Changes Made

### Frontend: `frontend/app/researcher/grants/awards/page.js`

**Before:**
```javascript
// Fetch live proposals from database
const res = await axios.get(`${API_URL}/grants/proposals`, {
  headers: { Authorization: `Bearer ${token}` },
});

const proposals = res.data || [];

// Transform proposals into awards for demonstration
// In production, this would fetch from a real awards endpoint
const transformedAwards = proposals.map((proposal, index) => {
  // Generate mock award details...
  // ~80 lines of transformation code
});

setAwards(transformedAwards);
```

**After:**
```javascript
// Fetch awards from database (only proposals marked as awarded)
const res = await axios.get(`${API_URL}/grants/awards`, {
  headers: { Authorization: `Bearer ${token}` },
});

const awardsData = res.data || [];
setAwards(awardsData);
```

## Backend Endpoint Used

The page now uses the existing awards endpoint at `/api/grants/awards` which:

1. **Filters by awarded status**: Only returns proposals that have been officially awarded
2. **Returns complete award data**: Includes all award information from the `awards` table:
   - Award number
   - Funder information
   - Total amount and currency
   - Start and end dates
   - Award status (active, suspended, completed, terminated)
   - Conditions and terms
   - Budget breakdown with spending tracking
   - Linked research project (if created)

3. **Filters by user role**:
   - For Principal Investigators: Shows only their own awards
   - For Grant Officers/Institutional Leadership: Shows all institutional awards

## Database Schema

The system uses two key models:

### Proposal Model
- Has a `status` field which can be:
  - `DRAFT`
  - `INTERNAL_REVIEW`
  - `RETURNED`
  - `SUBMITTED`
  - `UNDER_REVIEW`
  - **`AWARDED`** ← Proposals with this status have been awarded
  - `DECLINED`

### Award Model
- One-to-one relationship with proposals
- Contains official award details:
  - `award_number`: Unique award identifier
  - `funder_name`: Name of funding organization
  - `total_amount`: Award amount
  - `currency`: Currency (default: KES)
  - `start_date` / `end_date`: Award period
  - `status`: Award status (active, suspended, completed, terminated)
  - `conditions`: Award terms and conditions
  - `budget_lines`: Detailed budget breakdown with spending tracking

## Benefits

1. **Data Integrity**: Shows real awards from the database, not mock transformed data
2. **Accurate Information**: All award details come from actual award records
3. **Proper Filtering**: Only shows proposals that have been officially awarded
4. **Budget Tracking**: Real budget data with actual spending amounts
5. **Project Linking**: Shows which awards have associated research projects
6. **Role-Based Access**: Researchers only see their own awards

## Testing

To test this change:

1. **Create an award**: 
   - Use the Grant Officer account to issue an award for a proposal
   - This creates an `Award` record and sets the proposal status to `AWARDED`

2. **View awards page**:
   - Log in as the PI (researcher)
   - Navigate to `/researcher/grants/awards`
   - You should only see proposals that have been awarded

3. **Verify data accuracy**:
   - Check that award numbers, amounts, dates match the issued award
   - Verify budget breakdown is accurate
   - Confirm project linking works if applicable

## Related Files

- **Frontend**: `frontend/app/researcher/grants/awards/page.js`
- **Backend Endpoint**: `backend/routes/grants/awards.py`
- **Database Models**: `backend/models.py` (Proposal, Award, BudgetLine classes)

## API Endpoint Details

### GET `/api/grants/awards`

**Authentication**: Required (Bearer token)

**Roles**: 
- PRINCIPAL_INVESTIGATOR (sees own awards)
- GRANT_OFFICER (sees all institutional awards)
- INSTITUTIONAL_LEAD (sees all institutional awards)

**Response**: Array of award objects with structure:
```json
[
  {
    "id": "string",
    "award_number": "AWD-2026-ABC123",
    "proposal_id": "string",
    "proposal_title": "string",
    "opportunity_title": "string",
    "opportunity_sponsor": "string",
    "funder_name": "string",
    "total_amount": 10000000,
    "currency": "KES",
    "status": "active",
    "start_date": "2026-01-01T00:00:00Z",
    "end_date": "2028-12-31T00:00:00Z",
    "conditions": "string",
    "issued_at": "2026-01-01T00:00:00Z",
    "project_id": "string or null",
    "budget_lines": [
      {
        "id": "string",
        "category": "Personnel",
        "description": "Research staff salaries",
        "amount": 4500000,
        "spent_to_date": 900000
      }
    ]
  }
]
```

## Notes

- Awards can only be created by users with GRANT_OFFICER role
- When an award is issued, the proposal status is automatically changed to AWARDED
- A research project is automatically created when an award is issued
- Budget lines can be added after award creation for detailed financial tracking
