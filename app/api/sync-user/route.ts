import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('Sync user endpoint called - This endpoint is now deprecated');
  
  // Return a message indicating this endpoint is deprecated
  return NextResponse.json(
    { 
      success: true, 
      message: 'User sync functionality has been deprecated as it is no longer needed. Auth accounts and user table entries are now automatically in sync.' 
    },
    { status: 200 }
  );

  /*
  // Original implementation preserved for reference
  try {
    console.log('Sync user endpoint called');
    
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
    const email = userData.user.email;
    
    console.log(`User authenticated: ${userId}, ${email}`);
    
    // Use admin client to check if user exists in users table
    const { data: existingUser, error: checkError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .limit(1)
      .single();
    
    // Check for errors other than "no rows found"
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking for existing user:', checkError);
      return NextResponse.json(
        { error: 'Database query failed', details: checkError.message },
        { status: 500 }
      );
    }
    
    // If user exists, return it
    if (existingUser) {
      console.log(`User already exists in users table: ${userId}`);
      return NextResponse.json({
        success: true,
        user: existingUser
      });
    }
    
    // User doesn't exist, create it
    console.log(`Creating new user in users table: ${userId}`);
    const { data: newUser, error: insertError } = await adminClient
      .from('users')
      .insert({
        id: userId,
        email: email,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error creating user record:', insertError);
      return NextResponse.json(
        { error: 'Failed to create user record', details: insertError.message },
        { status: 500 }
      );
    }
    
    console.log(`Successfully created user in users table: ${userId}`);
    return NextResponse.json({
      success: true,
      user: newUser
    });
  } catch (error) {
    console.error('Error in sync-user API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
  */
} 