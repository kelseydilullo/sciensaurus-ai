import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  // Check for environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables', { 
      hasUrl: !!supabaseUrl, 
      hasKey: !!supabaseAnonKey 
    })
    
    const missingVars = []
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
  }

  // Validate URL format
  try {
    new URL(supabaseUrl)
  } catch (e) {
    console.error('Invalid Supabase URL format:', supabaseUrl)
    throw new Error('Invalid Supabase URL format. Please check your environment variables.')
  }

  // Remove any quotes that might have been accidentally added to the values
  const cleanUrl = supabaseUrl.replace(/["']/g, '')
  const cleanKey = supabaseAnonKey.replace(/["']/g, '')

  try {
    // In Next.js 15, cookies() is an async function
    const cookieStore = await cookies()
    
    return createServerClient(cleanUrl, cleanKey, {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          try {
            // The set method expects name, value, and options as separate parameters
            cookieStore.set({
              name,
              value,
              ...options
            })
          } catch (error) {
            // This can happen in middleware or other contexts
            console.error('Error setting cookie:', error)
          }
        },
        remove(name, options) {
          try {
            // The delete method expects just the name parameter in Next.js 15
            cookieStore.delete(name)
          } catch (error) {
            // This can happen in middleware or other contexts
            console.error('Error removing cookie:', error)
          }
        },
      },
    })
  } catch (error) {
    console.error('Failed to create server-side Supabase client:', error)
    throw error
  }
}