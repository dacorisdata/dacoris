# GitHub Actions Deployment Setup

This document explains how to set up GitHub Actions for automatic deployment to your production server.

## Overview

The deployment workflow automatically deploys to production (41.89.92.140) whenever you push to the `main` branch.

**Deployment Method:**
- Code is pulled from GitHub directly on the server
- Docker images are built locally on the server
- Uses `docker-compose.prod.yml` with `.env.production`
- Database is preserved during deployments

---

## Prerequisites

### 1. Server Setup

Ensure your production server has:
- ✅ Docker and Docker Compose installed
- ✅ Git repository cloned at `/home/dacoris/`
- ✅ `.env.production` file configured at `/home/dacoris/.env.production`
- ✅ SSH access configured for `dacoris` user

### 2. GitHub Repository

Your repository should have:
- ✅ `docker-compose.prod.yml` in the root
- ✅ `.github/workflows/cd-production.yml` workflow file

---

## Setup Steps

### Step 1: Generate SSH Key for GitHub Actions

On your local machine or server, generate an SSH key pair:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/dacoris-deploy
```

This creates:
- **Private key**: `~/.ssh/dacoris-deploy` (keep secret)
- **Public key**: `~/.ssh/dacoris-deploy.pub` (add to server)

### Step 2: Add Public Key to Production Server

Copy the public key to the server:

```bash
# View the public key
cat ~/.ssh/dacoris-deploy.pub

# SSH to server
ssh adminuser@41.89.92.140

# Switch to dacoris user
sudo su - dacoris

# Add the public key
mkdir -p ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJeeRlmQNcU5y2vFubDtAQpx84Se4sKlXPPsdHvhly0L github-actions-deploy
" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

### Step 3: Test SSH Connection

Test the connection with the private key:

```bash
ssh -i ~/.ssh/dacoris-deploy dacoris@41.89.92.140
```

If successful, you should be logged in as the `dacoris` user.

### Step 4: Add SSH Key to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secret:

**Name:** `PRODUCTION_SSH_KEY`

**Value:** Copy the entire contents of the **private key** file:

```bash
cat ~/.ssh/dacoris-deploy
```

Copy everything including:
```
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

5. Click **Add secret**

### Step 5: Verify `.env.production` on Server

SSH to the server and verify the environment file exists:

```bash
ssh dacoris@41.89.92.140
cd /home/dacoris
ls -la .env.production
```

If it doesn't exist, create it following the guide in `.guides/DEPLOY_WITH_DOCKER_COMPOSE.md`.

---

## How It Works

### Automatic Deployment

When you push to `main` branch:

1. GitHub Actions triggers the workflow
2. Connects to server via SSH
3. Backs up the database
4. Pulls latest code: `git pull origin main`
5. Deploys: `docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build`
6. Runs migrations
7. Performs health check
8. Reports success or failure

### Manual Deployment

You can also trigger deployment manually:

1. Go to **Actions** tab in GitHub
2. Select **CD - Deploy to Production**
3. Click **Run workflow**
4. Optionally check "Skip database backup" (not recommended)
5. Click **Run workflow**

---

## Monitoring Deployments

### View Deployment Logs

1. Go to **Actions** tab
2. Click on the latest workflow run
3. Click on **deploy-production** job
4. Expand each step to view logs

### Check Deployment Status

After deployment completes:

- **Application**: http://41.89.92.140
- **API Health**: http://41.89.92.140/api/health
- **API Docs**: http://41.89.92.140/apiDocs

### SSH to Server

If deployment fails, SSH to the server to investigate:

```bash
ssh dacoris@41.89.92.140
cd /home/dacoris

# Check container status
docker compose -f docker-compose.prod.yml --env-file .env.production ps

# View logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f
```

---

## Troubleshooting

### Deployment Fails with SSH Error

**Problem:** Cannot connect to server

**Solution:**
1. Verify `PRODUCTION_SSH_KEY` secret is correct
2. Test SSH connection manually
3. Check server firewall allows SSH from GitHub Actions IPs

### Health Check Fails

**Problem:** Application doesn't respond after deployment

**Solution:**
1. Check logs in GitHub Actions
2. SSH to server and check container logs
3. Verify `.env.production` has correct values
4. Check database is running

### Database Backup Fails

**Problem:** Backup step shows warning

**Solution:**
1. This is usually not critical (deployment continues)
2. Verify database container is running
3. Check disk space on server

### Environment File Not Found

**Problem:** Workflow fails with "❌ .env.production file not found!"

**Solution:**
1. SSH to server
2. Create `.env.production` at `/home/dacoris/.env.production`
3. Follow the deployment guide to configure it

---

## Manual Rollback

If deployment fails and you need to rollback:

```bash
# SSH to server
ssh dacoris@41.89.92.140
cd /home/dacoris

# View commit history
git log --oneline

# Rollback to previous commit
git reset --hard HEAD~1

# Redeploy
docker compose -f docker-compose.prod.yml --env-file .env.production down
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

---

## Security Best Practices

1. **Never commit `.env.production`** to git
2. **Rotate SSH keys** periodically
3. **Use strong passwords** in `.env.production`
4. **Monitor deployment logs** for suspicious activity
5. **Keep server updated** with security patches
6. **Backup database regularly** (automated in workflow)

---

## Workflow Configuration

The workflow is configured in `.github/workflows/cd-production.yml`:

```yaml
on:
  push:
    branches: [ main ]  # Auto-deploy on push to main
  workflow_dispatch:     # Allow manual trigger
```

To disable auto-deployment, remove the `push` trigger and keep only `workflow_dispatch`.

---

## Additional Resources

- [Deployment Guide](./../.guides/DEPLOY_WITH_DOCKER_COMPOSE.md)
- [Workflows README](./workflows/README.md)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

## Support

For deployment issues:

1. Check GitHub Actions logs
2. Check server logs: `docker compose logs`
3. Review deployment guide
4. Contact DevOps team
