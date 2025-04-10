import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('Store article summary endpoint called');
    
    // Try to get user from auth cookie (optional, will still store article if no user)
    let userId: string | undefined;
    let email: string | undefined;
    
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
            email = userData.user.email;
            console.log(`User authenticated: ${userId}`);
          }
        }
      }
    } catch (authError) {
      console.warn('Non-critical auth error:', authError);
      // Continue without user auth - we'll still store the article
    }

    if (!userId) {
      console.log('No authenticated user found, will store article summary only');
    }

    // Parse the request body
    const requestBody = await request.json();
    
    // Log the request body structure for debugging
    console.log('Received request body structure:', {
      hasUrl: !!requestBody.url,
      hasTitle: !!requestBody.title,
      hasSource: !!requestBody.source,
      hasPublishDate: !!requestBody.publish_date,
      hasSummary: !!requestBody.summary,
      hasVisualSummary: !!requestBody.visual_summary && Array.isArray(requestBody.visual_summary),
      visualSummaryLength: requestBody.visual_summary ? requestBody.visual_summary.length : 0,
      hasKeywords: !!requestBody.keywords && Array.isArray(requestBody.keywords),
      keywordsLength: requestBody.keywords ? requestBody.keywords.length : 0,
      hasStudyMetadata: !!requestBody.study_metadata,
      hasRelatedResearch: !!requestBody.related_research,
      hasRawContent: !!requestBody.raw_content
    });
    
    const { 
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
      raw_content
    } = requestBody;

    // Validate required fields
    if (!url || !title) {
      console.error('Missing required fields:', { hasUrl: !!url, hasTitle: !!title });
      return NextResponse.json(
        { error: 'Missing required fields: url and title are required' },
        { status: 400 }
      );
    }

    // Validate publish_date if provided - ensure it's not in the future
    let validatedPublishDate = publish_date;
    if (validatedPublishDate) {
      try {
        const publishDate = new Date(validatedPublishDate);
        const now = new Date();
        
        // Check if it's a valid date
        if (!isNaN(publishDate.getTime())) {
          // If date is in the future, set it to current date
          if (publishDate > now) {
            console.warn(`Future publish date detected: ${validatedPublishDate}, defaulting to current date`);
            // Set to current date
            validatedPublishDate = now.toISOString();
          }
        } else {
          console.warn(`Invalid publish date format: ${validatedPublishDate}, defaulting to null`);
          validatedPublishDate = null;
        }
      } catch (dateError) {
        console.warn('Error validating publish date:', dateError);
        validatedPublishDate = null;
      }
    }

    console.log(`Storing article summary for URL: ${url.substring(0, 50)}...`);
    
    // Use admin client for database operations
    const adminClient = createAdminClient();
    
    // Verify admin client was created correctly
    if (!adminClient) {
      console.error('Failed to create admin client');
      return NextResponse.json(
        { error: 'Failed to create database client' },
        { status: 500 }
      );
    }
    
    console.log('Admin client created successfully');
    
    // First check if this article already exists (by URL)
    console.log(`Checking if article with URL ${url.substring(0, 30)}... already exists`);
    const { data: existingArticles, error: checkError } = await adminClient
      .from('article_summaries')
      .select('id')
      .eq('url', url)
      .limit(1);
      
    if (checkError) {
      console.error('Error checking for existing article:', checkError);
      return NextResponse.json(
        { error: 'Failed to check for existing article', details: checkError.message },
        { status: 500 }
      );
    }
    
    console.log(`Check complete. Found ${existingArticles?.length || 0} matching articles`);
    
    let articleSummaryId: string;
    
    // If article exists, update it
    if (existingArticles && existingArticles.length > 0) {
      console.log(`Article found, updating existing record with ID: ${existingArticles[0].id}`);
      
      // Prepare update data
      const updateData = {
        title,
        summarized_title,
        source,
        publish_date: validatedPublishDate,
        summary,
        visual_summary: visual_summary,
        keywords,
        study_metadata: study_metadata,
        related_research: related_research,
        raw_content: raw_content,
        updated_at: new Date().toISOString()
      };
      
      console.log('Update data prepared:', {
        hasTitle: !!updateData.title,
        hasSummarizedTitle: !!updateData.summarized_title,
        hasSource: !!updateData.source,
        hasPublishDate: !!updateData.publish_date,
        hasSummary: !!updateData.summary,
        hasVisualSummary: !!updateData.visual_summary,
        hasKeywords: !!updateData.keywords,
        hasStudyMetadata: !!updateData.study_metadata,
        hasRelatedResearch: !!updateData.related_research,
        hasRawContent: !!updateData.raw_content
      });
      
      const { data, error } = await adminClient
        .from('article_summaries')
        .update(updateData)
        .eq('id', existingArticles[0].id)
        .select()
        .single();
        
      if (error) {
        console.error('Error updating article summary:', error);
        return NextResponse.json(
          { error: 'Failed to update article summary', details: error.message },
          { status: 500 }
        );
      }
      
      articleSummaryId = data.id;
      console.log(`Successfully updated article with ID: ${articleSummaryId}`);
    } else {
      // Otherwise insert new article
      console.log('Article not found, creating new record');
      
      // Prepare insert data
      const insertData = {
        url,
        title,
        summarized_title,
        source,
        publish_date: validatedPublishDate,
        summary,
        visual_summary: visual_summary,
        keywords,
        study_metadata: study_metadata,
        related_research: related_research,
        raw_content: raw_content
      };
      
      console.log('Insert data prepared:', {
        hasUrl: !!insertData.url,
        hasTitle: !!insertData.title,
        hasSummarizedTitle: !!insertData.summarized_title,
        hasSource: !!insertData.source,
        hasPublishDate: !!insertData.publish_date,
        hasSummary: !!insertData.summary,
        hasVisualSummary: !!insertData.visual_summary,
        hasKeywords: !!insertData.keywords,
        hasStudyMetadata: !!insertData.study_metadata,
        hasRelatedResearch: !!insertData.related_research,
        hasRawContent: !!insertData.raw_content
      });
      
      const { data, error } = await adminClient
        .from('article_summaries')
        .insert(insertData)
        .select()
        .single();
        
      if (error) {
        console.error('Error inserting article summary:', error);
        console.log('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return NextResponse.json(
          { error: 'Failed to insert article summary', details: error.message },
          { status: 500 }
        );
      }
      
      articleSummaryId = data.id;
      console.log(`Successfully inserted new article with ID: ${articleSummaryId}`);
    }

    // If user is authenticated, record the interaction
    let userArticle = null;
    if (userId && articleSummaryId) {
      console.log(`Recording user interaction for user ${userId} with article ${articleSummaryId}`);
      
      // First verify that the article actually exists
      const { data: articleExists, error: verifyError } = await adminClient
        .from('article_summaries')
        .select('id')
        .eq('id', articleSummaryId)
        .single();
        
      if (verifyError || !articleExists) {
        console.error(`Cannot create user-article relation: Article ${articleSummaryId} does not exist or cannot be accessed`);
        return NextResponse.json({
          success: true,
          articleSummaryId,
          userArticle: null,
          warning: "Could not create user-article relationship due to missing article reference"
        });
      }
      
      // Check if relation already exists
      const { data: existingRelation, error: relationCheckError } = await adminClient
        .from('users_articles')
        .select('id, is_bookmarked, view_count')
        .eq('user_id', userId)
        .eq('article_summary_id', articleSummaryId)
        .limit(1)
        .single();
        
      if (relationCheckError && relationCheckError.code !== 'PGRST116') {
        console.error('Error checking for existing relation:', relationCheckError);
      } else if (existingRelation) {
        // Update existing relation
        const { data: updatedRelation, error: updateError } = await adminClient
          .from('users_articles')
          .update({
            last_viewed_at: new Date().toISOString(),
            view_count: (existingRelation.view_count || 0) + 1
          })
          .eq('id', existingRelation.id)
          .select()
          .single();
          
        if (updateError) {
          console.error('Error updating user article relation:', updateError);
        } else {
          userArticle = updatedRelation;
          console.log('Successfully updated user-article relation');
        }
      } else {
        // Create new relation
        const { data: newRelation, error: insertError } = await adminClient
          .from('users_articles')
          .insert({
            user_id: userId,
            article_summary_id: articleSummaryId,
            is_bookmarked: false, // Not bookmarked by default
            view_count: 1,
            last_viewed_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (insertError) {
          console.error('Error creating user article relation:', insertError);
        } else {
          userArticle = newRelation;
          console.log('Successfully created user-article relation');
        }
      }
    }

    return NextResponse.json({
      success: true,
      articleSummaryId,
      userArticle
    });
  } catch (error) {
    console.error('Error in store-article-summary API:', error);
    // Add more detailed error logging
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : 'Unknown error type';
    
    console.error('Detailed error information:', errorDetails);
    
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 