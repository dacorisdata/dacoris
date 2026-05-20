#!/bin/bash
# Server Setup Script for DACORIS CI/CD
# This script prepares a fresh Ubuntu server for DACORIS deployment

set -e

echo "🚀 DACORIS Server Setup Script"
echo "================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install required packages
echo "📦 Installing required packages..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Create deployment user
echo "👤 Creating deployment user..."
if ! id -u dacoris &> /dev/null; then
    useradd -m -s /bin/bash dacoris
    usermod -aG docker dacoris
    usermod -aG sudo dacoris
    echo "✅ User 'dacoris' created"
else
    echo "✅ User 'dacoris' already exists"
fi

# Create deployment directories
echo "📁 Creating deployment directories..."
mkdir -p /home/dacoris
mkdir -p /var/backups/dacoris
chown -R dacoris:dacoris /home/dacoris
chown -R dacoris:dacoris /var/backups/dacoris
echo "✅ Directories created"

# Configure firewall
echo "🔥 Configuring firewall..."
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
echo "✅ Firewall configured"

# Setup automatic security updates
echo "🔒 Setting up automatic security updates..."
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# Create backup script
echo "💾 Creating backup script..."
cat > /home/dacoris/backup.sh << 'EOF'
#!/bin/bash
# DACORIS Database Backup Script

BACKUP_DIR="/var/backups/dacoris"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Backup production database
if docker ps | grep -q dacoris-db-prod; then
    echo "Backing up production database..."
    docker exec dacoris-db-prod pg_dump -U postgres dacoris | gzip > "$BACKUP_DIR/prod-$TIMESTAMP.sql.gz"
fi

# Backup staging database
if docker ps | grep -q dacoris-db-staging; then
    echo "Backing up staging database..."
    docker exec dacoris-db-staging pg_dump -U postgres dacoris | gzip > "$BACKUP_DIR/staging-$TIMESTAMP.sql.gz"
fi

# Remove old backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $TIMESTAMP"
EOF

chmod +x /home/dacoris/backup.sh
chown dacoris:dacoris /home/dacoris/backup.sh

# Setup cron job for daily backups
echo "⏰ Setting up daily backup cron job..."
(crontab -u dacoris -l 2>/dev/null; echo "0 2 * * * /home/dacoris/backup.sh >> /var/log/dacoris-backup.log 2>&1") | crontab -u dacoris -

# Create health check script
echo "🏥 Creating health check script..."
cat > /home/dacoris/health-check.sh << 'EOF'
#!/bin/bash
# DACORIS Health Check Script

check_service() {
    local env=$1
    local url=$2
    
    echo "Checking $env environment..."
    
    # Check if containers are running
    containers=("dacoris-db-prod" "dacoris-backend-prod" "dacoris-frontend-prod" "dacoris-nginx-prod")
    
    for container in "${containers[@]}"; do
        if docker ps | grep -q "$container"; then
            echo "  ✅ $container is running"
        else
            echo "  ❌ $container is not running"
        fi
    done
    
    # Check API health endpoint
    if [ -n "$url" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url/api/health" 2>/dev/null || echo "000")
        if [ "$response" == "200" ]; then
            echo "  ✅ API health check passed"
        else
            echo "  ❌ API health check failed (HTTP $response)"
        fi
    fi
}

# Check deployment
if [ -f "/home/dacoris/docker-compose.yml" ]; then
    check_service "production" "${PRODUCTION_URL:-}"
else
    echo "No deployment found in /home/dacoris"
fi

# Check disk space
echo ""
echo "Disk Usage:"
df -h / | tail -1

# Check memory
echo ""
echo "Memory Usage:"
free -h | grep Mem

# Check Docker disk usage
echo ""
echo "Docker Disk Usage:"
docker system df
EOF

chmod +x /home/dacoris/health-check.sh
chown dacoris:dacoris /home/dacoris/health-check.sh

# Display SSH key instructions
echo ""
echo "✅ Server setup completed!"
echo ""
echo "📝 Next steps:"
echo "1. Generate SSH keys for GitHub Actions:"
echo "   ssh-keygen -t ed25519 -C 'github-actions' -f ~/.ssh/dacoris-deploy"
echo ""
echo "2. Add the public key to the dacoris user:"
echo "   sudo -u dacoris mkdir -p /home/dacoris/.ssh"
echo "   sudo cat ~/.ssh/dacoris-deploy.pub >> /home/dacoris/.ssh/authorized_keys"
echo "   sudo chmod 600 /home/dacoris/.ssh/authorized_keys"
echo "   sudo chown dacoris:dacoris /home/dacoris/.ssh/authorized_keys"
echo ""
echo "3. Add the private key to GitHub Secrets as PRODUCTION_SSH_KEY or STAGING_SSH_KEY"
echo ""
echo "4. Test SSH connection:"
echo "   ssh -i ~/.ssh/dacoris-deploy dacoris@$(hostname -I | awk '{print $1}')"
echo ""
echo "5. Run health check:"
echo "   sudo -u dacoris /home/dacoris/health-check.sh"
echo ""
