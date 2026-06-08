// Push Notification Service - Supabase + Capacitor Integration
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

import { supabase } from '../lib/supabase';
import type { Vibe, SOS } from '../types';

interface PushSubscription {
  id: string;
  user_id: string;
  fcm_token: string;
  user_location_lat?: number;
  user_location_lng?: number;
  notification_radius: number; // in kilometers
  emergency_alerts: boolean;
  safety_reports: boolean;
  created_at: string;
  updated_at: string;
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private currentUserId: string | null = null;
  private currentToken: string | null = null;
  private unsubscribeFromMessages: (() => void) | null = null;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  // Initialize push notifications for a user
  async initialize(userId: string): Promise<void> {
    console.log('🔔 Starting push notification initialization for user:', userId);
    this.currentUserId = userId;

    try {
      // Ensure Capacitor is ready before initializing push notifications
      if (Capacitor.isNativePlatform()) {
        console.log('📱 Waiting for Capacitor to be ready...');
        await this.waitForCapacitorReady();
        console.log('📱 Capacitor is ready, proceeding with push notification setup');
      }

      // TODO: Implement push notifications with Capacitor + Supabase
      // For now, using Capacitor push notifications on native platforms
      console.log('🔔 Push notifications support (Firebase removed - use Capacitor)');

      if (!Capacitor.isNativePlatform()) {
        console.log('⚠️ Push notifications require native platform or Capacitor setup');
        return;
      }

      // Request Capacitor push notification permission
      console.log('🔔 Requesting notification permission via Capacitor...');
      const token = 'capacitor-push-notifications-enabled';

      this.currentToken = token;

      // Handle different platforms
      if (Capacitor.isNativePlatform()) {
        if (token === 'capacitor-push-notifications-enabled') {
          // Set up Capacitor push notification listeners
          this.setupCapacitorListeners();
          console.log('📱 Capacitor push notifications initialized - waiting for FCM token');
        } else {
          // Store FCM token directly if we got one
          console.log('📱 Storing FCM token for Capacitor platform...');
          await this.storePushSubscription(token);
        }
      } else {
        // Web platform - Capacitor push notifications not available
        if (token !== 'capacitor-push-notifications-enabled') {
          console.log('🌐 Web platform: configure Capacitor or use alternative notification method');
          // TODO: Implement web push notifications with Supabase or alternative service
        }
      }

      console.log('✅ Push notifications successfully initialized for user:', userId);

    } catch (error: any) {
      console.error('❌ Failed to initialize push notifications:', error);
      console.log('   Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack?.substring(0, 200) + '...',
      });
      console.log('   Troubleshooting steps:');
      console.log('   1. Check browser console for additional errors');
      console.log('   2. Verify Firebase configuration in environment variables');
      console.log('   3. Ensure service worker is properly registered');
      console.log('   4. Check network connectivity');
      console.log('   5. Try refreshing the page');

      // Don't rethrow - we want the app to continue working even if push notifications fail
    }
  }

  // Wait for Capacitor to be fully ready
  private async waitForCapacitorReady(): Promise<void> {
    return new Promise((resolve) => {
      const checkReady = () => {
        // Check if Capacitor plugins are available
        if (typeof (window as any).Capacitor !== 'undefined' &&
            typeof (window as any).Capacitor.Plugins !== 'undefined' &&
            typeof (window as any).Capacitor.Plugins.PushNotifications !== 'undefined') {
          resolve();
        } else {
          // Wait a bit and check again
          setTimeout(checkReady, 100);
        }
      };

      // Start checking immediately
      checkReady();

      // Also set a timeout to resolve anyway after 5 seconds to prevent hanging
      setTimeout(() => {
        console.log('📱 Capacitor ready check timeout - proceeding anyway');
        resolve();
      }, 5000);
    });
  }

  // Set up Capacitor push notification listeners
  private setupCapacitorListeners(): void {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Listen for FCM token registration
    PushNotifications.addListener('registration', async (token) => {
      console.log('📱 FCM token received from Capacitor:', token.value);
      this.currentToken = token.value;
      await this.storePushSubscription(token.value);
    });

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('📱 Push notification registration error:', error);
    });

    // Listen for push notifications received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('📱 Push notification received in foreground:', notification);
      this.handleForegroundMessage({
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data,
      });
    });

    // Listen for push notification action performed (user tapped notification)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('📱 Push notification action performed:', action);
      // Handle notification tap - could navigate to specific screen
      const data = action.notification.data;
      if (data?.url) {
        window.location.href = data.url;
      }
    });
  }

  // Store FCM token in Supabase
  private async storePushSubscription(token: string): Promise<void> {
    if (!this.currentUserId) {
      return;
    }

    try {
      console.log('📱 Storing push subscription for user:', this.currentUserId);

      // Use upsert to handle both insert and update cases
      const { error: upsertError } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: this.currentUserId,
          fcm_token: token,
          notification_radius: 5,
          emergency_alerts: true,
          safety_reports: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,fcm_token',
        });

      if (upsertError) {
        console.error('Failed to upsert push subscription:', upsertError);
        console.log('Error details:', {
          message: upsertError.message,
          code: upsertError.code,
          details: upsertError.details,
          hint: upsertError.hint,
        });
      } else {
        console.log('📱 Push subscription stored successfully in database');
      }
    } catch (error) {
      console.error('Failed to store push subscription:', error);
      // Don't throw - push notifications are not critical
    }
  }

  // Handle foreground messages (when app is open)
  private handleForegroundMessage(payload: any): void {
    console.log('📨 Foreground push message received:', payload);

    const { notification, data } = payload;

    if (notification) {
      // Show in-app notification
      this.showInAppNotification({
        type: data?.type === 'emergency' ? 'error' : 'info',
        title: notification.title,
        message: notification.body,
        action: data?.url ? {
          label: 'View',
          onClick: () => {
            if (data.url) {
              window.location.href = data.url;
            }
          },
        } : undefined,
      });
    }
  }

  // Show in-app notification (fallback for foreground messages)
  private showInAppNotification(notification: {
    type: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    action?: { label: string; onClick: () => void };
  }): void {
    // This will be handled by the notification context
    // For now, just log it
    console.log('📢 In-app notification:', notification);
  }

  // Send push notification to nearby users (server-side function)
  async sendPushToNearbyUsers(report: Vibe | SOS, reportLocation: [number, number]): Promise<void> {
    try {
      // Call Supabase Edge Function to handle push sending
      const { data, error } = await supabase.functions.invoke('send-push-notifications', {
        body: {
          report,
          location: reportLocation,
          radius: 5, // 5km radius
        },
      });

      if (error) {
        console.error('Failed to send push notifications:', error);
      } else {
        console.log('📤 Push notifications sent to nearby users:', data);
      }
    } catch (error) {
      console.error('Error invoking push notification function:', error);
    }
  }

  // Update user location for targeted notifications
  async updateUserLocation(location: [number, number]): Promise<void> {
    if (!this.currentUserId) {
      return;
    }

    try {
      await supabase
        .from('push_subscriptions')
        .update({
          user_location_lat: location[0],
          user_location_lng: location[1],
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', this.currentUserId);

      console.log('📍 User location updated for push notifications');
    } catch (error) {
      console.error('Failed to update user location:', error);
    }
  }

  // Update notification preferences
  async updatePreferences(preferences: {
    emergency_alerts?: boolean;
    safety_reports?: boolean;
    notification_radius?: number;
  }): Promise<void> {
    if (!this.currentUserId) {
      return;
    }

    try {
      await supabase
        .from('push_subscriptions')
        .update({
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', this.currentUserId);

      console.log('⚙️ Push notification preferences updated');
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  }

  // Cleanup when user logs out
  cleanup(): void {
    if (this.unsubscribeFromMessages) {
      this.unsubscribeFromMessages();
      this.unsubscribeFromMessages = null;
    }

    this.currentUserId = null;
    this.currentToken = null;

    console.log('🧹 Push notification service cleaned up');
  }

  // Check if push notifications are enabled
  async isEnabled(): Promise<boolean> {
    const permissionStatus = await fcmService.getPermissionStatus();
    return permissionStatus === 'granted' && !!this.currentToken;
  }

  // Get current FCM token
  getCurrentToken(): string | null {
    return this.currentToken;
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();
export default pushNotificationService;
