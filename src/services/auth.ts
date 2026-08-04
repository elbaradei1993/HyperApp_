import { AuthResponse, User } from '@supabase/supabase-js';

// import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'; // Disabled to fix 500 error
import { supabase } from '../lib/supabase';
import type { User as AppUser } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

type ProfileQueryError = {
  code: 'PROFILE_NOT_FOUND' | 'PROFILE_DUPLICATE';
  message: string;
  details: string;
};

type ProfileQueryResult<T> = {
  data: T | null;
  error: ProfileQueryError | null;
};

const PROFILE_WRITE_FIELDS: ReadonlyArray<keyof AppUser> = [
  'email',
  'username',
  'first_name',
  'last_name',
  'phone',
  'profile_picture_url',
  'location',
  'interests',
  'reputation',
  'language',
  'profile_completed_at',
  'onboarding_completed',
  'verification_level',
  'verified_at',
  'verification_badge_earned_at',
  'email_verified',
];

export const sanitizeProfileUpdates = (updates: Partial<AppUser>): Partial<AppUser> =>
  PROFILE_WRITE_FIELDS.reduce<Partial<AppUser>>((payload, field) => {
    if (updates[field] !== undefined) {
      (payload as Record<string, unknown>)[field] = updates[field];
    }
    return payload;
  }, {});

const AUTH_METADATA_FIELDS: ReadonlyArray<keyof AppUser> = [
  'username',
  'first_name',
  'last_name',
  'phone',
  'profile_picture_url',
  'location',
  'interests',
  'language',
  'profile_completed_at',
  'onboarding_completed',
];

export const buildAuthProfileMetadata = (updates: Partial<AppUser>): Partial<AppUser> =>
  AUTH_METADATA_FIELDS.reduce<Partial<AppUser>>((metadata, field) => {
    if (updates[field] !== undefined) {
      (metadata as Record<string, unknown>)[field] = updates[field];
    }
    return metadata;
  }, {});

export const buildProfileUpsertPayload = (
  userId: string,
  updates: Partial<AppUser>,
  authIdentity: { email?: string | null; username?: string | null },
) => ({
  user_id: userId,
  username: authIdentity.username || authIdentity.email?.split('@')[0] || 'User',
  email: authIdentity.email || '',
  reputation: 0,
  language: 'en',
  ...sanitizeProfileUpdates(updates),
});

/**
 * PostgREST's single-row coercion returns the opaque PGRST116 message when a
 * query finds either zero rows or more than one row. Keep the response as an
 * array and validate it here so callers receive an actionable error instead.
 */
export const resolveProfileRow = <T>(
  rows: T[] | null | undefined,
  operation: 'load' | 'create' | 'update',
  allowMissing = false,
): ProfileQueryResult<T> => {
  const rowCount = rows?.length ?? 0;

  if (rowCount === 0) {
    if (allowMissing) {
      return { data: null, error: null };
    }

    return {
      data: null,
      error: {
        code: 'PROFILE_NOT_FOUND',
        message: `Profile ${operation} failed because no accessible profile record was found.`,
        details: 'The users query returned zero rows. The profile may be missing or blocked by row-level security.',
      },
    };
  }

  if (rowCount > 1) {
    return {
      data: null,
      error: {
        code: 'PROFILE_DUPLICATE',
        message: 'This account has duplicate profile records. Please contact support so the account data can be repaired safely.',
        details: `Expected one users row but received ${rowCount}.`,
      },
    };
  }

  return { data: rows![0], error: null };
};

export const mergeAuthIdentity = (
  authUser: Pick<User, 'id' | 'email' | 'email_confirmed_at'>,
  profile: Partial<AppUser>,
): AppUser => ({
  ...profile,
  // Never allow a primary key from the public profile table to replace the
  // auth ID used in every users.user_id filter.
  id: authUser.id,
  email: authUser.email || profile.email || '',
  email_verified: Boolean(authUser.email_confirmed_at),
  email_verified_at: authUser.email_confirmed_at,
});

