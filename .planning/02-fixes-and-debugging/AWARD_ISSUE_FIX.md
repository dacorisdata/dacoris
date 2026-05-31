# Award Issue Page - Error Fixes

## Issues Identified

### 1. Browser Warning: Proposal ID Field Type
**Error Message:**
```
The specified value "4e6830fd-7740-4c2d-9a53-ac524bb48bc3" cannot be parsed, or is out of range.
```

**Cause:**
- The Proposal ID field was set as `type="number"` in the TextField
- Proposal IDs are UUIDs (strings), not numbers
- The browser couldn't parse the UUID as a number

**Fix:**
- Removed `type="number"` from the Proposal ID TextField
- Changed it to a regular text field (default type)
- Added `size="small"` for better UI consistency

### 2. Currency Default Mismatch
**Issue:**
- Frontend defaulted to `"USD"`
- Backend expects `"KES"` as default
- This could cause confusion in currency selection

**Fix:**
- Changed default currency from `'USD'` to `'KES'` to match backend

### 3. Funder Name Not Auto-populated
**Issue:**
- Funder name field was not being populated from the proposal's opportunity sponsor
- Code existed to populate it, but no error handling if data was missing
- No visual feedback if auto-population failed

**Fix:**
- Added better error handling in the proposal data fetch
- Added console logging for debugging
- Added warning message if funder name cannot be auto-populated
- Added helper text "Auto-populated from proposal opportunity"

### 4. Poor Error Handling for 422 Validation Errors
**Issue:**
- 422 Unprocessable Entity errors were not well-explained to users
- Validation errors from Pydantic were not properly formatted
- No client-side validation before sending request

**Fix:**
- Added client-side validation:
  - Checks if proposal_id exists
  - Validates total_amount is a positive number
  - Validates funder_name is not empty
- Improved error message formatting for validation errors
- Added specific error messages for 404 and 400 status codes
- Added console logging for debugging

### 5. Missing Error Details in API Calls
**Issue:**
- No detailed logging of request/response data
- Hard to debug what was being sent to the API
- No visibility into what the API was returning

**Fix:**
- Added `console.log` statements for:
  - Request payload before sending
  - Response data after success
  - Detailed error information (status, response data)
- Better error message construction based on error type

## Code Changes

### File: `frontend/app/admin-staff/grants/awards/issue/page.js`

#### Change 1: Fixed Proposal ID Field Type
```javascript
// BEFORE
<TextField
  label="Proposal ID"
  type="number"  // Wrong! UUIDs are strings
  value={proposalId || ''}
  disabled
  helperText="The proposal being awarded"
  sx={{ flex: '1 1 200px' }}
/>

// AFTER
<TextField
  label="Proposal ID"
  value={proposalId || ''}
  disabled
  helperText="The proposal being awarded"
  sx={{ flex: '1 1 300px' }}
  size="small"
/>
```

#### Change 2: Fixed Currency Default
```javascript
// BEFORE
const [currency, setCurrency] = useState('USD');

// AFTER
const [currency, setCurrency] = useState('KES');
```

#### Change 3: Enhanced Proposal Data Fetching
```javascript
// Added better error handling and logging
if (!proposalId) {
  setError('No proposal ID provided. Please select a proposal first.');
  return;
}

console.log('Fetching proposal data for ID:', proposalId);

// Added warning if funder name not found
if (res.data?.opportunity?.sponsor) {
  setFunderName(res.data.opportunity.sponsor);
} else {
  console.warn('No sponsor found in opportunity data');
  setError('Warning: Could not auto-populate funder name from proposal. Please enter it manually.');
}
```

#### Change 4: Enhanced Award Issuance with Validation
```javascript
// Added client-side validation
if (!proposalId) {
  setError('Proposal ID is required');
  return;
}

const amount = parseFloat(totalAmount);
if (isNaN(amount) || amount <= 0) {
  setError('Total amount must be a positive number');
  return;
}

if (!funderName || funderName.trim() === '') {
  setError('Funder name is required');
  return;
}

// Added logging
console.log('Issuing award with payload:', payload);

// Better error handling
if (e.response?.status === 404) {
  errorMessage = 'Proposal not found or you do not have permission to award it.';
} else if (e.response?.status === 400) {
  errorMessage = e.response.data?.detail || 'The proposal cannot be awarded in its current status.';
}
```

