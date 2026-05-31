# 🔍 Authentication Diagnostic Guide

## Problem: 401 Unauthorized Errors

You're getting `401 Unauthorized` when trying to save sections. This means your authentication token is either:
1. **Expired** (tokens have a limited lifetime)
2. **Missing** (never set or was cleared)
3. **Invalid** (corrupted or wrong format)

---

## ✅ Quick Fix Steps

### Step 1: Check if you're logged in
1. Open your browser's **Developer Console** (F12)
2. Go to the **Console** tab
3. Type this and press Enter:
   ```javascript
   localStorage.getItem('token')
   ```
4. **Expected result:**
   - ✅ Should show a long string like `"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
   - ❌ If it shows `null` → **You're not logged in**

### Step 2: Log in again
1. Navigate to: `http://localhost/login`
2. Enter your credentials:
   - **Email:** `researcher@example.com` (or your test user)
   - **Password:** `password123` (or your test password)
3. After successful login, you should be redirected to the dashboard
4. Try saving a section again

### Step 3: Verify the token is set
After logging in, check the console again:
```javascript
localStorage.getItem('token')
```
Should now show a token.

---

## 🔧 Advanced Diagnostics

### Check token expiration
Paste this in the console to decode your token:
```javascript
const token = localStorage.getItem('token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token expires at:', new Date(payload.exp * 1000));
  console.log('Current time:', new Date());
  console.log('Is expired?', Date.now() > payload.exp * 1000);
} else {
  console.log('No token found');
}
```

### Test API directly
```javascript
const token = localStorage.getItem('token');
fetch('http://localhost/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('User:', data))
.catch(err => console.error('Auth failed:', err));
```

---

## 🛠️ Backend Token Settings

The token expiration is set in the backend. Check:
- **File:** `backend/auth.py`
- **Setting:** `ACCESS_TOKEN_EXPIRE_MINUTES`
- **Default:** Usually 30-60 minutes

To extend token lifetime (for development):
```python
# In backend/auth.py
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours
```

---

## 🔄 Auto-Refresh Solution (Future Enhancement)

Currently, the app doesn't auto-refresh tokens. When your session expires, you need to log in again.

**To implement auto-refresh:**
1. Add a token refresh endpoint in the backend
2. Create an axios interceptor to catch 401 errors
3. Attempt to refresh the token before redirecting to login

---

## 📝 Current Behavior

With the latest update, when you get a 401 error:
1. ❌ Error message: **"Session expired. Please log in again."**
2. 🗑️ Token is cleared from localStorage
3. ⏱️ After 2 seconds, you're redirected to `/login`
4. ✅ After logging in, you can continue working

---

## 🎯 Immediate Action

**Right now, do this:**
1. Open `http://localhost/login`
2. Log in with your credentials
3. Navigate back to your proposal workspace
4. Try saving again

The error should be gone! 🎉
