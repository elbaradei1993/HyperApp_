import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { AuthResponse } from '@supabase/supabase-js';

import type { User, AuthState } from '../types';
import { authService } from '../services/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, marketingConsent?: boolean) => Promise<AuthResponse>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<any>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Auth initialization timeout')), 10000); // 10 second timeout
      });

      let minLoadingTime: Promise<void>;

      try {
        console.log('🔄 Initializing auth...');
        const authPromise = authService.getSession();
        const { session } = await Promise.race([authPromise, timeoutPromise]) as any;
        console.log('📋 Session check result:', !!session?.user);

        // Set loading time based on whether user has existing session
        // 5 seconds for new login, 2 seconds for refresh
        const loadingDuration = session?.user ? 2000 : 5000;
        minLoadingTime = new Promise(resolve => setTimeout(resolve, loadingDuration));

        if (session?.user && isMounted) {
          console.log('👤 Syncing user profile...');
          const userProfile = await authService.syncUserWithProfile(session.user);
          console.log('✅ User profile synced:', userProfile?.username);
          setUser(userProfile);
        } else {
          console.log('🚪 No active session found');
        }

        // Wait for minimum loading time to ensure splash screen is visible
        await minLoadingTime;
      } catch (error: any) {
        console.error('❌ Auth initialization error:', error);

        // Check if this is an invalid refresh token error
        if (error?.message?.includes('Invalid Refresh Token') ||
            error?.message?.includes('Refresh Token Not Found') ||
            error?.message?.includes('refresh_token_not_found')) {
          console.log('🔄 Invalid refresh token detected, clearing auth state...');
          await authService.clearAuthState();
        }

        // Continue even if there's an error
        // Use default 2-second loading time on error
        minLoadingTime = new Promise(resolve => setTimeout(resolve, 2000));
        await minLoadingTime;
      } finally {
        if (isMounted) {
          console.log('🏁 Setting loading to false');
          setIsLoading(false);
        }
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (authUser) => {
      console.log('🔐 Auth state change detected:', !!authUser, authUser?.email);
      if (!isMounted) {
        return;
      }

      try {
        if (authUser) {
          console.log('👤 Syncing user profile for:', authUser.email);
          const userProfile = await authService.syncUserWithProfile(authUser);
          console.log('✅ User profile synced:', userProfile.username);
          setUser(userProfile);
        } else {
          console.log('🚪 User signed out');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Auth state change error:', error);
        // If profile sync fails, sign out to prevent inconsistent state
        await authService.signOut();
        setUser(null);
      }
    });

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);


  const signIn = async (email: string, password: string) => {
    await authService.signIn(email, password);
  };

  const signUp = async (email: string, password: string, username: string, marketingConsent?: boolean) => {
    return await authService.signUp(email, password, username, marketingConsent);
  };

  const signInWithGoogle = async () => {
    await authService.signInWithGoogle();
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await authService.resetPassword(email);
    if (error) {
      throw new Error(error.message);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) {
      throw new Error('No user logged in');
    }
    const response = await authService.updateUserProfile(user.id, updates);
    if (response.data) {
      setUser({ ...user, ...response.data });
    }
    return response;
  };

  const refreshProfile = async () => {
    if (!user) {
      return;
    }
    const { session } = await authService.getSession();
    if (session?.user) {
      const userProfile = await authService.syncUserWithProfile(session.user);
      setUser(userProfile);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
