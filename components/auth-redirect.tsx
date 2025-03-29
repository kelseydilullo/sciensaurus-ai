"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function AuthRedirect({ redirectTo = "/dashboard" }) {
  const router = useRouter()

  useEffect(() => {
    // In a real app, you would check if the user is authenticated here
    // For demo purposes, we're just redirecting after a short delay
    const timer = setTimeout(() => {
      router.push(redirectTo)
    }, 1500)

    return () => clearTimeout(timer)
  }, [router, redirectTo])

  return (
    <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1e3a6d] mb-4"></div>
        <h3 className="text-xl font-medium text-gray-900">Logging you in...</h3>
        <p className="text-gray-600">Redirecting to your dashboard</p>
      </div>
    </div>
  )
}

