#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const BACKEND_PATH = './Snatchers_Backend/snatchers-backend-main';
const FRONTEND_PATH = './Snatchers_Frontend/snatchers.in-main';

function checkNodeModules(projectPath, projectName) {
  const nodeModulesPath = path.join(projectPath, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log(chalk.yellow(`⚠️  ${projectName} dependencies not found. Installing...`));
    return false;
  }
  return true;
}

function runCommand(command, args, cwd, name) {
  return new Promise((resolve, reject) => {
    console.log(chalk.blue(`🔧 Running: ${command} ${args.join(' ')} in ${name}`));
    
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green(`✅ ${name} setup completed`));
        resolve();
      } else {
        console.log(chalk.red(`❌ ${name} setup failed with code ${code}`));
        reject(new Error(`${name} setup failed`));
      }
    });

    child.on('error', (error) => {
      console.log(chalk.red(`❌ ${name} setup error:`, error.message));
      reject(error);
    });
  });
}

async function setupDevelopment() {
  console.log(chalk.blue('🚀 Setting up development environment...\n'));

  try {
    // Check and install backend dependencies
    if (!checkNodeModules(BACKEND_PATH, 'Backend')) {
      await runCommand('npm', ['install'], BACKEND_PATH, 'Backend');
    } else {
      console.log(chalk.green('✅ Backend dependencies found'));
    }

    // Check and install frontend dependencies
    if (!checkNodeModules(FRONTEND_PATH, 'Frontend')) {
      await runCommand('npm', ['install'], FRONTEND_PATH, 'Frontend');
    } else {
      console.log(chalk.green('✅ Frontend dependencies found'));
    }

    // Copy environment file if it doesn't exist
    const backendEnvPath = path.join(BACKEND_PATH, '.env');
    const backendEnvExamplePath = path.join(BACKEND_PATH, '.env.example');
    
    if (!fs.existsSync(backendEnvPath) && fs.existsSync(backendEnvExamplePath)) {
      fs.copyFileSync(backendEnvExamplePath, backendEnvPath);
      console.log(chalk.yellow('📝 Created .env file from .env.example for backend'));
    }

    console.log(chalk.green('\n✅ Development environment setup complete!'));
    console.log(chalk.cyan('\n📋 Available commands:'));
    console.log(chalk.white('  npm run dev     - Start both servers in development mode'));
    console.log(chalk.white('  npm start       - Start both servers in production mode'));
    console.log(chalk.white('  npm run health  - Check server health'));
    console.log(chalk.white('  npm test        - Run all tests'));

  } catch (error) {
    console.error(chalk.red('\n❌ Setup failed:'), error.message);
    process.exit(1);
  }
}

setupDevelopment();