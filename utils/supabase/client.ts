import { createBrowserClient } from '@supabase/ssr'

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  // Check for environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables', { 
      hasUrl: !!supabaseUrl, 
      hasKey: !!supabaseAnonKey 
    });
    
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate URL format
  try {
    new URL(supabaseUrl);
  } catch (e) {
    console.error('Invalid Supabase URL format:', supabaseUrl);
    throw new Error('Invalid Supabase URL format. Please check your environment variables.');
  }

  // Remove any quotes that might have been accidentally added to the values
  const cleanUrl = supabaseUrl.replace(/["']/g, '');
  const cleanKey = supabaseAnonKey.replace(/["']/g, '');

  if (!supabaseClient) {
    console.log('Creating new Supabase client with URL:', cleanUrl.substring(0, 20) + '...');
    
    try {
      supabaseClient = createBrowserClient(cleanUrl, cleanKey);
    } catch (error) {
      console.error('Failed to create Supabase client:', error);
      throw error;
    }
  }

  return supabaseClient;
}