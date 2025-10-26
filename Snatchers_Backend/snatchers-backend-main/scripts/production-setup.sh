#!/bin/bash

# Production Environment Setup Script for Snatchers Backend
# This script sets up the production environment with all necessary configurations

set -e

echo "🚀 Setting up Snatchers Backend Production Environment..."

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root or with sudo"
    exit 1
fi

# Update system packages
print_status "Updating system packages..."
apt-get update && apt-get upgrade -y
print_success "System packages updated"

# Install required system packages
print_status "Installing required system packages..."
apt-get install -y \
    curl \
    wget \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw \
    fail2ban \
    htop \
    iotop \
    netstat-nat \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

print_success "System packages installed"

# Install Node.js 18
print_status "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
print_success "Node.js $(node --version) installed"

# Install PM2 globally
print_status "Installing PM2..."
npm install -g pm2
print_success "PM2 installed"

# Install Docker
print_status "Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable docker
systemctl start docker
print_success "Docker installed"

# Install Docker Compose
print_status "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
print_success "Docker Compose installed"

# Create application user
print_status "Creating application user..."
if ! id "snatchers" &>/dev/null; then
    useradd -m -s /bin/bash snatchers
    usermod -aG docker snatchers
    print_success "User 'snatchers' created"
else
    print_warning "User 'snatchers' already exists"
fi

# Create application directories
print_status "Creating application directories..."
mkdir -p /var/www/snatchers-backend
mkdir -p /var/log/snatchers
mkdir -p /etc/snatchers
mkdir -p /var/backups/snatchers

# Set proper ownership
chown -R snatchers:snatchers /var/www/snatchers-backend
chown -R snatchers:snatchers /var/log/snatchers
chown -R snatchers:snatchers /var/backups/snatchers

print_success "Application directories created"

# Configure firewall
print_status "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw --force enable
print_success "Firewall configured"

# Configure fail2ban
print_status "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl enable fail2ban
systemctl restart fail2ban
print_success "Fail2ban configured"

# Configure log rotation
print_status "Configuring log rotation..."
cat > /etc/logrotate.d/snatchers << EOF
/var/log/snatchers/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 snatchers snatchers
    postrotate
        pm2 reloadLogs
    endscript
}

/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data adm
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then \
            run-parts /etc/logrotate.d/httpd-prerotate; \
        fi
    endscript
    postrotate
        invoke-rc.d nginx rotate >/dev/null 2>&1
    endscript
}
EOF
print_success "Log rotation configured"

# Set up system limits
print_status "Configuring system limits..."
cat >> /etc/security/limits.conf << EOF
snatchers soft nofile 65536
snatchers hard nofile 65536
snatchers soft nproc 32768
snatchers hard nproc 32768
EOF

# Configure sysctl for better performance
cat >> /etc/sysctl.conf << EOF
# Network performance tuning
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 10

# Memory management
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5

# File system
fs.file-max = 2097152
EOF

sysctl -p
print_success "System limits configured"

# Create systemd service for the application
print_status "Creating systemd service..."
cat > /etc/systemd/system/snatchers-backend.service << EOF
[Unit]
Description=Snatchers Backend Application
After=network.target mongod.service redis.service

[Service]
Type=forking
User=snatchers
WorkingDirectory=/var/www/snatchers-backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/pm2 start ecosystem.config.js --env production
ExecReload=/usr/bin/pm2 reload ecosystem.config.js --env production
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
PIDFile=/var/www/snatchers-backend/.pm2/pm2.pid
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable snatchers-backend
print_success "Systemd service created"

# Set up monitoring directories
print_status "Setting up monitoring..."
mkdir -p /var/lib/prometheus
mkdir -p /var/lib/grafana
mkdir -p /etc/prometheus
mkdir -p /etc/grafana

# Create monitoring user
if ! id "monitoring" &>/dev/null; then
    useradd -r -s /bin/false monitoring
    chown -R monitoring:monitoring /var/lib/prometheus
    chown -R monitoring:monitoring /etc/prometheus
fi

print_success "Monitoring setup completed"

# Create backup script
print_status "Creating backup script..."
cat > /usr/local/bin/snatchers-backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/var/backups/snatchers"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/snatchers-backend"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup application files
tar -czf "$BACKUP_DIR/app_backup_$TIMESTAMP.tar.gz" \
    -C "$APP_DIR" \
    --exclude=node_modules \
    --exclude=logs \
    --exclude=temp \
    .

