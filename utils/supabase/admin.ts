import { createClient } from '@supabase/supabase-js';

// This client bypasses RLS using the service_role key
// IMPORTANT: Only use this on the server, never expose this client to the browser
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase admin credentials', { 
      hasUrl: !!supabaseUrl, 
      hasServiceKey: !!supabaseServiceKey 
    });
    
    throw new Error('Supabase admin credentials not configured');
  }
  
  try {
    // Remove any quotes that might have been accidentally added
    const cleanUrl = supabaseUrl.replace(/["']/g, '');
    
    return createClient(cleanUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  } catch (error) {
    console.error('Failed to create admin Supabase client:', error);
    throw error;
  }
} 