#!/usr/bin/env node

const chalk = require('chalk');
const { spawn } = require('child_process');

function clearScreen() {
  process.stdout.write('\x1Bc');
}

function showDashboard() {
  clearScreen();
  
  console.log(chalk.blue.bold('🚀 Snatchers Development Dashboard'));
  console.log(chalk.gray('═'.repeat(50)));
  console.log();
  
  console.log(chalk.green('📋 Quick Commands:'));
  console.log(chalk.white('  npm run dev     - Start development servers'));
  console.log(chalk.white('  npm run health  - Check server health'));
  console.log(chalk.white('  npm test        - Run all tests'));
  console.log(chalk.white('  npm run clean   - Clean dependencies'));
  console.log();
  
  console.log(chalk.cyan('🌐 Server URLs:'));
  console.log(chalk.white('  Frontend: http://localhost:3000'));
  console.log(chalk.white('  Backend:  http://localhost:5000'));
  console.log(chalk.white('  Health:   http://localhost:5000/health'));
  console.log();
  
  console.log(chalk.yellow('💡 Tips:'));
  console.log(chalk.white('  • Use Ctrl+C to stop servers'));
  console.log(chalk.white('  • Backend auto-restarts on file changes'));
  console.log(chalk.white('  • Frontend hot-reloads automatically'));
  console.log(chalk.white('  • Check logs if servers fail to start'));
  console.log();
  
  console.log(chalk.magenta('🔧 Project Structure:'));
  console.log(chalk.white('  Backend:  ./Snatchers_Backend/snatchers-backend-main/'));
  console.log(chalk.white('  Frontend: ./Snatchers_Frontend/snatchers.in-main/'));
  console.log();
  
  console.log(chalk.gray('Press any key to start development servers or Ctrl+C to exit...'));
}

function startDevelopment() {
  console.log(chalk.blue('\n🚀 Starting development servers...\n'));
  
  const devProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });

  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Shutting down...'));
    devProcess.kill('SIGINT');
    process.exit(0);
  });

  devProcess.on('close', (code) => {
    if (code !== 0) {
      console.log(chalk.red(`\n❌ Servers exited with code ${code}`));
    }
    process.exit(code);
  });
}

// Show dashboard
showDashboard();

// Wait for user input
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', (key) => {
  if (key[0] === 3) { // Ctrl+C
    console.log(chalk.yellow('\n👋 Goodbye!'));
    process.exit(0);
  } else {
    startDevelopment();
  }
});