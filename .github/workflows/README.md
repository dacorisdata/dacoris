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

### 2. CD Staging Workflow (`cd-staging.yml`)

**Purpose**: Continuous Deployment to staging environment

**Triggers**:
- Automatic: Push to `main` branch
- Manual: Workflow dispatch

**Jobs**:
- **deploy-staging**: Deploy to staging server

**Steps**:
1. SSH to staging server
2. Create environment file
3. Pull latest Docker images
4. Deploy containers
5. Run database migrations
6. Health check
7. Notify on Slack (optional)

**Duration**: ~3-5 minutes

**Required Secrets**:
- `DOCKER_USERNAME`, `DOCKER_PASSWORD`
- `STAGING_HOST`, `STAGING_USER`, `STAGING_SSH_KEY`, `STAGING_URL`
- `DB_PASSWORD`, `JWT_SECRET_KEY`
- `ORCID_CLIENT_ID`, `ORCID_CLIENT_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`
- `ADMIN_EMAIL`, `FROM_EMAIL`

---

### 3. CD Production Workflow (`cd-production.yml`)

**Purpose**: Continuous Deployment to production environment

**Triggers**:
- Automatic: When a release is published
- Manual: Workflow dispatch with version input

**Jobs**:
- **deploy-production**: Deploy to production server with rollback on failure

**Steps**:
1. Backup current deployment and database
2. Tag current images for rollback
3. SSH to production server
4. Create environment file
5. Pull latest Docker images
6. Deploy with zero-downtime rolling update
7. Run database migrations
8. Health check (with retries)
9. Rollback on failure
10. Notify on Slack (optional)

**Duration**: ~5-10 minutes

**Required Secrets**:
- All secrets from staging
- `PRODUCTION_HOST`, `PRODUCTION_USER`, `PRODUCTION_SSH_KEY`, `PRODUCTION_URL`
- `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `INGEST_API_KEY`, `MINIO_INGEST_URL`

**Environment Protection**:
- Requires manual approval (recommended)
- Production environment configured in repository settings

---

### 4. Rollback Workflow (`rollback.yml`)

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
![CD Staging](https://github.com/yourusername/dacoris/workflows/CD%20-%20Deploy%20to%20Staging/badge.svg)
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

### Adding New Environments

1. Create new workflow file (e.g., `cd-development.yml`)
2. Copy from existing workflow
3. Update environment name and secrets
4. Add environment in repository settings

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
- ✅ Different keys for each environment
- ✅ Restrict SSH access by IP
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
- [DACORIS CI/CD Setup Guide](../../CICD_SETUP_GUIDE.md)

---

## Support

For workflow issues:

1. Check workflow logs in Actions tab
2. Review this documentation
3. Check GitHub Actions status page
4. Contact DevOps team
