# DACORIS Registration Workflow Documentation

## Overview
The DACORIS platform supports two types of user registration:
1. **Researcher Accounts** - For researchers with optional ORCID authentication
2. **Administrative Staff Accounts** - For institutional staff members

Both registration types include email verification via a 6-digit code sent to the user's institutional email.

---

## Registration Flow

### 1. Researcher Registration

#### Frontend Flow (`/register`)
**Step 1: Select Account Type**
- User selects "Researcher" account type

**Step 2: ORCID Details**
- User can authenticate with ORCID (optional) or skip
- If authenticated, ORCID data auto-populates (first name, given name, affiliation)
- User can cancel ORCID authentication and re-authenticate with different account
- Fields: First Name, Given Name (Last Name), Affiliation (optional)
- Visual feedback: ORCID logo on authenticate button

**Step 3: Institution Email**
- User enters institutional email
- Real-time email domain verification against registered institutions
- Visual feedback:
  - Green border + checkmark icon = verified domain
  - Red border + X icon = invalid domain
  - Loading spinner during verification
- Institution auto-populated upon successful verification

**Step 4: Password**
- User creates password (minimum 8 characters)
- Confirm password field
- Visual feedback:
  - Green border + checkmark = valid password/match
  - Red border + X icon = invalid/mismatch
- Password strength indicator (Too weak, Weak, Fair, Strong)

#### Backend Endpoint
**POST** `/api/registration/researcher/orcid`

**Request Body:**
```json
{
  "first_name": "John",
  "given_name": "Doe",
  "affiliation": "University of Nairobi",
  "email": "john.doe@uonbi.ac.ke",
  "institution": "University of Nairobi",
  "institution_id": 1,
  "orcid_id": "0000-0001-2345-6789",
  "password": "SecurePass123",
  "confirm_password": "SecurePass123",
  "department": "Computer Science",
  "phone": "+254712345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful! A verification code has been sent to your email...",
  "user_id": 123,
  "status": "pending",
  "requires_approval": true
}
```

**Process:**
1. Validates institution exists
2. Validates email domain matches institution
3. Checks for duplicate email/ORCID
4. Creates user with status `PENDING` and `email_verified=false`
5. Generates 6-digit verification code
6. Sends verification email via SMTP
7. Returns success response

---

### 2. Administrative Staff Registration

#### Frontend Flow (`/register`)
**Step 1: Select Account Type**
- User selects "Administrative Staff" account type

**Step 2: Account Details**
- Fields: Full Name, Institutional Email, Department (optional)
- Real-time email domain verification
- Visual feedback same as researcher registration
- Password and confirm password with validation indicators

#### Backend Endpoint
**POST** `/api/registration/admin-staff`

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane.smith@uonbi.ac.ke",
  "department": "Research Office",
  "job_title": "Grant Officer",
  "phone": "+254712345678",
  "password": "SecurePass123",
  "confirm_password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful! A verification code has been sent to your email...",
  "user_id": 124,
  "status": "pending",
  "requires_approval": true
}
```

**Process:**
1. Extracts domain from email
2. Finds institution by domain (checks primary and verified domains)
3. Checks for duplicate email
4. Creates user with status `PENDING` and `email_verified=false`
5. Generates 6-digit verification code
6. Sends verification email via SMTP
7. Returns success response

---

## Email Verification System

### Verification Email
**Sent automatically after registration**

**Email Content:**
- Subject: "Verify Your Email - DACORIS"
- Contains clickable verification link with embedded code
- Alternative: 6-digit verification code for manual entry
- Link/code expires in 24 hours
- HTML formatted with DACORIS branding
- Green "Verify Email Address" button
- Fallback plain text link

**SMTP Configuration** (`.env.docker`):
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=steveggaita@gmail.com
SMTP_PASSWORD=hkpd boqh bupm azka
FROM_EMAIL="DACORIS <no-reply@dacoris.org>"
```

### Verification Page (`/verify-email`)

**Features:**
- **Automatic verification** when accessed via email link (email and code in URL parameters)
- Shows "Verifying Your Email..." loading screen during auto-verification
- Email field (auto-populated if coming from email link)
- 6-digit code input (formatted with spacing) for manual entry
- Verify button
- Resend code functionality
- Link to login page

**URL Format:**
```
http://localhost/verify-email?email=john.doe@uonbi.ac.ke&code=123456
```

**Verification Endpoint:**
**POST** `/api/verification/verify`

**Request:**
```json
{
  "email": "john.doe@uonbi.ac.ke",
  "code": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email verified successfully!"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "message": "Invalid or expired verification code. Please request a new code."
}
```

**Resend Code Endpoint:**
**POST** `/api/verification/send`

**Request:**
```json
{
  "email": "john.doe@uonbi.ac.ke"
}
```

---

## Registration Success Page

### Researcher Account
**Message:**
- Email verification required
- Verification code sent to email
- Account will be active after verification
- Base "Researcher" role assigned
- Can be elevated to PI or Co-I by institution admins

**Actions:**
- "Verify Email Now" button → `/verify-email`
- "Go to Login" button → `/login`

### Administrative Staff Account
**Message:**
- Email verification required
- After verification, pending approval by institution admin
- Will receive email when approved and roles assigned
- List of possible roles (Grant Officer, Research Administrator, etc.)

**Actions:**
- Check email for updates

---

## Database Models

