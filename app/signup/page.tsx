'use client';

import Link from "next/link"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { SciensaurusLogo } from "@/components/sciensaurus-logo"
import { AuthRedirect } from "@/components/auth-redirect"
import { Check } from "lucide-react"

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const { signUp, isLoading, error: authError } = useAuth();

  // Show any auth configuration errors
  useEffect(() => {
    if (authError) {
      setSignupError(authError);
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    // Basic validation
    if (password !== confirmPassword) {
      setSignupError('Passwords do not match');
      return;
    }

    if (!acceptTerms) {
      setSignupError('You must accept the terms and conditions');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await signUp(email, password);
      if (error) {
        setSignupError(error.message || 'Failed to create account. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err) {
      setSignupError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return <AuthRedirect redirectTo="/dashboard" />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <SciensaurusLogo className="h-6 w-6 text-[#1e3a6d]" />
            <span className="text-xl font-bold text-[#1e3a6d]">Sciensaurus</span>
          </Link>
        </div>
      </header>

      {/* Signup Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-[#1e3a6d]">Create account</CardTitle>
            <CardDescription className="text-center">Get started with your Sciensaurus account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {signupError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {signupError}
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
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={!!authError}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={!!authError}
                />
                <p className="text-xs text-gray-500">
                  Password must be at least 8 characters long
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="confirm-password" className="text-sm font-medium">
                  Confirm Password
                </label>
                <Input 
                  id="confirm-password" 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={!!authError}
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <div className="flex items-center">
                  <Checkbox 
                    id="terms" 
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                    disabled={!!authError}
                    className="mr-2"
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium cursor-pointer"
                  >
                    I accept the <Link href="/terms" className="text-[#1e3a6d] hover:underline">terms and conditions</Link>
                  </label>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#1e3a6d] hover:bg-[#0f2a4d] text-white"
                disabled={isSubmitting || !!authError}
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="text-[#1e3a6d] font-medium hover:underline">
                Sign in
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

