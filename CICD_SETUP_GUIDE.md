# DACORIS CI/CD Setup Guide

Complete guide to setting up Continuous Integration and Continuous Deployment for DACORIS using GitHub Actions.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Server Setup](#server-setup)
5. [GitHub Configuration](#github-configuration)
6. [Deployment Workflows](#deployment-workflows)
7. [Manual Deployment](#manual-deployment)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### CI/CD Pipeline Architecture

```
┌─────────────┐
│   Push to   │
│   GitHub    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  CI Workflow (Automatic)            │
│  ├─ Run Backend Tests               │
│  ├─ Run Frontend Tests              │
│  ├─ Lint Code                       │
│  ├─ Build Docker Images             │
│  └─ Push to Docker Hub              │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  CD Workflow (Automatic/Manual)     │
│  ├─ SSH to Server                   │
│  ├─ Backup Database                 │
│  ├─ Pull Latest Images              │
│  ├─ Deploy Containers               │
│  ├─ Run Migrations                  │
│  ├─ Health Check                    │
│  └─ Rollback on Failure             │
└─────────────────────────────────────┘
```

### Workflows Created

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR to main/develop | Test, lint, and build |
| `cd-staging.yml` | Push to main | Deploy to staging |
| `cd-production.yml` | Release/Manual | Deploy to production |
| `rollback.yml` | Manual | Rollback deployment |

---

## Prerequisites

### Required Accounts

- ✅ GitHub account with repository access
- ✅ Docker Hub account (free tier is fine)
- ✅ Linux server (Ubuntu 20.04+ recommended)
- ✅ Domain name (optional but recommended)

### Server Requirements

- **OS**: Ubuntu 20.04 LTS or later
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: Minimum 20GB free space
- **Network**: Public IP or domain name
- **Ports**: 22 (SSH), 80 (HTTP), 443 (HTTPS)

### Local Requirements

- Git installed
- SSH client
- Text editor

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/dacoris.git
cd dacoris
```

### 2. Setup Server

Run the automated server setup script on your Ubuntu server:

```bash
# On your server
sudo bash scripts/setup-server.sh
```

This script will:
- Install Docker and Docker Compose
- Create deployment user (`dacoris`)
- Setup directories
- Configure firewall
- Create backup scripts

### 3. Generate SSH Keys

On your local machine:

```bash
# Generate SSH key for GitHub Actions
ssh-keygen -t ed25519 -C "github-actions-production" -f ~/.ssh/dacoris-production

# Copy public key to server
ssh-copy-id -i ~/.ssh/dacoris-production.pub dacoris@your-server-ip
```

### 4. Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add all required secrets (see [`.github/SECRETS.md`](.github/SECRETS.md))

**Minimum required secrets:**
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- `PRODUCTION_HOST`
- `PRODUCTION_USER`
- `PRODUCTION_SSH_KEY`
- `PRODUCTION_URL`
- `DB_PASSWORD`
- `JWT_SECRET_KEY`

### 5. Test the Pipeline

```bash
# Make a small change and push
git add .
git commit -m "test: CI/CD pipeline"
git push origin main
```

Check GitHub Actions tab to see the workflow running.

---

## Server Setup

### Automated Setup

Use the provided script for quick setup:

```bash
# On your server as root
sudo bash scripts/setup-server.sh
```

### Manual Setup

If you prefer manual setup:

#### 1. Install Docker

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

#### 2. Install Docker Compose

```bash
# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 3. Create Deployment User

```bash
# Create user
sudo adduser dacoris
sudo usermod -aG docker dacoris
sudo usermod -aG sudo dacoris

# Create deployment directories
sudo mkdir -p /home/dacoris
sudo mkdir -p /var/backups/dacoris
sudo chown -R dacoris:dacoris /home/dacoris
sudo chown -R dacoris:dacoris /var/backups/dacoris
```

#### 4. Configure Firewall

```bash
# Enable firewall
sudo ufw enable
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
```

#### 5. Setup SSH Access

```bash
# Switch to dacoris user
sudo su - dacoris

# Create SSH directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add your public key
echo "your-public-key-here" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

## GitHub Configuration

### 1. Add Repository Secrets

See [`.github/SECRETS.md`](.github/SECRETS.md) for complete list.

**Quick reference:**

```bash
# Generate JWT secret
openssl rand -hex 32

# Generate database password
openssl rand -base64 32

# Get SSH private key
cat ~/.ssh/dacoris-production
```

### 2. Configure Environments

1. Go to **Settings** → **Environments**
2. Create two environments:
   - `staging`
   - `production`

3. For production environment:
   - Enable **Required reviewers** (recommended)
   - Add **Deployment protection rules**

### 3. Enable GitHub Actions

1. Go to **Settings** → **Actions** → **General**
2. Enable **Allow all actions and reusable workflows**
3. Set **Workflow permissions** to **Read and write permissions**

---

## Deployment Workflows

### CI Workflow (Continuous Integration)

**Trigger**: Push or Pull Request to `main` or `develop`

**Steps**:
1. Run backend tests with PostgreSQL
2. Run frontend linting and build
3. Build Docker images
4. Push images to Docker Hub

**File**: `.github/workflows/ci.yml`

### CD Staging Workflow

**Trigger**: Push to `main` branch

**Steps**:
1. SSH to staging server
2. Pull latest Docker images
3. Deploy containers
4. Run database migrations
5. Health check
6. Notify on Slack (if configured)

**File**: `.github/workflows/cd-staging.yml`

### CD Production Workflow

**Trigger**: 
- Release published
- Manual workflow dispatch

**Steps**:
1. Backup current deployment
2. Backup database
3. Tag current images for rollback
4. Deploy new version
5. Run migrations
6. Health check
7. Rollback on failure
8. Notify on Slack (if configured)

**File**: `.github/workflows/cd-production.yml`

### Rollback Workflow

**Trigger**: Manual workflow dispatch

**Steps**:
1. Restore previous docker-compose.yml
2. Tag rollback images as latest
3. Restart containers
4. Health check
5. Notify on Slack (if configured)

**File**: `.github/workflows/rollback.yml`

---

## Manual Deployment

### Using Deployment Script

```bash
# Deploy locally
bash scripts/deploy-local.sh production

# Deploy to remote server
bash scripts/deploy-local.sh production your-server-ip dacoris
```

### Manual Docker Deployment

```bash
# SSH to server
ssh dacoris@your-server

# Navigate to deployment directory
cd /home/dacoris

# Pull latest images
docker-compose pull

# Deploy
docker-compose down
docker-compose up -d

# Run migrations
docker exec dacoris-backend-prod alembic upgrade head

# Check health
curl http://localhost/api/health
```

---

## Monitoring and Maintenance

### Health Checks

Run the health check script on your server:

```bash
# On server
/home/dacoris/health-check.sh
```

### Database Backups

Backups run automatically daily at 2 AM. Manual backup:

```bash
# On server
/home/dacoris/backup.sh
```

### View Logs

```bash
# Backend logs
docker logs dacoris-backend-prod --tail=100 -f

# Frontend logs
docker logs dacoris-frontend-prod --tail=100 -f

# Nginx logs
docker logs dacoris-nginx-prod --tail=100 -f

# All logs
docker-compose logs -f
```

### Disk Space Management

```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a -f

# Remove old backups (older than 30 days)
find /var/backups/dacoris -name "*.sql.gz" -mtime +30 -delete
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and deploy
docker-compose build
docker-compose up -d

# Run migrations
docker exec dacoris-backend-prod alembic upgrade head
```

---

## Troubleshooting

### CI/CD Pipeline Issues

#### Build Fails

```bash
# Check GitHub Actions logs
# Go to Actions tab → Click on failed workflow → View logs

# Test build locally
docker build -t test-backend ./backend
docker build -t test-frontend ./frontend
```

#### SSH Connection Fails

```bash
# Test SSH connection
ssh -i ~/.ssh/dacoris-production dacoris@your-server

# Check SSH key permissions
chmod 600 ~/.ssh/dacoris-production

# Verify key on server
cat ~/.ssh/authorized_keys
```

#### Docker Login Fails

```bash
# Test Docker Hub login
docker login -u your-username

# Generate new access token
# Go to Docker Hub → Account Settings → Security → New Access Token
```

### Deployment Issues

#### Health Check Fails

```bash
# Check if containers are running
docker ps

# Check backend health
curl http://localhost:8000/api/health

# Check logs
docker logs dacoris-backend-prod --tail=50
```

#### Database Migration Fails

```bash
# Check migration status
docker exec dacoris-backend-prod alembic current

# View migration history
docker exec dacoris-backend-prod alembic history

# Rollback one migration
docker exec dacoris-backend-prod alembic downgrade -1

# Upgrade to latest
docker exec dacoris-backend-prod alembic upgrade head
```

#### Port Already in Use

```bash
# Check what's using port 80
sudo lsof -i :80

# Stop conflicting service
sudo systemctl stop apache2  # or nginx, etc.
```

### Rollback Procedure

#### Using GitHub Actions

1. Go to **Actions** tab
2. Select **Rollback Deployment** workflow
3. Click **Run workflow**
4. Select environment (staging/production)
5. Click **Run workflow**

#### Manual Rollback

```bash
# SSH to server
ssh dacoris@your-server
cd /home/dacoris

# Run rollback script
bash /path/to/scripts/rollback.sh production
```

#### Emergency Rollback

```bash
# On server
cd /home/dacoris

# Restore backup
mv docker-compose.yml.backup docker-compose.yml

# Restart with previous version
docker-compose down
docker-compose up -d
```

### Database Recovery

```bash
# List available backups
ls -lh /var/backups/dacoris/

# Restore from backup
gunzip < /var/backups/dacoris/prod-20240519_020000.sql.gz | \
  docker exec -i dacoris-db-prod psql -U postgres dacoris
```

---

## Best Practices

### Development Workflow

1. **Feature branches**: Create feature branches from `develop`
2. **Pull requests**: Always create PR for code review
3. **Testing**: Ensure tests pass before merging
4. **Staging first**: Deploy to staging before production
5. **Version tags**: Use semantic versioning for releases

### Security

- ✅ Rotate secrets every 90 days
- ✅ Use different passwords for staging/production
- ✅ Enable 2FA on GitHub and Docker Hub
- ✅ Restrict SSH access by IP (if possible)
- ✅ Keep server updated: `sudo apt-get update && sudo apt-get upgrade`
- ✅ Monitor logs for suspicious activity
- ✅ Use HTTPS in production (setup SSL certificates)

### Monitoring

- ✅ Check GitHub Actions regularly
- ✅ Monitor server resources (CPU, RAM, disk)
- ✅ Review application logs daily
- ✅ Test backups monthly
- ✅ Setup uptime monitoring (e.g., UptimeRobot)
- ✅ Configure Slack notifications

### Backup Strategy

- ✅ Automated daily database backups
- ✅ Keep backups for 30 days
- ✅ Test restore procedure monthly
- ✅ Store backups off-server (optional)
- ✅ Document recovery procedures

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)

---

## Support

For issues or questions:

1. Check this documentation
2. Review GitHub Actions logs
3. Check server logs
4. Contact your DevOps team

---

## Changelog

### Version 1.0.0 (2024-05-19)

- Initial CI/CD setup
- GitHub Actions workflows
- Automated deployment scripts
- Server setup automation
- Comprehensive documentation