# Backup database (if MongoDB is local)
if command -v mongodump &> /dev/null; then
    mongodump --out "$BACKUP_DIR/db_backup_$TIMESTAMP"
    tar -czf "$BACKUP_DIR/db_backup_$TIMESTAMP.tar.gz" -C "$BACKUP_DIR" "db_backup_$TIMESTAMP"
    rm -rf "$BACKUP_DIR/db_backup_$TIMESTAMP"
fi

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $TIMESTAMP"
EOF

chmod +x /usr/local/bin/snatchers-backup.sh
chown snatchers:snatchers /usr/local/bin/snatchers-backup.sh

# Add backup to crontab
(crontab -u snatchers -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/snatchers-backup.sh") | crontab -u snatchers -

print_success "Backup script created and scheduled"

# Create health check script
print_status "Creating health check script..."
cat > /usr/local/bin/snatchers-health-check.sh << 'EOF'
#!/bin/bash

HEALTH_URL="http://localhost:5000/health"
LOG_FILE="/var/log/snatchers/health-check.log"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Perform health check
if curl -f -s "$HEALTH_URL" > /dev/null; then
    echo "$(date): Health check passed" >> "$LOG_FILE"
    exit 0
else
    echo "$(date): Health check failed" >> "$LOG_FILE"
    
    # Try to restart the application
    systemctl restart snatchers-backend
    
    # Wait and check again
    sleep 30
    if curl -f -s "$HEALTH_URL" > /dev/null; then
        echo "$(date): Application restarted successfully" >> "$LOG_FILE"
        exit 0
    else
        echo "$(date): Application restart failed" >> "$LOG_FILE"
        exit 1
    fi
fi
EOF

chmod +x /usr/local/bin/snatchers-health-check.sh

# Add health check to crontab (every 5 minutes)
(crontab -u snatchers -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/snatchers-health-check.sh") | crontab -u snatchers -

print_success "Health check script created and scheduled"

# Configure nginx (basic configuration)
print_status "Configuring nginx..."
rm -f /etc/nginx/sites-enabled/default

cat > /etc/nginx/sites-available/snatchers-backend << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/snatchers-backend /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
print_success "Nginx configured"

# Create environment template
print_status "Creating environment template..."
cat > /var/www/snatchers-backend/.env.production.template << 'EOF'
# Production Environment Variables Template
# Copy this file to .env and fill in the actual values

NODE_ENV=production
PORT=5000

# Database
MONGO_URI=mongodb://localhost:27017/snatchers_prod

# Session
SESSION_SECRET=your_secure_session_secret_here

# Frontend URL
FRONTEND_URL=https://your-domain.com

# AWS Cognito
COGNITO_USER_POOL_ID=your_user_pool_id
COGNITO_CLIENT_ID=your_client_id
COGNITO_CLIENT_SECRET=your_client_secret
COGNITO_REGION=us-east-1

# Payment Gateways
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
STRIPE_SECRET_KEY=your_stripe_secret_key

# Email Service
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@your-domain.com

# Monitoring
MONITORING_WEBHOOK_URL=your_monitoring_webhook_url
SLACK_WEBHOOK_URL=your_slack_webhook_url
ALERT_EMAIL=alerts@your-domain.com

# Analytics
GA_MEASUREMENT_ID=your_ga_measurement_id
FB_PIXEL_ID=your_facebook_pixel_id
EOF

chown snatchers:snatchers /var/www/snatchers-backend/.env.production.template
print_success "Environment template created"

print_success "🎉 Production environment setup completed!"

echo ""
echo "📋 Next Steps:"
echo "1. Copy your application code to /var/www/snatchers-backend"
echo "2. Create .env file from the template and fill in actual values"
echo "3. Install application dependencies: npm ci --only=production"
echo "4. Start the application: systemctl start snatchers-backend"
echo "5. Configure SSL certificate: certbot --nginx -d your-domain.com"
echo "6. Set up monitoring dashboards"
echo "7. Test all functionality"
echo ""
echo "📁 Important Directories:"
echo "   Application: /var/www/snatchers-backend"
echo "   Logs: /var/log/snatchers"
echo "   Backups: /var/backups/snatchers"
echo "   Config: /etc/snatchers"
echo ""
echo "🔧 Useful Commands:"
echo "   Check status: systemctl status snatchers-backend"
echo "   View logs: journalctl -u snatchers-backend -f"
echo "   PM2 status: sudo -u snatchers pm2 status"
echo "   Health check: curl http://localhost:5000/health"