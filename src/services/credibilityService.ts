import { supabase } from '../lib/supabase';
import type { ReportValidation } from '../types';

/**
 * Credibility Service - Handles report validation and credibility scoring
 */
class CredibilityService {
  /**
   * Validate a report (confirm or deny)
   */
  async validateReport(reportId: number, userId: string, validationType: 'confirm' | 'deny'): Promise<boolean> {
    try {
      // First check if we have a valid session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        console.warn('No valid session for report validation');
        return false;
      }

      // Check if user already validated this report
      const { data: existingValidation, error: checkError } = await supabase
        .from('report_validations')
        .select('id')
        .eq('report_id', reportId)
        .eq('user_id', userId)
        .single();

      // Handle authentication errors during check
      if (checkError && (checkError.message?.includes('401') || checkError.message?.includes('Unauthorized'))) {
        console.warn('Authentication error during validation check, attempting session refresh');

        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshData.session) {
          console.error('Failed to refresh session for validation:', refreshError);
          return false;
        }

        // Retry the check with refreshed session
        const { data: retryValidation, error: retryCheckError } = await supabase
          .from('report_validations')
          .select('id')
          .eq('report_id', reportId)
          .eq('user_id', userId)
          .single();

        if (retryCheckError && retryCheckError.code !== 'PGRST116') {
          console.error('Retry failed for validation check:', retryCheckError);
          return false;
        }

        // Continue with the retry result
        if (retryValidation) {
          // Update existing validation
          const { error: updateError } = await supabase
            .from('report_validations')
            .update({ validation_type: validationType })
            .eq('report_id', reportId)
            .eq('user_id', userId);

          if (updateError) {
            console.error('Error updating validation:', updateError);
            return false;
          }
        } else {
          // Create new validation
          const { error: insertError } = await supabase
            .from('report_validations')
            .insert({
              report_id: reportId,
              user_id: userId,
              validation_type: validationType,
            });

          if (insertError) {
            console.error('Error inserting validation:', insertError);
            return false;
          }
        }

        return true;
      }

      if (existingValidation) {
        // Update existing validation
        const { error } = await supabase
          .from('report_validations')
          .update({ validation_type: validationType })
          .eq('report_id', reportId)
          .eq('user_id', userId);

        if (error) {
          console.error('Error updating validation:', error);
          return false;
        }
      } else {
        // Create new validation
        const { error } = await supabase
          .from('report_validations')
          .insert({
            report_id: reportId,
            user_id: userId,
            validation_type: validationType,
          });

        if (error) {
          console.error('Error inserting validation:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating report:', error);
      return false;
    }
  }

  /**
   * Get user's validation for a specific report
   */
  async getUserValidation(reportId: number, userId: string): Promise<'confirm' | 'deny' | null> {
    try {
      // First check if we have a valid session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        console.warn('No valid session for user validation request');
        return null;
      }

      const { data, error } = await supabase
        .from('report_validations')
        .select('validation_type')
        .eq('report_id', reportId)
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        console.error('Error getting user validation:', error);
        return null;
      }

