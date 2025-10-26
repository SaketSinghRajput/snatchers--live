# Production Deployment Guide

This guide covers the complete production deployment and monitoring setup for the Snatchers E-commerce Backend.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB 7.0+
- Redis 7.2+
- Elasticsearch 8.11+ (optional)
- Docker & Docker Compose
- PM2 (for process management)
- Nginx (for reverse proxy)

### 1. Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd snatchers-backend

# Run production setup script (requires sudo)
sudo ./scripts/production-setup.sh

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your production values
```

### 2. Configuration

#### Required Environment Variables
```bash
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://localhost:27017/snatchers_prod
SESSION_SECRET=your_secure_session_secret_here
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
```

### 3. Deployment

#### Option A: Docker Deployment (Recommended)
```bash
# Build and start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

#### Option B: PM2 Deployment
```bash
# Install dependencies
npm ci --only=production

# Validate production setup
npm run validate:production

# Start with PM2
npm run pm2:start

# Check status
npm run pm2:status
```

### 4. SSL/HTTPS Setup
```bash
# Install SSL certificate with Certbot
sudo certbot --nginx -d your-domain.com

# Update nginx configuration for HTTPS
sudo systemctl reload nginx
```

## 📊 Monitoring & Logging

### Built-in Monitoring
The application includes comprehensive monitoring with:

- **System Metrics**: CPU, memory, disk usage
- **Application Metrics**: Request rates, response times, error rates
- **Business Metrics**: Order conversion, payment success rates
- **Real-time Alerts**: Slack, email, webhook notifications
- **Error Tracking**: Automatic error collection and reporting
- **Performance Monitoring**: Response time tracking and optimization

### Monitoring Endpoints
- Health Check: `GET /health`
- Metrics Dashboard: `GET /api/monitoring/dashboard`
- System Resources: `GET /api/deployment/resources`
- Deployment Status: `GET /api/deployment/status`

### Log Files
```bash
# Application logs
tail -f logs/combined.log
tail -f logs/error.log
tail -f logs/access.log

# PM2 logs
pm2 logs

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Prometheus & Grafana (Optional)
```bash
# Start monitoring stack
docker-compose --profile monitoring up -d

# Access Grafana dashboard
open http://localhost:3001
# Default credentials: admin/admin
```

## 🔧 Production Configuration

### Security Features
- **Rate Limiting**: API endpoint protection
- **CORS**: Cross-origin request security
- **Helmet**: Security headers
- **Input Sanitization**: XSS and injection prevention
- **Session Security**: Secure cookie configuration
- **SSL/TLS**: HTTPS enforcement
- **Audit Logging**: Security event tracking

### Performance Optimizations
- **Compression**: Gzip response compression
- **Caching**: Redis-based caching
- **Connection Pooling**: Database connection optimization
- **Load Balancing**: Nginx upstream configuration
- **Static Asset Optimization**: CDN integration
- **Database Indexing**: Optimized query performance

### Backup Strategy
```bash
# Manual backup
npm run backup

# Automated backups (configured via cron)
# Daily at 2 AM: 0 2 * * * /usr/local/bin/snatchers-backup.sh

# Restore from backup
npm run backup:restore
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check logs
npm run logs:error

# Validate configuration
npm run validate:production

# Check system resources
npm run monitoring:test
```

#### 2. Database Connection Issues
```bash
# Test MongoDB connection
mongosh $MONGO_URI

# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod
```

#### 3. High Memory Usage
```bash
# Check memory usage
free -h

# Restart application
npm run pm2:restart

# Check for memory leaks
npm run monitoring:dashboard
```

#### 4. SSL Certificate Issues
```bash
# Renew SSL certificate
sudo certbot renew

# Test SSL configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Health Checks
```bash
# Application health
curl -f http://localhost:5000/health

# Database health
curl -f http://localhost:5000/api/monitoring/dashboard

# System health
npm run monitoring:test
```

## 📈 Scaling

### Horizontal Scaling
```bash
# Add more PM2 instances
pm2 scale snatchers-backend +2

# Load balancer configuration
# Update nginx.conf upstream block
```

### Database Scaling
```bash
# MongoDB replica set setup
# Configure in MONGO_URI connection string

# Read replicas for analytics
# Separate connection for reporting queries
```

### CDN Integration
```bash
# Configure Cloudinary for images
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Configure CloudFront for static assets
# Update FRONTEND_URL and CORS settings
```

## 🔄 Deployment Automation

### CI/CD Pipeline
```yaml
# Example GitHub Actions workflow
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to server
        run: |
          ssh user@server 'cd /var/www/snatchers-backend && git pull && npm run deploy:prod'
```

### Deployment Scripts
```bash
# Deploy to different environments
npm run deploy:dev      # Development
npm run deploy:staging  # Staging
npm run deploy:prod     # Production

# Rollback deployment
# Use the admin dashboard or API endpoint
curl -X POST http://localhost:5000/api/deployment/rollback \
  -H "Content-Type: application/json" \
  -d '{"deploymentId": "deploy_123456789"}'
```

## 📋 Maintenance

### Regular Tasks

#### Daily
- [ ] Check system health dashboard
- [ ] Review error logs
- [ ] Monitor performance metrics
- [ ] Verify backup completion

#### Weekly
- [ ] Update security patches
- [ ] Clean old log files
- [ ] Review performance trends
- [ ] Test backup restoration

#### Monthly
- [ ] Security audit
- [ ] Performance optimization
- [ ] Dependency updates
- [ ] Capacity planning review

### Maintenance Commands
```bash
# Clean old logs
npm run logs:clean

# Update dependencies
npm update

# Security audit
npm audit

# Performance test
npm run test:performance
```

## 🆘 Emergency Procedures

### Incident Response
1. **Identify the issue** using monitoring dashboard
2. **Check recent deployments** for potential causes
3. **Review error logs** for specific error messages
4. **Scale resources** if needed (CPU, memory, instances)
5. **Rollback deployment** if issue is code-related
6. **Notify stakeholders** via configured channels

### Emergency Contacts
- **System Administrator**: [contact-info]
- **DevOps Team**: [contact-info]
- **On-call Engineer**: [contact-info]

### Rollback Procedure
```bash
# Quick rollback to previous deployment
npm run deploy:rollback

# Or use the API
curl -X POST /api/deployment/rollback \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"deploymentId": "previous_deployment_id"}'
```

## 📞 Support

### Documentation
- [API Documentation](./API_DOCUMENTATION.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Security Guide](./SECURITY.md)

### Monitoring Dashboards
- **Application**: http://localhost:5000/api/monitoring/dashboard
- **System**: http://localhost:3001 (Grafana)
- **Logs**: http://localhost:5601 (Kibana, if configured)

### Log Analysis
```bash
# Search logs for errors
grep -i error logs/combined.log

# Monitor real-time logs
tail -f logs/combined.log | grep -i error

# Analyze performance
grep "response_time" logs/access.log | awk '{print $NF}' | sort -n
```

---

## 🔐 Security Checklist

- [ ] Environment variables secured
- [ ] SSL/TLS certificates installed
- [ ] Firewall configured
- [ ] Database access restricted
- [ ] API rate limiting enabled
- [ ] Security headers configured
- [ ] Audit logging enabled
- [ ] Backup encryption enabled
- [ ] Access controls implemented
- [ ] Security monitoring active

## ✅ Go-Live Checklist

- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificates installed
- [ ] Monitoring dashboards accessible
- [ ] Backup procedures tested
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Load testing passed
- [ ] Rollback procedure tested
- [ ] Team trained on operations

---

For additional support or questions, please refer to the project documentation or contact the development team.