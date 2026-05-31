# Session Timeout & Token Refresh Implementation

## Problem Summary

Users were experiencing data loss and forced logouts when inactive for periods longer than 30 minutes. This was particularly problematic in:

1. **Manuscript Editor** - Users would lose unsaved manuscript content after being idle
2. **Import Page** - Imported items would disappear, requiring users to log in again

The root cause was that JWT access tokens expired after 30 minutes with no refresh mechanism in place.

## Solution Implemented

A comprehensive **token refresh system** has been implemented to prevent session timeouts and data loss.

### Key Features

1. **Dual Token System**
   - **Access Token**: Short-lived (30 minutes for regular users, 8 hours for admins)
   - **Refresh Token**: Long-lived (7 days) used to obtain new access tokens

2. **Automatic Token Refresh**
   - Tokens are automatically refreshed 5 minutes before expiration
   - No user interaction required
   - Seamless continuation of work

3. **Intelligent Error Handling**
   - Failed API requests due to expired tokens are automatically retried with refreshed tokens
   - Queuing mechanism prevents multiple simultaneous refresh attempts
   - Graceful logout only when refresh token also expires

4. **Persistent Sessions**
   - Token expiry times stored in localStorage
   - Automatic refresh on page reload if token is expired or about to expire
   - Sessions remain valid for up to 7 days without requiring re-login

## Changes Made

### Backend Changes

#### 1. `backend/auth.py`
- Added `REFRESH_TOKEN_EXPIRE_DAYS` configuration (default: 7 days)
- Added `create_refresh_token()` function to generate refresh tokens
- Added `verify_refresh_token()` function to validate refresh tokens
- Updated `create_access_token()` to include token type in payload

#### 2. `backend/routes/auth.py`
- Updated `Token` response model to include `refresh_token` and `expires_in`
- Added `RefreshTokenRequest` model for refresh endpoint
- Updated `/auth/login` endpoint to return both access and refresh tokens
- Added new `/auth/refresh` endpoint to exchange refresh tokens for new access tokens
  - Validates refresh token
  - Checks user is still active
  - Returns new access token and refresh token (token rotation for security)

#### 3. `backend/routes/orcid.py`
- Updated ORCID callback to generate and return refresh tokens
- Modified redirect URLs to include both `token` and `refresh_token` parameters

### Frontend Changes

#### 1. `frontend/lib/api.js`
- Enhanced axios response interceptor with automatic token refresh
- Added request queuing to prevent multiple refresh attempts
- Implements token refresh on 401 errors before retrying failed requests
- Added `authAPI.refreshToken()` function

#### 2. `frontend/contexts/AuthContext.js`
- Added refresh token state management
- Implemented automatic token refresh scheduling
- Added `performTokenRefresh()` function for manual and automatic refresh
- Token expiry tracking with localStorage persistence
- Cleanup of refresh timers on unmount

#### 3. `frontend/store/authStore.js`
- Added refresh token support to Zustand store
- Implemented automatic token refresh scheduling
- Added `performTokenRefresh()` function
- Enhanced `initAuth()` to check token expiry on load
- Updated `login()` to schedule automatic refresh
- Cleanup of timers on logout

#### 4. `frontend/app/onboarding/page.js`
- Updated to capture and store refresh token from URL parameters
- Schedules automatic refresh after ORCID authentication

#### 5. `frontend/app/dashboard/page.js`
- Added token handler component for ORCID redirects
- Captures and stores refresh token from URL parameters

### Configuration Changes

#### `backend/.env.example`
```env
REFRESH_TOKEN_EXPIRE_DAYS=7  # New configuration option
```

## How It Works

### Login Flow
1. User logs in (email/password or ORCID)
2. Backend generates:
   - Access token (expires in 30 minutes)
   - Refresh token (expires in 7 days)
3. Frontend stores both tokens and schedules automatic refresh 5 minutes before access token expires

### Automatic Refresh Flow
1. Timer triggers 5 minutes before access token expiration
2. Frontend calls `/auth/refresh` with refresh token
3. Backend validates refresh token and user status
4. Backend returns new access token and new refresh token
5. Frontend updates stored tokens and reschedules next refresh

