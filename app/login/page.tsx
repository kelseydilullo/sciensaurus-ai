'use client';

import Link from "next/link"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { SciensaurusLogo } from "@/components/sciensaurus-logo"
import { Check, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const { signIn, isLoading, error: authError, session, user } = useAuth();

  // Clear errors when user interacts with form fields
  const clearError = () => {
    if (loginError) {
      setLoginError(null); 
    }
  };

  // Show any auth configuration errors
  useEffect(() => {
    if (authError) {
      setLoginError(authError);
    }
  }, [authError]);

  // Redirect on successful authentication
  useEffect(() => {
    if (session && isSubmitting) {
      console.log('Login page detected active session, redirecting to dashboard');
      window.location.href = '/dashboard';
      // We don't reset isSubmitting here since we're redirecting away
    }
  }, [session, isSubmitting]);

  // Show session info for debugging
  useEffect(() => {
    if (session) {
      const info = {
        sessionId: session.access_token?.slice(0, 10) + '...',
        userId: user?.id,
        email: user?.email,
        authenticated: !!session,
      };
      setDebugInfo(JSON.stringify(info, null, 2));
      console.log('Login page detected active session:', info);
    } else {
      console.log('Login page - no session detected');
    }
  }, [session, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);
    console.log('Attempting login with email:', email);

    try {
      const { error, success } = await signIn(email, password);
      if (error) {
        console.error('Login error:', error.message);
        setLoginError(error.message || 'Failed to sign in. Please check your credentials.');
        setIsSubmitting(false);
      } else if (success) {
        console.log('Login successful, session should be detected');
        // Keep isSubmitting true until redirect happens in useEffect
        
        // Fallback redirect in case the session detection doesn't trigger
        setTimeout(() => {
          if (document.visibilityState !== 'hidden') { // Check if we're still on this page
            console.log('Session not detected after successful login, redirecting manually');
            window.location.href = '/dashboard';
            // Don't need to reset isSubmitting since we're redirecting away
          }
        }, 2000); // Give more time for session to be detected
      } else {
        console.error('Login succeeded but no session was created');
        setLoginError('Authentication succeeded but no session was created. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Unexpected error during login:', err);
      setLoginError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center px-4 md:px-8 xl:px-0">
            <Link href="/" className="flex items-center space-x-2">
              <SciensaurusLogo className="h-6 w-6 text-[#1e3a6d]" />
              <span className="text-xl font-bold text-[#1e3a6d]">Sciensaurus</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-[#1e3a6d]">Welcome back</CardTitle>
            <CardDescription className="text-center">Sign in to your Sciensaurus account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loginError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {loginError}
              </div>
            )}
            <div className="pt-2"></div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearError();
                  }}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-sm text-[#1e3a6d] hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input 
                  id="password" 
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError();
                  }}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <div className="flex items-center">
                  <Checkbox 
                    id="remember" 
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={isSubmitting}
                    className="mr-2"
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Remember me
                  </label>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#1e3a6d] hover:bg-[#0f2a4d] text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link href="/signup" className="text-[#1e3a6d] font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p>© {new Date().getFullYear()} Sciensaurus. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