## Understanding the Errors

### 422 Unprocessable Entity
This error occurs when:
1. **Required fields are missing**: `total_amount` or `proposal_id` not provided
2. **Invalid data types**: Sending string instead of number for `total_amount`
3. **Invalid format**: Dates not in ISO format
4. **Validation rules violated**: Amount is zero or negative

### 404 Not Found
This error occurs when:
1. **Proposal doesn't exist**: The proposal_id is invalid or proposal was deleted
2. **Permission denied**: User doesn't have access to this proposal (wrong institution)

### 400 Bad Request
This error occurs when:
1. **Proposal status invalid**: Proposal must be in "submitted", "under_review", or "awarded" status
2. **Business logic violation**: Proposal already has an award, etc.

### 500 Internal Server Error
This error indicates a server-side issue:
1. **Database connection problems**
2. **Unexpected exceptions in backend code**
3. **Missing relationships** (e.g., proposal has no opportunity)

## Backend Requirements

According to `backend/routes/grants/awards.py`:

### AwardCreate Schema
```python
class AwardCreate(BaseModel):
    proposal_id: str           # Required - UUID of the proposal
    funder_name: Optional[str] = None  # Optional - name of funding organization
    total_amount: float        # Required - must be positive number
    currency: str = "KES"      # Optional - defaults to KES
    start_date: Optional[datetime] = None  # Optional - ISO format
    end_date: Optional[datetime] = None    # Optional - ISO format
    conditions: Optional[str] = None       # Optional - award conditions
```

### Proposal Status Requirements
The proposal must be in one of these statuses:
- `SUBMITTED`
- `UNDER_REVIEW`
- `AWARDED`

If the proposal is in `DRAFT`, `INTERNAL_REVIEW`, `RETURNED`, or `DECLINED` status, the award cannot be issued.

## Testing Checklist

To verify the fixes work:

1. ✅ **Check Proposal ID Display**
   - Navigate to issue award page
   - Verify no browser console warning about parsing UUID
   - Proposal ID should display correctly

2. ✅ **Verify Funder Auto-population**
   - Select a proposal that has an opportunity with a sponsor
   - Funder name field should auto-populate
   - If no sponsor, warning message should appear

3. ✅ **Test Currency Default**
   - Currency should default to "KES"
   - Should be able to change to USD, EUR, GBP

4. ✅ **Test Client-side Validation**
   - Try submitting without entering total amount (should show error)
   - Try entering zero or negative amount (should show error)
   - Try clearing funder name (should show error)

5. ✅ **Test Error Messages**
   - Try awarding a proposal that doesn't exist (should show 404 error)
   - Try awarding a proposal in draft status (should show 400 error)
   - Verify detailed error messages in console

6. ✅ **Test Successful Award Creation**
   - Enter valid data
   - Submit award
   - Should see success message
   - Should redirect to awards list

## Additional Recommendations

### 1. Add Proposal Status Display
Consider showing the current proposal status on the award issue page:
```javascript
<Alert severity="info" sx={{ mb: 2 }}>
  Proposal Status: {proposalStatus}
  {proposalStatus === 'draft' && ' (Cannot issue award for draft proposals)'}
</Alert>
```

### 2. Add Opportunity Details Display
Show opportunity information for context:
```javascript
<Typography variant="body2" color="text.secondary">
  Opportunity: {opportunityTitle}
  Sponsor: {opportunitySponsor}
</Typography>
```

### 3. Pre-fill Dates from Opportunity
If the opportunity has suggested start/end dates, pre-fill them:
```javascript
if (res.data?.opportunity?.project_start_date) {
  setStartDate(new Date(res.data.opportunity.project_start_date).toISOString().split('T')[0]);
}
```

## Related Files

- **Frontend**: `frontend/app/admin-staff/grants/awards/issue/page.js`
- **Backend Route**: `backend/routes/grants/awards.py`
- **Backend Models**: `backend/models.py` (Award, Proposal, ProposalStatus)
- **Proposal Detail Page**: `frontend/app/admin-staff/grants/proposals/[id]/page.js`

## Notes

- The award creation automatically creates a ResearchProject with status "ACTIVE"
- The proposal status is automatically changed to "AWARDED"
- A notification is sent to the PI when an award is issued
- Budget lines are added in a separate API call after award creation
