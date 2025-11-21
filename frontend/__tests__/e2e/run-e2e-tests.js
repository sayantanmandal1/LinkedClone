#!/usr/bin/env node

/**
 * E2E Test Runner Script
 * 
 * This script checks prerequisites and runs the E2E tests
 */

const { execSync } = require('child_process');
const http = require('http');

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://linkedclone.onrender.com';
const FRONTEND_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://linked-cloney.vercel.app';

console.log('\n=== E2E Test Runner ===\n');

/**
 * Check if a server is running
 */
function checkServer(url, name) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: '/',
      method: 'GET',
      timeout: 2000,
    };

    const req = http.request(options, (res) => {
      console.log(`✓ ${name} is running on ${url}`);
      resolve(true);
    });

    req.on('error', () => {
      console.log(`✗ ${name} is NOT running on ${url}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log(`✗ ${name} connection timeout on ${url}`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('Step 1: Checking prerequisites...\n');

  // Check backend
  const backendRunning = await checkServer(BACKEND_URL, 'Backend');
  
  // Check frontend
  const frontendRunning = await checkServer(FRONTEND_URL, 'Frontend');

  console.log('');

  if (!backendRunning || !frontendRunning) {
    console.log('⚠ Prerequisites not met!\n');
    console.log('Please ensure both servers are running:');
    
    if (!backendRunning) {
      console.log('\nBackend:');
      console.log('  cd backend');
      console.log('  npm run dev');
    }
    
    if (!frontendRunning) {
      console.log('\nFrontend:');
      console.log('  cd frontend');
      console.log('  npm run dev');
    }
    
    console.log('\nThen run this script again.\n');
    process.exit(1);
  }

  console.log('Step 2: Running E2E tests...\n');

  try {
    // Run the simple tests first
    console.log('Running component tests...\n');
    execSync('npm run test:e2e', { 
      stdio: 'inherit',
      cwd: __dirname + '/../..'
    });

    console.log('\n✓ All tests passed!\n');
    console.log('For manual testing, see: __tests__/e2e/manual-call-test.md\n');
    
  } catch (error) {
    console.log('\n✗ Some tests failed\n');
    console.log('Check the output above for details.\n');
    process.exit(1);
  }
}

// Run the tests
runTests().catch((error) => {
  console.error('Error running tests:', error);
  process.exit(1);
});
