'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import * as AuthUtils from '@/utils/supabase/auth';

type AuthContextType = {
  session: Session | null;
  user: Session['user'] | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: any; success?: boolean }>;
  signUp: (email: string, password: string) => Promise<{ error: any; success?: boolean }>;
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
      });
    }
  }, [session]);

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

    // Subscribe to auth changes
    let subscription: { unsubscribe: () => void } | undefined;
    
    try {
      subscription = AuthUtils.onAuthStateChange((newSession) => {
        console.log('Auth state changed:', { 
          hasSession: !!newSession,
          userId: newSession?.user?.id,
          email: newSession?.user?.email 
        });
        setSession(newSession);
      });
    } catch (error) {
      console.error('Error subscribing to auth changes:', error);
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    try {
      console.log('Attempting sign in for:', email);
      setIsLoading(true);
      const { data, error } = await AuthUtils.signIn(email, password);
      
      if (error) {
        console.error('Sign in error:', error.message);
        setError(error.message);
        return { error, success: false };
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

  async function signUp(email: string, password: string) {
    try {
      console.log('Attempting sign up for:', email);
      setIsLoading(true);
      const { data, error } = await AuthUtils.signUp(email, password);
      
      if (error) {
        console.error('Sign up error:', error.message);
        setError(error.message);
        return { error, success: false };
      }
      
      if (data?.session) {
        console.log('Sign up successful with session, user:', data.user?.id);
        setSession(data.session);
        setError(null);
        return { error: null, success: true };
      }
      
      // Email confirmation might be required, so there might not be a session immediately
      console.log('Sign up successful, email confirmation may be required');
      setError(null);
      return { error: null, success: true };
    } catch (error: any) {
      console.error('Error signing up:', error);
      setError(error?.message || 'Unknown error during sign up');
      return { error, success: false };
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