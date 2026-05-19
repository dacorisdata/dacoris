# DACORIS Troubleshooting Guide

## Docker Build Issues

### TLS Handshake Timeout Error

**Error**: `net/http: TLS handshake timeout` when pulling images from Docker Hub

**Causes**:
1. Slow or unstable internet connection
2. Docker Hub rate limiting
3. Firewall/proxy blocking Docker Hub
4. DNS resolution issues

**Solutions**:

#### 1. Check Docker Hub Connection
```powershell
# Test connection to Docker Hub
docker pull hello-world
```

#### 2. Restart Docker Desktop
```powershell
# Close Docker Desktop completely
# Then restart it
```

#### 3. Use Cached Images (if available)
```powershell
# Build without pulling new images
docker-compose build --no-cache

# Or use existing images
docker-compose up
```

#### 4. Configure Docker to Use Different DNS
1. Open Docker Desktop
2. Go to Settings → Docker Engine
3. Add DNS configuration:
```json
{
  "dns": ["8.8.8.8", "8.8.4.4"]
}
```
4. Click "Apply & Restart"

#### 5. Increase Timeout
Add to Docker Engine configuration:
```json
{
  "max-concurrent-downloads": 3,
  "max-concurrent-uploads": 5
}
```

#### 6. Use a VPN or Different Network
If your network has restrictions, try:
- Using a VPN
- Switching to mobile hotspot
- Using a different network

#### 7. Pull Images Manually First
```powershell
# Pull images one by one
docker pull python:3.11-slim
docker pull node:20-alpine
docker pull nginx:alpine
docker pull postgres:15-alpine

# Then build
docker-compose up --build
```

#### 8. Check Proxy Settings
If you're behind a corporate proxy:

1. Open Docker Desktop → Settings → Resources → Proxies
2. Enable "Manual proxy configuration"
3. Enter your proxy details
4. Click "Apply & Restart"

## Common Solutions

### Quick Fix (Try This First)
```powershell
# 1. Restart Docker Desktop
# 2. Wait 30 seconds
# 3. Try again
docker-compose up --build
```

### If Still Failing
```powershell
# Pull images manually with retries
docker pull python:3.11-slim
docker pull node:20-alpine
docker pull nginx:alpine
docker pull postgres:15-alpine

# Then build without pulling
docker-compose build
docker-compose up -d
```

### Use Pre-built Images (Advanced)
If you have persistent network issues, you can use pre-built images:

1. Build on a machine with good internet
2. Save images:
```powershell
docker save dacoris-backend:latest | gzip > backend.tar.gz
docker save dacoris-frontend:latest | gzip > frontend.tar.gz
docker save dacoris-nginx:latest | gzip > nginx.tar.gz
```

3. Load on target machine:
```powershell
docker load < backend.tar.gz
docker load < frontend.tar.gz
docker load < nginx.tar.gz
```

## Other Common Issues

### Port Already in Use
```powershell
# Check what's using port 80
netstat -ano | findstr :80

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Or change port in docker-compose.yml
# Change "80:80" to "8080:80"
```

### Database Connection Failed
```powershell
# Check if database is healthy
docker-compose ps

# View database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### Frontend Not Loading
```powershell
# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up -d --build frontend
```

### Backend Crashes on Startup
```powershell
# Check backend logs
docker-compose logs backend

# Common causes:
# 1. Database not ready - wait and restart
# 2. Environment variables missing - check .env.local
# 3. Port conflict - check if port 8000 is free
```

### Permission Denied Errors
```powershell
# Run PowerShell as Administrator
# Then try again
docker-compose up --build
```

## Network Diagnostics

### Test Docker Network
```powershell
# Check Docker is running
docker ps

# Test Docker Hub connection
docker pull hello-world

# Check DNS resolution
nslookup registry-1.docker.io

# Test network connectivity
Test-NetConnection -ComputerName registry-1.docker.io -Port 443
```

### Check Docker Desktop Status
```powershell
# View Docker system info
docker info

# Check Docker version
docker --version
docker-compose --version
```

## Getting Help

If issues persist:

1. **Check logs**:
```powershell
docker-compose logs -f
```

2. **Check container status**:
```powershell
docker-compose ps
```

3. **Get system info**:
```powershell
docker info
docker-compose version
```

4. **Clean everything and retry**:
```powershell
docker-compose down -v
docker system prune -a
docker-compose up --build
```

## Contact Support

Include this information when asking for help:
- Error message (full output)
- Docker version: `docker --version`
- Docker Compose version: `docker-compose --version`
- Operating System: Windows 11
- Network setup (corporate/home/VPN)
- Output of: `docker-compose logs`