### User Table
```python
User(
    email: str,                          # Lowercase institutional email
    name: str,                           # Full name
    password_hash: str,                  # Hashed password
    account_type: AccountType,           # ORCID or INSTITUTION_ADMIN
    status: UserStatus,                  # PENDING, ACTIVE, SUSPENDED
    email_verified: bool,                # False until code verified
    orcid_id: str | None,               # ORCID iD if provided
    primary_institution_id: int,         # Institution FK
    primary_account_type: PrimaryAccountType,  # RESEARCHER or ADMIN_STAFF
    department: str | None,
    job_title: str | None,
    phone: str | None,
    is_global_admin: bool,              # False for self-registration
    is_institution_admin: bool,         # False for self-registration
    is_guest: bool                      # False for self-registration
)
```

### EmailVerification Table
```python
EmailVerification(
    email: str,                         # Email to verify
    verification_code: str,             # 6-digit code
    expires_at: datetime,               # 24 hours from creation
    verified: bool,                     # False until verified
    verified_at: datetime | None,       # Timestamp when verified
    created_at: datetime                # When code was generated
)
```

---

## API Endpoints Summary

### Registration
- `POST /api/registration/researcher/orcid` - Register researcher
- `POST /api/registration/admin-staff` - Register admin staff
- `POST /api/registration/verify-email` - Verify email domain during registration

### Email Verification
- `POST /api/verification/send` - Send/resend verification code
- `POST /api/verification/verify` - Verify email with code

---

## Frontend Components

### Registration Components
- `ResearcherRegistration.js` - Multi-step researcher registration form
- `AdminStaffRegistration.js` - Admin staff registration form
- `RegistrationSuccess.js` - Success page after registration
- `TierSelector.js` - Account type selection

### Verification Components
- `/app/verify-email/page.js` - Email verification page

### Visual Feedback Features
1. **Email Verification Indicator**
   - Real-time domain verification
   - Border color changes (green/red)
   - Icon indicators (checkmark/X)

2. **Password Validation Indicator**
   - Real-time password strength
   - Border color changes
   - Icon indicators
   - Strength meter (4 levels)

3. **ORCID Integration**
   - Official ORCID logo on button
   - Cancel & re-authenticate option
   - Auto-population of profile data

---

## Testing the Workflow

### Prerequisites
1. Institution with verified domain in database
2. SMTP credentials configured in `.env.docker`
3. Backend and frontend services running

### Test Researcher Registration
1. Navigate to `http://192.168.100.90/register`
2. Select "Researcher" account type
3. (Optional) Authenticate with ORCID or skip
4. Enter name and affiliation
5. Enter institutional email (e.g., `test@uonbi.ac.ke`)
6. Verify email domain is recognized (green border)
7. Create password (minimum 8 characters)
8. Submit registration
9. Check email for verification link
10. **Click "Verify Email Address" button in email**
11. Automatically redirected to verification page
12. Email verified automatically
13. Redirected to login page

**Alternative (Manual Entry):**
- Copy 6-digit code from email
- Navigate to `/verify-email`
- Enter email and code manually
- Click verify button

### Test Admin Staff Registration
1. Navigate to `http://192.168.100.90/register`
2. Select "Administrative Staff" account type
3. Enter full name
4. Enter institutional email
5. Verify email domain is recognized
6. (Optional) Select department
7. Create password
8. Submit registration
9. Check email for verification link
10. **Click verification link in email**
11. Automatic verification and redirect to login

---

## Error Handling

### Common Errors
1. **Email domain not recognized**
   - Ensure institution domain is in database
   - Check `Institution.domain` and `Institution.verified_domains`

2. **Duplicate email**
   - User already exists with that email
   - Check if previous registration was completed

3. **SMTP failure**
   - Verify SMTP credentials
   - Check Gmail app password is valid
   - Ensure port 587 is accessible

4. **Invalid verification code**
   - Code may have expired (24 hours)
   - User can request new code via "Resend Code"

---

## Security Features

1. **Password Requirements**
   - Minimum 8 characters
   - Strength indicator encourages strong passwords
   - Hashed using bcrypt before storage

2. **Email Verification**
   - 6-digit random code
   - 24-hour expiration
   - One-time use (marked verified after use)

3. **Domain Validation**
   - Email must match institution's verified domains
   - Prevents unauthorized registrations

4. **Account Status**
   - New accounts start as `PENDING`
   - Requires email verification
   - Admin staff requires additional approval

---

## Next Steps After Registration

### For Researchers
1. Verify email
2. Account becomes active
3. Can log in immediately
4. Has base "Researcher" role
5. Can be elevated to PI/Co-I by institution admin

### For Admin Staff
1. Verify email
2. Account remains pending
3. Institution admin reviews and approves
4. Admin assigns specific roles
5. User receives approval notification
6. Can then log in

---

## Troubleshooting

### Email not received
1. Check spam/junk folder
2. Verify SMTP configuration
3. Check backend logs for email sending errors
4. Use "Resend Code" button

### Email verification fails
1. Ensure code is entered correctly (6 digits)
2. Check if code has expired (24 hours)
3. Request new code
4. Verify email address is correct

### Registration fails
1. Check institution exists in database
2. Verify email domain matches institution
3. Ensure no duplicate email/ORCID
4. Check backend logs for detailed error

---

## Conclusion

The registration workflow is now complete with:
✅ Researcher registration with optional ORCID
✅ Administrative staff registration
✅ Email domain verification during registration
✅ Email verification code system
✅ Visual feedback for all validations
✅ Comprehensive error handling
✅ Professional UI/UX

All components are integrated and ready for testing.
