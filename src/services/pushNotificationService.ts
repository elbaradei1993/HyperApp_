import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

import { supabase } from '../lib/supabase';
import type { Vibe, SOS } from '../types';

class PushNotificationService {
  private static instance: PushNotificationService;
  private currentUserId: string | null = null;
  private currentToken: string | null = null;
  private listenerHandles: PluginListenerHandle[] = [];

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize(userId: string): Promise<void> {
    this.currentUserId = userId;
    if (!Capacitor.isNativePlatform()) {
      console.info('Push notifications are available in the installed Capacitor app.');
      return;
    }

    try {
      const permissions = await PushNotifications.checkPermissions();
      const requested = permissions.receive === 'prompt'
        ? await PushNotifications.requestPermissions()
        : permissions;

      if (requested.receive !== 'granted') {
        throw new Error('Push notification permission was not granted.');
      }

      await this.removeListeners();
      await this.setupCapacitorListeners();
      await PushNotifications.register();
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      throw error;
    }
  }

  private async setupCapacitorListeners(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    this.listenerHandles.push(await PushNotifications.addListener('registration', async (token) => {
      this.currentToken = token.value;
      await this.storePushSubscription(token.value);
    }));

    this.listenerHandles.push(await PushNotifications.addListener('registrationError', (error) => {
      console.error('Push notification registration error:', error);
    }));

    this.listenerHandles.push(await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const data = notification.data || {};
      this.showInAppNotification({
        type: data.type === 'emergency' ? 'error' : 'info',
        title: notification.title || 'HyperApp',
        message: notification.body || '',
        action: data.reportId
          ? {
              label: 'View',
              onClick: () => {
                window.location.href = `/?tab=map&report=${encodeURIComponent(String(data.reportId))}`;
              },
            }
          : undefined,
      });
    }));

    this.listenerHandles.push(await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data || {};
      if (data.reportId) {
        window.location.href = `/?tab=map&report=${encodeURIComponent(String(data.reportId))}`;
      }
    }));
  }

  private async removeListeners(): Promise<void> {
    const handles = this.listenerHandles.splice(0);
    await Promise.all(handles.map((handle) => handle.remove().catch(() => undefined)));
  }

  private async storePushSubscription(token: string): Promise<void> {
    if (!this.currentUserId || !token) return;

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: this.currentUserId,
          fcm_token: token,
          notification_radius: 5,
          emergency_alerts: true,
          safety_reports: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,fcm_token' },
      );

    if (error) {
      console.error('Failed to store push subscription:', error);
      throw error;
    }
  }

  private showInAppNotification(notification: {
    type: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    action?: { label: string; onClick: () => void };
  }): void {
    window.dispatchEvent(new CustomEvent('hyperapp:push-notification', { detail: notification }));
  }

  async sendPushToNearbyUsers(report: Vibe | SOS): Promise<void> {
    try {
      const reportId = Number(report.id);
      if (!Number.isInteger(reportId) || reportId <= 0) return;
      const { error } = await supabase.functions.invoke('send-push-notifications', {
        body: { reportId },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Failed to send nearby push notification:', error);
    }
  }

  async updateUserLocation(location: [number, number]): Promise<void> {
    if (!this.currentUserId || !this.currentToken) return;
    const { error } = await supabase
      .from('push_subscriptions')
      .update({
        user_location_lat: location[0],
        user_location_lng: location[1],
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', this.currentUserId)
      .eq('fcm_token', this.currentToken);
    if (error) console.error('Failed to update push location:', error);
  }

  async updatePreferences(preferences: {
    emergency_alerts?: boolean;
    safety_reports?: boolean;
    notification_radius?: number;
  }): Promise<void> {
    if (!this.currentUserId || !this.currentToken) return;
    const { error } = await supabase
      .from('push_subscriptions')
      .update({ ...preferences, updated_at: new Date().toISOString() })
      .eq('user_id', this.currentUserId)
      .eq('fcm_token', this.currentToken);
    if (error) throw error;
  }

  async cleanup(): Promise<void> {
    const userId = this.currentUserId;
    const token = this.currentToken;
    await this.removeListeners();
    if (userId && token) {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('fcm_token', token);
      if (error) console.error('Failed to remove push subscription:', error);
    }
    this.currentUserId = null;
    this.currentToken = null;
  }

  async isEnabled(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    const permissions = await PushNotifications.checkPermissions();
    return permissions.receive === 'granted' && !!this.currentToken;
  }

  getCurrentToken(): string | null {
    return this.currentToken;
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
export default pushNotificationService;
