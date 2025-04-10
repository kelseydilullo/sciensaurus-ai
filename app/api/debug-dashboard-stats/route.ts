import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

// This endpoint is only for debugging and should be disabled in production
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Debug dashboard stats endpoint called');
    
    // Get environment - only allow in development
    const NODE_ENV = process.env.NODE_ENV;
    if (NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development mode' },
        { status: 403 }
      );
    }
    
    // Initialize admin client (bypasses RLS)
    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: 'Failed to create admin client' },
        { status: 500 }
      );
    }
    
    // For testing, we'll get stats for all users
    // First, get all users from the auth.users table
    const { data: users, error: usersError } = await adminClient.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error listing users:', usersError);
      return NextResponse.json(
        { error: 'Failed to list users', details: usersError.message },
        { status: 500 }
      );
    }
    
    // Now get article counts for the first active user
    const testUser = users.users.find(user => user.email && !user.banned_until);
    
    if (!testUser) {
      return NextResponse.json(
        { error: 'No active users found for testing' },
        { status: 404 }
      );
    }
    
    console.log(`Using test user: ${testUser.email} (${testUser.id})`);
    
    // Get article count for this user
    const { count: totalArticles, error: countError } = await adminClient
      .from('users_articles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', testUser.id);
      
    if (countError) {
      console.error('Error counting articles:', countError);
      return NextResponse.json(
        { error: 'Failed to count articles', details: countError.message },
        { status: 500 }
      );
    }
    
    // Get recent articles
    const { data: recentArticles, error: articlesError } = await adminClient
      .from('users_articles')
      .select(`
        id,
        is_bookmarked,
        view_count,
        last_viewed_at,
        article_summary:article_summary_id(
          id,
          url,
          title,
          source,
          publish_date,
          summary,
          keywords,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', testUser.id)
      .order('last_viewed_at', { ascending: false })
      .limit(4);
      
    if (articlesError) {
      console.error('Error getting recent articles:', articlesError);
      return NextResponse.json(
        { error: 'Failed to get recent articles', details: articlesError.message },
        { status: 500 }
      );
    }
    
    // Format recent articles
    const formattedArticles = recentArticles
      .filter(item => item.article_summary)
      .map(item => ({
        ...item.article_summary,
        is_bookmarked: item.is_bookmarked,
        view_count: item.view_count
      }));
    
    return NextResponse.json({
      success: true,
      stats: {
        user: {
          id: testUser.id,
          firstName: testUser.user_metadata?.first_name || testUser.email?.split('@')[0] || 'Test User',
          email: testUser.email
        },
        articlesAnalyzed: {
          count: totalArticles || 0,
          growthPercentage: 12, // Placeholder
          savedCount: 0 // Placeholder
        },
        recentArticles: formattedArticles,
        lastSavedDaysAgo: 0, // Placeholder
        totalArticles: totalArticles || 0,
        debug: {
          isDebugEndpoint: true,
          userCount: users.users.length,
          articleCount: totalArticles || 0,
          recentArticlesCount: formattedArticles.length
        }
      }
    });
  } catch (error) {
    console.error('Error in debug-dashboard-stats API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 