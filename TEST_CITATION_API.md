# Testing Citation API Endpoints

## Issue
Publications and libraries are not showing in the citation sidebar, even though they exist in "My Library" page.

## Root Cause Analysis

The frontend is calling:
- `http://localhost:8000/api/publications/libraries`
- `http://localhost:8000/api/publications`

But since you're accessing via `http://localhost/researcher/...`, the API calls should go through nginx proxy at `/api` not `http://localhost:8000/api`.

## Fix Required

The `NEXT_PUBLIC_API_URL` environment variable should be set to `/api` (relative) not `http://localhost:8000` (absolute).

## Testing Steps

### 1. Check Current API Calls

Open browser console (F12) and run:
```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
```

### 2. Test API Endpoints Manually

#### Test Libraries Endpoint
```bash
# Get your auth token from browser localStorage
# Then test:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost/api/publications/libraries
```

Expected response:
```json
[
  {
    "id": "uuid",
    "name": "Diabetes",
    "is_folder": true,
    ...
  },
  {
    "id": "uuid",
    "name": "Covid",
    "is_folder": true,
    ...
  }
]
```

#### Test Publications Endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost/api/publications
```

Expected response:
```json
[
  {
    "id": "uuid",
    "title": "Publication Title",
    "library_id": "uuid",
    "library_name": "Diabetes",
    ...
  }
]
```

### 3. Check Browser Network Tab

1. Open citation sidebar
2. Open browser DevTools (F12)
3. Go to Network tab
4. Look for requests to:
   - `/api/publications/libraries`
   - `/api/publications`
5. Check:
   - Status code (should be 200)
   - Response data
   - Any CORS errors

## Quick Fix

The issue is likely that `NEXT_PUBLIC_API_URL` is set to `http://localhost:8000` but it should be `/api` for the nginx proxy.

### Option 1: Update docker-compose.yml

```yaml
frontend:
  environment:
    - NEXT_PUBLIC_API_URL=/api  # Change this line
```

### Option 2: Update CitationSidebar.js

Change the default fallback:
```javascript
const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';  // Not 'http://localhost:8000'
```

## Implementation

I'll update the CitationSidebar to use `/api` as the default instead of `http://localhost:8000`.
