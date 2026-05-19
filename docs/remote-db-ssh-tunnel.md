# Connecting Dacoris to Remote PostgreSQL via SSH Tunnel

The remote PostgreSQL server is not publicly exposed. Access is provided through an SSH tunnel that forwards a local port to the remote database port.

---

## Overview

```
Your Machine (Windows)          Remote Server (41.89.92.140)
┌──────────────────────┐        ┌──────────────────────────┐
│                      │        │                           │
│  Docker Backend ─────┼──────► │  PostgreSQL :5432         │
│  (host.docker.       │  SSH   │                           │
│   internal:15432)    │ Tunnel │                           │
│                      │        │                           │
│  localhost:15432 ◄───┼────────┤  SSH Daemon :22000        │
└──────────────────────┘        └──────────────────────────┘
```

---

## Prerequisites

- SSH access to `41.89.92.140` on port `22000` with user `adminuser`
- Docker Desktop running on Windows
- Dacoris project at `C:\projects\dacoris`

---

## Step 1: Open the SSH Tunnel

Run this command in a **dedicated PowerShell window** and **keep it open**:

```powershell
ssh -L 15432:localhost:5432 adminuser@41.89.92.140 -p 22000 -N
```

**What this does:**
- `-L 15432:localhost:5432` — forwards `localhost:15432` on your machine to `localhost:5432` on the remote server
- `-p 22000` — SSH port on the remote server
- `-N` — no remote command, tunnel only

> **Note:** Port `15432` is used instead of `5432` to avoid conflicts with any local PostgreSQL instance.

The terminal will appear to hang — that is correct. The tunnel is active as long as this window is open.

---

## Step 2: Verify the Tunnel

Open a new PowerShell window and test connectivity:

```powershell
# Should return PostgreSQL version if tunnel is working
psql -h localhost -p 15432 -U postgres -d dacoris -c "SELECT version();"
```

Or with Docker:

```powershell
docker run --rm --add-host=host.docker.internal:host-gateway postgres:15-alpine `
  psql postgresql://postgres:d6xvCEiRaBMmOwWqg69Np67pqcYWhqTF@host.docker.internal:15432/dacoris `
  -c "SELECT version();"
```

---

## Step 3: Environment Configuration

The `.env.docker` file is already configured for the tunnel:

```env
# Remote PostgreSQL (SSH tunnel: 41.89.92.140:22000 -> localhost:5432)
POSTGRES_PASSWORD=d6xvCEiRaBMmOwWqg69Np67pqcYWhqTF
DATABASE_URL=postgresql+asyncpg://postgres:d6xvCEiRaBMmOwWqg69Np67pqcYWhqTF@host.docker.internal:15432/dacoris
```

`host.docker.internal` resolves to the Windows host from inside the Docker container, so the backend container reaches `localhost:15432` on the host, which is forwarded through the SSH tunnel to the remote PostgreSQL.

---

## Step 4: Start the Application

With the SSH tunnel active, start the containers:

```powershell
cd C:\projects\dacoris
docker compose --env-file .env.docker up -d --build
```

---

## Step 5: Verify Backend Connectivity

Check the backend logs to confirm the database connection succeeded:

```powershell
docker logs dacoris-backend --tail 20
```

Look for:
```
Database connected and initialized
Application startup complete.
Uvicorn running on http://0.0.0.0:8000
```

If you see `Connection refused` or `could not connect to server`, the SSH tunnel is not active — go back to Step 1.

---

## Stopping

To stop the application:

```powershell
docker compose --env-file .env.docker down
```

Then close the PowerShell window running the SSH tunnel (Ctrl+C).

---

## Keeping the Tunnel Alive (Optional)

For long-running sessions, add keep-alive flags to prevent the tunnel from dropping:

```powershell
ssh -L 15432:localhost:5432 adminuser@41.89.92.140 -p 22000 -N `
    -o ServerAliveInterval=60 `
    -o ServerAliveCountMax=3
```

---

## Reverse Tunnel (for MinIO Ingest Service)

The MinIO ingest service at `102.68.87.70` needs to reach the Dacoris API at `192.168.100.87`. Since `192.168.100.87` is a private LAN IP unreachable from the internet, use a **reverse tunnel**:

```powershell
ssh -R 8080:localhost:80 adminuser@41.89.92.140 -p 22000 -N
```

**What this does:**
- Exposes `localhost:80` (Dacoris nginx) as `localhost:8080` on the remote server
- The MinIO ingest service can then use `DACORIS_API_URL=http://localhost:8080`

