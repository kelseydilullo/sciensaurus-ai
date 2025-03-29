"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export function AuthRedirect({ 
  redirectTo = "/dashboard", 
  message = "Logging you in...",
  isSignup = false
}) {
  const router = useRouter()
  const { isLoading, session } = useAuth()
  const [debugInfo, setDebugInfo] = useState("")
  const [redirectAttempts, setRedirectAttempts] = useState(0)

  useEffect(() => {
    if (session) {
      setDebugInfo(`Session found for ${session?.user?.email}, redirecting...`)
      
      // Redirect immediately for better UX
      router.push(redirectTo)
    } else if (!isLoading) {
      if (isSignup) {
        setDebugInfo("Account created! Please check your email to verify your account.")
      } else {
        setDebugInfo(`No session found after ${redirectAttempts} attempts. Please try again.`)
      }
    } else {
      setDebugInfo(isSignup ? "Creating your account..." : "Checking authentication...")
    }
  }, [isLoading, router, redirectTo, session, redirectAttempts, isSignup])
  
  // Count redirect attempts
  useEffect(() => {
    if (!isLoading && !session) {
      const timer = setTimeout(() => {
        setRedirectAttempts(prev => prev + 1)
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [isLoading, session])

  return (
    <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1e3a6d] mb-4"></div>
        <h3 className="text-xl font-medium text-gray-900">{message}</h3>
        <p className="text-gray-600">{debugInfo}</p>
        {(redirectAttempts > 3 || (isSignup && redirectAttempts > 1)) && (
          <div className="mt-4 space-y-2">
            {isSignup ? (
              <p className="text-sm text-gray-600">
                We've sent a verification email. Please check your inbox.
              </p>
            ) : null}
            <button 
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-[#1e3a6d] text-white rounded-md hover:bg-[#0f2a4d]"
            >
              Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

