import { NextResponse } from 'next/server';
// Import the custom async helper function from our utils
import { createClient } from '@/utils/supabase/server';
// We don't need cookies import here anymore as the helper handles it
// import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic'; // Ensure it's not cached

// Define an interface for the article data we fetch
interface ArticleKeywords {
    keywords: string[] | null;
}

export async function GET(req: Request) {
  // No need to get cookieStore here
  // const cookieStore = cookies();
  
  // Await the custom helper to get the Supabase client
  const supabase = await createClient();

  try {
    // 1. Get Authenticated User
    console.log('[API Keyword Stats] Attempting to get user (using custom server client)...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[API Keyword Stats] Auth Error:', JSON.stringify(authError, null, 2));
      console.error('[API Keyword Stats] User object:', user);
      return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 });
    }
    console.log('[API Keyword Stats] User authenticated:', user.id);

    // 2. Fetch User Keywords by joining users_articles and article_summaries
    const { data: articles, error: fetchError } = await supabase
      .from('users_articles') // Start from the join table
      .select(`
        article_summaries (
          keywords
        )
      `)
      .eq('user_id', user.id); // Filter by user_id in the join table

    if (fetchError) {
      console.error('Error fetching user keywords:', fetchError);
      return NextResponse.json({ success: false, error: 'Failed to fetch user articles' }, { status: 500 });
    }

    if (!articles) {
        return NextResponse.json({ 
            success: true, 
            stats: { 
                researchInterestCount: 0, 
                topKeyword: null 
            } 
        });
    }

    // 3. Process Keywords
    // Get the original keywords first, handling potential nulls and trimming
    const originalKeywordsWithNulls = articles
      .map((joinResult: any) => joinResult.article_summaries?.keywords || [])
      .flat();
    const originalKeywords = originalKeywordsWithNulls
      .map((kw: string | null) => kw?.trim())
      .filter((kw): kw is string => !!kw); // Ensure we only have strings
      
    // Create lowercased version for counting
    const allKeywordsLowercase = originalKeywords.map(kw => kw.toLowerCase());

    if (allKeywordsLowercase.length === 0) {
        console.log('User has no keywords yet.');
        return NextResponse.json({ 
            success: true, 
            stats: { 
                researchInterestCount: 0, 
                topKeyword: null 
            } 
        });
    }

    // 4. Calculate Stats
    const keywordFrequency: Record<string, number> = {};
    // Count using the lowercased keywords
    allKeywordsLowercase.forEach(kw => {
      keywordFrequency[kw] = (keywordFrequency[kw] || 0) + 1;
    });

    // Calculate Research Interest Count (keywords appearing >= 2 times)
    const researchInterestCount = Object.values(keywordFrequency).filter(count => count >= 2).length;

    // Calculate Top Keyword (lowercase first)
    let topKeywordLowercase: string | null = null;
    let maxFrequency = 0;
    for (const [keyword, count] of Object.entries(keywordFrequency)) {
      if (count > maxFrequency) {
        maxFrequency = count;
        topKeywordLowercase = keyword; // Store the lowercase version
      }
    }

    // Find the original casing of the top keyword
    let topKeywordOriginalCase: string | null = null;
    if (topKeywordLowercase) {
      topKeywordOriginalCase = originalKeywords.find(kw => kw.toLowerCase() === topKeywordLowercase) || topKeywordLowercase;
    }
    
     console.log('Keyword Stats:', { researchInterestCount, topKeyword: topKeywordOriginalCase, keywordFrequency });


    // 5. Return Response
    return NextResponse.json({ 
      success: true, 
      stats: { 
        researchInterestCount, 
        topKeyword: topKeywordOriginalCase // Return original case
      } 
    });

  } catch (error: any) {
    console.error('Error in get-user-keyword-stats:', error);
    return NextResponse.json({ success: false, error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
} 