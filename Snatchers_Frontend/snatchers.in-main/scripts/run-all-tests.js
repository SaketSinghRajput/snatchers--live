#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Test configurations
const tests = [
  {
    name: 'Unit Tests',
    command: 'npm',
    args: ['run', 'test:coverage'],
    description: 'Running unit tests with coverage...'
  },
  {
    name: 'Accessibility Tests',
    command: 'npm',
    args: ['run', 'test:a11y'],
    description: 'Running accessibility tests...'
  },
  {
    name: 'SEO Tests',
    command: 'npm',
    args: ['run', 'test:seo'],
    description: 'Running SEO validation tests...'
  },
  {
    name: 'Performance Tests',
    command: 'npm',
    args: ['run', 'test:performance'],
    description: 'Running performance tests...'
  },
  {
    name: 'E2E Tests',
    command: 'npm',
    args: ['run', 'test:e2e'],
    description: 'Running end-to-end tests...'
  }
];

async function runTest(test) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 ${test.description}`);
    
    const child = spawn(test.command, test.args, {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${test.name} passed`);
        resolve();
      } else {
        console.log(`❌ ${test.name} failed with code ${code}`);
        reject(new Error(`${test.name} failed`));
      }
    });

    child.on('error', (error) => {
      console.error(`❌ Error running ${test.name}:`, error.message);
      reject(error);
    });
  });
}

async function runAllTests() {
  console.log('🧪 Starting comprehensive test suite...\n');
  
  const results = {
    passed: [],
    failed: [],
    startTime: Date.now()
  };

  for (const test of tests) {
    try {
      await runTest(test);
      results.passed.push(test.name);
    } catch (error) {
      results.failed.push({
        name: test.name,
        error: error.message
      });
      
      // Continue with other tests even if one fails
      console.log(`⚠️  Continuing with remaining tests...\n`);
    }
  }

  // Generate summary report
  const endTime = Date.now();
  const duration = Math.round((endTime - results.startTime) / 1000);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY REPORT');
  console.log('='.repeat(60));
  console.log(`Total Duration: ${duration}s`);
  console.log(`Tests Passed: ${results.passed.length}/${tests.length}`);
  console.log(`Tests Failed: ${results.failed.length}/${tests.length}`);
  
  if (results.passed.length > 0) {
    console.log('\n✅ Passed Tests:');
    results.passed.forEach(test => console.log(`  - ${test}`));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(test => console.log(`  - ${test.name}: ${test.error}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Exit with appropriate code
  if (results.failed.length > 0) {
    console.log('❌ Some tests failed. Please check the output above.');
    process.exit(1);
  } else {
    console.log('🎉 All tests passed successfully!');
    process.exit(0);
  }
}

// Handle process interruption
process.on('SIGINT', () => {
  console.log('\n⚠️  Test execution interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Test execution terminated');
  process.exit(1);
});

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };