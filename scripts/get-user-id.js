/**
 * Script to fetch the current user ID from the debug-user-auth endpoint
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFile = promisify(fs.readFile);

async function extractAuthCookie() {
  try {
    console.log('Looking for auth cookie in development environment...');
    
    // Check if .next/cookies directory exists (Next.js stores cookies for local dev)
    const cookiesDir = path.resolve(__dirname, '../.next/cookies');
    if (!fs.existsSync(cookiesDir)) {
      console.log('No .next/cookies directory found. Please ensure you are logged in and have visited the app recently.');
      return null;
    }
    
    // Read cookie files in directory
    const cookieFiles = fs.readdirSync(cookiesDir);
    if (!cookieFiles.length) {
      console.log('No cookie files found in .next/cookies directory.');
      return null;
    }
    
    // Try to find the Supabase auth cookie in the latest cookie file
    let authCookie = null;
    for (const file of cookieFiles) {
      if (!file.endsWith('.json')) continue;
      
      const filePath = path.join(cookiesDir, file);
      const content = await readFile(filePath, 'utf8');
      const cookies = JSON.parse(content);
      
      // Look for the Supabase auth cookie
      const supabaseAuthCookie = cookies.find(cookie => 
        cookie.name === 'sb-fybwkixwqjyggeuyzwxl-auth-token');
      
      if (supabaseAuthCookie) {
        authCookie = supabaseAuthCookie.value;
        console.log(`Found auth cookie in file: ${file}`);
        break;
      }
    }
    
    if (!authCookie) {
      console.log('No Supabase auth cookie found. Please ensure you are logged in.');
      return null;
    }
    
    return authCookie;
  } catch (error) {
    console.error('Error extracting auth cookie:', error);
    return null;
  }
}

async function getCurrentUserId() {
  try {
    console.log('Fetching user ID from debug endpoint...');
    
    // First make sure server is running
    let serverRunning = false;
    try {
      const healthCheck = await fetch('http://localhost:3000/api/debug-user-auth', {
        method: 'GET',
      });
      serverRunning = healthCheck.status !== 404;
    } catch (e) {
      console.error('Error connecting to server. Is your Next.js app running?');
      console.error('Please start your app with: pnpm dev');
      return null;
    }
    
    if (!serverRunning) {
      console.error('Server returned 404. Make sure the debug-user-auth endpoint exists and the app is running.');
      return null;
    }
    
    // Get auth cookie
    const authCookie = await extractAuthCookie();
    if (!authCookie) {
      // If we can't extract from files, prompt user to get it from browser
      console.log('\nCould not automatically extract auth cookie.');
      console.log('Please open your browser developer tools, go to Application > Cookies');
      console.log('Find the cookie named "sb-fybwkixwqjyggeuyzwxl-auth-token" and copy its value.');
      console.log('Then run this script with the cookie value:');
      console.log('node get-user-id.js "YOUR_COOKIE_VALUE"');
      
      // Check if a cookie was provided as a command-line argument
      if (process.argv.length > 2) {
        console.log('Using cookie value from command line argument...');
        const response = await fetch('http://localhost:3000/api/debug-user-auth', {
          method: 'GET',
          headers: {
            'Cookie': `sb-fybwkixwqjyggeuyzwxl-auth-token=${process.argv[2]}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user && data.user.id) {
            console.log(`\n✅ Success! Your user ID is: ${data.user.id}`);
            console.log(`\nRun the following command to add a test article to your account:`);
            console.log(`node add-test-article.js ${data.user.id}`);
            return data.user.id;
          }
        }
        
        console.error('Failed to get user ID with provided cookie.');
        return null;
      }
      
      return null;
    }
    
    // Make the request to the debug endpoint with the cookie
    const response = await fetch('http://localhost:3000/api/debug-user-auth', {
      method: 'GET',
      headers: {
        'Cookie': `sb-fybwkixwqjyggeuyzwxl-auth-token=${authCookie}`
      }
    });
    
    if (!response.ok) {
      console.error(`Error response from debug endpoint: ${response.status}`);
      console.error(await response.text());
      return null;
    }
    
    const data = await response.json();
    
    if (data.success && data.user && data.user.id) {
      console.log(`\n✅ Success! Your user ID is: ${data.user.id}`);
      console.log(`\nRun the following command to add a test article to your account:`);
      console.log(`node add-test-article.js ${data.user.id}`);
      return data.user.id;
    } else {
      console.error('No user ID found in response:', data);
      return null;
    }
  } catch (error) {
    console.error('Error fetching user ID:', error);
    return null;
  }
}

// Run the function
getCurrentUserId().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
