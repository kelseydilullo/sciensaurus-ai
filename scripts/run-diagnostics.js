/**
 * Comprehensive diagnostic script for Sciensaurus
 * Run with: node scripts/run-diagnostics.js
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function printHeader(text) {
  console.log(`\n${colors.bright}${colors.blue}==========================================${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${text}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}==========================================${colors.reset}\n`);
}

function runScript(scriptName, args = []) {
  const scriptPath = path.join(__dirname, scriptName);
  if (!fs.existsSync(scriptPath)) {
    console.log(`${colors.bright}${colors.red}Script not found: ${scriptPath}${colors.reset}`);
    return false;
  }
  
  try {
    printHeader(`Running ${scriptName}...`);
    const output = execSync(`node ${scriptPath} ${args.join(' ')}`, { encoding: 'utf8' });
    console.log(output);
    return true;
  } catch (error) {
    console.error(`${colors.bright}${colors.red}Error running ${scriptName}:${colors.reset}`);
    console.error(error.toString());
    return false;
  }
}

// Main execution
async function main() {
  console.log(`${colors.bright}${colors.green}Starting Sciensaurus Diagnostics${colors.reset}`);
  console.log(`${colors.dim}Time: ${new Date().toISOString()}${colors.reset}`);
  
  // Check environment variables
  runScript('check-supabase-env.js');
  
  // Check RLS policies
  runScript('check-rls-policies.js');
  
  // Get user ID from arguments if provided
  const userId = process.argv[2];
  if (userId) {
    console.log(`${colors.bright}${colors.green}User ID provided: ${userId}${colors.reset}`);
    
    // Run user-specific tests with the provided user ID
    runScript('add-test-article.js', [userId]);
  } else {
    console.log(`${colors.bright}${colors.yellow}No user ID provided. Skipping user-specific tests.${colors.reset}`);
    console.log(`${colors.yellow}To run all tests, provide a user ID:${colors.reset}`);
    console.log(`${colors.yellow}node scripts/run-diagnostics.js YOUR_USER_ID${colors.reset}`);
  }
  
  console.log(`\n${colors.bright}${colors.green}Diagnostics Complete${colors.reset}`);
}

main().catch(error => {
  console.error(`${colors.bright}${colors.red}Unhandled error in diagnostics:${colors.reset}`, error);
  process.exit(1);
}); 