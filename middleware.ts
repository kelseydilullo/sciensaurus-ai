import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Check if it's a request to clear session for testing
  if (request.nextUrl.searchParams.has('clear_session')) {
    const url = request.nextUrl.clone()
    url.searchParams.delete('clear_session')
    
    const response = NextResponse.redirect(url)
    
    // Clear all Supabase-related cookies
    response.cookies.getAll().forEach(cookie => {
      if (cookie.name.startsWith('sb-')) {
        response.cookies.delete(cookie.name)
      }
    })
    
    console.log('Clearing all session cookies for testing')
    return response
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Get Supabase URL and key from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Skip auth check if environment variables are not set
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase environment variables are not set. Skipping auth check.')
    return response
  }

  // Validate URL format
  try {
    // Test if it's a valid URL
    new URL(supabaseUrl)
    
    if (!supabaseUrl.startsWith('https://')) {
      console.warn('Supabase URL should start with https://')
      return response
    }
  } catch (error) {
    console.error('Invalid Supabase URL format:', error)
    return response
  }

  // List all cookies for debugging
  console.log('Request cookies:', request.cookies.getAll().map(c => `${c.name}=${c.value.substring(0, 10)}...`))

  try {
    // Clean environment variables - remove quotes if present
    const cleanUrl = supabaseUrl.replace(/["']/g, '')
    const cleanKey = supabaseKey.replace(/["']/g, '')
    
    const supabase = createServerClient(
      cleanUrl,
      cleanKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Make sure cookies are properly set in the response
              console.log(`Setting cookie: ${name}=${value.substring(0, 10)}...`)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // IMPORTANT: Always call auth.getUser() to refresh tokens
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Log authentication status for debugging
    console.log('Middleware auth check:', { 
      path: request.nextUrl.pathname,
      authenticated: !!session,
      userId: user?.id,
      email: user?.email
    })

    // Check if we're in development mode and allow force login view with query param
    const isDev = process.env.NODE_ENV === 'development'
    const forceLogin = request.nextUrl.searchParams.has('force_login')
    
    if (isDev && forceLogin) {
      console.log('Development mode: force_login parameter detected, allowing access to login page')
      return response
    }

    // Check if the route is protected
    const protectedRoute = request.nextUrl.pathname.startsWith('/dashboard')
    const isLoginPage = request.nextUrl.pathname === '/login'
    const isSignupPage = request.nextUrl.pathname === '/signup'

    if (protectedRoute && !session) {
      // If trying to access a protected route without being authenticated,
      // redirect to the login page
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      console.log('Redirecting unauthenticated user to login')
      return NextResponse.redirect(redirectUrl)
    }
    
    if ((isLoginPage || isSignupPage) && session) {
      // If already authenticated and trying to access login/signup pages,
      // redirect to the dashboard
      const redirectUrl = new URL('/dashboard', request.url)
      console.log('Redirecting authenticated user to dashboard', { 
        sessionId: session.access_token?.substring(0, 10)
      })
      return NextResponse.redirect(redirectUrl)
    }
  } catch (error) {
    console.error('Error in auth middleware:', error)
  }

  return response
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    // Protected routes
    '/dashboard/:path*',
    // Auth pages
    '/login',
    '/signup',
    // Include clear session route
    '/:path*',
  ],
} 