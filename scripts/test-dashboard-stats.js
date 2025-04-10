/**
 * Script to test dashboard statistics API endpoints
 * This helps verify the stats API is working correctly
 */

import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

async function testDashboardStats() {
  console.log(`${colors.blue}${colors.bright}Testing Dashboard Stats API...${colors.reset}\n`);
  
  let baseUrl = 'http://localhost:3000';
  
  // Check if server is running
  try {
    console.log('Checking if Next.js server is running...');
    const response = await fetch(`${baseUrl}/api/health`);
    
    if (!response.ok) {
      console.log(`${colors.yellow}Health check endpoint returned ${response.status}${colors.reset}`);
      console.log(`${colors.yellow}This is not critical if another endpoint exists${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ Server is running${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Server is not running at ${baseUrl}${colors.reset}`);
    console.error(`${colors.red}Please start your Next.js server with: pnpm dev${colors.reset}`);
    return;
  }
  
  // Test the dashboard stats endpoint
  try {
    console.log('\nTesting debug dashboard stats endpoint...');
    const response = await fetch(`${baseUrl}/api/debug-dashboard-stats`);
    
    if (!response.ok) {
      console.error(`${colors.red}❌ Failed to fetch dashboard stats: ${response.status} ${response.statusText}${colors.reset}`);
      console.error(await response.text());
      return;
    }
    
    const data = await response.json();
    
    // Display the stats
    console.log(`${colors.green}✅ Successfully fetched dashboard stats${colors.reset}`);
    console.log('\nDashboard Statistics:');
    console.log('-----------------');
    
    if (data.success && data.stats) {
      const stats = data.stats;
      
      console.log(`User: ${stats.user.firstName} (${stats.user.email})`);
      console.log(`Articles analyzed: ${stats.articlesAnalyzed.count}`);
      console.log(`Growth percentage: ${stats.articlesAnalyzed.growthPercentage}%`);
      
      // Log any recent articles
      if (stats.recentArticles && stats.recentArticles.length > 0) {
        console.log('\nRecent articles:');
        stats.recentArticles.forEach((article, index) => {
          console.log(`  ${index + 1}. ${article.title}`);
        });
      } else {
        console.log('\nNo recent articles found.');
      }
      
      // Check for issues
      if (stats.articlesAnalyzed.count === 0) {
        console.log(`\n${colors.yellow}⚠️ Articles count is 0. This may indicate a data issue.${colors.reset}`);
      } else if (stats.articlesAnalyzed.count > 0 && (!stats.recentArticles || stats.recentArticles.length === 0)) {
        console.log(`\n${colors.yellow}⚠️ Data inconsistency: Articles count is ${stats.articlesAnalyzed.count} but no recent articles were found.${colors.reset}`);
      } else {
        console.log(`\n${colors.green}✅ Found ${stats.articlesAnalyzed.count} total articles${colors.reset}`);
      }
      
      // Show debug info if available
      if (stats.debug) {
        console.log('\nDebug information:');
        console.log(JSON.stringify(stats.debug, null, 2));
      }
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error testing dashboard stats: ${error.message}${colors.reset}`);
  }
}

// Run the test
testDashboardStats().catch(error => {
  console.error(`Unhandled error: ${error}`);
}); 