#!/bin/bash

# Deploy script for CRM DANIK-SERVIS
# Run this script on VPS for manual deployment

set -e

# Configuration
APP_DIR="/var/www/crm.poisk24na7.ru"
REPO_DIR="/var/www/crm-danik-servis"
BRANCH="main"

echo "=== CRM DANIK-SERVIS Deployment ==="
echo "Started at: $(date)"

# Navigate to repository directory
if [ -d "$REPO_DIR" ]; then
    cd "$REPO_DIR"
    echo "Pulling latest changes..."
    git fetch origin
    git reset --hard origin/$BRANCH
else
    echo "Error: Repository directory not found: $REPO_DIR"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm ci --production=false

# Build the project
echo "Building project..."
npm run build

# Copy build to web directory
echo "Deploying to $APP_DIR..."
rm -rf "$APP_DIR"/*
cp -r dist/* "$APP_DIR/"

# Set proper permissions
echo "Setting permissions..."
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"

# Reload nginx
echo "Reloading nginx..."
sudo systemctl reload nginx

echo "=== Deployment completed successfully ==="
echo "Finished at: $(date)"
