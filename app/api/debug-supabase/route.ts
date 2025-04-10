import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    console.log('Debug Supabase connection endpoint called');
    const adminClient = createAdminClient();
    
    // Try a simple query to test connection and permissions
    const { data, error } = await adminClient
      .from('users') // Assuming 'users' table exists
      .select('id')
      .limit(1);

    // Also test Supabase Functions ping endpoint if needed (optional)
    /*
    const pingUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/hello-world`;
    let pingStatus = 'Not Tested';
    // Remove unused pingData
    // let pingData = null; 
    try {
      const pingResponse = await fetch(pingUrl);
      pingStatus = pingResponse.ok ? 'OK' : `Failed (${pingResponse.status})`;
      // pingData = await pingResponse.json(); // Remove assignment to unused variable
    } catch (pingError) {
      pingStatus = `Error (${pingError instanceof Error ? pingError.message : 'Unknown'})`;
    }
    */

    if (error) {
      console.error('Supabase connection error:', error);
      return NextResponse.json(
        { status: 'Error', message: 'Failed to connect to Supabase or query table', details: error.message },
        { status: 500 }
      );
    }

    console.log('Supabase connection test successful. Data sample:', data);
    return NextResponse.json({
      status: 'OK',
      message: 'Successfully connected to Supabase and queried table.',
      // functionPingStatus: pingStatus,
      // functionPingData: pingData // Remove unused variable reference
    });

  } catch (error) {
    console.error('Error in debug-supabase API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 