import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getDashboardStats } from '@/utils/supabase/article-storage';
import { createClient } from '@/utils/supabase/server';

// This endpoint is only for debugging and should be disabled in production
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    console.log('Debug dashboard stats endpoint called');
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Authentication required', details: authError?.message }, { status: 401 });
    }

    const userId = user.id;
    console.log(`User authenticated: ${userId}`);

    const adminClient = createAdminClient();
    const { count, error: countError } = await adminClient
      .from('users_articles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Error counting articles:', countError);
    }

    const dashboardStats = await getDashboardStats(userId, 5); // Fetch 5 recent for debug

    if (!dashboardStats) {
      return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Debug dashboard stats retrieved successfully',
      userId,
      userEmail: user.email,
      articleCountFromDb: count,
      stats: dashboardStats
    });
  } catch (error) {
    console.error('Error in debug-dashboard-stats API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 