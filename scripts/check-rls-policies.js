/**
 * Script to check and test Supabase RLS policies
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Colors for console output
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

// Function to check if a string is a valid UUID
function isUUID(str) {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(str);
}

async function checkRLSPolicies() {
  console.log(`${colors.blue}${colors.bright}Checking Supabase RLS Policies...${colors.reset}\n`);
  
  // Get Supabase credentials
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.log(`${colors.red}❌ Missing required environment variables${colors.reset}`);
    return;
  }
  
  try {
    // Create a client with the service role key (for admin access)
    console.log('Creating admin client with service role key...');
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create an anonymous client (for testing RLS)
    console.log('Creating anonymous client...');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // Tables to check
    const tables = ['users', 'users_articles', 'article_summaries'];
    const operations = ['select', 'insert', 'update', 'delete'];
    
    // Test each table
    for (const table of tables) {
      console.log(`\n${colors.bright}Checking table: ${table}${colors.reset}`);
      
      // Get the ID of an existing record for testing (using admin client)
      const { data: recordData, error: recordError } = await adminClient
        .from(table)
        .select('id')
        .limit(1)
        .single();
        
      if (recordError) {
        console.log(`${colors.yellow}⚠️ Could not get test record for ${table}: ${recordError.message}${colors.reset}`);
        console.log(`${colors.yellow}  Skipping operation tests that require an existing ID${colors.reset}`);
        continue;
      }
      
      const recordId = recordData.id;
      
      if (!recordId) {
        console.log(`${colors.yellow}⚠️ No records found in ${table} for testing${colors.reset}`);
        continue;
      }
      
      console.log(`Using test record with ID: ${recordId.substring(0, 8)}...`);
      
      // Test each operation with the anonymous client
      for (const operation of operations) {
        console.log(`Testing ${operation} operation...`);
        
        let testResult;
        let errorMsg;
        
        try {
          switch (operation) {
            case 'select':
              testResult = await anonClient
                .from(table)
                .select('*')
                .eq('id', recordId)
                .single();
              break;
              
            case 'insert':
              // Create dummy data for insert tests
              const insertData = { id: crypto.randomUUID() };
              
              // Add required fields based on table
              if (table === 'users') {
                insertData.email = `test-${Date.now()}@example.com`;
              } else if (table === 'users_articles') {
                insertData.user_id = isUUID(recordId) ? recordId : crypto.randomUUID();
                insertData.article_summary_id = crypto.randomUUID();
              } else if (table === 'article_summaries') {
                insertData.url = `https://test-${Date.now()}.com`;
                insertData.title = `Test Article ${Date.now()}`;
              }
              
              testResult = await anonClient
                .from(table)
                .insert(insertData)
                .select();
              break;
              
            case 'update':
              const updateData = { updated_at: new Date().toISOString() };
              testResult = await anonClient
                .from(table)
                .update(updateData)
                .eq('id', recordId)
                .select();
              break;
              
            case 'delete':
              testResult = await anonClient
                .from(table)
                .delete()
                .eq('id', recordId)
                .select();
              break;
          }
          
          errorMsg = testResult.error ? testResult.error.message : null;
        } catch (err) {
          errorMsg = err.message;
        }
        
        // Display result
        if (errorMsg && errorMsg.includes('permission denied')) {
          console.log(`${colors.green}✅ ${operation}: Permission denied (RLS working)${colors.reset}`);
        } else if (errorMsg) {
          console.log(`${colors.yellow}⚠️ ${operation}: Failed with error: ${errorMsg}${colors.reset}`);
        } else {
          console.log(`${colors.red}❌ ${operation}: Succeeded (RLS NOT restricting access)${colors.reset}`);
        }
      }
    }
    
    console.log(`\n${colors.blue}RLS policy check complete${colors.reset}`);
  } catch (err) {
    console.error(`${colors.red}Error checking RLS policies: ${err.message}${colors.reset}`);
  }
}

// Run the check
checkRLSPolicies(); 