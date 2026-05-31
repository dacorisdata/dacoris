# Development Hot Reload Setup Guide

## Overview
The application now supports **hot reload** in development mode, allowing you to see changes instantly without rebuilding the Docker containers.

---

## Quick Start

### Development Mode (Hot Reload)
```bash
# Start with hot reload enabled
docker-compose -f docker-compose.dev.yml up --build

# Or in detached mode
docker-compose -f docker-compose.dev.yml up -d --build
```

### Production Mode (Optimized Build)
```bash
# Use the original docker-compose for production
docker-compose up --build
```

---

## What Changed?

### 1. **New Development Dockerfile** (`frontend/Dockerfile.dev`)
- Uses `npm run dev` instead of building
- Mounts source code as volumes
- Enables hot module replacement (HMR)

### 2. **New Development Compose File** (`docker-compose.dev.yml`)
- Uses `Dockerfile.dev` for frontend
- Mounts frontend code: `./frontend:/app`
- Preserves `node_modules` and `.next` folders
- Enables file watching with `WATCHPACK_POLLING=true`

### 3. **Updated Next.js Config** (`frontend/next.config.mjs`)
- Conditional `output: 'standalone'` (production only)
- Webpack polling for file changes in Docker
- Hot Module Replacement (HMR) enabled

---

## How It Works

### Development Mode:
1. **Frontend container** runs `npm run dev`
2. Your code is **mounted** into the container
3. Next.js **watches** for file changes
4. Changes are **instantly reflected** in the browser
5. **No rebuild** required!

### Production Mode:
1. Frontend is **built** (`npm run build`)
2. Optimized **standalone** output
3. Runs with `node server.js`
4. Minimal container size

---

## File Structure

```
dacoris/
├── docker-compose.yml          # Production (builds frontend)
├── docker-compose.dev.yml      # Development (hot reload)
├── frontend/
│   ├── Dockerfile              # Production build
│   ├── Dockerfile.dev          # Development (no build)
│   └── next.config.mjs         # Conditional config
└── backend/
    └── Dockerfile              # Backend (same for both)
```

---

## Usage Examples

### Start Development Environment
```bash
# First time or after dependency changes
docker-compose -f docker-compose.dev.yml up --build

# Subsequent starts (no build needed)
docker-compose -f docker-compose.dev.yml up
```

### Stop Development Environment
```bash
docker-compose -f docker-compose.dev.yml down
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Frontend only
docker-compose -f docker-compose.dev.yml logs -f frontend

# Backend only
docker-compose -f docker-compose.dev.yml logs -f backend
```

### Restart Frontend Only
```bash
docker-compose -f docker-compose.dev.yml restart frontend
```

---

## Hot Reload Features

### ✅ What Auto-Reloads:
- **React components** - Instant updates
- **Pages** - Automatic refresh
- **Styles** (CSS, Tailwind) - Live updates
- **API routes** - Restart on change
- **Configuration files** - Requires restart

### ⚠️ When to Restart:
- After installing new npm packages
- After changing `next.config.mjs`
- After changing environment variables
- After changing Docker configuration

---

## Troubleshooting

### Changes Not Reflecting?

1. **Check if container is running:**
   ```bash
   docker ps | grep dacoris-frontend
   ```

2. **Check logs for errors:**
   ```bash
   docker-compose -f docker-compose.dev.yml logs frontend
   ```

3. **Restart the frontend:**
   ```bash
   docker-compose -f docker-compose.dev.yml restart frontend
   ```

4. **Clear Next.js cache:**
   ```bash
   docker-compose -f docker-compose.dev.yml exec frontend rm -rf .next
   docker-compose -f docker-compose.dev.yml restart frontend
   ```

### Slow File Watching?

If changes are slow to detect, increase polling frequency in `next.config.mjs`:
```javascript
poll: 500, // Check every 500ms instead of 1000ms
```

### Port Already in Use?

```bash
# Stop all containers
docker-compose -f docker-compose.dev.yml down

# Check what's using port 3000
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Linux/Mac

# Kill the process or change the port in docker-compose.dev.yml
```

---

## Performance Tips

### 1. **Use .dockerignore**
Ensure you have a `.dockerignore` in the frontend folder:
```
node_modules
.next
.git
*.log
```

### 2. **Limit File Watching**
Next.js watches many files. For better performance:
- Close unused files in your editor
- Exclude large directories from your IDE's indexing

### 3. **Increase Docker Resources**
In Docker Desktop:
- **Memory:** 4GB minimum, 8GB recommended
- **CPUs:** 2 minimum, 4 recommended

---

## Environment Variables

### Development (.env.local)
Create `frontend/.env.local` for local overrides:
```env
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_ORCID_CLIENT_ID=APP-SFROMHSFNMHXG46K
```

### Docker Environment
Set in `docker-compose.dev.yml` under `frontend.environment`

---

## Switching Between Modes

### From Development to Production:
```bash
# Stop dev environment
docker-compose -f docker-compose.dev.yml down

# Start production
docker-compose up --build
```

### From Production to Development:
```bash
# Stop production
docker-compose down

# Start dev environment
docker-compose -f docker-compose.dev.yml up --build
```

---

## Best Practices

1. **Use dev mode for development** - Fast iteration
2. **Test in production mode before deploying** - Catch build issues
3. **Commit both compose files** - Team consistency
4. **Document environment variables** - Easy onboarding
5. **Keep dependencies updated** - Security and features

---

## CI/CD Integration

### GitHub Actions Example:
```yaml
# .github/workflows/deploy.yml
- name: Build and Deploy
  run: |
    docker-compose up --build -d  # Use production compose
```

### Local Testing:
```bash
# Test production build locally
docker-compose up --build
```

---

## Summary

| Feature | Development | Production |
|---------|-------------|------------|
| **Compose File** | `docker-compose.dev.yml` | `docker-compose.yml` |
| **Dockerfile** | `Dockerfile.dev` | `Dockerfile` |
| **Command** | `npm run dev` | `node server.js` |
| **Hot Reload** | ✅ Yes | ❌ No |
| **Build Time** | Fast (no build) | Slow (full build) |
| **Container Size** | Large | Small (optimized) |
| **Use Case** | Development | Production |

---

## Need Help?

- Check logs: `docker-compose -f docker-compose.dev.yml logs -f`
- Restart services: `docker-compose -f docker-compose.dev.yml restart`
- Rebuild: `docker-compose -f docker-compose.dev.yml up --build`
- Clean slate: `docker-compose -f docker-compose.dev.yml down -v && docker-compose -f docker-compose.dev.yml up --build`

Happy coding! 🚀
