import { supabase } from '../lib/supabase';

export interface GuardianRelationship {
  id: number;
  user_id: string;
  guardian_id: string;
  relationship_type: 'guardian' | 'emergency_contact';
  location_sharing_enabled: boolean;
  sos_alerts_enabled: boolean;
  created_at: string;
  updated_at: string;
  guardian_profile?: {
    user_id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    profile_picture_url?: string;
  };
}

export interface GuardianInvitation {
  id: number;
  inviter_id: string;
  invitee_email: string;
  invitee_name?: string;
  invitation_token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  relationship_type: 'guardian' | 'emergency_contact';
  location_sharing_enabled: boolean;
  sos_alerts_enabled: boolean;
  expires_at: string;
  accepted_at?: string;
  accepted_by?: string;
  created_at: string;
  updated_at: string;
}

export interface GuardianSOSAlert {
  id: number;
  user_id: string;
  guardian_id: string;
  alert_type: 'sos' | 'emergency' | 'check_in';
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  message?: string;
  status: 'active' | 'resolved' | 'false_alarm';
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface GuardianLocationShare {
  id: number;
  guardian_relationship_id: number;
  shared_location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: string;
  };
  shared_at: string;
  expires_at?: string;
}

class GuardianService {
  // Guardian Relationships
  async getUserGuardians(userId: string): Promise<GuardianRelationship[]> {
    const { data, error } = await supabase
      .from('user_guardians')
      .select(`
        *,
        guardian_profile:users!guardian_id (
          user_id,
          email,
          first_name,
          last_name,
          profile_picture_url
        )
      `)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
    return data || [];
  }

  async getGuardianRelationships(userId: string): Promise<GuardianRelationship[]> {
    const { data, error } = await supabase
      .from('user_guardians')
      .select(`
        *,
        user_profile:users!user_id (
          user_id,
          email,
          first_name,
          last_name,
          profile_picture_url
        )
      `)
      .eq('guardian_id', userId);

    if (error) {
      throw error;
    }
    return data || [];
  }

