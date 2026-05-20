# Delete User Account

## Quick Command

```bash
# SSH into server
ssh adminuser@41.89.92.140
sudo su - dacoris
cd /home/dacoris/production

# Access database
docker compose -f docker-compose.prod.yml exec db psql -U postgres -d dacoris

# Delete the user and related records
DELETE FROM email_verifications WHERE email = 'gm@ascensiondynamics.co';
DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email = 'gm@ascensiondynamics.co');
DELETE FROM users WHERE email = 'gm@ascensiondynamics.co';

# Verify deletion
SELECT * FROM users WHERE email = 'gm@ascensiondynamics.co';

# Exit
\q
```

## What Gets Deleted

1. Email verification records
2. User role assignments
3. User account

## Note

This is a permanent deletion. The user will need to register again if they want to create a new account.
