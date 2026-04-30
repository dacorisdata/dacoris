# DACORIS Quick Start Commands

## 🔥 Development Mode (Hot Reload)

### Start
```bash
docker-compose -f docker-compose.dev.yml up
```

### Start in Background
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Stop
```bash
docker-compose -f docker-compose.dev.yml down
```

### Rebuild
```bash
docker-compose -f docker-compose.dev.yml up --build
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

---

## 🚀 Production Mode

### Start
```bash
docker-compose up
```

### Start in Background
```bash
docker-compose up -d
```

### Stop
```bash
docker-compose down
```

### Rebuild
```bash
docker-compose up --build
```

---

## 🔧 Common Tasks

### Restart Frontend
```bash
docker-compose -f docker-compose.dev.yml restart frontend
```

### Clear Next.js Cache
```bash
docker-compose -f docker-compose.dev.yml exec frontend rm -rf .next
docker-compose -f docker-compose.dev.yml restart frontend
```

### Install New Package
```bash
# Add package to package.json, then:
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up --build
```

### Access Container Shell
```bash
# Frontend
docker-compose -f docker-compose.dev.yml exec frontend sh

# Backend
docker-compose -f docker-compose.dev.yml exec backend sh

# Database
docker-compose -f docker-compose.dev.yml exec db psql -U postgres -d dacoris
```

---

## 📍 Access Points

- **Frontend:** http://localhost or http://192.168.100.90
- **Backend API:** http://localhost/api or http://192.168.100.90/api
- **Database:** localhost:5433

---

## 🆘 Troubleshooting

### Changes Not Showing?
```bash
docker-compose -f docker-compose.dev.yml restart frontend
```

### Complete Reset
```bash
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up --build
```

### Check Running Containers
```bash
docker ps
```

### Check Container Logs
```bash
docker logs dacoris-frontend
docker logs dacoris-backend
docker logs dacoris-db
```

---

## 📝 Notes

- **Development:** Use `docker-compose.dev.yml` for hot reload
- **Production:** Use `docker-compose.yml` for optimized build
- **Hot Reload:** Changes to frontend code appear instantly
- **Restart Required:** After installing packages or changing config
