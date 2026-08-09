# GitHub Actions Workflows

This directory contains all CI/CD workflows for the DACORIS project.

## Workflows Overview

### 1. CI Workflow (`ci.yml`)

**Purpose**: Continuous Integration - Test and build the application

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs**:
- **test-backend**: Run Python tests, linting, and code coverage
- **test-frontend**: Run Next.js linting and build
- **build-images**: Build and push Docker images to Docker Hub

**Duration**: ~5-10 minutes

**Required Secrets**:
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`

---

### 2. CD Production Workflow (`cd-production.yml`)

**Purpose**: Continuous Deployment to production server (41.89.92.140)

**Triggers**:
- Automatic: Push to `main` branch
- Manual: Workflow dispatch (with optional skip backup)

**Jobs**:
- **deploy-production**: Deploy to production server using git pull and docker compose

**Steps**:
1. Set up SSH connection to server
2. Backup database (unless skipped)
3. Pull latest code from GitHub (`git pull origin main`)
4. Verify `.env.production` file exists on server
5. Deploy with Docker Compose (`docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build`)
6. Run database migrations
7. Verify deployment (check container status)
8. Health check (with retries)
9. Show logs on failure

**Duration**: ~5-10 minutes (depending on build time)

**Required Secrets**:
- `PRODUCTION_SSH_KEY`: SSH private key for dacoris@41.89.92.140

**Important Notes**:
- `.env.production` must already exist on the server at `/opt/dacoris/rims/.env.production`
- Code is built directly on the server (not pulled from Docker Hub)
- Database is preserved during deployment
- Application URL: http://41.89.92.140

---

### 3. Rollback Workflow (`rollback.yml`)

**Purpose**: Rollback to previous deployment

**Triggers**:
- Manual: Workflow dispatch with environment selection

**Jobs**:
- **rollback**: Restore previous deployment

**Steps**:
1. SSH to selected server (staging/production)
2. Restore previous docker-compose.yml
3. Tag rollback images as latest
4. Restart containers
5. Verify rollback with health check
6. Notify on Slack (optional)

**Duration**: ~2-3 minutes

**Required Secrets**:
- Same as deployment workflows for selected environment

---

## How to Use

### Running Workflows Manually

1. Go to **Actions** tab in GitHub
2. Select the workflow you want to run
3. Click **Run workflow**
4. Select branch (if applicable)
5. Fill in inputs (if required)
6. Click **Run workflow**

### Monitoring Workflows

1. Go to **Actions** tab
2. Click on a workflow run
3. View logs for each job
4. Download artifacts (if available)

### Canceling Workflows

1. Go to **Actions** tab
2. Click on running workflow
3. Click **Cancel workflow**

---

## Workflow Status Badges

Add these badges to your README.md:

```markdown
![CI](https://github.com/yourusername/dacoris/workflows/CI%20-%20Test%20and%20Build/badge.svg)
![CD Production](https://github.com/yourusername/dacoris/workflows/CD%20-%20Deploy%20to%20Production/badge.svg)
```

---

## Debugging Workflows

### Enable Debug Logging

1. Go to **Settings** → **Secrets**
2. Add secrets:
   - `ACTIONS_STEP_DEBUG` = `true`
   - `ACTIONS_RUNNER_DEBUG` = `true`

### Common Issues

#### SSH Connection Fails

- Check SSH key is correctly added to secrets
- Verify server hostname/IP
- Test SSH connection manually
- Check server firewall rules

#### Docker Build Fails

- Check Dockerfile syntax
- Verify all dependencies are available
- Test build locally
- Check Docker Hub rate limits

#### Health Check Fails

- Check application logs
- Verify environment variables
- Test health endpoint manually
- Increase health check timeout

---

## Workflow Customization

### Deployment Process

The production deployment follows these principles:

1. **Git-based deployment**: Code is pulled directly from GitHub on the server
2. **Local builds**: Docker images are built on the production server
3. **Environment file**: `.env.production` is managed manually on the server (not in git)
4. **Database preservation**: Database volume is never deleted during deployment
5. **Health checks**: Automatic verification after deployment

### Modifying Deployment Steps

1. Edit workflow file
2. Test changes in feature branch
3. Create PR for review
4. Merge to main after approval

### Adding Notifications

Example: Add email notifications

```yaml
- name: Send email notification
  if: always()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 587
    username: ${{ secrets.SMTP_USER }}
    password: ${{ secrets.SMTP_PASSWORD }}
    subject: Deployment ${{ job.status }}
    body: Deployment to ${{ github.event.inputs.environment }} ${{ job.status }}
    to: admin@yourdomain.com
    from: GitHub Actions
```

---

## Security Considerations

### Secrets Management

- ✅ Never log secrets
- ✅ Use environment-specific secrets
- ✅ Rotate secrets regularly
- ✅ Limit secret access

### Workflow Permissions

- ✅ Use minimal required permissions
- ✅ Enable branch protection
- ✅ Require PR reviews
- ✅ Use environment protection rules

### SSH Security

- ✅ Use SSH keys (not passwords)
- ✅ SSH key stored in GitHub Secrets as `PRODUCTION_SSH_KEY`
- ✅ SSH user: `dacoris@41.89.92.140`
- ✅ Restrict SSH access by IP (recommended)
- ✅ Monitor SSH logs

---

## Performance Optimization

### Caching

Workflows use caching for:
- Python dependencies (`pip cache`)
- Node.js dependencies (`npm cache`)
- Docker layers (`buildx cache`)

### Parallel Jobs

- Backend and frontend tests run in parallel
- Independent deployment steps can be parallelized

### Resource Limits

- Workflows timeout after 60 minutes (default)
- Can be adjusted per workflow

---

## Maintenance

### Regular Tasks

- [ ] Review workflow logs weekly
- [ ] Update action versions monthly
- [ ] Test rollback procedure monthly
- [ ] Rotate secrets quarterly
- [ ] Review and optimize workflows quarterly

### Updating Actions

Check for updates to GitHub Actions:

```yaml
# Update from v3 to v4
- uses: actions/checkout@v3  # Old
- uses: actions/checkout@v4  # New
```

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)
- [Deployment Guide](../../.guides/DEPLOY_WITH_DOCKER_COMPOSE.md)
- [DACORIS CI/CD Setup Guide](../../CICD_SETUP_GUIDE.md)

---

## Support

For workflow issues:

1. Check workflow logs in Actions tab
2. Review this documentation
3. Check GitHub Actions status page
4. Contact DevOps team
