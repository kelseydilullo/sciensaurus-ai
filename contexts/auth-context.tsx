'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import * as AuthUtils from '@/utils/supabase/auth';

type UserWithMetadata = Session['user'] & {
  user_metadata?: {
    first_name?: string;
    last_name?: string;
  }
};

type AuthContextType = {
  session: Session | null;
  user: UserWithMetadata | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: any; success?: boolean }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => 
    Promise<{ error: any; success?: boolean; emailConfirmed?: boolean }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Log for debugging
  useEffect(() => {
    if (session) {
      console.log('Auth session detected:', {
        userId: session.user?.id,
        email: session.user?.email,
        accessToken: session.access_token?.substring(0, 8) + '...',
        metadata: session.user?.user_metadata
      });
    }
  }, [session]);

  // Sync user with users table
  const syncUser = useCallback(async (session: Session | null) => {
    if (session?.user) {
      try {
        // Add a small delay to ensure auth is fully established
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('Syncing user with users table...');
        
        // Simpler fetch with standard error checking
        const response = await fetch('/api/sync-user');
        const responseText = await response.text();
        
        try {
          // Try to parse as JSON
          const result = JSON.parse(responseText);
          
          if (response.ok) {
            console.log('User sync successful:', result.success);
          } else {
            console.error('Failed to sync user:', response.status, response.statusText);
            console.error('Error details:', result.error, result.details || '');
            
            // If there are RLS or permission issues, log them clearly
            if (responseText.includes('Permission denied') || responseText.includes('RLS')) {
              console.error('PERMISSION ERROR: Check your Supabase Row Level Security (RLS) policies for the users table');
            }
          }
        } catch (jsonError) {
          // If the response is not valid JSON, log the raw text
          console.error('Invalid JSON response from sync-user API:', responseText);
        }
      } catch (error) {
        console.error('Error syncing user:', error instanceof Error ? error.message : error);
      }
    }
  }, []);

  useEffect(() => {
    // Check for active session on mount
    async function checkSession() {
      setIsLoading(true);
      try {
        // Check if Supabase env vars are available
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          console.warn('Supabase environment variables are not configured');
          setError('Authentication is not configured');
          setIsLoading(false);
          return;
        }

        const session = await AuthUtils.getSession();
        console.log('Initial session check:', {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
        });
        setSession(session);
      } catch (error) {
        console.error('Error checking auth session:', error);
        setError('Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    }

    checkSession();

    // Set up auth state change listener
    const subscription = AuthUtils.onAuthStateChange((session) => {
      setSession(session);
      setIsLoading(false);
      
      // Sync user whenever auth state changes
      if (session?.user) {
        syncUser(session);
      }
    });

    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [syncUser]);

  async function signIn(email: string, password: string) {
    try {
      console.log('Attempting sign in for:', email);
      setIsLoading(true);
      const { data, error } = await AuthUtils.signIn(email, password);
      
      if (error) {
        console.error('Sign in error:', error.message);
        let errorMessage = error.message;
        
        // Improve error messages based on Supabase error messages
        if (error.message === 'Invalid login credentials') {
          errorMessage = 'The email or password you entered is incorrect. Please try again.';
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'Too many login attempts. Please wait a moment before trying again.';
        }
        
        setError(errorMessage);
        return { error: { ...error, message: errorMessage }, success: false };
      }
      
      if (data?.session) {
        console.log('Sign in successful, user:', data.user?.id);
        setSession(data.session);
        setError(null);
        return { error: null, success: true };
      }
      
      setError('No session returned from sign in');
      return { error: { message: 'No session returned from sign in' }, success: false };
    } catch (error: any) {
      console.error('Error signing in:', error);
      setError(error?.message || 'Unknown error during sign in');
      return { error, success: false };
    } finally {
      setIsLoading(false);
    }
  }

  async function signUp(email: string, password: string, firstName?: string, lastName?: string) {
    try {
      console.log('Attempting sign up for:', email);
      setIsLoading(true);
      const { data, error } = await AuthUtils.signUp(email, password, firstName, lastName);
      
      if (error) {
        console.error('Sign up error:', error.message);
        setError(error.message);
        return { error, success: false, emailConfirmed: false };
      }
      
      if (data?.session) {
        console.log('Sign up successful with session, user:', data.user?.id);
        setSession(data.session);
        setError(null);
        return { error: null, success: true, emailConfirmed: true };
      }
      
      // Email confirmation is required - this is the most common case with Supabase
      console.log('Sign up successful, email confirmation required');
      setError(null);
      return { error: null, success: true, emailConfirmed: false };
    } catch (error: any) {
      console.error('Error signing up:', error);
      setError(error?.message || 'Unknown error during sign up');
      return { error, success: false, emailConfirmed: false };
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    try {
      console.log('Attempting sign out');
      setIsLoading(true);
      const { error } = await AuthUtils.signOut();
      
      if (!error) {
        console.log('Sign out successful');
        setSession(null);
        setError(null);
      } else {
        console.error('Sign out error:', error.message);
        setError(error.message);
      }
      
      return { error };
    } catch (error: any) {
      console.error('Error signing out:', error);
      setError(error?.message || 'Unknown error during sign out');
      return { error };
    } finally {
      setIsLoading(false);
    }
  }

  async function resetPassword(email: string) {
    try {
      setIsLoading(true);
      const { error } = await AuthUtils.resetPassword(email);
      
      if (error) {
        setError(error.message);
      } else {
        setError(null);
      }
      
      return { error };
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setError(error?.message || 'Unknown error during password reset');
      return { error };
    } finally {
      setIsLoading(false);
    }
  }

  const value = {
    session,
    user: session?.user || null,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 