class AuthService {
  // Authentication methods
  async signUp(email: string, password: string, username: string, marketingConsent: boolean = false, language: string = 'en'): Promise<AuthResponse> {
    // Validate inputs
    if (!email?.trim()) {
      throw new Error('Email is required');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    if (!username?.trim()) {
      throw new Error('Username is required');
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.trim();

    // First create the user account with Supabase (without sending default email)
    const response = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          username: cleanUsername,
          display_name: cleanUsername,
          reputation: 0,
          language,
          signup_timestamp: new Date().toISOString(),
          marketing_consent: marketingConsent,
        },
      },
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    // If user was created successfully, send our custom verification email
    if (response.data.user && !response.data.session) {
      try {
        console.log('Sending custom verification email for user:', response.data.user.id);

        // Call our custom auth email function
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-auth-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            email: cleanEmail,
            userId: response.data.user.id,
            userName: cleanUsername,
            language,
          }),
        });

        const emailResult = await emailResponse.json();

        if (!emailResult.success) {
          console.error('Failed to send custom verification email:', emailResult.error);
          // Don't throw here - user account was created successfully, just log the email error
        } else {
          console.log('Custom verification email sent successfully');
        }
      } catch (emailError) {
        console.error('Error sending custom verification email:', emailError);
        // Don't throw - user account creation succeeded
      }
    }

    return response;
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    if (!email?.trim()) {
      throw new Error('Email is required');
    }
    if (!password) {
      throw new Error('Password is required');
    }

    const response = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response;
  }

  async signInWithGoogle(): Promise<void> {
    // Google Auth disabled to fix 500 error
    throw new Error('Google Sign-In is currently disabled');
    // try {
    //   // Use native Google Sign-In for mobile
    //   const googleUser = await GoogleAuth.signIn();

    //   // Sign in with Supabase using the Google ID token
    //   const { data, error } = await supabase.auth.signInWithIdToken({
    //     provider: 'google',
    //     token: googleUser.authentication.idToken
    //   });

    //   if (error) {
    //     throw new Error(error.message);
    //   }

    // } catch (error: any) {
    //   console.error('Google Sign-In error:', error);
    //   throw new Error(error.message || 'Google Sign-In failed');
    // }
  }

  async signOut(): Promise<{ error: any }> {
    return supabase.auth.signOut();
  }

  // Clear corrupted authentication state
  async clearAuthState(): Promise<void> {
    try {
      console.log('🧹 Clearing authentication state...');

      // Clear local storage
      if (typeof localStorage !== 'undefined') {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }

      // Clear session storage
      if (typeof sessionStorage !== 'undefined') {
        const sessionKeysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth'))) {
            sessionKeysToRemove.push(key);
          }
        }
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
      }

      // Force sign out from Supabase
      await supabase.auth.signOut();

      console.log('✅ Authentication state cleared');
    } catch (error) {
      console.error('❌ Failed to clear authentication state:', error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }
    return user;
  }

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    return data;
  }

  // User profile methods
  async createUserProfile(userId: string, profileData: Partial<AppUser>): Promise<any> {
    const payload = buildProfileUpsertPayload(userId, profileData, {
      email: profileData.email,
      username: profileData.username,
    });
    const { data: rows, error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'user_id' })
      .select();

    if (error) {
      return { data: null, error };
    }

    return resolveProfileRow(rows, 'create');
  }

  async getUserProfile(userId: string): Promise<any> {
    const { data: rows, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .limit(2);

    if (error) {
      return { data: null, error };
    }

    return resolveProfileRow(rows, 'load', true);
  }

  async updateUserProfile(userId: string, updates: Partial<AppUser>): Promise<any> {
    const { data: authData, error: authLookupError } = await supabase.auth.getUser();
    if (authLookupError) {
      return { data: null, error: authLookupError };
    }

    let authenticatedUser = authData.user;
    if (!authenticatedUser || authenticatedUser.id !== userId) {
      return {
        data: null,
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'The signed-in account does not match the profile being updated.',
          details: 'The Auth user ID did not match users.user_id.',
        },
      };
    }

    if (updates.email) {
      if (authenticatedUser.email && authenticatedUser.email !== updates.email) {
        const { error: authEmailError } = await supabase.auth.updateUser({ email: updates.email });
        if (authEmailError) {
          return { data: null, error: authEmailError };
        }
      }
    }

    const safeUpdates = sanitizeProfileUpdates(updates);
    const authMetadata = buildAuthProfileMetadata(safeUpdates);
    let metadataSaved = Object.keys(authMetadata).length === 0;
    let metadataError: unknown = null;

    if (!metadataSaved) {
      const { data: updatedAuthData, error: authMetadataError } = await supabase.auth.updateUser({
        data: authMetadata,
      });
      metadataSaved = !authMetadataError;
      metadataError = authMetadataError;
      authenticatedUser = updatedAuthData.user || authenticatedUser;
    }

    const { data: rows, error } = await supabase
      .from('users')
      .update(safeUpdates)
      .eq('user_id', userId)
      .select();

    if (error) {
      if (metadataSaved) {
        console.warn('Public profile update failed; changes were preserved in Auth metadata.', error);
        return { data: safeUpdates, error: null, warning: error };
      }
      return { data: null, error };
    }

    const updateResult = resolveProfileRow(rows, 'update', true);
    if (updateResult.data || updateResult.error) {
      return updateResult;
    }

    // Older accounts can have a valid Auth identity but no public.users row.
    // Repair that state during the save instead of asking the user to sign out.
    const repairPayload = buildProfileUpsertPayload(userId, safeUpdates, {
      email: authenticatedUser.email,
      username: authenticatedUser.user_metadata?.username || authenticatedUser.user_metadata?.display_name,
    });
    const { data: repairedRows, error: repairError } = await supabase
      .from('users')
      .upsert(repairPayload, { onConflict: 'user_id' })
      .select();

    if (repairError) {
      if (metadataSaved) {
        console.warn('Public profile repair failed; changes were preserved in Auth metadata.', repairError);
        return { data: safeUpdates, error: null, warning: repairError };
      }
      if (metadataError) {
        console.error('Auth metadata backup also failed.', metadataError);
      }
      return { data: null, error: repairError };
    }

    return resolveProfileRow(repairedRows, 'update');
  }



  // Sync user data between auth and profile
  async syncUserWithProfile(authUser: User): Promise<AppUser> {
    try {
      // First check if profile exists
      const { data: profile, error } = await this.getUserProfile(authUser.id);

      if (error) {
        console.error('Profile fetch error:', error);
        throw new Error(error.message || 'The profile could not be loaded.');
      }

      // Check for pending profile data from signup
      const pendingProfileKey = `pendingProfile_${authUser.id}`;
      const pendingProfileData = typeof localStorage !== 'undefined' ? localStorage.getItem(pendingProfileKey) : null;
      let pendingProfile = null;
      if (pendingProfileData) {
        try {
          pendingProfile = JSON.parse(pendingProfileData);
          console.log('Found pending profile data for user:', authUser.id, pendingProfile);
        } catch (parseError) {
          console.error('Error parsing pending profile data:', parseError);
        }
      }

      if (profile) {
        // Profile exists, merge with any pending data and update if needed
        console.log('Found existing profile for user:', authUser.id);

        const metadataProfile = sanitizeProfileUpdates(authUser.user_metadata as Partial<AppUser>);
        let mergedProfile = mergeAuthIdentity(authUser, { ...profile, ...metadataProfile });

        // If we have pending profile data and the profile is incomplete, update it
        if (pendingProfile && !profile.first_name) {
          console.log('Updating existing profile with pending data');
          try {
            const pendingUpdate = await this.updateUserProfile(authUser.id, pendingProfile);
            if (pendingUpdate.error || !pendingUpdate.data) {
              throw new Error(pendingUpdate.error?.message || 'Pending profile data could not be saved.');
            }
            mergedProfile = mergeAuthIdentity(authUser, { ...mergedProfile, ...pendingProfile });
            // Clear the pending data
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem(pendingProfileKey);
            }
          } catch (updateError) {
            console.error('Error updating profile with pending data:', updateError);
          }
        }

        return mergedProfile;
      } else {
        // Profile doesn't exist, create it
        console.log('Creating new profile for user:', authUser.id);

        const username = authUser.user_metadata?.username ||
                        authUser.user_metadata?.display_name ||
                        authUser.email?.split('@')[0] ||
                        'User';

        const metadataProfile = sanitizeProfileUpdates(authUser.user_metadata as Partial<AppUser>);
        const profileData = {
          username,
          email: authUser.email,
          reputation: 0,
          language: authUser.user_metadata?.language || 'en',
          email_verified: authUser.email_confirmed_at ? true : false,
          ...metadataProfile,
        };

        const { data: newProfile, error: createError } = await this.createUserProfile(authUser.id, profileData);

        if (createError) {
          console.error('Profile creation failed:', createError);
          // For existing auth users without profiles, create a minimal profile
          console.log('Creating minimal profile as fallback');
          const minimalProfile: AppUser = {
            id: authUser.id,
            email: authUser.email!,
            username,
            reputation: 0,
            language: 'en',
            email_verified: authUser.email_confirmed_at ? true : false,
            email_verified_at: authUser.email_confirmed_at,
            ...metadataProfile,
          };
          return minimalProfile;
        }

        console.log('Profile created successfully');
        return mergeAuthIdentity(authUser, newProfile);
      }
    } catch (error) {
      console.error('Profile sync failed:', error);
      // Return minimal user object to prevent auth failure
      const metadataProfile = sanitizeProfileUpdates(authUser.user_metadata as Partial<AppUser>);
      const fallbackUser: AppUser = {
        id: authUser.id,
        email: authUser.email!,
        username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User',
        reputation: 0,
        language: 'en',
        email_verified: authUser.email_confirmed_at ? true : false,
        email_verified_at: authUser.email_confirmed_at,
        ...metadataProfile,
      };
      console.log('Using fallback user profile');
      return fallbackUser;
    }
  }

  // Auth state listener
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null);
    });
  }

  // Password reset
  async resetPassword(email: string): Promise<{ error: any }> {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  }

  // Update password
  async updatePassword(newPassword: string): Promise<any> {
    return supabase.auth.updateUser({ password: newPassword });
  }

  // Profile data methods for components
  async getUserReports(userId: string): Promise<any> {
    return supabase
      .from('reports')
      .select('upvotes, downvotes')
      .eq('user_id', userId);
  }

  async getUserRecentReports(userId: string, limit: number = 5): Promise<any> {
    return supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
  }

  async getAllUsersByReputation(): Promise<any> {
    return supabase
      .from('users')
      .select('user_id, reputation')
      .order('reputation', { ascending: false });
  }

  async getUserReportsCount(userId: string): Promise<any> {
    return supabase
      .from('reports')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);
  }

  // Voting methods
  async getUserVote(userId: string, reportId: number): Promise<any> {
    return supabase
      .from('votes')
      .select('vote_type')
      .eq('user_id', userId)
      .eq('report_id', reportId)
      .maybeSingle();
  }

  async addVote(userId: string, reportId: number, voteType: 'upvote' | 'downvote'): Promise<any> {
    return supabase
      .from('votes')
      .insert([{
        user_id: userId,
        report_id: reportId,
        vote_type: voteType,
      }]);
  }

  async removeVote(userId: string, reportId: number): Promise<any> {
    return supabase
      .from('votes')
      .delete()
      .eq('user_id', userId)
      .eq('report_id', reportId);
  }

  async updateVote(userId: string, reportId: number, voteType: 'upvote' | 'downvote'): Promise<any> {
    return supabase
      .from('votes')
      .update({ vote_type: voteType })
      .eq('user_id', userId)
      .eq('report_id', reportId);
  }

  // Reports methods for profile
  async getNearbyReports(limit: number = 10): Promise<any> {
    return supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
  }

  // Account management methods
  async deleteAccount(userId: string): Promise<any> {
    // Delete user profile data first
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('user_id', userId);

    if (profileError) {
      console.error('Error deleting user profile:', profileError);
      return { error: profileError };
    }

    // Delete user votes
    const { error: votesError } = await supabase
      .from('votes')
      .delete()
      .eq('user_id', userId);

    if (votesError) {
      console.error('Error deleting user votes:', votesError);
      // Continue with account deletion even if votes deletion fails
    }

    // Delete user reports
    const { error: reportsError } = await supabase
      .from('reports')
      .delete()
      .eq('user_id', userId);

    if (reportsError) {
      console.error('Error deleting user reports:', reportsError);
      // Continue with account deletion even if reports deletion fails
    }

    // Finally delete the auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error deleting auth user:', authError);
      return { error: authError };
    }

    return { error: null };
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
