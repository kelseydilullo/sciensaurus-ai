'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Verifying your email...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleAuthCallback() {
      try {
        // Get the auth token from the URL
        const code = searchParams.get('code');
        
        if (!code) {
          setStatus('error');
          setMessage('No verification code found in the URL. Please try again.');
          return;
        }

        // Check for specific error messages
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (errorParam || errorDescription) {
          setStatus('error');
          setError(errorParam);
          setMessage(errorDescription || 'Authentication error. Please try again.');
          console.error('Auth error:', { errorParam, errorDescription });
          return;
        }

        // This step is handled automatically by Supabase client in most cases
        // but we'll make it explicit here
        const supabase = createClient();
        console.log('Processing auth callback with code:', code.substring(0, 5) + '...');
        
        // Let the browser complete the auth flow by itself
        // This fixes the PKCE code_verifier issues as the browser
        // Supabase JS client has already stored the code_verifier in localStorage
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setStatus('error');
          setMessage(sessionError.message || 'Failed to verify your account. Please try again.');
          return;
        }
        
        if (data?.session) {
          console.log('Session established successfully');
          setStatus('success');
          setMessage('Account verified successfully! Redirecting to dashboard...');
          
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        } else {
          // If no session, the browser may still be processing the token exchange
          // Wait a bit and check again
          setTimeout(async () => {
            const { data: retryData } = await supabase.auth.getSession();
            if (retryData?.session) {
              console.log('Session established on retry');
              setStatus('success');
              setMessage('Account verified successfully! Redirecting to dashboard...');
              
              setTimeout(() => {
                router.push('/dashboard');
              }, 1500);
            } else {
              setStatus('error');
              setMessage('Could not establish a session. Please try logging in manually.');
            }
          }, 1500);
        }
      } catch (err) {
        console.error('Unexpected error during auth callback:', err);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    }

    handleAuthCallback();
  }, [router, searchParams]);

  return (
    <Suspense fallback={<div>Loading callback...</div>}>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 flex flex-col items-center text-center">
            {status === 'loading' && (
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1e3a6d] mb-4"></div>
            )}
            {status === 'success' && (
              <div className="bg-green-100 p-3 rounded-full mb-4">
                <Check className="h-10 w-10 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="bg-red-100 p-3 rounded-full mb-4">
                <AlertTriangle className="h-10 w-10 text-red-600" />
              </div>
            )}
            <CardTitle className="text-2xl font-bold text-[#1e3a6d]">
              {status === 'loading' ? 'Verifying Email' : 
               status === 'success' ? 'Email Verified' : 'Verification Failed'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-gray-600">{message}</p>
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            
            {status === 'error' && (
              <div className="pt-4">
                <Button 
                  onClick={() => router.push('/login')} 
                  className="bg-[#1e3a6d] hover:bg-[#0f2a4d] text-white"
                >
                  Back to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Suspense>
  );
} 