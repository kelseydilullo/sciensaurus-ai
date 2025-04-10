/**
 * Test script to add a sample article to Supabase and associate it with a user
 * 
 * To run:
 * node scripts/add-test-article.js YOUR_USER_ID
 */

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local if available
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('Loaded environment variables from .env.local');
}

// Supabase connection details
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fybwkixwqjyggeuyzwxl.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5YndraXh3cWp5Z2dldXl6d3hsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzA1MjA0NSwiZXhwIjoyMDU4NjI4MDQ1fQ.q36M7fBmSnuoXbWZxA5xmgYt2x12A7wQP0CwbQaMKNM';

async function addTestArticle() {
  try {
    // Get user ID from command line
    const userId = process.argv[2];
    
    if (!userId) {
      console.error('Please provide a user ID as an argument');
      console.log('Usage: node add-test-article.js YOUR_USER_ID');
      process.exit(1);
    }
    
    console.log(`Adding test article for user: ${userId}`);
    
    // Initialize Supabase admin client (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // First, check if the user exists in the auth.users table
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError) {
      console.error('Error getting auth user:', authError);
      process.exit(1);
    }
    
    if (!authUser || !authUser.user) {
      console.error(`User with ID ${userId} not found in auth.users table`);
      process.exit(1);
    }
    
    console.log(`Found auth user: ${authUser.user.email}`);
    
    // Next, check if the user exists in the public.users table
    const { data: publicUser, error: publicUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    // If the user doesn't exist in the public.users table, create it
    if (!publicUser) {
      console.log('User not found in public.users table, creating...');
      
      const { data: newUser, error: createUserError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: authUser.user.email,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (createUserError) {
        console.error('Error creating user in public.users table:', createUserError);
        process.exit(1);
      }
      
      console.log('User created successfully in public.users table');
    } else {
      console.log('User already exists in public.users table');
    }
    
    // Create a test article
    const testArticle = {
      url: `https://test-article-${Date.now()}.com`,
      title: `Test Article ${new Date().toISOString()}`,
      source: 'Test Source',
      publish_date: new Date().toISOString(),
      summary: 'This is a test article summary created for debugging purposes.',
      visual_summary: [
        { emoji: '🧪', point: 'This is a test article' },
        { emoji: '🔍', point: 'Created for debugging' }
      ],
      keywords: ['test', 'debug', 'sciensaurus'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Inserting test article...');
    
    // Insert the article in article_summaries
    const { data: articleData, error: articleError } = await supabase
      .from('article_summaries')
      .insert(testArticle)
      .select()
      .single();
    
    if (articleError) {
      console.error('Error inserting article:', articleError);
      process.exit(1);
    }
    
    console.log(`Article inserted successfully with ID: ${articleData.id}`);
    
    // Now create a relationship between the user and article
    const userArticle = {
      user_id: userId,
      article_summary_id: articleData.id,
      is_bookmarked: false,
      view_count: 1,
      last_viewed_at: new Date().toISOString()
    };
    
    console.log('Creating user-article relationship...');
    
    // Insert the relationship
    const { data: relationData, error: relationError } = await supabase
      .from('users_articles')
      .insert(userArticle)
      .select()
      .single();
    
    if (relationError) {
      console.error('Error creating user-article relationship:', relationError);
      process.exit(1);
    }
    
    console.log(`Relationship created successfully with ID: ${relationData.id}`);
    console.log('Test complete! You should now see this article in your dashboard.');
    
  } catch (error) {
    console.error('Script error:', error);
    process.exit(1);
  }
}

// Run the function
addTestArticle();
