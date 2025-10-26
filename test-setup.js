#!/usr/bin/env node

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

console.log(chalk.blue.bold('🧪 Testing Enhanced Development Setup\n'));

// Test 1: Check if all required files exist
const requiredFiles = [
  'package.json',
  'scripts/health-check.js',
  'scripts/dev-setup.js',
  'scripts/dev-dashboard.js',
  '.env.development',
  'Snatchers_Backend/snatchers-backend-main/package.json',
  'Snatchers_Frontend/snatchers.in-main/package.json',
  'Snatchers_Backend/snatchers-backend-main/nodemon.json'
];

let allFilesExist = true;

console.log(chalk.yellow('📁 Checking required files...'));
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(chalk.green(`✅ ${file}`));
  } else {
    console.log(chalk.red(`❌ ${file}`));
    allFilesExist = false;
  }
});

// Test 2: Check package.json scripts
console.log(chalk.yellow('\n📋 Checking package.json scripts...'));
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['dev', 'start', 'health', 'setup', 'dashboard'];

requiredScripts.forEach(script => {
  if (packageJson.scripts[script]) {
    console.log(chalk.green(`✅ npm run ${script}`));
  } else {
    console.log(chalk.red(`❌ npm run ${script}`));
    allFilesExist = false;
  }
});

// Test 3: Check dependencies
console.log(chalk.yellow('\n📦 Checking dependencies...'));
const requiredDeps = ['concurrently', 'axios', 'chalk'];
const requiredDevDeps = ['nodemon', 'wait-on', 'cross-env'];

requiredDeps.forEach(dep => {
  if ((packageJson.dependencies && packageJson.dependencies[dep]) || 
      (packageJson.devDependencies && packageJson.devDependencies[dep])) {
    console.log(chalk.green(`✅ ${dep}`));
  } else {
    console.log(chalk.red(`❌ ${dep}`));
    allFilesExist = false;
  }
});

requiredDevDeps.forEach(dep => {
  if ((packageJson.devDependencies && packageJson.devDependencies[dep]) ||
      (packageJson.dependencies && packageJson.dependencies[dep])) {
    console.log(chalk.green(`✅ ${dep}`));
  } else {
    console.log(chalk.red(`❌ ${dep}`));
    allFilesExist = false;
  }
});

// Summary
console.log(chalk.yellow('\n📊 Setup Test Summary:'));
if (allFilesExist) {
  console.log(chalk.green.bold('✅ All tests passed! Enhanced setup is ready.'));
  console.log(chalk.cyan('\n🚀 You can now use:'));
  console.log(chalk.white('  npm run dev       - Start development servers'));
  console.log(chalk.white('  npm run dashboard - Interactive development dashboard'));
  console.log(chalk.white('  npm run health    - Check server health'));
  console.log(chalk.white('  npm run setup     - Install all dependencies'));
} else {
  console.log(chalk.red.bold('❌ Some tests failed. Please check the setup.'));
  process.exit(1);
}