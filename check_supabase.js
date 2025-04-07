const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const supabaseUrl = 'https://fybwkixwqjyggeuyzwxl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5YndraXh3cWp5Z2dldXl6d3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwNTIwNDUsImV4cCI6MjA1ODYyODA0NX0.Eq7gbYjWGDKhX7dpmbZgKEbpBuRngEFNGI0ZmNZamIY';

async function checkTables() {
  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // First attempt - try to list tables from a known table if it exists
    console.log('Attempting to connect to Supabase...');
    
    const { data: articleData, error: articleError } = await supabase
      .from('article_summaries')
      .select('*')
      .limit(1);
    
    if (!articleError) {
      console.log('Successfully connected! Found article_summaries table:');
      console.log('Sample record:', articleData);
    } else {
      console.log('Could not query article_summaries:', articleError.message);
    }
    
    // Try users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (!userError) {
      console.log('\nFound users table:');
      console.log('Sample record:', userData);
    } else {
      console.log('Could not query users table:', userError.message);
    }
    
    // Try users_articles table
    const { data: usersArticlesData, error: usersArticlesError } = await supabase
      .from('users_articles')
      .select('*')
      .limit(1);
    
    if (!usersArticlesError) {
      console.log('\nFound users_articles table:');
      console.log('Sample record:', usersArticlesData);
    } else {
      console.log('Could not query users_articles table:', usersArticlesError.message);
    }
    
  } catch (err) {
    console.error('Script error:', err);
  }
}

checkTables(); 