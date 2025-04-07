import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('Toggle bookmark endpoint called');
    
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

    // Parse the request body
    const requestBody = await request.json();
    const { articleSummaryId } = requestBody;

    // Validate required fields
    if (!articleSummaryId) {
      console.error('Missing required field: articleSummaryId');
      return NextResponse.json(
        { error: 'Missing required field: articleSummaryId' },
        { status: 400 }
      );
    }

    console.log(`Toggling bookmark for user ${userId}, article ${articleSummaryId}`);
    
    // Check if relation already exists
    const { data: existingRelation, error: checkError } = await adminClient
      .from('users_articles')
      .select('id, is_bookmarked')
      .eq('user_id', userId)
      .eq('article_summary_id', articleSummaryId)
      .limit(1)
      .single();
      
    // Check for errors other than "no rows found"
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking for existing relation:', checkError);
      return NextResponse.json(
        { error: 'Database query failed', details: checkError.message },
        { status: 500 }
      );
    }
    
    const newStatus = existingRelation ? !existingRelation.is_bookmarked : true;
    
    if (existingRelation) {
      // Update existing relation
      console.log(`Updating existing bookmark to ${newStatus}`);
      const { error: updateError } = await adminClient
        .from('users_articles')
        .update({
          is_bookmarked: newStatus,
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', existingRelation.id);
        
      if (updateError) {
        console.error('Error updating bookmark status:', updateError);
        return NextResponse.json(
          { error: 'Failed to update bookmark', details: updateError.message },
          { status: 500 }
        );
      }
    } else {
      // Create new relation
      console.log(`Creating new bookmark with status ${newStatus}`);
      const { error: insertError } = await adminClient
        .from('users_articles')
        .insert({
          user_id: userId,
          article_summary_id: articleSummaryId,
          is_bookmarked: newStatus,
          view_count: 1,
          last_viewed_at: new Date().toISOString()
        });
        
      if (insertError) {
        console.error('Error creating bookmark:', insertError);
        return NextResponse.json(
          { error: 'Failed to create bookmark', details: insertError.message },
          { status: 500 }
        );
      }
    }

    console.log(`Successfully toggled bookmark to ${newStatus}`);
    return NextResponse.json({
      success: true,
      isBookmarked: newStatus
    });
  } catch (error) {
    console.error('Error in toggle-bookmark API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 