// PM2 Ecosystem Configuration for Production Deployment
module.exports = {
  apps: [
    {
      name: 'snatchers-backend',
      script: 'server.js',
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: 'cluster',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Monitoring
      monitoring: true,
      pmx: true,
      
      // Advanced features
      watch: false, // Disable in production
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Auto restart on file changes (development only)
      watch_options: {
        followSymlinks: false,
        usePolling: false
      },
      
      // Source map support
      source_map_support: true,
      
      // Merge logs from all instances
      merge_logs: true,
      
      // Time zone
      time: true,
      
      // Autorestart
      autorestart: true,
      
      // Cron restart (optional - restart every day at 2 AM)
      cron_restart: process.env.NODE_ENV === 'production' ? '0 2 * * *' : undefined,
      
      // Health check
      health_check_grace_period: 3000,
      
      // Environment-specific settings
      node_args: process.env.NODE_ENV === 'production' 
        ? ['--max-old-space-size=2048'] 
        : ['--max-old-space-size=1024'],
      
      // Interpreter
      interpreter: 'node',
      interpreter_args: '--harmony',
      
      // Instance variables
      instance_var: 'INSTANCE_ID',
      
      // Post-deploy hooks
      post_update: ['npm install', 'npm run build'],
      
      // Pre-deploy hooks
      pre_setup: 'echo "Setting up application"',
      
      // Error handling
      exp_backoff_restart_delay: 100,
      
      // Custom environment variables for each instance
      env_file: '.env'
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/snatchers-backend.git',
      path: '/var/www/snatchers-backend',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'echo "Pre-setup commands"',
      'post-setup': 'echo "Post-setup commands"',
      env: {
        NODE_ENV: 'production'
      }
    },
    staging: {
      user: 'deploy',
      host: ['your-staging-server.com'],
      ref: 'origin/develop',
      repo: 'https://github.com/your-username/snatchers-backend.git',
      path: '/var/www/snatchers-backend-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};