import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createClient();

  try {
    // 1. Get Authenticated User
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Remove Article] Auth Error:', authError);
      return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 });
    }

    // 2. Get article_summary_id from request body
    const { articleSummaryId } = await req.json();

    if (!articleSummaryId) {
      return NextResponse.json({ success: false, error: 'Missing articleSummaryId' }, { status: 400 });
    }

    // 3. Delete the record from users_articles
    console.log(`[Remove Article] Attempting to delete where user_id=${user.id} and article_summary_id=${articleSummaryId}`); // Log values
    const { count, error: deleteError } = await supabase
      .from('users_articles')
      .delete({ count: 'exact' }) // Request the count of deleted rows
      .eq('user_id', user.id)
      .eq('article_summary_id', articleSummaryId);

    if (deleteError) {
      console.error('[Remove Article] Error deleting user_article record:', deleteError);
      return NextResponse.json({ success: false, error: 'Failed to remove article from history' }, { status: 500 });
    }

    // Check if any rows were actually deleted
    if (count === 0) {
      console.warn(`[Remove Article] No record found to delete for user_id=${user.id} and article_summary_id=${articleSummaryId}`);
      // Return success=false or a specific message if needed, 
      // but for now, maybe return success=true but log the warning?
      // Let's return success: false to indicate no deletion occurred.
      return NextResponse.json({ success: false, error: 'Article not found in history for this user.' }, { status: 404 }); 
    }

    console.log(`[Remove Article] Successfully removed ${count} article record(s) for user ${user.id}`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error in remove-user-article:', error);
    return NextResponse.json({ success: false, error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
} 