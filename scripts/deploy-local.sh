#!/bin/bash
# Local Deployment Script for DACORIS
# This script deploys DACORIS to a local or remote server manually

set -e

# Configuration
ENVIRONMENT=${1:-production}
REMOTE_HOST=${2:-}
REMOTE_USER=${3:-dacoris}

echo "🚀 DACORIS Deployment Script"
echo "============================="
echo "Environment: $ENVIRONMENT"

# Validate environment
if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "staging" ]; then
    echo "❌ Invalid environment. Use 'production' or 'staging'"
    exit 1
fi

# Function to deploy locally
deploy_local() {
    echo "📦 Deploying locally..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running"
        exit 1
    fi
    
    # Build images
    echo "🔨 Building Docker images..."
    docker-compose -f docker-compose.prod.yml build
    
    # Stop existing containers
    echo "🛑 Stopping existing containers..."
    docker-compose -f docker-compose.prod.yml down
    
    # Start new containers
    echo "🚀 Starting new containers..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services
    echo "⏳ Waiting for services to start..."
    sleep 15
    
    # Run migrations
    echo "🔄 Running database migrations..."
    docker exec dacoris-backend-prod alembic upgrade head
    
    # Health check
    echo "🏥 Running health check..."
    sleep 5
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health || echo "000")
    
    if [ "$response" == "200" ]; then
        echo "✅ Deployment successful!"
        echo "🌐 Application is running at http://localhost"
    else
        echo "❌ Health check failed (HTTP $response)"
        exit 1
    fi
}

# Function to deploy remotely
deploy_remote() {
    echo "📦 Deploying to remote server: $REMOTE_HOST..."
    
    # Check SSH connection
    if ! ssh -q $REMOTE_USER@$REMOTE_HOST exit; then
        echo "❌ Cannot connect to $REMOTE_HOST"
        exit 1
    fi
    
    # Create deployment directory
    ssh $REMOTE_USER@$REMOTE_HOST "mkdir -p /home/dacoris"
    
    # Copy files
    echo "📤 Copying deployment files..."
    scp docker-compose.prod.yml $REMOTE_USER@$REMOTE_HOST:/home/dacoris/docker-compose.yml
    scp -r nginx $REMOTE_USER@$REMOTE_HOST:/home/dacoris/
    
    # Check if .env file exists
    if [ -f ".env.$ENVIRONMENT" ]; then
        scp .env.$ENVIRONMENT $REMOTE_USER@$REMOTE_HOST:/home/dacoris/.env.production
    else
        echo "⚠️  Warning: .env.$ENVIRONMENT not found. Make sure to create it on the server."
    fi
    
    # Deploy on remote server
    echo "🚀 Deploying on remote server..."
    ssh $REMOTE_USER@$REMOTE_HOST << EOF
        cd /home/dacoris
        
        # Pull latest images (if using registry)
        # docker-compose pull
        
        # Stop existing containers
        docker-compose down
        
        # Start new containers
        docker-compose up -d
        
        # Wait for services
        sleep 15
        
        # Run migrations
        docker exec dacoris-backend-prod alembic upgrade head
        
        echo "✅ Remote deployment completed"
EOF
    
    echo "✅ Deployment to $REMOTE_HOST successful!"
}

# Main deployment logic
if [ -z "$REMOTE_HOST" ]; then
    deploy_local
else
    deploy_remote
fi

echo ""
echo "📊 Deployment Summary:"
echo "  Environment: $ENVIRONMENT"
echo "  Timestamp: $(date)"
if [ -n "$REMOTE_HOST" ]; then
    echo "  Host: $REMOTE_HOST"
else
    echo "  Host: localhost"
fi
echo ""