> Both tunnels can run simultaneously in separate PowerShell windows.

---

## Summary

| Tunnel | Command | Purpose |
|--------|---------|---------|
| **Forward** (DB) | `ssh -L 15432:localhost:5432 adminuser@41.89.92.140 -p 22000 -N` | Backend → Remote PostgreSQL |
| **Reverse** (API) | `ssh -R 8080:localhost:80 adminuser@41.89.92.140 -p 22000 -N` | MinIO service → Dacoris API |

---

## Moving the App to the Remote Server

When the app is deployed **on** `41.89.92.140` directly, the SSH tunnels are no longer needed. The following changes apply.

### Architecture on the Remote Server

```
Remote Server (41.89.92.140)
┌─────────────────────────────────────────┐
│                                         │
│  Docker: dacoris-backend ───────────►  PostgreSQL :5432 (host or db container)
│  Docker: dacoris-frontend               │
│  Docker: dacoris-nginx  ◄─── public ── :80
│                                         │
│  MinIO ingest service reaches Dacoris   │
│  directly via http://41.89.92.140       │
└─────────────────────────────────────────┘
```

### 1. Database URL — no tunnel needed

If PostgreSQL runs as a **Docker service** named `db` (using `docker-compose.prod.yml`):
```env
DATABASE_URL=postgresql+asyncpg://postgres:d6xvCEiRaBMmOwWqg69Np67pqcYWhqTF@db:5432/dacoris
```

If PostgreSQL runs **natively on the host** (not in Docker):
```env
DATABASE_URL=postgresql+asyncpg://postgres:d6xvCEiRaBMmOwWqg69Np67pqcYWhqTF@host.docker.internal:5432/dacoris
```

### 2. MinIO Ingest — no reverse tunnel needed

The MinIO ingest service at `102.68.87.70` can reach Dacoris directly via the public IP:
```env
DACORIS_API_URL=http://41.89.92.140
```

### 3. ORCID Redirect URI — update to server IP

```env
ORCID_REDIRECT_URI=http://41.89.92.140/api/auth/orcid/callback
```

> Also update the redirect URI in your [ORCID developer portal](https://orcid.org/developer-tools).

### 4. Use `docker-compose.prod.yml`

The prod compose file is the correct one for remote deployment:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Create `.env.production` on the server with:
```env
# Database
POSTGRES_PASSWORD=d6xvCEiRaBMmOwWqg69Np67pqcYWhqTF
DATABASE_URL=postgresql+asyncpg://postgres:d6xvCEiRaBMmOwWqg69Np67pqcYWhqTF@db:5432/dacoris

# Auth
JWT_SECRET_KEY=f61375a0bb2981f19a4391c3e294b49a
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# ORCID
ORCID_CLIENT_ID=APP-S0GZISHBG32PK5HU
ORCID_CLIENT_SECRET=542b22f8-8f65-44a3-a0bd-e5043cc64bbd
ORCID_REDIRECT_URI=http://41.89.92.140/api/auth/orcid/callback
ORCID_SANDBOX_MODE=false
ORCID_API_BASE_URL=https://orcid.org

# MinIO / Ingest
INGEST_API_KEY=fe54ba2885ab0beab88a5479c6edbfa40d7f3317b88ff0f716d6d735da80da1e
MINIO_ENDPOINT=http://102.68.87.70:9000
MINIO_BRONZE_BUCKET=dacoris-bronze
MINIO_USE_SSL=false
```

### 5. Comparison: Local vs Remote

| Item | Local (Windows, tunneled) | Remote (41.89.92.140) |
|---|---|---|
| DB connection | `host.docker.internal:15432` via SSH tunnel | `db:5432` direct (Docker service) |
| SSH forward tunnel | ✅ Required | ❌ Not needed |
| SSH reverse tunnel | ✅ Required (MinIO → Dacoris) | ❌ Not needed |
| MinIO `DACORIS_API_URL` | `http://localhost:8080` | `http://41.89.92.140` |
| ORCID redirect URI | `http://192.168.100.87/api/auth/orcid/callback` | `http://41.89.92.140/api/auth/orcid/callback` |
| Compose file | `docker-compose.yml` + `.env.docker` | `docker-compose.prod.yml` + `.env.production` |
