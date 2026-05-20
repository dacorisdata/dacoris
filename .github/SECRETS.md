# GitHub Secrets Configuration Guide

This document lists all the secrets you need to configure in your GitHub repository for the CI/CD pipeline to work.

## How to Add Secrets

1. Go to your GitHub repository
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret listed below

## Required Secrets

### Docker Registry Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `DOCKER_USERNAME` | Your Docker Hub username | `myusername` |
| `DOCKER_PASSWORD` | Your Docker Hub password or access token | `dckr_pat_xxxxx` |

### Staging Server Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `STAGING_HOST` | Staging server IP or domain | `staging.yourdomain.com` or `192.168.1.100` |
| `STAGING_USER` | SSH user for staging server | `dacoris` |
| `STAGING_SSH_KEY` | Private SSH key for staging server | Contents of `~/.ssh/dacoris-staging` |
| `STAGING_URL` | Full URL of staging environment | `https://staging.yourdomain.com` |

### Production Server Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `PRODUCTION_HOST` | Production server IP or domain | `yourdomain.com` or `192.168.1.200` |
| `PRODUCTION_USER` | SSH user for production server | `dacoris` |
| `PRODUCTION_SSH_KEY` | Private SSH key for production server | Contents of `~/.ssh/dacoris-production` |
| `PRODUCTION_URL` | Full URL of production environment | `https://yourdomain.com` |

### Application Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `DB_PASSWORD` | PostgreSQL database password | `your-secure-password` |
| `JWT_SECRET_KEY` | Secret key for JWT tokens | `your-jwt-secret-key` |
| `ADMIN_EMAIL` | Global admin email address | `admin@yourdomain.com` |

### ORCID OAuth Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `ORCID_CLIENT_ID` | ORCID OAuth client ID | `APP-XXXXXXXXXXXX` |
| `ORCID_CLIENT_SECRET` | ORCID OAuth client secret | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

### Email (SMTP) Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | `noreply@yourdomain.com` |
| `SMTP_PASSWORD` | SMTP password or app password | `your-app-password` |
| `FROM_EMAIL` | Email sender address | `DACORIS <no-reply@yourdomain.com>` |

### MinIO/Lakehouse Secrets (Optional)

| Secret Name | Description | Example |
|------------|-------------|---------|
| `MINIO_ACCESS_KEY` | MinIO access key | `your-minio-access-key` |
| `MINIO_SECRET_KEY` | MinIO secret key | `your-minio-secret-key` |
| `INGEST_API_KEY` | Ingest API key | `your-ingest-api-key` |
| `MINIO_INGEST_URL` | MinIO ingest URL | `http://102.68.87.70:8000/ingest/bronze` |

### Notification Secrets (Optional)

| Secret Name | Description | Example |
|------------|-------------|---------|
| `SLACK_WEBHOOK` | Slack webhook URL for notifications | `https://hooks.slack.com/services/xxx/yyy/zzz` |
| `CODECOV_TOKEN` | Codecov token for code coverage | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

## Generating SSH Keys

To generate SSH keys for GitHub Actions:

```bash
# For staging
ssh-keygen -t ed25519 -C "github-actions-staging" -f ~/.ssh/dacoris-staging

# For production
ssh-keygen -t ed25519 -C "github-actions-production" -f ~/.ssh/dacoris-production
```

Then copy the public keys to your servers:

```bash
# For staging
ssh-copy-id -i ~/.ssh/dacoris-staging.pub dacoris@staging-server

# For production
ssh-copy-id -i ~/.ssh/dacoris-production.pub dacoris@production-server
```

Add the **private key** contents to GitHub Secrets:

```bash
# Display private key (copy this to GitHub Secrets)
cat ~/.ssh/dacoris-staging
cat ~/.ssh/dacoris-production
```

## Generating Secure Secrets

### JWT Secret Key

```bash
openssl rand -hex 32
```

### Database Password

```bash
openssl rand -base64 32
```

### API Keys

```bash
openssl rand -hex 32
```

## Environment-Specific Secrets

Some secrets may differ between staging and production:

- **ORCID**: Use sandbox credentials for staging, production credentials for production
- **Database**: Use different passwords for staging and production
- **URLs**: Different domains for staging and production

## Security Best Practices

1. ✅ **Never commit secrets to Git**
2. ✅ **Use different secrets for staging and production**
3. ✅ **Rotate secrets regularly** (every 90 days recommended)
4. ✅ **Use strong, randomly generated passwords**
5. ✅ **Limit access to secrets** (only necessary team members)
6. ✅ **Enable 2FA** on GitHub and Docker Hub
7. ✅ **Use environment-specific SSH keys**
8. ✅ **Monitor secret usage** in GitHub Actions logs

## Testing Secrets

After adding secrets, test them:

1. Trigger a workflow manually
2. Check the workflow logs for connection errors
3. Verify deployments complete successfully

## Troubleshooting

### SSH Connection Fails

- Verify SSH key is correctly copied to server
- Check SSH key permissions (should be 600)
- Verify server hostname/IP is correct
- Test SSH connection manually: `ssh -i ~/.ssh/dacoris-staging dacoris@staging-server`

### Docker Login Fails

- Verify Docker Hub credentials
- Check if using access token instead of password
- Ensure Docker Hub account has push permissions

### Environment Variables Not Working

- Check secret names match exactly (case-sensitive)
- Verify secrets are added to correct environment (staging/production)
- Check workflow file references correct secret names
