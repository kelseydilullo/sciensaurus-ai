import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';
import { getDashboardStats } from '@/utils/supabase/article-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Define the response type structure
type DashboardResponse = {
  success: boolean;
  stats: {
    user: {
      id: string;
      firstName: string;
      email: string | undefined;
    };
    articlesAnalyzed: {
      count: number;
      growthPercentage: number;
      savedCount: number;
    };
    recentArticles: any[]; // Using any[] for simplicity here
    lastSavedDaysAgo: number;
    responseTime: number;
    debug?: any; // Optional debug property
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    console.log('Get dashboard stats endpoint called');
    
    // Extract auth token directly from cookie
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('sb-fybwkixwqjyggeuyzwxl-auth-token');
    
    if (!authCookie?.value) {
      console.error('No auth cookie found');
      return NextResponse.json(
        { error: 'Authentication required', details: 'No auth cookie found' },
        { status: 401 }
      );
    }
    
    let token: string;
    try {
      // Auth cookie value is base64-encoded JSON
      const cookieData = JSON.parse(
        Buffer.from(authCookie.value.replace('base64-', ''), 'base64').toString()
      );
      token = cookieData.access_token;
    } catch (parseError) {
      console.error('Failed to parse auth cookie:', parseError);
      return NextResponse.json(
        { error: 'Invalid auth cookie format' },
        { status: 401 }
      );
    }
    
    if (!token) {
      console.error('No access token found in auth cookie');
      return NextResponse.json(
        { error: 'No access token in auth cookie' },
        { status: 401 }
      );
    }
    
    // Use admin client to get user info and bypass RLS
    const adminClient = createAdminClient();
    
    // Verify token and get user info
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    
    if (userError || !userData?.user) {
      console.error('Failed to verify user token:', userError);
      return NextResponse.json(
        { error: 'Invalid authentication token', details: userError?.message },
        { status: 401 }
      );
    }
    
    const userId = userData.user.id;
    console.log(`User authenticated: ${userId}`);
    
    // Get URL parameters (limit for recent articles)
    const searchParams = request.nextUrl.searchParams;
    const recentArticlesLimit = searchParams.get('limit') ? 
      parseInt(searchParams.get('limit')!, 10) : 8; // Default to 8 recent articles
    const includeDebug = searchParams.get('debug') === 'true'; // Optional debug parameter
    
    // First, ensure user exists in users table 
    // We'll combine this with getting user profile data to reduce queries
    let userProfile = null;
    const { data: existingUser, error: userProfileError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .limit(1)
      .single();
      
    // If user doesn't exist and no error other than "not found", create user
    if (userProfileError && userProfileError.code === 'PGRST116') {
      console.log(`User ${userId} not found in users table, creating...`);
      const { data: newUser, error: insertError } = await adminClient
        .from('users')
        .insert({
          id: userId,
          email: userData.user.email,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
        
      if (insertError) {
        console.error('Error creating user record:', insertError);
      } else {
        console.log(`User ${userId} created successfully`);
        userProfile = newUser;
      }
    } else if (userProfileError) {
      console.error('Error checking for user existence:', userProfileError);
    } else {
      userProfile = existingUser;
      console.log(`Found existing user in users table: ${userId}`);
    }
    
    // Try direct DB query to check for articles (debugging)
    try {
      const { count, error } = await adminClient
        .from('users_articles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (error) {
        console.error('Direct count query error:', error);
      } else {
        console.log(`Direct DB query found ${count} articles for user ${userId}`);
      }
    } catch (directQueryError) {
      console.error('Error in direct count query:', directQueryError);
    }
    
    // Get all dashboard stats in one efficient call using our utility function
    const dashboardStats = await getDashboardStats(userId, recentArticlesLimit);
    
    if (!dashboardStats) {
      return NextResponse.json(
        { error: 'Failed to fetch dashboard statistics' },
        { status: 500 }
      );
    }
    
    // Get user's first name from metadata or parse from email
    const firstName = userData.user.user_metadata?.first_name || 
      (userData.user.email 
        ? userData.user.email.split('@')[0].split('.')[0].charAt(0).toUpperCase() + 
          userData.user.email.split('@')[0].split('.')[0].slice(1) 
        : "there");
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    console.log(`Dashboard stats retrieved in ${responseTime}ms`);
    console.log(`Articles found: ${dashboardStats.articlesAnalyzed.count}, Recent articles: ${dashboardStats.recentArticles.length}`);
    
    // Create response object
    const response: DashboardResponse = {
      success: true,
      stats: {
        user: {
          id: userId,
          firstName: firstName,
          email: userData.user.email
        },
        articlesAnalyzed: {
          count: dashboardStats.articlesAnalyzed.count,
          growthPercentage: dashboardStats.articlesAnalyzed.growthPercentage,
          savedCount: dashboardStats.articlesAnalyzed.savedCount
        },
        recentArticles: dashboardStats.recentArticles,
        lastSavedDaysAgo: dashboardStats.lastSavedDaysAgo,
        responseTime: responseTime
      }
    };
    
    // Include debug info if requested
    if (includeDebug) {
      response.stats.debug = {
        ...dashboardStats.debug,
        authInfo: {
          userId,
          userEmail: userData.user.email,
          hasMetadata: !!userData.user.user_metadata,
          userProfile: userProfile ? { id: userProfile.id, email: userProfile.email } : null
        }
      };
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in get-dashboard-stats API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 