# Local Development with Remote Database

This guide explains how to run the DACORIS application locally using Docker Compose while connecting to the remote production database via SSH tunnel.

## Prerequisites

- Docker and Docker Compose installed
- SSH access to the remote server (adminuser@41.89.92.140)
- `.env.docker` file configured in the project root

---

## Step 1: Find Remote Database Container

SSH into the remote server to identify the PostgreSQL container:

```bash
ssh adminuser@41.89.92.140 -p 22000
```

Once connected, run:

```bash
# List all PostgreSQL containers
docker ps | grep postgres
```

**Example output:**
```
e07247099a9d   postgres:15-alpine   "docker-entrypoint.s…"   19 hours ago   Up 19 hours (healthy)   5432/tcp   dacoris-db-prod
```

Note the container name (e.g., `dacoris-db-prod`).

---

## Step 2: Get Database Container IP Address

Get the internal IP address of the PostgreSQL container:

```bash
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' dacoris-db-prod
```

**Example output:**
```
172.19.0.2
```

Save this IP address - you'll need it for the SSH tunnel.

You can now exit the SSH session:
```bash
exit
```

---

## Step 3: Create SSH Tunnel to Remote Database

From your **local machine**, create an SSH tunnel that forwards local port 15432 to the remote PostgreSQL container:

```bash
ssh -L 15432:172.19.0.2:5432 adminuser@41.89.92.140 -p 22000 -N
```

**Command breakdown:**
- `-L 15432:172.19.0.2:5432` - Forward local port 15432 to container IP 172.19.0.2 port 5432
- `adminuser@41.89.92.140` - Remote server credentials
- `-p 22000` - SSH port on remote server
- `-N` - Don't execute remote commands (tunnel only)

**Important:** Replace `172.19.0.2` with the actual IP address you got in Step 2.

Enter the password when prompted. **Keep this terminal window open** - closing it will terminate the tunnel.

---

## Step 4: Configure Local Environment

Ensure your `.env.docker` file is configured to use the tunneled database connection:

```env
# Database Configuration (via SSH tunnel)
DATABASE_URL=postgresql://dacoris_user:your_password@host.docker.internal:15432/dacoris_db

# Or individual variables
DB_HOST=host.docker.internal
DB_PORT=15432
DB_NAME=dacoris_db
DB_USER=dacoris_user
DB_PASSWORD=your_password

# Other environment variables...
```

**Note:** Use `host.docker.internal` (on Windows/Mac) or `172.17.0.1` (on Linux) to access the host machine from within Docker containers.

---

## Step 5: Run Application Locally

With the SSH tunnel active, start the local application:

```bash
docker-compose --env-file .env.docker up -d --build
```

**Command breakdown:**
- `--env-file .env.docker` - Use the Docker environment file
- `up` - Start services
- `-d` - Run in detached mode (background)
- `--build` - Rebuild images before starting

---

## Step 6: Verify Connection

Check that containers are running:

```bash
docker-compose ps
```

View logs to confirm database connection:

```bash
# Backend logs
docker-compose logs -f backend

# All services
docker-compose logs -f
```

Access the application:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## Stopping the Application

Stop local containers:

```bash
docker-compose down
```

Stop the SSH tunnel:
- Press `Ctrl+C` in the terminal where the tunnel is running
- Or find and kill the SSH process

---

## Troubleshooting

### SSH Tunnel Connection Refused

If you see "Connection refused" errors:

1. Verify the container is running:
   ```bash
   ssh adminuser@41.89.92.140 -p 22000 "docker ps | grep postgres"
   ```

2. Confirm the container IP hasn't changed:
   ```bash
   ssh adminuser@41.89.92.140 -p 22000 "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' dacoris-db-prod"
   ```

3. Update your SSH tunnel command with the correct IP

### Database Connection Errors

1. Verify SSH tunnel is active:
   ```bash
   # On Windows PowerShell
   netstat -an | findstr "15432"
   
   # On Linux/Mac
   netstat -an | grep 15432
   ```

2. Check database credentials in `.env.docker`

3. Ensure `host.docker.internal` resolves (Windows/Mac) or use `172.17.0.1` (Linux)

### Container Won't Start

1. Check for port conflicts:
   ```bash
   docker-compose ps
   netstat -an | findstr "3000 8000"
   ```

2. View detailed logs:
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   ```

3. Rebuild without cache:
   ```bash
   docker-compose down
   docker-compose --env-file .env.docker up -d --build --force-recreate
   ```

---

## Quick Reference Commands

```bash
# Find remote DB container
ssh adminuser@41.89.92.140 -p 22000 "docker ps | grep postgres"

# Get container IP
ssh adminuser@41.89.92.140 -p 22000 "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' dacoris-db-prod"

# Create SSH tunnel (replace IP as needed)
ssh -L 15432:172.19.0.2:5432 adminuser@41.89.92.140 -p 22000 -N

# Start local app
docker-compose --env-file .env.docker up -d --build

# View logs
docker-compose logs -f

# Stop local app
docker-compose down
```

---

## Security Notes

- **Never commit** `.env.docker` with production credentials to version control
- The SSH tunnel encrypts all database traffic
- Port 15432 is only accessible on your local machine
- Always close the SSH tunnel when not in use
- Consider using SSH key authentication instead of passwords

---

## Alternative: Using SSH Config

For convenience, add this to your `~/.ssh/config`:

```
Host dacoris-prod
    HostName 41.89.92.140
    Port 22000
    User adminuser
    LocalForward 15432 172.19.0.2:5432
```

Then simply run:
```bash
ssh -N dacoris-prod
```
