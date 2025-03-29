import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Get and validate Supabase URL and key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase environment variables are not configured in middleware')
    return supabaseResponse
  }

  // Validate URL format
  try {
    new URL(supabaseUrl)
  } catch (error) {
    console.error('Invalid Supabase URL format in middleware:', error)
    return supabaseResponse
  }

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
            try {
              request.cookies.set(name, value)
              
              supabaseResponse = NextResponse.next({
                request,
              })
              
              // Set the cookie in the response as well
              supabaseResponse.cookies.set(name, value, options)
            } catch (error) {
              console.error(`Error setting cookie ${name}:`, error)
            }
          })
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  try {
    // IMPORTANT: DO NOT REMOVE auth.getUser()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log('Middleware session update complete', {
      authenticated: !!user,
      userId: user?.id,
      email: user?.email,
    })

    // Allow public access to home page, login page, and auth routes
    if (
      !user &&
      !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/auth') &&
      request.nextUrl.pathname !== '/' && // Allow home page
      !request.nextUrl.pathname.startsWith('/signup') && // Allow signup page
      !request.nextUrl.pathname.startsWith('/demo') // Allow demo page
    ) {
      // no user, potentially respond by redirecting the user to the login page
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
  } catch (error) {
    console.error('Error in middleware update session:', error)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}