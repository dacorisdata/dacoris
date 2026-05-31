# Quick Start: Testing Token Refresh Implementation

## Prerequisites
Before testing, ensure your `.env` file has the new configuration:

```bash
# Add this line to your backend/.env file
REFRESH_TOKEN_EXPIRE_DAYS=7
```

## Step 1: Restart the Backend

The backend needs to be restarted to load the new refresh token functionality:

```bash
cd backend
# Stop the current backend if running
# Then start it again
uvicorn main:app --reload
```

## Step 2: Clear Browser Storage (Important!)

Old sessions won't have refresh tokens, so you need to clear your browser storage:

1. Open your browser's Developer Tools (F12)
2. Go to the "Application" or "Storage" tab
3. Under "Local Storage", select your site (e.g., `http://localhost:3000`)
4. Click "Clear All" or delete these keys manually:
   - `token`
   - `user`
5. Alternatively, just log out and log back in

## Step 3: Log In Fresh

Log in to the system with your credentials. The system will now:
- Store both access token and refresh token
- Schedule automatic refresh 5 minutes before the access token expires
- Monitor token expiry on every page load

## Step 4: Test the Fix

### Test 1: Verify Token Storage
1. Log in to the system
2. Open Developer Tools (F12) → Application → Local Storage
3. Verify you see these keys:
   - `token` (your access token)
   - `refreshToken` (your refresh token)
   - `tokenExpiry` (timestamp when token expires)
   - `user` (your user data)

### Test 2: Stay Inactive for 25+ Minutes
1. Log in to the manuscript editor or import page
2. Import some data or start editing a manuscript
3. Leave the browser open but **don't interact** for 25-30 minutes
4. After waiting, interact with the page (e.g., type in editor, click a button)
5. **Expected Result**: Your session should still be active, no logout!

### Test 3: Check Console Logs
1. Log in to the system
2. Open Developer Tools (F12) → Console
3. Wait or set your system clock forward
4. Look for these console messages:
   - `Token will expire in XXXXms. Scheduling refresh in XXXXms`
   - `Auto-refreshing token...` (appears 5 min before expiry)
   - `Token refreshed successfully`

### Test 4: Close and Reopen Browser
1. Log in to the system
2. Import data or create some content
3. **Close the entire browser** (not just the tab)
4. Wait 5-10 minutes
5. Reopen browser and navigate back to your site
6. **Expected Result**: Still logged in with your data intact!

### Test 5: Test Past Token Expiration
This test simulates what happens if the access token expires while you're away:

1. Log in to the system
2. Open Developer Tools → Application → Local Storage
3. Find `tokenExpiry` and note its value
4. Change your system time to 35 minutes in the future (past token expiry)
5. Refresh the page or make an API call
6. **Expected Result**: Token should auto-refresh, you stay logged in!
7. **Restore your system clock back to normal time**

## What to Look For

### ✅ Success Indicators
- No unexpected logouts during work
- Data persists across sessions
- Console shows "Token refreshed successfully"
- Can work for hours without interruption

### ❌ Problem Indicators
- Still getting logged out after 30 minutes
- Console shows "Token refresh failed" or "Invalid refresh token"
- Browser shows "Could not validate credentials" errors
- Redirected to login page unexpectedly

## Troubleshooting

### Problem: Still getting logged out after 30 minutes
**Solution:**
1. Verify `REFRESH_TOKEN_EXPIRE_DAYS=7` is in your `.env`
2. Restart backend server
3. Clear browser localStorage completely
4. Log in again with fresh credentials

### Problem: "Invalid refresh token" in console
**Solution:**
- Your refresh token might be expired (after 7 days)
- Log out and log back in

### Problem: No refresh token in localStorage
**Solution:**
- You logged in before the update
- Log out completely and log back in

### Problem: Backend errors about missing imports
**Solution:**
```bash
cd backend
pip install python-jose[cryptography]
```

## Quick Verification Script

Want to verify without waiting 30 minutes? Use this browser console trick:

```javascript
// Run this in your browser console after logging in

// 1. Check if refresh token exists
console.log('Has refresh token:', !!localStorage.getItem('refreshToken'));

// 2. Check token expiry
const expiry = localStorage.getItem('tokenExpiry');
if (expiry) {
  const expiresIn = parseInt(expiry) - Date.now();
  console.log('Token expires in (minutes):', Math.floor(expiresIn / 60000));
}

// 3. Manually trigger a token refresh (for testing)
// Note: This will only work if you have the auth store/context available
// and may not work in all page contexts
```

## Expected Behavior Summary

| Scenario | Old Behavior | New Behavior |
|----------|-------------|--------------|
| Inactive for 30+ minutes | Logged out, data lost | Still logged in, data preserved |
| Working continuously for hours | Logged out every 30 min | Stays logged in, auto-refreshes |
| Close/reopen browser | Need to log in again | Still logged in (for 7 days) |
| Page reload after 35 minutes | Logged out | Auto-refreshes, stays logged in |
| 401 error from API | Immediate redirect to login | Auto-refresh token, retry request |

## Performance Notes

- Token refresh happens in the background
- No noticeable performance impact
- One timer per user session (cleaned up on logout)
- Automatic retry of failed requests (transparent to user)

## Security Notes

- Access tokens still expire after 30 minutes (short-lived)
- Refresh tokens expire after 7 days (configurable)
- Each refresh generates a new refresh token (token rotation)
- Tokens are only stored in localStorage (not cookies)
- **Remember**: Always use HTTPS in production!

## Next Steps

Once you've verified the fix works:
1. Test in the manuscript editor specifically
2. Test in the import page with actual imports
3. Consider adjusting `REFRESH_TOKEN_EXPIRE_DAYS` based on your needs
4. Deploy to staging/production environments

## Support

If you encounter any issues:
1. Check the console for error messages
2. Verify backend logs for token refresh attempts
3. Ensure `.env` configuration is correct
4. Try logging out and back in with a fresh session

---

**Status**: ✅ Implementation Complete - Ready for Testing
