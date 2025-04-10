import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Debug user auth endpoint called');
    
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
    
    let cookieData: any;
    let token: string;
    try {
      // Auth cookie value is base64-encoded JSON
      cookieData = JSON.parse(
        Buffer.from(authCookie.value.replace('base64-', ''), 'base64').toString()
      );
      token = cookieData.access_token;
    } catch (parseError) {
      console.error('Failed to parse auth cookie:', parseError);
      return NextResponse.json(
        { error: 'Invalid auth cookie format', details: String(parseError) },
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
    
    // Return the user information
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: userData.user.email,
        hasMetadata: !!userData.user.user_metadata,
        metadata: userData.user.user_metadata || {},
        created_at: userData.user.created_at,
        last_sign_in_at: userData.user.last_sign_in_at
      },
      auth: {
        cookieFound: true,
        tokenValid: true,
        cookieData: {
          ...cookieData,
          // Don't return the actual token for security
          access_token: token ? "[REDACTED]" : null,
          refresh_token: cookieData.refresh_token ? "[REDACTED]" : null,
        }
      }
    });
  } catch (error) {
    console.error('Error in debug-user-auth API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 