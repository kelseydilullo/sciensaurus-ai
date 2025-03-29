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
import { Check, Mail } from "lucide-react"

export default function SignupPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
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
    if (!firstName.trim() || !lastName.trim()) {
      setSignupError('First name and last name are required');
      return;
    }

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
      const { error, success, emailConfirmed } = await signUp(email, password, firstName, lastName);
      if (error) {
        setSignupError(error.message || 'Failed to create account. Please try again.');
        setIsSubmitting(false);
      } else if (success) {
        if (emailConfirmed) {
          // No need to change state, AuthRedirect will handle this
        } else {
          // Email confirmation required
          setSignupComplete(true);
          setIsSubmitting(false);
        }
      }
    } catch (err) {
      setSignupError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Show email verification message instead of redirecting
  if (signupComplete) {
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

        {/* Success Message */}
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <div className="mx-auto bg-green-100 p-3 rounded-full">
                <Mail className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-center text-[#1e3a6d] mt-4">Check your email</CardTitle>
              <CardDescription className="text-center">
                We've sent a confirmation link to <span className="font-medium">{email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-gray-600">
                Please check your email and click the confirmation link to complete your registration.
              </p>
              <p className="text-gray-500 text-sm">
                If you don't see the email, check your spam folder or try again.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                className="w-full text-[#1e3a6d] border-[#1e3a6d] hover:bg-[#1e3a6d]/10"
                onClick={() => setSignupComplete(false)}
              >
                Back to Sign Up
              </Button>
              <Link href="/login" className="w-full">
                <Button className="w-full bg-[#1e3a6d] hover:bg-[#0f2a4d] text-white">
                  Go to Login
                </Button>
              </Link>
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

  if (isSubmitting) {
    return <AuthRedirect redirectTo="/dashboard" message="Creating your account..." isSignup={true} />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-medium">
                    First Name
                  </label>
                  <Input 
                    id="firstName" 
                    type="text" 
                    placeholder="John" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={!!authError}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-medium">
                    Last Name
                  </label>
                  <Input 
                    id="lastName" 
                    type="text" 
                    placeholder="Doe" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={!!authError}
                  />
                </div>
              </div>
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

