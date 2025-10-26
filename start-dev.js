#!/usr/bin/env node

const { spawn } = require('child_process');
const chalk = require('chalk');
const path = require('path');

console.log(chalk.blue.bold('🚀 Starting Snatchers Development Environment\n'));

// Check if we're in the right directory
if (!require('fs').existsSync('./package.json')) {
  console.error(chalk.red('❌ Please run this script from the Snatchers root directory'));
  process.exit(1);
}

// Start the development servers
const devProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

// Handle process termination
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n🛑 Shutting down development servers...'));
  devProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n🛑 Shutting down development servers...'));
  devProcess.kill('SIGTERM');
  process.exit(0);
});

devProcess.on('close', (code) => {
  if (code !== 0) {
    console.log(chalk.red(`\n❌ Development servers exited with code ${code}`));
  } else {
    console.log(chalk.green('\n✅ Development servers stopped successfully'));
  }
  process.exit(code);
});