      // Return the validation type if found, otherwise null
      return data && data.length > 0 ? data[0].validation_type : null;
    } catch (error) {
      console.warn('Error getting user validation:', error);
      return null;
    }
  }

  /**
   * Get validation statistics for a report
   */
  async getValidationStats(reportId: number): Promise<{
    confirmCount: number;
    denyCount: number;
    totalValidations: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('report_validations')
        .select('validation_type')
        .eq('report_id', reportId);

      if (error) {
        throw error;
      }

      const confirmCount = data.filter(v => v.validation_type === 'confirm').length;
      const denyCount = data.filter(v => v.validation_type === 'deny').length;

      return {
        confirmCount,
        denyCount,
        totalValidations: data.length,
      };
    } catch (error) {
      console.error('Error getting validation stats:', error);
      return { confirmCount: 0, denyCount: 0, totalValidations: 0 };
    }
  }

  /**
   * Remove user's validation for a report
   */
  async removeValidation(reportId: number, userId: string): Promise<boolean> {
    try {
      // First check if we have a valid session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        console.warn('No valid session for removing validation');
        return false;
      }

      const { error } = await supabase
        .from('report_validations')
        .delete()
        .eq('report_id', reportId)
        .eq('user_id', userId);

      // Handle authentication errors
      if (error && (error.message?.includes('401') || error.message?.includes('Unauthorized'))) {
        console.warn('Authentication error removing validation, attempting session refresh');

        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshData.session) {
          console.error('Failed to refresh session for removing validation:', refreshError);
          return false;
        }

        // Retry the delete with refreshed session
        const { error: retryError } = await supabase
          .from('report_validations')
          .delete()
          .eq('report_id', reportId)
          .eq('user_id', userId);

        if (retryError) {
          console.error('Retry failed for removing validation:', retryError);
          return false;
        }

        return true;
      }

      if (error) {
        console.error('Error removing validation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error removing validation:', error);
      return false;
    }
  }

  /**
   * Update user verification level
   */
  async updateUserVerificationLevel(userId: string, level: 'basic' | 'verified' | 'trusted'): Promise<boolean> {
    try {
      const updateData: any = {
        verification_level: level,
      };

      if (level !== 'basic') {
        updateData.verified_at = new Date().toISOString();
        if (level === 'trusted') {
          updateData.verification_badge_earned_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
      return true;
    } catch (error) {
      console.error('Error updating user verification level:', error);
      return false;
    }
  }

  /**
   * Calculate credibility score for a report (client-side fallback)
   */
  calculateCredibilityScore(
    report: {
      credibility_score?: number;
      validation_count?: number;
      user_reputation?: number;
      created_at: string;
    },
    validationStats?: { confirmCount: number; denyCount: number; totalValidations: number },
  ): number {
    // If server-calculated score exists, use it
    if (report.credibility_score !== undefined) {
      return report.credibility_score;
    }

    // Fallback client-side calculation
    const baseScore = 0.5;
    const userRepBonus = ((report.user_reputation || 0) / 100) * 0.2;
    const hoursOld = (Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60);
    const timePenalty = Math.min(hoursOld * 0.01, 0.2);

    let communityBonus = 0;
    if (validationStats && validationStats.totalValidations > 0) {
      communityBonus = ((validationStats.confirmCount / validationStats.totalValidations) - 0.5) * 0.6;
    }

    const finalScore = Math.max(0.1, Math.min(0.9, baseScore + userRepBonus + communityBonus - timePenalty));
    return finalScore;
  }

  /**
   * Get credibility level description
   */
  getCredibilityLevel(score: number): {
    level: 'low' | 'medium' | 'high';
    label: string;
    color: string;
    icon: string;
  } {
    if (score >= 0.8) {
      return {
        level: 'high',
        label: 'Highly Credible',
        color: '#10b981',
        icon: '⭐',
      };
    } else if (score >= 0.6) {
      return {
        level: 'medium',
        label: 'Moderately Credible',
        color: '#f59e0b',
        icon: '⚖️',
      };
    } else {
      return {
        level: 'low',
        label: 'Low Credibility',
        color: '#ef4444',
        icon: '⚠️',
      };
    }
  }

  /**
   * Get verification level info
   */
  getVerificationLevelInfo(level: 'basic' | 'verified' | 'trusted' | undefined): {
    label: string;
    color: string;
    icon: string;
    description: string;
  } {
    switch (level) {
    case 'trusted':
      return {
        label: 'Trusted Reporter',
        color: '#10b981',
        icon: '⭐',
        description: 'High reputation + accurate reporting history',
      };
    case 'verified':
      return {
        label: 'Verified User',
        color: '#3b82f6',
        icon: '✅',
        description: 'Identity verified + activity history',
      };
    default:
      return {
        label: 'Basic User',
        color: '#6b7280',
        icon: '👤',
        description: 'Email/phone verified',
      };
    }
  }

  /**
   * Calculate net upvotes for a user (upvotes - downvotes across all reports)
   */
  async calculateUserNetUpvotes(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('upvotes, downvotes')
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      // Calculate net upvotes: sum of (upvotes - downvotes) for all reports
      const netUpvotes = data.reduce((total, report) => {
        return total + (report.upvotes || 0) - (report.downvotes || 0);
      }, 0);

      return Math.max(0, netUpvotes); // Ensure non-negative
    } catch (error) {
      console.error('Error calculating user net upvotes:', error);
      return 0;
    }
  }

  /**
   * Get verification level based on net upvotes and email verification
   */
  getVerificationLevelFromUpvotes(netUpvotes: number, isEmailVerified: boolean = false): 'basic' | 'verified' | 'trusted' {
    if (netUpvotes >= 50 && isEmailVerified) {
      return 'trusted';
    } else if (netUpvotes >= 15 && isEmailVerified) {
      return 'verified';
    } else {
      return 'basic';
    }
  }

  /**
   * Check and update user verification level based on current net upvotes and email verification
   */
  async checkAndUpdateVerificationLevel(userId: string): Promise<boolean> {
    try {
      // Calculate current net upvotes
      const netUpvotes = await this.calculateUserNetUpvotes(userId);

      // Get user email verification status
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('verification_level, email_verified')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      const isEmailVerified = userData.email_verified || false;
      const currentLevel = userData.verification_level || 'basic';

      // Determine what verification level they should have
      const newLevel = this.getVerificationLevelFromUpvotes(netUpvotes, isEmailVerified);

      // Only update if the level has changed
      if (currentLevel !== newLevel) {
        console.log(`🔄 Updating user ${userId} verification from ${currentLevel} to ${newLevel} (${netUpvotes} net upvotes, email verified: ${isEmailVerified})`);

        const success = await this.updateUserVerificationLevel(userId, newLevel);

        if (success) {
          console.log(`✅ User ${userId} verification level updated to ${newLevel}`);
        }

        return success;
      }

      return true; // No change needed
    } catch (error) {
      console.error('Error checking and updating verification level:', error);
      return false;
    }
  }
}

// Export singleton instance
export const credibilityService = new CredibilityService();
export default credibilityService;
