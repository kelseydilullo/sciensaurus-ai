import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Get article summary endpoint called');
    
    // Get article ID from query parameters
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('id');
    
    if (!articleId) {
      return NextResponse.json(
        { error: 'Missing article ID parameter' },
        { status: 400 }
      );
    }
    
    console.log(`Fetching article summary with ID: ${articleId}`);
    
    // Try to get user from auth cookie (optional, will still return article if no user)
    let userId: string | undefined;
    
    try {
      // Extract auth token directly from cookie
      const cookieStore = await cookies();
      const authCookie = cookieStore.get('sb-fybwkixwqjyggeuyzwxl-auth-token');
      
      if (authCookie?.value) {
        // Parse auth cookie
        const cookieData = JSON.parse(
          Buffer.from(authCookie.value.replace('base64-', ''), 'base64').toString()
        );
        const token = cookieData.access_token;
        
        if (token) {
          // Use admin client to verify user
          const adminClient = createAdminClient();
          const { data: userData, error: userError } = await adminClient.auth.getUser(token);
          
          if (!userError && userData?.user) {
            userId = userData.user.id;
            console.log(`User authenticated: ${userId}`);
          }
        }
      }
    } catch (authError) {
      console.warn('Non-critical auth error:', authError);
      // Continue without user auth - we'll still return the article
    }

    // Use admin client for database operations
    const adminClient = createAdminClient();
    
    // Fetch the article summary from the database
    const { data: article, error } = await adminClient
      .from('article_summaries')
      // Explicitly select all required fields, including new demographics
      .select(`
        id,
        url,
        title,
        summarized_title,
        source,
        publish_date,
        summary,
        visual_summary,
        keywords,
        study_metadata,
        related_research,
        raw_content,
        created_at,
        updated_at,
        age_demographics, 
        gender_demographics 
      `)
      .eq('id', articleId)
      .single();
      
    if (error) {
      console.error('Error fetching article summary:', error);
      return NextResponse.json(
        { error: 'Failed to fetch article summary', details: error.message },
        { status: 500 }
      );
    }
    
    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }
    
    // If user is authenticated, record the view
    if (userId) {
      try {
        // Check if relation already exists
        const { data: existingRelation, error: relationCheckError } = await adminClient
          .from('users_articles')
          .select('id, view_count')
          .eq('user_id', userId)
          .eq('article_summary_id', articleId)
          .limit(1)
          .single();
          
        if (relationCheckError && relationCheckError.code !== 'PGRST116') {
          console.error('Error checking for existing relation:', relationCheckError);
        } else if (existingRelation) {
          // Update existing relation
          await adminClient
            .from('users_articles')
            .update({
              last_viewed_at: new Date().toISOString(),
              view_count: (existingRelation.view_count || 0) + 1
            })
            .eq('id', existingRelation.id);
        } else {
          // Create new relation
          await adminClient
            .from('users_articles')
            .insert({
              user_id: userId,
              article_summary_id: articleId,
              is_bookmarked: false, // Not bookmarked by default
              view_count: 1,
              last_viewed_at: new Date().toISOString()
            });
        }
      } catch (relationError) {
        console.error('Error recording article view:', relationError);
        // Continue even if recording the view fails
      }
    }
    
    return NextResponse.json({
      success: true,
      article
    });
  } catch (error) {
    console.error('Error in get-article-summary API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 