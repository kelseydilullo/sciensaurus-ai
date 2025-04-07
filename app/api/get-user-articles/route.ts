import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Get user articles endpoint called');
    
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
    
    // Get URL parameters
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    
    // Parse limit parameter
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    
    // Get the user's articles with admin client
    console.log(`Fetching articles for user: ${userId}, limit: ${limit}`);
    
    // First, ensure user exists in users table 
    const { data: existingUser, error: checkError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .limit(1)
      .single();
      
    // If user doesn't exist and no error other than "not found", create user
    if (checkError && checkError.code === 'PGRST116') {
      console.log(`User ${userId} not found in users table, creating...`);
      const { error: insertError } = await adminClient
        .from('users')
        .insert({
          id: userId,
          email: userData.user.email,
          created_at: new Date().toISOString(),
        });
        
      if (insertError) {
        console.error('Error creating user record:', insertError);
      } else {
        console.log(`User ${userId} created successfully`);
      }
    } else if (checkError) {
      console.error('Error checking for user existence:', checkError);
    }
    
    // Get articles related to this user, ordered by last viewed
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
      .limit(limit);
      
    if (error) {
      console.error('Error getting user articles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch articles', details: error.message },
        { status: 500 }
      );
    }
    
    // Format the data to match the expected structure
    const formattedArticles = articles?.map(item => ({
      ...item.article_summary,
      is_bookmarked: item.is_bookmarked,
      view_count: item.view_count
    })) || [];
    
    console.log(`Retrieved ${formattedArticles.length} articles for user ${userId}`);
    
    return NextResponse.json({
      success: true,
      articles: formattedArticles
    });
  } catch (error) {
    console.error('Error in get-user-articles API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 