#!/bin/bash

# Snatchers Backend Deployment Script
# Usage: ./scripts/deploy.sh [environment]
# Environment: development, staging, production

set -e  # Exit on any error

ENVIRONMENT=${1:-production}
PROJECT_NAME="snatchers-backend"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"

echo "🚀 Starting deployment for $ENVIRONMENT environment..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if environment file exists
if [ ! -f ".env.${ENVIRONMENT}" ] && [ ! -f ".env" ]; then
    print_error "Environment file not found. Please create .env.${ENVIRONMENT} or .env"
    exit 1
fi

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
    print_status "Loading environment variables from .env.${ENVIRONMENT}"
    export $(cat .env.${ENVIRONMENT} | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
    print_status "Loading environment variables from .env"
    export $(cat .env | grep -v '^#' | xargs)
fi

# Validate required environment variables
required_vars=("MONGO_URI" "NODE_ENV")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set"
        exit 1
    fi
done

print_success "Environment variables validated"

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs uploads temp backups

# Backup current deployment (if exists)
if [ -d "node_modules" ] && [ "$ENVIRONMENT" = "production" ]; then
    print_status "Creating backup of current deployment..."
    mkdir -p "$BACKUP_DIR"
    tar -czf "$BACKUP_DIR/backup_${TIMESTAMP}.tar.gz" \
        --exclude=node_modules \
        --exclude=logs \
        --exclude=uploads \
        --exclude=temp \
        --exclude=backups \
        . || print_warning "Backup creation failed, continuing..."
    print_success "Backup created: $BACKUP_DIR/backup_${TIMESTAMP}.tar.gz"
fi

# Install dependencies
print_status "Installing dependencies..."
if [ "$ENVIRONMENT" = "production" ]; then
    npm ci --only=production
else
    npm ci
fi
print_success "Dependencies installed"

# Run database migrations if they exist
if [ -d "migrations" ]; then
    print_status "Running database migrations..."
    npm run migrate || print_warning "Migration failed, continuing..."
fi

# Run tests in non-production environments
if [ "$ENVIRONMENT" != "production" ]; then
    print_status "Running tests..."
    npm test || {
        print_error "Tests failed"
        exit 1
    }
    print_success "Tests passed"
fi

# Build application if build script exists
if npm run | grep -q "build"; then
    print_status "Building application..."
    npm run build
    print_success "Application built"
fi

# Health check function
health_check() {
    local max_attempts=30
    local attempt=1
    local health_url="http://localhost:${PORT:-5000}/health"
    
    print_status "Performing health check..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            print_success "Health check passed"
            return 0
        fi
        
        print_status "Health check attempt $attempt/$max_attempts failed, retrying in 2 seconds..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "Health check failed after $max_attempts attempts"
    return 1
}

# Deployment strategy based on environment
case $ENVIRONMENT in
    "production")
        print_status "Deploying to production using PM2..."
        
        # Stop existing processes
        pm2 stop ecosystem.config.js --env production || print_warning "No existing PM2 processes to stop"
        
        # Start application with PM2
        pm2 start ecosystem.config.js --env production
        
        # Save PM2 configuration
        pm2 save
        
        # Generate startup script
        pm2 startup || print_warning "PM2 startup script generation failed"
        
        print_success "Application started with PM2"
        ;;
        
    "staging")
        print_status "Deploying to staging..."
        
        # Stop existing processes
        pm2 stop ecosystem.config.js --env staging || print_warning "No existing PM2 processes to stop"
        
        # Start application
        pm2 start ecosystem.config.js --env staging
        
        print_success "Staging deployment completed"
        ;;
        
    "development")
        print_status "Starting development server..."
        
        # Kill any existing development processes
        pkill -f "node server.js" || print_warning "No existing processes to kill"
        
        # Start in background for health check
        nohup npm start > logs/dev.log 2>&1 &
        DEV_PID=$!
        
        print_success "Development server started (PID: $DEV_PID)"
        ;;
        
    *)
        print_error "Unknown environment: $ENVIRONMENT"
        print_error "Supported environments: development, staging, production"
        exit 1
        ;;
esac

# Wait a moment for the application to start
sleep 5

# Perform health check
if health_check; then
    print_success "🎉 Deployment completed successfully!"
    
    # Display deployment information
    echo ""
    echo "📋 Deployment Summary:"
    echo "   Environment: $ENVIRONMENT"
    echo "   Timestamp: $TIMESTAMP"
    echo "   Node Version: $(node --version)"
    echo "   NPM Version: $(npm --version)"
    
    if [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "staging" ]; then
        echo "   PM2 Status:"
        pm2 list
    fi
    
    echo ""
    echo "🔗 Useful Commands:"
    echo "   View logs: tail -f logs/combined.log"
    echo "   Check status: curl http://localhost:${PORT:-5000}/health"
    
    if [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "staging" ]; then
        echo "   PM2 logs: pm2 logs"
        echo "   PM2 status: pm2 status"
        echo "   PM2 restart: pm2 restart ecosystem.config.js --env $ENVIRONMENT"
    fi
    
else
    print_error "❌ Deployment failed - health check unsuccessful"
    
    # Rollback in production
    if [ "$ENVIRONMENT" = "production" ] && [ -f "$BACKUP_DIR/backup_${TIMESTAMP}.tar.gz" ]; then
        print_status "Attempting rollback..."
        pm2 stop ecosystem.config.js --env production || true
        
        # Extract backup (this is a simplified rollback)
        print_warning "Manual rollback required. Backup available at: $BACKUP_DIR/backup_${TIMESTAMP}.tar.gz"
    fi
    
    exit 1
fi

# Cleanup old backups (keep last 5)
if [ "$ENVIRONMENT" = "production" ] && [ -d "$BACKUP_DIR" ]; then
    print_status "Cleaning up old backups..."
    ls -t "$BACKUP_DIR"/backup_*.tar.gz | tail -n +6 | xargs -r rm
    print_success "Old backups cleaned up"
fi

print_success "🚀 Deployment script completed!"