### Failed Request Recovery Flow
1. API request fails with 401 (Unauthorized)
2. Frontend interceptor catches the error
3. Attempts to refresh token using refresh token
4. If refresh succeeds:
   - Updates stored tokens
   - Retries original request with new token
   - Returns successful response
5. If refresh fails:
   - Clears stored tokens
   - Redirects to login page

### Page Reload Flow
1. User reloads page or returns after closing browser
2. Frontend loads tokens from localStorage
3. Checks token expiry time:
   - If expired: Immediately attempts refresh
   - If expiring soon (< 5 minutes): Immediately attempts refresh
   - If valid: Schedules refresh for later
4. User continues working seamlessly

## Benefits

### For Users
- ✅ No more unexpected logouts while working
- ✅ No data loss in manuscript editor or import pages
- ✅ Can leave browser open and return later without re-logging in
- ✅ Seamless experience - refresh happens in background

### For System
- ✅ Improved security with token rotation
- ✅ Configurable token lifetimes for different use cases
- ✅ Reduced login friction = better user experience
- ✅ Maintains stateless authentication with JWTs

## Testing Recommendations

1. **Session Persistence Test**
   - Log in to the system
   - Wait 25+ minutes (close to token expiration)
   - Interact with the system (e.g., edit manuscript)
   - Verify no logout occurs and work continues seamlessly

2. **Refresh Recovery Test**
   - Log in to the system
   - Wait 35+ minutes (past token expiration)
   - Make an API call (e.g., save manuscript)
   - Verify the request succeeds after automatic token refresh

3. **Page Reload Test**
   - Log in to the system
   - Import some data or create content
   - Reload the page
   - Verify you're still logged in and data persists

4. **Long Session Test**
   - Log in to the system
   - Keep the page open for several hours
   - Periodically interact with the system
   - Verify continuous access without re-login

5. **Token Expiry Test**
   - Log in to the system
   - Wait 7+ days (until refresh token expires)
   - Try to interact with the system
   - Verify you're redirected to login page

## Configuration Options

You can adjust these values in your `.env` file:

```env
# Time before access token expires (minutes)
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Time before admin access tokens expire (minutes)
ADMIN_SESSION_EXPIRE_MINUTES=480  # 8 hours

# Time before refresh token expires (days)
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### Recommended Settings

**For High Security Environments:**
```env
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=1
```

**For Better User Experience:**
```env
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30
```

**Current Default (Balanced):**
```env
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

## Security Considerations

1. **Token Rotation**: Each refresh generates a new refresh token, preventing token reuse attacks
2. **User Validation**: Each refresh validates the user is still active in the system
3. **Automatic Cleanup**: Logout clears all tokens and timers
4. **Stateless**: No server-side session storage required
5. **HTTPS Required**: In production, ensure all traffic uses HTTPS to protect tokens in transit

## Migration Notes

### Existing Users
- Existing users will need to log in once more to receive refresh tokens
- After that, they'll benefit from the new persistent sessions

### Database
- No database migrations required
- System remains stateless with JWT-based authentication

### Backward Compatibility
- Old access tokens will continue to work until they expire
- Users with old tokens will need to log in again (one-time)

## Troubleshooting

### Issue: Still getting logged out
**Check:**
- Ensure `.env` file has `REFRESH_TOKEN_EXPIRE_DAYS=7`
- Restart backend server after updating `.env`
- Clear browser localStorage and log in again
- Check browser console for token refresh errors

### Issue: "Invalid refresh token" errors
**Possible Causes:**
- Refresh token expired (after 7 days)
- Backend restarted with different `JWT_SECRET_KEY`
- User account was deactivated

**Solution:**
- Log in again to receive fresh tokens

### Issue: Performance concerns with timers
**Note:**
- Only one timer runs per user session
- Timer is cleaned up on logout or unmount
- Minimal performance impact

## Future Enhancements

Consider implementing:

1. **Sliding Sessions**: Extend refresh token expiry on each use
2. **Remember Me**: Optional longer-lived refresh tokens for convenience
3. **Device Management**: Track and revoke refresh tokens per device
4. **Token Blacklisting**: Store revoked tokens in Redis for immediate invalidation
5. **Activity Tracking**: Log token refresh events for security monitoring

## Conclusion

This implementation solves the session timeout problem comprehensively while maintaining security and providing a seamless user experience. Users can now work for extended periods without worrying about losing data or being unexpectedly logged out.
