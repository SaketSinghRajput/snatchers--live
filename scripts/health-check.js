#!/usr/bin/env node

const axios = require('axios');
const chalk = require('chalk');

const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3000';

async function checkHealth() {
  console.log(chalk.blue('🔍 Checking application health...\n'));

  const checks = [
    {
      name: 'Backend Server',
      url: `${BACKEND_URL}/health`,
      fallbackUrl: BACKEND_URL,
      color: 'blue'
    },
    {
      name: 'Frontend Server',
      url: FRONTEND_URL,
      color: 'green'
    }
  ];

  let allHealthy = true;

  for (const check of checks) {
    try {
      const response = await axios.get(check.url, { timeout: 5000 });
      
      if (response.status === 200) {
        console.log(chalk[check.color](`✅ ${check.name}: Running (${check.url})`));
      } else {
        console.log(chalk.red(`❌ ${check.name}: Unhealthy (Status: ${response.status})`));
        allHealthy = false;
      }
    } catch (error) {
      // Try fallback URL if available
      if (check.fallbackUrl && check.fallbackUrl !== check.url) {
        try {
          const fallbackResponse = await axios.get(check.fallbackUrl, { timeout: 5000 });
          console.log(chalk.yellow(`⚠️  ${check.name}: Running but no health endpoint (${check.fallbackUrl})`));
        } catch (fallbackError) {
          console.log(chalk.red(`❌ ${check.name}: Not responding (${check.url})`));
          allHealthy = false;
        }
      } else {
        console.log(chalk.red(`❌ ${check.name}: Not responding (${check.url})`));
        allHealthy = false;
      }
    }
  }

  console.log('\n' + chalk.bold('📊 Health Check Summary:'));
  if (allHealthy) {
    console.log(chalk.green('✅ All services are healthy!'));
    console.log(chalk.cyan(`🌐 Frontend: ${FRONTEND_URL}`));
    console.log(chalk.cyan(`🔧 Backend API: ${BACKEND_URL}`));
  } else {
    console.log(chalk.red('❌ Some services are not healthy. Please check the logs.'));
    process.exit(1);
  }
}

// Run health check
checkHealth().catch(error => {
  console.error(chalk.red('Health check failed:'), error.message);
  process.exit(1);
});