#!/bin/bash

# Build backend image
echo "Building backend image..."
cd backend
docker build -t dacorisdata/dacoris-backend:latest .
cd ..

# Build frontend image
echo "Building frontend image..."
cd frontend
docker build -t dacorisdata/dacoris-frontend:latest .
cd ..

# Build nginx image
echo "Building nginx image..."
cd nginx
docker build -t dacorisdata/dacoris-nginx:latest .
cd ..

echo "All images built successfully!"
