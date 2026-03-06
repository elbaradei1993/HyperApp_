import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug environment variables
console.log('🔧 Environment variables check:', {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '[PRESENT]' : '[MISSING]',
  allEnvKeys: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')),
});

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '❌ Missing Supabase environment variables.\n' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.\n' +
    'See .env.example for reference.',
  );
}

const finalUrl = supabaseUrl;
const finalKey = supabaseKey;

console.log('🔧 Supabase client initialization', {
  url: finalUrl,
  hasKey: !!finalKey,
  isNative: Capacitor.isNativePlatform(),
  timestamp: new Date().toISOString(),
});

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

// Test the connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('🚨 Supabase connection test failed:', error);
  } else {
    console.log('✅ Supabase connection test successful', {
      hasSession: !!data.session,
      timestamp: new Date().toISOString(),
    });
  }
}).catch((error) => {
  console.error('🚨 Supabase connection test error:', error);
});

// Export the client type for TypeScript
export type { SupabaseClient };
