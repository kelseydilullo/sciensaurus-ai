import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Get admin articles endpoint called');
    
    // Get the admin email from query parameters
    const searchParams = request.nextUrl.searchParams;
    const adminEmail = searchParams.get('email');
    
    if (!adminEmail) {
      console.error('No admin email provided');
      return NextResponse.json(
        { error: 'Admin email is required' },
        { status: 400 }
      );
    }
    
    console.log(`Fetching articles for admin: ${adminEmail}`);
    
    // Use admin client to bypass RLS
    const adminClient = createAdminClient();
    
    // First, find the user ID from email in the users table
    const { data: userRecord, error: userLookupError } = await adminClient
      .from('users')
      .select('id')
      .eq('email', adminEmail)
      .limit(1)
      .single();
    
    if (userLookupError || !userRecord) {
      console.error('Failed to find admin user:', userLookupError || 'No user found');
      return NextResponse.json(
        { error: 'Admin user not found', details: userLookupError?.message || 'No user with this email exists' },
        { status: 404 }
      );
    }
    
    const userId = userRecord.id;
    console.log(`Found admin user ID: ${userId}`);
    
    // Get the user's articles, limit to 10 most recent ones
    const { data: articles, error } = await adminClient
      .from('users_articles')
      .select(`
        is_bookmarked,
        view_count,
        last_viewed_at,
        article_summary:article_summary_id(*)
      `)
      .eq('user_id', userId)
      .order('last_viewed_at', { ascending: false })
      .limit(10);
      
    if (error) {
      console.error('Error getting admin articles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch admin articles', details: error.message },
        { status: 500 }
      );
    }
    
    if (!articles || articles.length === 0) {
      console.log(`No articles found for admin user: ${adminEmail}`);
      // Return empty array instead of error for easier handling
      return NextResponse.json({
        success: true,
        articles: []
      });
    }
    
    // Format the data to match the expected structure
    const formattedArticles = articles.map(item => ({
      ...item.article_summary,
      is_bookmarked: item.is_bookmarked,
      view_count: item.view_count
    })) || [];
    
    console.log(`Retrieved ${formattedArticles.length} articles for admin ${adminEmail}`);
    
    return NextResponse.json({
      success: true,
      articles: formattedArticles
    });
  } catch (error) {
    console.error('Error in get-admin-articles API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 