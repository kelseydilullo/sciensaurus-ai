import { createClient } from '@/utils/supabase/client';

/**
 * Service module for storing and retrieving article summaries from Supabase
 * This doesn't modify any UI components and works alongside the existing UI
 */

// Types matching our database schema
export interface ArticleSummary {
  id?: string;
  url: string;
  title: string;
  source?: string;
  publish_date?: string;
  summary?: string;
  visual_summary?: Array<{emoji: string; point: string}>;
  keywords?: string[];
  study_metadata?: any;
  related_research?: any;
  raw_content?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserArticle {
  id?: string;
  user_id: string;
  article_summary_id: string;
  is_bookmarked?: boolean;
  last_viewed_at?: string;
  view_count?: number;
  notes?: string;
}

// Interface for the join between users_articles and article_summaries
interface UserArticleJoin {
  is_bookmarked?: boolean;
  view_count?: number;
  last_viewed_at?: string;
  article_summary: ArticleSummary;
}

/**
 * Store a new article summary or update an existing one
 * @param articleSummary The article summary to store
 * @returns The stored article summary
 */
export async function storeArticleSummary(articleSummary: ArticleSummary): Promise<ArticleSummary | null> {
  try {
    console.log(`Starting storeArticleSummary for URL: ${articleSummary.url.substring(0, 50)}...`);
    
    const supabase = createClient();
    
    // First check if this article already exists (by URL)
    console.log('Checking if article already exists...');
    const { data: existingArticles, error: checkError } = await supabase
      .from('article_summaries')
      .select('*')
      .eq('url', articleSummary.url)
      .limit(1);
      
    if (checkError) {
      console.error('Error checking for existing article:', checkError.code, checkError.message, checkError.details);
      return null;
    }
    
    let result;
    
    // If article exists, update it
    if (existingArticles && existingArticles.length > 0) {
      console.log(`Article found, updating existing record with ID: ${existingArticles[0].id}`);
      const { data, error } = await supabase
        .from('article_summaries')
        .update({
          title: articleSummary.title,
          source: articleSummary.source,
          publish_date: articleSummary.publish_date,
          summary: articleSummary.summary,
          visual_summary: articleSummary.visual_summary,
          keywords: articleSummary.keywords,
          study_metadata: articleSummary.study_metadata,
          related_research: articleSummary.related_research,
          raw_content: articleSummary.raw_content,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingArticles[0].id)
        .select()
        .single();
        
      if (error) {
        console.error('Error updating article summary:', error.code, error.message, error.details);
        return null;
      }
      
      result = data;
      console.log(`Successfully updated article with ID: ${result.id}`);
    } else {
      // Otherwise insert new article
      console.log('Article not found, creating new record...');
      const { data, error } = await supabase
        .from('article_summaries')
        .insert({
          url: articleSummary.url,
          title: articleSummary.title,
          source: articleSummary.source,
          publish_date: articleSummary.publish_date,
          summary: articleSummary.summary,
          visual_summary: articleSummary.visual_summary,
          keywords: articleSummary.keywords,
          study_metadata: articleSummary.study_metadata,
          related_research: articleSummary.related_research,
          raw_content: articleSummary.raw_content
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error inserting article summary:', error.code, error.message, error.details);
        return null;
      }
      
      result = data;
      console.log(`Successfully inserted new article with ID: ${result.id}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error in storeArticleSummary:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Get an article summary by URL
 * @param url The URL of the article
 * @returns The article summary if found
 */
export async function getArticleSummaryByUrl(url: string): Promise<ArticleSummary | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('article_summaries')
      .select('*')
      .eq('url', url)
      .limit(1)
      .single();
      
    if (error) {
      console.error('Error getting article summary:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getArticleSummaryByUrl:', error);
    return null;
  }
}

/**
 * Record a user's interaction with an article
 * @param userId The user's ID
 * @param articleSummaryId The article summary ID
 * @param isBookmarked Whether the article is bookmarked
 * @returns The created or updated user article record
 */
export async function recordUserArticleInteraction(
  userId: string,
  articleSummaryId: string,
  isBookmarked: boolean = false
): Promise<UserArticle | null> {
  try {
    const supabase = createClient();
    
    // Check if relationship already exists
    const { data: existingRelations, error: checkError } = await supabase
      .from('users_articles')
      .select('*')
      .eq('user_id', userId)
      .eq('article_summary_id', articleSummaryId)
      .limit(1);
      
    if (checkError) {
      console.error('Error checking for existing relation:', checkError);
      return null;
    }
    
    let result;
    
    // If relation exists, update it
    if (existingRelations && existingRelations.length > 0) {
      const { data, error } = await supabase
        .from('users_articles')
        .update({
          is_bookmarked: isBookmarked,
          last_viewed_at: new Date().toISOString(),
          view_count: (existingRelations[0].view_count || 0) + 1
        })
        .eq('id', existingRelations[0].id)
        .select()
        .single();
        
      if (error) {
        console.error('Error updating user article relation:', error);
        return null;
      }
      
      result = data;
    } else {
      // Otherwise insert new relation
      const { data, error } = await supabase
        .from('users_articles')
        .insert({
          user_id: userId,
          article_summary_id: articleSummaryId,
          is_bookmarked: isBookmarked,
          view_count: 1
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error inserting user article relation:', error);
        return null;
      }
      
      result = data;
    }
    
    return result;
  } catch (error) {
    console.error('Error in recordUserArticleInteraction:', error);
    return null;
  }
}

/**
 * Get article summaries for a user (for dashboard display)
 * @param userId The user's ID
 * @param limit Maximum number of articles to return
 * @returns Array of article summaries with user-specific data
 */
export async function getUserArticleSummaries(
  userId: string,
  limit: number = 10
): Promise<Array<ArticleSummary & { is_bookmarked?: boolean; view_count?: number }>> {
  try {
    const supabase = createClient();
    
    // Get articles related to this user, ordered by last viewed
    const { data, error } = await supabase
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
      console.error('Error getting user article summaries:', error);
      return [];
    }
    
    // Format the data to match the expected structure
    return data.map((item: UserArticleJoin) => ({
      ...item.article_summary,
      is_bookmarked: item.is_bookmarked,
      view_count: item.view_count
    }));
  } catch (error) {
    console.error('Error in getUserArticleSummaries:', error);
    return [];
  }
}

/**
 * Toggle bookmark status for an article
 * @param userId The user's ID
 * @param articleSummaryId The article summary ID
 * @returns The updated bookmark status
 */
export async function toggleBookmark(
  userId: string,
  articleSummaryId: string
): Promise<boolean | null> {
  try {
    const supabase = createClient();
    
    // First check current status
    const { data: existingRelation, error: checkError } = await supabase
      .from('users_articles')
      .select('id, is_bookmarked')
      .eq('user_id', userId)
      .eq('article_summary_id', articleSummaryId)
      .limit(1)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error checking bookmark status:', checkError);
      return null;
    }
    
    const newStatus = existingRelation ? !existingRelation.is_bookmarked : true;
    
    if (existingRelation) {
      // Update existing relation
      const { error } = await supabase
        .from('users_articles')
        .update({
          is_bookmarked: newStatus
        })
        .eq('id', existingRelation.id);
        
      if (error) {
        console.error('Error updating bookmark status:', error);
        return null;
      }
    } else {
      // Create new relation
      const { error } = await supabase
        .from('users_articles')
        .insert({
          user_id: userId,
          article_summary_id: articleSummaryId,
          is_bookmarked: newStatus,
          view_count: 1
        });
        
      if (error) {
        console.error('Error creating bookmark:', error);
        return null;
      }
    }
    
    return newStatus;
  } catch (error) {
    console.error('Error in toggleBookmark:', error);
    return null;
  }
}

/**
 * Ensure that a user from Auth exists in the users table
 * @param userId The user's ID from Auth
 * @param email The user's email
 * @returns The user record from the users table
 */
export async function ensureUserExists(userId: string, email: string): Promise<any | null> {
  try {
    console.log(`ensureUserExists called for user: ${userId}`);
    
    if (!userId || !email) {
      console.error('Invalid user data provided to ensureUserExists', { hasUserId: !!userId, hasEmail: !!email });
      return null;
    }
    
    const supabase = createClient();
    
    // First, check if users table exists by trying to count records
    console.log('Checking if users table exists...');
    try {
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('Error accessing users table:', countError.code, countError.message);
        
        if (countError.code === '42P01') {
          console.error('The "users" table does not exist in the database');
          throw new Error('The "users" table does not exist in the database');
        }
        
        if (countError.code === '42501' || countError.code === '42000') {
          console.error('Permission denied accessing users table - check RLS policies');
          throw new Error('Permission denied - check RLS policies in Supabase');
        }
      } else {
        console.log(`Users table exists, contains ${count} records`);
      }
    } catch (tableCheckError) {
      console.error('Error checking users table:', tableCheckError);
      throw tableCheckError;
    }
    
    // Check if user exists in users table
    console.log(`Checking if user ${userId} exists in users table...`);
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .limit(1)
      .single();
      
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        // No rows returned - user doesn't exist, which is normal
        console.log(`No existing user found with ID ${userId}, will create new record`);
      } else {
        // Other database error
        console.error('Error checking for existing user:', checkError.code, checkError.message, checkError.details);
        return null;
      }
    }
    
    // User exists, return it
    if (existingUser) {
      console.log(`User already exists in users table: ${userId}`);
      return existingUser;
    }
    
    console.log(`Creating new user record in users table: ${userId}`);
    
    // User doesn't exist, create it
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating user in users table:', error.code, error.message, error.details);
      
      if (error.code === '23505') {
        console.log('Duplicate key violation - user may have been created concurrently');
        // Try to fetch the user that was created concurrently
        const { data: retryUser, error: retryError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .limit(1)
          .single();
          
        if (!retryError && retryUser) {
          console.log('Successfully retrieved concurrently created user');
          return retryUser;
        }
      }
      
      if (error.code === '42501') {
        console.error('Permission denied inserting to users table - check RLS policies');
      }
      
      return null;
    }
    
    console.log(`Successfully created user in users table: ${userId}`);
    return data;
  } catch (error) {
    console.error('Error in ensureUserExists:', error instanceof Error ? error.message : 'Unknown error');
    throw error; // Re-throw to allow handling at the API level
  }
} 