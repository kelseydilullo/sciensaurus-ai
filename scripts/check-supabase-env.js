/**
 * Script to check and verify Supabase environment settings
 * 
 * Used to validate that .env.local is properly configured
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Define colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function checkEnvVariable(name, expected = null) {
  const value = process.env[name];
  
  if (!value) {
    console.log(`${colors.red}❌ Missing required environment variable: ${colors.bright}${name}${colors.reset}`);
    return false;
  }
  
  if (expected && value !== expected) {
    console.log(`${colors.yellow}⚠️ ${name} does not match expected value${colors.reset}`);
    console.log(`  ${colors.yellow}Expected: ${expected}${colors.reset}`);
    console.log(`  ${colors.yellow}Actual: ${value}${colors.reset}`);
    return false;
  }
  
  console.log(`${colors.green}✅ ${name} is set properly${colors.reset}`);
  return true;
}

async function testConnection() {
  console.log('\nTesting Supabase connection...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log(`${colors.red}❌ Cannot test connection without URL and key${colors.reset}`);
    return false;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Simple test query - just get the schema
    const { data, error } = await supabase
      .from('article_summaries')
      .select('id')
      .limit(1);
      
    if (error) {
      console.log(`${colors.red}❌ Failed to connect to Supabase: ${error.message}${colors.reset}`);
      return false;
    }
    
    console.log(`${colors.green}✅ Successfully connected to Supabase${colors.reset}`);
    return true;
  } catch (err) {
    console.log(`${colors.red}❌ Failed to connect to Supabase: ${err.message}${colors.reset}`);
    return false;
  }
}

async function main() {
  console.log(`${colors.blue}${colors.bright}Checking Supabase environment configuration...${colors.reset}\n`);
  
  // Check for .env.local file
  const envPath = path.resolve(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    console.log(`${colors.red}❌ .env.local file not found${colors.reset}`);
    return;
  }
  
  console.log(`${colors.green}✅ .env.local file exists${colors.reset}`);
  
  // Check required variables
  checkEnvVariable('NEXT_PUBLIC_SUPABASE_URL');
  checkEnvVariable('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  checkEnvVariable('SUPABASE_SERVICE_ROLE_KEY');
  
  // Test connection
  await testConnection();
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}Unexpected error: ${error.message}${colors.reset}`);
  process.exit(1);
}); 