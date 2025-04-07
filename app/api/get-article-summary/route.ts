import { NextRequest, NextResponse } from 'next/server';
import { getArticleSummaryByUrl, recordUserArticleInteraction } from '@/utils/supabase/article-storage';
import { getSession } from '@/utils/supabase/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get URL parameter
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'Missing required parameter: url' },
        { status: 400 }
      );
    }

    // Get the article summary
    const articleSummary = await getArticleSummaryByUrl(url);

    if (!articleSummary) {
      return NextResponse.json(
        { found: false },
        { status: 404 }
      );
    }

    // Check if the user is authenticated
    const session = await getSession();
    const userId = session?.user?.id;

    // If user is authenticated, record the interaction
    if (userId && articleSummary.id) {
      await recordUserArticleInteraction(
        userId,
        articleSummary.id,
        false // Don't change bookmark status
      );
    }

    return NextResponse.json({
      found: true,
      articleSummary
    });
  } catch (error) {
    console.error('Error in get-article-summary API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 