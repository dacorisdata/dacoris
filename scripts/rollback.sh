#!/bin/bash
# Rollback Script for DACORIS
# This script rolls back to the previous deployment

set -e

ENVIRONMENT=${1:-production}
REMOTE_HOST=${2:-}
REMOTE_USER=${3:-dacoris}

echo "🔄 DACORIS Rollback Script"
echo "=========================="
echo "Environment: $ENVIRONMENT"

# Validate environment
if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "staging" ]; then
    echo "❌ Invalid environment. Use 'production' or 'staging'"
    exit 1
fi

# Function to rollback locally
rollback_local() {
    echo "🔄 Rolling back local deployment..."
    
    cd /opt/dacoris/rims 2>/dev/null || {
        echo "❌ Deployment directory not found"
        exit 1
    }
    
    # Check for backup
    if [ ! -f "docker-compose.yml.backup" ]; then
        echo "❌ No backup found. Cannot rollback."
        exit 1
    fi
    
    # Restore backup
    echo "📦 Restoring previous configuration..."
    mv docker-compose.yml.backup docker-compose.yml
    
    # Rollback Docker images
    echo "🐳 Rolling back Docker images..."
    docker tag ${DOCKER_USERNAME:-dacoris}/dacoris-backend:rollback ${DOCKER_USERNAME:-dacoris}/dacoris-backend:latest || true
    docker tag ${DOCKER_USERNAME:-dacoris}/dacoris-frontend:rollback ${DOCKER_USERNAME:-dacoris}/dacoris-frontend:latest || true
    docker tag ${DOCKER_USERNAME:-dacoris}/dacoris-nginx:rollback ${DOCKER_USERNAME:-dacoris}/dacoris-nginx:latest || true
    
    # Restart containers
    echo "🔄 Restarting containers..."
    docker-compose down
    docker-compose up -d
    
    # Wait for services
    sleep 15
    
    # Health check
    echo "🏥 Running health check..."
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health || echo "000")
    
    if [ "$response" == "200" ]; then
        echo "✅ Rollback successful!"
    else
        echo "❌ Health check failed after rollback (HTTP $response)"
        exit 1
    fi
}

# Function to rollback remotely
rollback_remote() {
    echo "🔄 Rolling back remote deployment on $REMOTE_HOST..."
    
    ssh $REMOTE_USER@$REMOTE_HOST << EOF
        cd /opt/dacoris/rims
        
        # Check for backup
        if [ ! -f "docker-compose.yml.backup" ]; then
            echo "❌ No backup found. Cannot rollback."
            exit 1
        fi
        
        # Restore backup
        echo "📦 Restoring previous configuration..."
        mv docker-compose.yml.backup docker-compose.yml
        
        # Rollback Docker images
        echo "🐳 Rolling back Docker images..."
        docker tag \${DOCKER_USERNAME:-dacoris}/dacoris-backend:rollback \${DOCKER_USERNAME:-dacoris}/dacoris-backend:latest || true
        docker tag \${DOCKER_USERNAME:-dacoris}/dacoris-frontend:rollback \${DOCKER_USERNAME:-dacoris}/dacoris-frontend:latest || true
        docker tag \${DOCKER_USERNAME:-dacoris}/dacoris-nginx:rollback \${DOCKER_USERNAME:-dacoris}/dacoris-nginx:latest || true
        
        # Restart containers
        echo "🔄 Restarting containers..."
        docker-compose down
        docker-compose up -d
        
        # Wait for services
        sleep 15
        
        echo "✅ Rollback completed on remote server"
EOF
    
    echo "✅ Remote rollback successful!"
}

# Confirm rollback
read -p "⚠️  Are you sure you want to rollback $ENVIRONMENT? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Rollback cancelled"
    exit 0
fi

# Main rollback logic
if [ -z "$REMOTE_HOST" ]; then
    rollback_local
else
    rollback_remote
fi

echo ""
echo "📊 Rollback Summary:"
echo "  Environment: $ENVIRONMENT"
echo "  Timestamp: $(date)"
if [ -n "$REMOTE_HOST" ]; then
    echo "  Host: $REMOTE_HOST"
else
    echo "  Host: localhost"
fi
echo ""
