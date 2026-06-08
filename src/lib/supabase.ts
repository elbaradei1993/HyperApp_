import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local'
  );
}

const finalUrl = supabaseUrl;
const finalKey = supabaseKey;

// Custom storage adapter for Capacitor to avoid ITP issues
const capacitorStorageAdapter = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Storage getItem failed:', error);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('Storage setItem failed:', error);
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Storage removeItem failed:', error);
    }
  },
};

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Enable for email confirmation redirects
    flowType: 'pkce', // Recommended for security
    storage: capacitorStorageAdapter, // Use custom storage adapter
    debug: process.env.NODE_ENV === 'development', // Enable debug logging in development
  },
  global: {
    headers: {
      'X-Client-Info': 'hyperapp-mimi',
    },
  },
});

// Connection will be tested on first use

// Export the client type for TypeScript
export type { SupabaseClient };
