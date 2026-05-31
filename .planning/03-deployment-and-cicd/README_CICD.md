# DACORIS CI/CD Quick Reference

## 🚀 Quick Start

### 1. First Time Setup

```bash
# On your server
sudo bash scripts/setup-server.sh

# On your local machine - generate SSH keys
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/dacoris-production
ssh-copy-id -i ~/.ssh/dacoris-production.pub dacoris@your-server-ip
```

### 2. Add GitHub Secrets

Go to **Settings** → **Secrets and variables** → **Actions** and add:

**Essential Secrets:**
- `DOCKER_USERNAME` - Your Docker Hub username
- `DOCKER_PASSWORD` - Your Docker Hub password/token
- `PRODUCTION_HOST` - Server IP or domain
- `PRODUCTION_USER` - SSH user (usually `dacoris`)
- `PRODUCTION_SSH_KEY` - Private SSH key content
- `PRODUCTION_URL` - Full URL (e.g., `https://yourdomain.com`)
- `DB_PASSWORD` - Database password
- `JWT_SECRET_KEY` - JWT secret (generate with `openssl rand -hex 32`)

See [`.github/SECRETS.md`](.github/SECRETS.md) for complete list.

### 3. Test Pipeline

```bash
git add .
git commit -m "test: CI/CD setup"
git push origin main
```

Check **Actions** tab in GitHub.

---

## 📋 Workflows

### Automatic Workflows

| Event | Workflow | Action |
|-------|----------|--------|
| Push to `main`/`develop` | CI | Test, lint, build images |
| Push to `main` | CD Staging | Deploy to staging |
| Publish release | CD Production | Deploy to production |

### Manual Workflows

| Workflow | When to Use |
|----------|-------------|
| CD Production | Deploy specific version |
| Rollback | Revert to previous version |

**To run manually:**
1. Go to **Actions** tab
2. Select workflow
3. Click **Run workflow**
4. Fill inputs and run

---

## 🔧 Common Commands

### On Server

```bash
# Check health
/home/dacoris/health-check.sh

# Manual backup
/home/dacoris/backup.sh

# View logs
docker logs dacoris-backend-prod --tail=100 -f

# Restart services
cd /home/dacoris
docker-compose restart

# Check disk space
df -h
docker system df
```

### Local Deployment

```bash
# Deploy to remote server
bash scripts/deploy-local.sh production your-server-ip

# Rollback
bash scripts/rollback.sh production your-server-ip
```

---

## 🔍 Troubleshooting

### Pipeline Fails

```bash
# Check GitHub Actions logs
# Actions tab → Click failed workflow → View logs

# Test locally
docker build -t test ./backend
```

### SSH Issues

```bash
# Test connection
ssh -i ~/.ssh/dacoris-production dacoris@your-server

# Fix permissions
chmod 600 ~/.ssh/dacoris-production
```

### Health Check Fails

```bash
# On server
docker ps  # Check containers
docker logs dacoris-backend-prod --tail=50
curl http://localhost/api/health
```

### Rollback

**Via GitHub:**
1. Actions → Rollback Deployment → Run workflow
2. Select environment → Run

**Via SSH:**
```bash
ssh dacoris@your-server
cd /home/dacoris
bash /path/to/scripts/rollback.sh production
```

---

## 📚 Documentation

- **[CICD_SETUP_GUIDE.md](CICD_SETUP_GUIDE.md)** - Complete setup guide
- **[.github/SECRETS.md](.github/SECRETS.md)** - All required secrets
- **[.github/workflows/README.md](.github/workflows/README.md)** - Workflow details
- **[CICD_DEPLOYMENT_GUIDE.md](CICD_DEPLOYMENT_GUIDE.md)** - Advanced deployment strategies

---

## 🔐 Security Checklist

- [ ] Different passwords for staging/production
- [ ] Secrets added to GitHub (not in code)
- [ ] SSH keys generated and configured
- [ ] Firewall configured (ports 22, 80, 443)
- [ ] 2FA enabled on GitHub and Docker Hub
- [ ] Backups tested and working
- [ ] SSL certificates configured (production)

---

## 📊 Monitoring

### Daily
- Check GitHub Actions for failures
- Review application logs

### Weekly
- Check disk space
- Review backup logs

### Monthly
- Test rollback procedure
- Update dependencies
- Rotate secrets (every 90 days)

---

## 🆘 Emergency Contacts

- **DevOps Team**: [your-contact]
- **GitHub Actions Status**: https://www.githubstatus.com/
- **Docker Hub Status**: https://status.docker.com/

---

## 🎯 Next Steps

After setup:

1. ✅ Configure SSL certificates (Let's Encrypt)
2. ✅ Setup monitoring (UptimeRobot, Datadog, etc.)
3. ✅ Configure Slack notifications
4. ✅ Setup staging environment
5. ✅ Document runbooks for common issues
6. ✅ Schedule regular maintenance windows

---

**Need Help?** Check the full documentation in `CICD_SETUP_GUIDE.md`
