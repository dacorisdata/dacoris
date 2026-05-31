# DACORIS CI/CD Deployment Guide with GitHub Actions

## Table of Contents
1. [Overview](#overview)
2. [CI/CD Architecture](#cicd-architecture)
3. [Prerequisites](#prerequisites)
4. [GitHub Actions Workflows](#github-actions-workflows)
5. [Server Setup for CI/CD](#server-setup-for-cicd)
6. [Deployment Strategies](#deployment-strategies)
7. [Environment Management](#environment-management)
8. [Security Best Practices](#security-best-practices)
9. [Monitoring and Rollback](#monitoring-and-rollback)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides a complete CI/CD pipeline setup for DACORIS using GitHub Actions to automate testing, building, and deployment to a Linux server.

### What This Pipeline Does

```mermaid
graph LR
    A[Push to GitHub] --> B[Run Tests]
    B --> C[Build Docker Images]
    C --> D[Push to Registry]
    D --> E[Deploy to Server]
    E --> F[Health Check]
    F -->|Success| G[Complete]
    F -->|Failure| H[Rollback]
    
    style G fill:#2b7d2b,stroke:#333,stroke-width:2px
    style H fill:#bb333c,stroke:#333,stroke-width:2px
```

---

## CI/CD Architecture

### Pipeline Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub
    participant GA as GitHub Actions
    participant DR as Docker Registry
    participant Server as Production Server
    participant App as Application
    
    Dev->>GH: 1. Push code
    GH->>GA: 2. Trigger workflow
    GA->>GA: 3. Run tests
    GA->>GA: 4. Build images
    GA->>DR: 5. Push images
    GA->>Server: 6. SSH deploy
    Server->>DR: 7. Pull images
    Server->>App: 8. Deploy containers
    App->>GA: 9. Health check
    GA->>Dev: 10. Notify status
```

### Deployment Environments

```mermaid
graph TB
    subgraph "Development"
        A[Feature Branch]
        B[Dev Environment]
    end
    
    subgraph "Staging"
        C[Main Branch]
        D[Staging Server]
    end
    
    subgraph "Production"
        E[Release Tag]
        F[Production Server]
    end
    
    A -->|Auto Deploy| B
    C -->|Auto Deploy| D
    E -->|Manual Approval| F
    
    style F fill:#095587,stroke:#333,stroke-width:2px
```

---

## Prerequisites

### 1. GitHub Repository Setup
- Repository with DACORIS code
- Admin access to repository settings
- GitHub Actions enabled

### 2. Production Server Requirements
- Linux server (Ubuntu 20.04+)
- Docker and Docker Compose installed
- SSH access configured
- Firewall rules configured (ports 80, 443, 22)

### 3. Required Accounts
- GitHub account with repository access
- Docker Hub account (or other container registry)
- Domain name (optional but recommended)

---

## GitHub Actions Workflows

### Workflow Structure

Create the following directory structure:

```
.github/
└── workflows/
    ├── ci.yml                 # Continuous Integration
    ├── cd-staging.yml         # Deploy to Staging
    ├── cd-production.yml      # Deploy to Production
    └── rollback.yml           # Rollback workflow
```

### 1. Continuous Integration Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI - Test and Build

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

env:
  REGISTRY: docker.io
  BACKEND_IMAGE: ${{ secrets.DOCKER_USERNAME }}/dacoris-backend
  FRONTEND_IMAGE: ${{ secrets.DOCKER_USERNAME }}/dacoris-frontend
  NGINX_IMAGE: ${{ secrets.DOCKER_USERNAME }}/dacoris-nginx

jobs:
  test-backend:
    name: Test Backend
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: dacoris_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      
      - name: Install dependencies
        working-directory: ./backend
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-cov
      
      - name: Run linting
        working-directory: ./backend
        run: |
          pip install flake8
          flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
          flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
      
      - name: Run tests
        working-directory: ./backend
        env:
          DATABASE_URL: postgresql+asyncpg://postgres:testpass@localhost:5432/dacoris_test
          JWT_SECRET_KEY: test-secret-key
        run: |
          pytest --cov=. --cov-report=xml --cov-report=term
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./backend/coverage.xml
          flags: backend

  test-frontend:
    name: Test Frontend
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: ./frontend/package-lock.json
      
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
      
      - name: Run linting
        working-directory: ./frontend
        run: npm run lint
      
      - name: Build application
        working-directory: ./frontend
        env:
          NEXT_PUBLIC_API_URL: /api
        run: npm run build

  build-images:
    name: Build Docker Images
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    if: github.event_name == 'push'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Extract metadata
        id: meta
        run: |
          echo "sha_short=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT
          echo "branch=${GITHUB_REF#refs/heads/}" >> $GITHUB_OUTPUT
          echo "timestamp=$(date +%s)" >> $GITHUB_OUTPUT
      
      - name: Build and push Backend image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            ${{ env.BACKEND_IMAGE }}:${{ steps.meta.outputs.sha_short }}
            ${{ env.BACKEND_IMAGE }}:${{ steps.meta.outputs.branch }}
            ${{ env.BACKEND_IMAGE }}:latest
          cache-from: type=registry,ref=${{ env.BACKEND_IMAGE }}:buildcache
          cache-to: type=registry,ref=${{ env.BACKEND_IMAGE }}:buildcache,mode=max
      
      - name: Build and push Frontend image
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          build-args: |
            NEXT_PUBLIC_API_URL=/api
            NEXT_PUBLIC_ORCID_CLIENT_ID=${{ secrets.ORCID_CLIENT_ID }}
          tags: |
            ${{ env.FRONTEND_IMAGE }}:${{ steps.meta.outputs.sha_short }}
            ${{ env.FRONTEND_IMAGE }}:${{ steps.meta.outputs.branch }}
            ${{ env.FRONTEND_IMAGE }}:latest
          cache-from: type=registry,ref=${{ env.FRONTEND_IMAGE }}:buildcache
          cache-to: type=registry,ref=${{ env.FRONTEND_IMAGE }}:buildcache,mode=max
      
      - name: Build and push Nginx image
        uses: docker/build-push-action@v5
        with:
          context: ./nginx
          push: true
          tags: |
            ${{ env.NGINX_IMAGE }}:${{ steps.meta.outputs.sha_short }}
            ${{ env.NGINX_IMAGE }}:${{ steps.meta.outputs.branch }}
            ${{ env.NGINX_IMAGE }}:latest
          cache-from: type=registry,ref=${{ env.NGINX_IMAGE }}:buildcache
          cache-to: type=registry,ref=${{ env.NGINX_IMAGE }}:buildcache,mode=max
      
      - name: Create deployment artifact
        run: |
          mkdir -p artifacts
          echo "${{ steps.meta.outputs.sha_short }}" > artifacts/version.txt
          echo "${{ steps.meta.outputs.timestamp }}" > artifacts/timestamp.txt
          cp docker-compose.yml artifacts/
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: deployment-artifacts
          path: artifacts/
          retention-days: 30
```

### 2. Staging Deployment Workflow

Create `.github/workflows/cd-staging.yml`:

```yaml
name: CD - Deploy to Staging

on:
  push:
    branches: [ main ]
  workflow_dispatch:

env:
  REGISTRY: docker.io
  BACKEND_IMAGE: ${{ secrets.DOCKER_USERNAME }}/dacoris-backend
  FRONTEND_IMAGE: ${{ secrets.DOCKER_USERNAME }}/dacoris-frontend
  NGINX_IMAGE: ${{ secrets.DOCKER_USERNAME }}/dacoris-nginx

jobs:
  deploy-staging:
    name: Deploy to Staging Server
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.yourdomain.com
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: deployment-artifacts
          path: artifacts/
      
      - name: Set up SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.STAGING_SSH_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H ${{ secrets.STAGING_HOST }} >> ~/.ssh/known_hosts
      
      - name: Create deployment directory
        run: |
          ssh ${{ secrets.STAGING_USER }}@${{ secrets.STAGING_HOST }} '
            mkdir -p /home/dacoris/staging
          '
      
      - name: Copy deployment files
        run: |
          scp docker-compose.yml ${{ secrets.STAGING_USER }}@${{ secrets.STAGING_HOST }}:/home/dacoris/staging/
          scp .env.staging ${{ secrets.STAGING_USER }}@${{ secrets.STAGING_HOST }}:/home/dacoris/staging/.env
      
      - name: Deploy application
        run: |
          ssh ${{ secrets.STAGING_USER }}@${{ secrets.STAGING_HOST }} '
            cd /home/dacoris/staging
            
            # Login to Docker Hub
            echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
            
            # Pull latest images
            docker pull ${{ env.BACKEND_IMAGE }}:latest
            docker pull ${{ env.FRONTEND_IMAGE }}:latest
            docker pull ${{ env.NGINX_IMAGE }}:latest
            
            # Stop and remove old containers
            docker-compose down
            
            # Start new containers
            docker-compose up -d
            
            # Wait for services to be healthy
            sleep 10
            
            # Run database migrations
            docker exec dacoris-backend alembic upgrade head
          '
      
      - name: Health check
        run: |
          sleep 15
          response=$(curl -s -o /dev/null -w "%{http_code}" https://staging.yourdomain.com/api/health)
          if [ $response -eq 200 ]; then
            echo "✅ Staging deployment successful!"
          else
            echo "❌ Health check failed with status $response"
            exit 1
          fi
      
      - name: Notify deployment status
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Staging deployment ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 3. Production Deployment Workflow

Create `.github/workflows/cd-production.yml`:

```yaml
name: CD - Deploy to Production

on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to deploy (e.g., v1.0.0)'
        required: true

env:
  REGISTRY: docker.io
  BACKEND_IMAGE: ${{ secrets.DOCKER_USERNAME }}/dacoris-backend
  FRONTEND_IMAGE: ${{ secrets.DOCKER_USERNAME }}/dacoris-frontend
  NGINX_IMAGE: ${{ secrets.DOCKER_USERNAME }}/dacoris-nginx

jobs:
  deploy-production:
    name: Deploy to Production Server
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://yourdomain.com
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.version || github.event.release.tag_name }}
      
      - name: Set up SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.PRODUCTION_SSH_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H ${{ secrets.PRODUCTION_HOST }} >> ~/.ssh/known_hosts
      
      - name: Backup current deployment
        run: |
          ssh ${{ secrets.PRODUCTION_USER }}@${{ secrets.PRODUCTION_HOST }} '
            cd /home/dacoris/production
            
            # Backup database
            docker exec dacoris-db pg_dump -U postgres dacoris | gzip > /var/backups/dacoris/pre-deploy-$(date +%Y%m%d_%H%M%S).sql.gz
            
            # Save current docker-compose for rollback
            cp docker-compose.yml docker-compose.yml.backup
            
            # Tag current images
            docker tag ${{ env.BACKEND_IMAGE }}:latest ${{ env.BACKEND_IMAGE }}:rollback
            docker tag ${{ env.FRONTEND_IMAGE }}:latest ${{ env.FRONTEND_IMAGE }}:rollback
            docker tag ${{ env.NGINX_IMAGE }}:latest ${{ env.NGINX_IMAGE }}:rollback
          '
      
      - name: Copy deployment files
        run: |
          scp docker-compose.yml ${{ secrets.PRODUCTION_USER }}@${{ secrets.PRODUCTION_HOST }}:/home/dacoris/production/
          scp .env.production ${{ secrets.PRODUCTION_USER }}@${{ secrets.PRODUCTION_HOST }}:/home/dacoris/production/.env
      
      - name: Deploy application
        run: |
          ssh ${{ secrets.PRODUCTION_USER }}@${{ secrets.PRODUCTION_HOST }} '
            cd /home/dacoris/production
            
            # Login to Docker Hub
            echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
            
            # Pull latest images
            docker pull ${{ env.BACKEND_IMAGE }}:latest
            docker pull ${{ env.FRONTEND_IMAGE }}:latest
            docker pull ${{ env.NGINX_IMAGE }}:latest
            
            # Deploy with zero-downtime
            docker-compose up -d --no-deps --build backend
            sleep 10
            docker-compose up -d --no-deps --build frontend
            sleep 10
            docker-compose up -d --no-deps --build nginx
            
            # Run database migrations
            docker exec dacoris-backend alembic upgrade head
            
            # Clean up old containers
            docker system prune -f
          '
      
      - name: Health check
        run: |
          sleep 20
          max_attempts=5
          attempt=1
          
          while [ $attempt -le $max_attempts ]; do
            response=$(curl -s -o /dev/null -w "%{http_code}" https://yourdomain.com/api/health)
            if [ $response -eq 200 ]; then
              echo "✅ Production deployment successful!"
              exit 0
            fi
            echo "Attempt $attempt/$max_attempts failed. Retrying..."
            sleep 10
            attempt=$((attempt + 1))
          done
          
          echo "❌ Health check failed after $max_attempts attempts"
          exit 1
      
      - name: Rollback on failure
        if: failure()
        run: |
          echo "🔄 Rolling back deployment..."
          ssh ${{ secrets.PRODUCTION_USER }}@${{ secrets.PRODUCTION_HOST }} '
            cd /home/dacoris/production
            
            # Restore previous docker-compose
            mv docker-compose.yml.backup docker-compose.yml
            
            # Rollback to previous images
            docker tag ${{ env.BACKEND_IMAGE }}:rollback ${{ env.BACKEND_IMAGE }}:latest
            docker tag ${{ env.FRONTEND_IMAGE }}:rollback ${{ env.FRONTEND_IMAGE }}:latest
            docker tag ${{ env.NGINX_IMAGE }}:rollback ${{ env.NGINX_IMAGE }}:latest
            
            # Restart with previous version
            docker-compose up -d
          '
      
      - name: Notify deployment status
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment ${{ job.status }} - Version: ${{ github.event.inputs.version || github.event.release.tag_name }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
      
      - name: Create deployment record
        if: success()
        run: |
          echo "Deployment successful at $(date)" >> deployment-log.txt
          echo "Version: ${{ github.event.inputs.version || github.event.release.tag_name }}" >> deployment-log.txt
```

### 4. Manual Rollback Workflow

Create `.github/workflows/rollback.yml`:

```yaml
name: Rollback Production

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to rollback'
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  rollback:
    name: Rollback ${{ github.event.inputs.environment }}
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    
    steps:
      - name: Set up SSH
        run: |
          mkdir -p ~/.ssh
          if [ "${{ github.event.inputs.environment }}" == "production" ]; then
            echo "${{ secrets.PRODUCTION_SSH_KEY }}" > ~/.ssh/id_rsa
            HOST="${{ secrets.PRODUCTION_HOST }}"
            USER="${{ secrets.PRODUCTION_USER }}"
          else
            echo "${{ secrets.STAGING_SSH_KEY }}" > ~/.ssh/id_rsa
            HOST="${{ secrets.STAGING_HOST }}"
            USER="${{ secrets.STAGING_USER }}"
          fi
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H $HOST >> ~/.ssh/known_hosts
          echo "SSH_HOST=$HOST" >> $GITHUB_ENV
          echo "SSH_USER=$USER" >> $GITHUB_ENV
      
      - name: Perform rollback
        run: |
          ssh ${{ env.SSH_USER }}@${{ env.SSH_HOST }} '
            cd /home/dacoris/${{ github.event.inputs.environment }}
            
            # Restore previous docker-compose
            if [ -f docker-compose.yml.backup ]; then
              mv docker-compose.yml.backup docker-compose.yml
            fi
            
            # Rollback to previous images
            docker tag ${{ secrets.DOCKER_USERNAME }}/dacoris-backend:rollback ${{ secrets.DOCKER_USERNAME }}/dacoris-backend:latest
            docker tag ${{ secrets.DOCKER_USERNAME }}/dacoris-frontend:rollback ${{ secrets.DOCKER_USERNAME }}/dacoris-frontend:latest
            docker tag ${{ secrets.DOCKER_USERNAME }}/dacoris-nginx:rollback ${{ secrets.DOCKER_USERNAME }}/dacoris-nginx:latest
            
            # Restart with previous version
            docker-compose down
            docker-compose up -d
          '
      
      - name: Verify rollback
        run: |
          sleep 15
          if [ "${{ github.event.inputs.environment }}" == "production" ]; then
            URL="https://yourdomain.com/api/health"
          else
            URL="https://staging.yourdomain.com/api/health"
          fi
          
          response=$(curl -s -o /dev/null -w "%{http_code}" $URL)
          if [ $response -eq 200 ]; then
            echo "✅ Rollback successful!"
          else
            echo "❌ Rollback verification failed"
            exit 1
          fi
      
      - name: Notify rollback status
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Rollback of ${{ github.event.inputs.environment }} ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Server Setup for CI/CD

### 1. Create Deployment User

```bash
# On your server
sudo adduser dacoris
sudo usermod -aG docker dacoris
sudo usermod -aG sudo dacoris

# Create deployment directories
sudo mkdir -p /home/dacoris/staging
sudo mkdir -p /home/dacoris/production
sudo chown -R dacoris:dacoris /home/dacoris
```

### 2. Generate SSH Keys for GitHub Actions

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-staging" -f ~/.ssh/dacoris-staging
ssh-keygen -t ed25519 -C "github-actions-production" -f ~/.ssh/dacoris-production

# Copy public keys to server
ssh-copy-id -i ~/.ssh/dacoris-staging.pub dacoris@staging-server
ssh-copy-id -i ~/.ssh/dacoris-production.pub dacoris@production-server
```

### 3. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

#### Docker Registry Secrets
- `DOCKER_USERNAME`: Your Docker Hub username
- `DOCKER_PASSWORD`: Your Docker Hub password or access token

#### Staging Server Secrets
- `STAGING_HOST`: Staging server IP or domain
- `STAGING_USER`: SSH user (e.g., `dacoris`)
- `STAGING_SSH_KEY`: Private SSH key content (from `~/.ssh/dacoris-staging`)

#### Production Server Secrets
- `PRODUCTION_HOST`: Production server IP or domain
- `PRODUCTION_USER`: SSH user (e.g., `dacoris`)
- `PRODUCTION_SSH_KEY`: Private SSH key content (from `~/.ssh/dacoris-production`)

#### Application Secrets
- `JWT_SECRET_KEY`: Your JWT secret key
- `ORCID_CLIENT_ID`: ORCID OAuth client ID
- `ORCID_CLIENT_SECRET`: ORCID OAuth client secret
- `SMTP_PASSWORD`: Email SMTP password
- `DB_PASSWORD`: PostgreSQL password

#### Notification Secrets (Optional)
- `SLACK_WEBHOOK`: Slack webhook URL for notifications

### 4. Create Environment Files

Create `.env.staging` in your repository root:

```env
# Staging Environment Configuration
PORT=8000
FRONTEND_URL=https://staging.yourdomain.com
DATABASE_URL=postgresql+asyncpg://postgres:${DB_PASSWORD}@db:5432/dacoris

JWT_SECRET_KEY=${JWT_SECRET_KEY}
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ADMIN_SESSION_EXPIRE_MINUTES=480

ORCID_CLIENT_ID=${ORCID_CLIENT_ID}
ORCID_CLIENT_SECRET=${ORCID_CLIENT_SECRET}
ORCID_REDIRECT_URI=https://staging.yourdomain.com/api/auth/orcid/callback
ORCID_SANDBOX_MODE=true
ORCID_API_BASE_URL=https://sandbox.orcid.org

GLOBAL_ADMIN_EMAIL=admin@yourdomain.com
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE_MB=50
NOTIFICATION_MODE=console

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=${SMTP_PASSWORD}
FROM_EMAIL="DACORIS Staging <no-reply@yourdomain.com>"

KOBO_API_BASE_URL=https://kf.kobotoolbox.org/api/v2
```

Create `.env.production` (similar structure with production values)

**Important**: Add these files to `.gitignore` and use GitHub Secrets for sensitive values.

---

## Deployment Strategies

### 1. Blue-Green Deployment

```mermaid
graph TB
    A[Load Balancer] --> B[Blue Environment<br/>Current]
    A -.-> C[Green Environment<br/>New Version]
    
    D[Deploy to Green] --> E[Test Green]
    E --> F{Tests Pass?}
    F -->|Yes| G[Switch Traffic to Green]
    F -->|No| H[Keep Blue Active]
    G --> I[Blue becomes Standby]
    
    style B fill:#095587,stroke:#333,stroke-width:2px
    style C fill:#2b7d2b,stroke:#333,stroke-width:2px
```

### 2. Rolling Deployment

```mermaid
graph LR
    A[Start] --> B[Update Backend]
    B --> C[Health Check]
    C --> D[Update Frontend]
    D --> E[Health Check]
    E --> F[Update Nginx]
    F --> G[Final Check]
    G --> H[Complete]
    
    style H fill:#2b7d2b,stroke:#333,stroke-width:2px
```

### 3. Canary Deployment

Deploy to a small subset of users first:

```yaml
# Example: Deploy to 10% of traffic
- name: Canary deployment
  run: |
    # Deploy new version to canary servers
    # Monitor metrics for 30 minutes
    # If successful, deploy to all servers
```

---

## Environment Management

### Environment Variables Priority

```mermaid
graph TB
    A[GitHub Secrets] --> B[Environment Files]
    B --> C[Docker Compose]
    C --> D[Application]
    
    style A fill:#811010,stroke:#333,stroke-width:2px
```

### Managing Multiple Environments

Create environment-specific compose files:

**docker-compose.staging.yml**:
```yaml
version: '3.8'

services:
  backend:
    image: ${DOCKER_USERNAME}/dacoris-backend:latest
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - FRONTEND_URL=https://staging.yourdomain.com
    # ... other staging-specific config

  frontend:
    image: ${DOCKER_USERNAME}/dacoris-frontend:latest
    # ... staging config

  nginx:
    image: ${DOCKER_USERNAME}/dacoris-nginx:latest
    # ... staging config
```

---

## Security Best Practices

### 1. Secrets Management

```mermaid
graph TB
    A[Secrets] --> B[GitHub Secrets]
    B --> C[Encrypted in Transit]
    C --> D[Environment Variables]
    D --> E[Application]
    
    F[Never in Code] -.-> A
    G[Never in Logs] -.-> D
    
    style B fill:#811010,stroke:#333,stroke-width:2px
```

### 2. Security Checklist

- [ ] Use SSH keys instead of passwords
- [ ] Rotate secrets regularly
- [ ] Use environment-specific secrets
- [ ] Enable 2FA on GitHub
- [ ] Restrict SSH access by IP
- [ ] Use Docker secrets for sensitive data
- [ ] Enable GitHub branch protection
- [ ] Require pull request reviews
- [ ] Enable security scanning
- [ ] Use signed commits

### 3. Docker Image Security

Add to your workflows:

```yaml
- name: Scan Docker images
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.BACKEND_IMAGE }}:latest
    format: 'sarif'
    output: 'trivy-results.sarif'

- name: Upload scan results
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: 'trivy-results.sarif'
```

---

## Monitoring and Rollback

### Deployment Monitoring Dashboard

```mermaid
graph TB
    A[Deployment] --> B[Health Checks]
    A --> C[Error Logs]
    A --> D[Performance Metrics]
    A --> E[User Analytics]
    
    B --> F{All Green?}
    C --> F
    D --> F
    E --> F
    
    F -->|Yes| G[Success]
    F -->|No| H[Auto Rollback]
    
    style G fill:#2b7d2b,stroke:#333,stroke-width:2px
    style H fill:#bb333c,stroke:#333,stroke-width:2px
```

### Post-Deployment Checks

Create a monitoring script on your server:

```bash
#!/bin/bash
# /home/dacoris/scripts/post-deploy-check.sh

echo "Running post-deployment checks..."

# Check backend health
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health)
if [ "$BACKEND_STATUS" != "200" ]; then
    echo "❌ Backend health check failed"
    exit 1
fi

# Check frontend
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_STATUS" != "200" ]; then
    echo "❌ Frontend health check failed"
    exit 1
fi

# Check database connection
DB_CHECK=$(docker exec dacoris-db psql -U postgres -d dacoris -c "SELECT 1" 2>&1)
if [[ $DB_CHECK != *"1 row"* ]]; then
    echo "❌ Database connection failed"
    exit 1
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "⚠️  Warning: Disk usage is at ${DISK_USAGE}%"
fi

# Check memory
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ "$MEM_USAGE" -gt 90 ]; then
    echo "⚠️  Warning: Memory usage is at ${MEM_USAGE}%"
fi

echo "✅ All post-deployment checks passed"
```

### Automatic Rollback Triggers

Add to your deployment workflow:

```yaml
- name: Monitor deployment
  run: |
    # Monitor error rate for 5 minutes
    for i in {1..30}; do
      ERROR_RATE=$(curl -s https://yourdomain.com/api/metrics | jq '.error_rate')
      if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
        echo "Error rate too high: $ERROR_RATE"
        exit 1
      fi
      sleep 10
    done
```

---

## Troubleshooting

### Common CI/CD Issues

#### 1. Build Failures

```bash
# Check build logs
gh run view <run-id> --log

# Rebuild locally
docker build -t test-build ./backend
```

#### 2. SSH Connection Issues

```bash
# Test SSH connection
ssh -i ~/.ssh/dacoris-production dacoris@production-server

# Check SSH key permissions
chmod 600 ~/.ssh/dacoris-production

# Verify key is added to server
cat ~/.ssh/dacoris-production.pub
# Compare with server's ~/.ssh/authorized_keys
```

#### 3. Docker Pull Failures

```bash
# On server, check Docker login
docker login

# Verify image exists
docker pull username/dacoris-backend:latest

# Check disk space
df -h
```

#### 4. Health Check Failures

```bash
# Check container logs
docker logs dacoris-backend --tail=100

# Check if services are running
docker ps

# Test health endpoint manually
curl -v http://localhost:8000/api/health
```

#### 5. Database Migration Failures

```bash
# Check migration status
docker exec dacoris-backend alembic current

# View migration history
docker exec dacoris-backend alembic history

# Rollback migration
docker exec dacoris-backend alembic downgrade -1
```

### Debugging Workflows

Enable debug logging in GitHub Actions:

1. Go to repository Settings → Secrets
2. Add secret: `ACTIONS_STEP_DEBUG` = `true`
3. Add secret: `ACTIONS_RUNNER_DEBUG` = `true`

### Emergency Procedures

#### Quick Rollback

```bash
# SSH to server
ssh dacoris@production-server

# Navigate to deployment directory
cd /home/dacoris/production

# Restore previous version
docker-compose down
docker tag username/dacoris-backend:rollback username/dacoris-backend:latest
docker tag username/dacoris-frontend:rollback username/dacoris-frontend:latest
docker-compose up -d

# Verify
curl http://localhost:8000/api/health
```

#### Database Restore

```bash
# List backups
ls -lh /var/backups/dacoris/

# Restore from backup
gunzip < /var/backups/dacoris/pre-deploy-YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i dacoris-db psql -U postgres dacoris
```

---

## Best Practices Summary

### Development Workflow

```mermaid
graph LR
    A[Feature Branch] --> B[Pull Request]
    B --> C[CI Tests]
    C --> D[Code Review]
    D --> E[Merge to Main]
    E --> F[Deploy to Staging]
    F --> G[QA Testing]
    G --> H[Create Release]
    H --> I[Deploy to Production]
    
    style I fill:#095587,stroke:#333,stroke-width:2px
```

### Key Recommendations

1. **Always test in staging first**
2. **Use semantic versioning for releases**
3. **Keep deployment scripts in version control**
4. **Monitor deployments for at least 30 minutes**
5. **Have a rollback plan ready**
6. **Document all deployment procedures**
7. **Use environment-specific configurations**
8. **Automate database backups before deployments**
9. **Keep secrets out of code**
10. **Review and rotate credentials regularly**

---

## Additional Resources

### Useful Commands

```bash
# View workflow runs
gh run list

# Watch a workflow run
gh run watch

# View workflow logs
gh run view --log

# Trigger workflow manually
gh workflow run cd-production.yml

# List secrets
gh secret list

# Set a secret
gh secret set SECRET_NAME
```

### Monitoring Tools

- **Uptime monitoring**: UptimeRobot, Pingdom
- **Error tracking**: Sentry, Rollbar
- **Log aggregation**: ELK Stack, Grafana Loki
- **Metrics**: Prometheus, Grafana
- **APM**: New Relic, DataDog

### Further Reading

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [12-Factor App Methodology](https://12factor.net/)
- [CI/CD Best Practices](https://www.atlassian.com/continuous-delivery/principles/continuous-integration-vs-delivery-vs-deployment)

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-17  
**Maintained By**: DACORIS Team