  async addGuardian(
    userId: string,
    guardianEmail: string,
    relationshipType: 'guardian' | 'emergency_contact' = 'guardian',
    options: {
      locationSharing?: boolean;
      sosAlerts?: boolean;
    } = {},
  ): Promise<{ success: boolean; invitation?: GuardianInvitation; relationship?: GuardianRelationship }> {
    // Always create invitation to avoid user lookup issues
    // The invitation acceptance process will handle user existence
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const { data: invitation, error: invitationError } = await supabase
      .from('guardian_invitations')
      .insert({
        inviter_id: userId,
        invitee_email: guardianEmail,
        invitation_token: invitationToken,
        relationship_type: relationshipType,
        location_sharing_enabled: options.locationSharing || false,
        sos_alerts_enabled: options.sosAlerts !== false,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (invitationError) {
      throw invitationError;
    }

    // Send invitation email
    await this.sendGuardianInvitationEmail(invitation);

    return { success: true, invitation };
  }

  async removeGuardian(userId: string, guardianId: string): Promise<void> {
    const { error } = await supabase
      .from('user_guardians')
      .delete()
      .eq('user_id', userId)
      .eq('guardian_id', guardianId);

    if (error) {
      throw error;
    }
  }

  async updateGuardianSettings(
    relationshipId: number,
    settings: {
      location_sharing_enabled?: boolean;
      sos_alerts_enabled?: boolean;
    },
  ): Promise<void> {
    const { error } = await supabase
      .from('user_guardians')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', relationshipId);

    if (error) {
      throw error;
    }
  }

  // Guardian Invitations
  async getPendingInvitations(userId: string): Promise<GuardianInvitation[]> {
    const { data, error } = await supabase
      .from('guardian_invitations')
      .select('*')
      .eq('inviter_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    if (error) {
      throw error;
    }
    return data || [];
  }

  async acceptGuardianInvitation(invitationToken: string, newUserId: string): Promise<GuardianRelationship> {
    // Get invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('guardian_invitations')
      .select('*')
      .eq('invitation_token', invitationToken)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (invitationError) {
      throw invitationError;
    }
    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    // Create the guardian relationship
    const { data: relationship, error: relationshipError } = await supabase
      .from('user_guardians')
      .insert({
        user_id: invitation.inviter_id,
        guardian_id: newUserId,
        relationship_type: invitation.relationship_type,
        location_sharing_enabled: invitation.location_sharing_enabled,
        sos_alerts_enabled: invitation.sos_alerts_enabled,
      })
      .select(`
        *,
        guardian_profile:users!guardian_id (
          user_id,
          email,
          first_name,
          last_name,
          profile_picture_url
        )
      `)
      .single();

    if (relationshipError) {
      throw relationshipError;
    }

    // Update invitation status
    await supabase
      .from('guardian_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: newUserId,
      })
      .eq('id', invitation.id);

    return relationship;
  }

  async cancelGuardianInvitation(invitationId: number): Promise<void> {
    const { error } = await supabase
      .from('guardian_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);

    if (error) {
      throw error;
    }
  }

  // SOS Alerts
  async sendSOSAlert(
    userId: string,
    alertType: 'sos' | 'emergency' | 'check_in',
    location?: { latitude: number; longitude: number; accuracy?: number },
    message?: string,
  ): Promise<GuardianSOSAlert[]> {
    // Get user's guardians
    const guardians = await this.getUserGuardians(userId);

    const alerts: GuardianSOSAlert[] = [];

    for (const guardian of guardians) {
      if (guardian.sos_alerts_enabled) {
        const { data: alert, error } = await supabase
          .from('guardian_sos_alerts')
          .insert({
            user_id: userId,
            guardian_id: guardian.guardian_id,
            alert_type: alertType,
            location: location ? JSON.stringify(location) : null,
            message,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }
        alerts.push(alert);
      }
    }

    return alerts;
  }

  async getSOSAlerts(userId: string): Promise<GuardianSOSAlert[]> {
    const { data, error } = await supabase
      .from('guardian_sos_alerts')
      .select('*')
      .or(`user_id.eq.${userId},guardian_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }
    return data || [];
  }

  async resolveSOSAlert(alertId: number, resolvedBy: string): Promise<void> {
    const { error } = await supabase
      .from('guardian_sos_alerts')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
      })
      .eq('id', alertId);

    if (error) {
      throw error;
    }
  }

  // Location Sharing
  async shareLocation(
    relationshipId: number,
    location: { latitude: number; longitude: number; accuracy?: number },
    expiresAt?: string,
  ): Promise<GuardianLocationShare> {
    const { data, error } = await supabase
      .from('guardian_location_shares')
      .insert({
        guardian_relationship_id: relationshipId,
        shared_location: {
          ...location,
          timestamp: new Date().toISOString(),
        },
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  }

  async getSharedLocations(userId: string): Promise<GuardianLocationShare[]> {
    const { data, error } = await supabase
      .from('guardian_location_shares')
      .select(`
        *,
        relationship:user_guardians!guardian_relationship_id (
          user_id,
          guardian_id
        )
      `)
      .or(`relationship.user_id.eq.${userId},relationship.guardian_id.eq.${userId}`)
      .gt('expires_at', new Date().toISOString())
      .order('shared_at', { ascending: false });

    if (error) {
      throw error;
    }
    return data || [];
  }

  // Send guardian alerts (notifications and emails)
  async sendGuardianAlert(
    userId: string,
    alertType: string,
    message?: string,
    shareLocation?: boolean,
    location?: { latitude: number; longitude: number; accuracy?: number },
  ): Promise<{ pushSent: number; emailSent: number; totalGuardians: number }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-guardian-alerts', {
        body: {
          userId,
          alertType,
          message,
          shareLocation,
          location,
        },
      });

      if (error) {
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error sending guardian alert:', error);
      throw error;
    }
  }

  // Email functionality
  private async sendGuardianInvitationEmail(invitation: GuardianInvitation): Promise<void> {
    // Use the app's base URL - must be set in environment variables
    const baseUrl = import.meta.env.VITE_APP_URL;
    if (!baseUrl) {
      throw new Error('VITE_APP_URL environment variable is not set. Please set it to your app\'s public domain (e.g., https://your-app.pages.dev)');
    }
    const invitationUrl = `${baseUrl}/guardian/invite/${invitation.invitation_token}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: ltr;">
        <h1 style="color: #3b82f6;">🛡️ Guardian Angel Invitation</h1>
        <p>You've been invited to be a Guardian Angel for someone on HyperApp!</p>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2>What is a Guardian Angel?</h2>
          <p>Guardian Angels help keep their loved ones safe by:</p>
          <ul>
            <li>📍 Receiving location updates when needed</li>
            <li>🚨 Getting notified during emergencies</li>
            <li>👥 Being part of their safety network</li>
          </ul>
        </div>

        <p style="text-align: center; margin: 30px 0;">
          <a href="${invitationUrl}" style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            🚀 Accept Invitation & Join HyperApp
          </a>
        </p>

        <p>This invitation expires in 7 days.</p>
        <p>Best regards,<br>The HyperApp Safety Team</p>
      </div>
    `;

    // For development/testing, log the invitation details instead of sending email
    console.log('🛡️ Guardian invitation created:', {
      email: invitation.invitee_email,
      invitationUrl,
      token: invitation.invitation_token,
      expires: invitation.expires_at,
    });

    // Skip actual email sending in development to avoid function errors
    // In production, you would call the email service here
    // const { error } = await supabase.functions.invoke('send-marketing-email', {
    //   body: {
    //     testEmail: invitation.invitee_email,
    //     subject: '🛡️ You\'ve been invited to be a Guardian Angel on HyperApp',
    //     html: emailHtml,
    //   },
    // });

    // if (error) {
    //   console.error('Failed to send guardian invitation email:', error);
    //   throw error;
    // }
  }

  // Utility functions
  async checkExistingRelationship(userId: string, guardianEmail: string): Promise<boolean> {
    // Check if relationship already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('user_id')
      .eq('email', guardianEmail)
      .single();

    if (!existingUser) {
      return false;
    }

    const { data: relationship } = await supabase
      .from('user_guardians')
      .select('id')
      .eq('user_id', userId)
      .eq('guardian_id', existingUser.user_id)
      .single();

    return !!relationship;
  }

  async getGuardianStats(userId: string): Promise<{
    totalGuardians: number;
    activeSOSAlerts: number;
    pendingInvitations: number;
  }> {
    const [guardians, alerts, invitations] = await Promise.all([
      this.getUserGuardians(userId),
      this.getSOSAlerts(userId),
      this.getPendingInvitations(userId),
    ]);

    return {
      totalGuardians: guardians.length,
      activeSOSAlerts: alerts.filter(alert => alert.status === 'active').length,
      pendingInvitations: invitations.length,
    };
  }
}

export const guardianService = new GuardianService();
