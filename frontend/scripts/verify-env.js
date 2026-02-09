import http from 'http';
import { execSync } from 'child_process';

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.reset}`);
}

console.log('🔍 Starting Environment Verification...\n');

// 1. Check Node.js Version
const nodeVersion = process.version;
const requiredNode = 18;
const currentMajor = parseInt(nodeVersion.slice(1).split('.')[0]);

if (currentMajor >= requiredNode) {
  log(COLORS.green, `✅ Node.js Version: ${nodeVersion} (Satisfied)`);
} else {
  log(COLORS.red, `❌ Node.js Version: ${nodeVersion} (Required: >=${requiredNode})`);
  process.exit(1);
}

// 2. Check Backend Connectivity
const backendUrl = 'http://localhost:8080';
console.log(`\nTesting Backend Connection (${backendUrl})...`);

const req = http.get(backendUrl, (res) => {
  clearTimeout(timeoutId);
  if (res.statusCode === 401 || res.statusCode === 200 || res.statusCode === 404) {
    // 401 is good for backend root, implies service is up
    log(COLORS.green, `✅ Backend is reachable (Status: ${res.statusCode})`);
  } else {
    log(COLORS.yellow, `⚠️ Backend returned unexpected status: ${res.statusCode}`);
  }
}).on('error', (e) => {
  clearTimeout(timeoutId);
  log(COLORS.red, `❌ Backend unreachable: ${e.message}`);
  log(COLORS.yellow, '  Suggestion: Check if Docker container "supplypro-backend" is running.');
  log(COLORS.yellow, '  Command: docker ps');
});

const timeoutId = setTimeout(() => {
  req.destroy();
  log(COLORS.red, '❌ Backend connection timed out');
}, 2000);

// 3. Check Frontend Port (5173) Availability (Optional)
// Note: This script assumes it's run BEFORE npm run dev to check environment, 
// or independent of it. If we want to check if 5173 is FREE, we can try to listen.
// If we want to check if Frontend is RUNNING, we try to connect.

// Let's check if Frontend is already running (e.g. for e2e tests)
const frontendUrl = 'http://localhost:5173';
console.log(`\nChecking Frontend Status (${frontendUrl})...`);
const reqFe = http.get(frontendUrl, (res) => {
  log(COLORS.green, `✅ Frontend is ALREADY running (Status: ${res.statusCode})`);
}).on('error', () => {
  log(COLORS.yellow, `ℹ️  Frontend is NOT running on 5173 (Ready to start)`);
});

reqFe.setTimeout(1000, () => {
  reqFe.abort();
});
