import { createClient } from '@/utils/supabase/client';
import { Session } from '@supabase/supabase-js';

// Helper to safely create Supabase client
function getSupabaseClient() {
  try {
    return createClient();
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    throw new Error('Authentication is not configured properly');
  }
}

export async function signUp(email: string, password: string, firstName?: string, lastName?: string) {
  try {
    console.log('Auth util: Signing up with:', email);
    
    const supabase = getSupabaseClient();
    
    // Remove quotes from environment variables if they were added
    const redirectUrl = typeof window !== 'undefined' 
      ? window.location.origin + '/auth/callback'
      : undefined;
      
    console.log('Using redirect URL:', redirectUrl);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    });
    
    console.log('Sign up result:', { success: !!data, error: !!error });
    
    return { data, error };
  } catch (error) {
    console.error('Error in signUp:', error);
    return { data: null, error: { message: 'Authentication service unavailable' } };
  }
}

export async function signIn(email: string, password: string) {
  try {
    console.log('Auth util: Signing in with:', email);
    
    const supabase = getSupabaseClient();
    
    // First ensure we're signed out to prevent any state confusion
    await supabase.auth.signOut();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    console.log('Sign in result:', { success: !!data?.session, error: !!error });
    
    if (data?.session) {
      // Verify the session was created
      const verifySession = await getSession();
      console.log('Session verification after login:', !!verifySession);
    }
    
    return { data, error };
  } catch (error) {
    console.error('Error in signIn:', error);
    return { data: null, error: { message: 'Authentication service unavailable' } };
  }
}

export async function signOut() {
  try {
    console.log('Auth util: Signing out');
    
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    
    console.log('Sign out result:', { error: !!error });
    
    return { error };
  } catch (error) {
    console.error('Error in signOut:', error);
    return { error: { message: 'Authentication service unavailable' } };
  }
}

export async function getSession(): Promise<Session | null> {
  try {
    console.log('Auth util: Getting session');
    
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    
    console.log('Get session result:', { 
      hasSession: !!data.session, 
      userId: data.session?.user?.id,
      email: data.session?.user?.email
    });
    
    return data.session;
  } catch (error) {
    console.error('Error in getSession:', error);
    return null;
  }
}

export async function resetPassword(email: string) {
  try {
    console.log('Auth util: Resetting password for:', email);
    
    const supabase = getSupabaseClient();
    
    // Get the origin for the redirect URL
    const redirectUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/reset-password` 
      : undefined;
      
    console.log('Using redirect URL:', redirectUrl);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    
    console.log('Reset password result:', { error: !!error });
    
    return { error };
  } catch (error) {
    console.error('Error in resetPassword:', error);
    return { error: { message: 'Authentication service unavailable' } };
  }
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  try {
    console.log('Auth util: Setting up auth state change listener');
    
    const supabase = getSupabaseClient();
    const { data } = supabase.auth.onAuthStateChange(
      (event: string, session: Session | null) => {
        console.log('Auth state changed:', { event, hasSession: !!session });
        callback(session);
      }
    );
    
    return data.subscription;
  } catch (error) {
    console.error('Error in onAuthStateChange:', error);
    // Return a dummy subscription object
    return { unsubscribe: () => {} };
  }
} 