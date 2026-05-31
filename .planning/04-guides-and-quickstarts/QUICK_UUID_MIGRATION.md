# Quick UUID Migration Steps

## Prerequisites
✅ Database backup created
✅ Docker containers stopped (`docker-compose down`)

## Step-by-Step

### 1. Open SSH Tunnel (PowerShell Window #1)
```powershell
ssh -L 15432:localhost:5432 adminuser@41.89.92.140 -p 22000 -N
```
**Keep this window open!** The tunnel must stay active during migration.

### 2. Run Migration (PowerShell Window #2)
```powershell
cd C:\projects\dacoris\backend

# Set DATABASE_URL to use the SSH tunnel
$env:DATABASE_URL = "postgresql://postgres:d6xvCEiRaBMmOwWqg69Np67pqcYWhqTF@localhost:15432/dacoris"

# Run migration
python migrations/convert_to_uuid_pks.py
```

### 3. After Migration Completes
```powershell
# Close SSH tunnel (Ctrl+C in Window #1)

# Restart Docker services
cd C:\projects\dacoris
docker-compose --env-file .env.docker up -d --build
```

## Troubleshooting

### "Connection refused" error
- ✅ Check SSH tunnel is running in Window #1
- ✅ Verify port 15432 is being forwarded: `netstat -an | findstr 15432`

### "Password authentication failed"
- ✅ Check password in DATABASE_URL matches: `d6xvCEiRaBMmOwWqg69Np67pqcYWhqTF`
- ✅ Test connection: `psql -h localhost -p 15432 -U postgres -d dacoris`

### Migration takes too long
- ⏱️ Normal - migrating 50+ tables with data takes time
- 📊 Watch progress in the console output

## What Gets Migrated
- ✅ 55 primary keys → UUID strings
- ✅ 115 foreign keys → String type
- ✅ All relationships preserved
- ✅ Original tables backed up with timestamp

## Post-Migration Verification
```powershell
# Connect to database
psql -h localhost -p 15432 -U postgres -d dacoris

# Check IDs are now UUIDs
SELECT id, email FROM users LIMIT 3;
SELECT id, name FROM institutions LIMIT 3;

# Should see 36-character UUID strings like:
# a3f8c9d2-4b5e-4c8a-9f2d-1e3b4c5d6e7f
```
