// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

// Firebase configuration - these will be set via environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
let messaging: Messaging | null = null;

console.log('🔔 Firebase initialized successfully');

try {
  // Initialize messaging based on platform
  if (Capacitor.isNativePlatform()) {
    // On mobile, we don't need Firebase messaging directly - Capacitor handles it
    console.log('📱 Running on mobile - using Capacitor for notifications');
    messaging = null;
  } else {
    // On web, initialize Firebase messaging for PWA
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      messaging = getMessaging(app);
      console.log('🌐 Running on web - Firebase messaging initialized');
    }
  }
} catch (error) {
  console.warn('Firebase Messaging initialization failed:', error);
  messaging = null;
}

export { messaging, app };
export default app;

// FCM Token Management
export class FCMService {
  private static instance: FCMService;
  private vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  private constructor() {}

  static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
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

  // Request notification permission and get FCM token
  async requestPermission(): Promise<string | null> {
    try {
      if (Capacitor.isNativePlatform()) {
        // On mobile, use Capacitor's PushNotifications plugin for native permission dialog
        console.log('📱 Requesting push notification permission via Capacitor');

        // Ensure Capacitor is ready before proceeding
        await this.waitForCapacitorReady();

        // Check current permission status first
        const { receive } = await PushNotifications.checkPermissions();
        console.log('📱 Current push notification permission status:', receive);

        if (receive === 'denied') {
          console.log('❌ 📱 Push notification permission was previously denied');
          return null;
        }

        // Request permissions if not already granted
        if (receive !== 'granted') {
          console.log('📱 Requesting push notification permissions...');
          const permissionResult = await PushNotifications.requestPermissions();
          console.log('📱 Permission request result:', permissionResult);

          if (permissionResult.receive !== 'granted') {
            console.log('❌ 📱 Push notification permission denied via Capacitor');
            return null;
          }
        }

        console.log('✅ 📱 Push notification permission granted via Capacitor');

        // Register for push notifications
        console.log('📱 Registering for push notifications...');
        await PushNotifications.register();
        console.log('✅ 📱 Push notification registration initiated');

        // Return a placeholder - actual FCM token will be received via registration listener
        return 'capacitor-push-notifications-enabled';

      } else {
        // On web, use Firebase messaging
        console.log('🌐 Requesting notification permission via Firebase');

        // Check if service worker is supported
        if (!('serviceWorker' in navigator)) {
          console.warn('❌ 🌐 Service workers not supported');
          return null;
        }

        // Check for existing Firebase service worker registration
        const existingRegistrations = await navigator.serviceWorker.getRegistrations();
        console.log('🌐 Existing service worker registrations:', existingRegistrations.length);

        let registration: ServiceWorkerRegistration | undefined;

        // Look for Firebase messaging service worker specifically
        const firebaseRegistration = existingRegistrations.find(reg =>
          reg.active?.scriptURL.includes('firebase-messaging-sw.js') ||
          reg.waiting?.scriptURL.includes('firebase-messaging-sw.js') ||
          reg.installing?.scriptURL.includes('firebase-messaging-sw.js'),
        );

        if (firebaseRegistration) {
          registration = firebaseRegistration;
          console.log('✅ 🌐 Found existing Firebase service worker registration');
        } else {
          // Try to register Firebase service worker if not found
          try {
            console.log('🔄 🌐 Firebase service worker not found, attempting registration...');
            registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
              scope: '/',
            });
            console.log('✅ 🌐 Firebase service worker registered successfully');

            // Wait for service worker to be ready
            await navigator.serviceWorker.ready;
          } catch (registrationError) {
            console.error('❌ 🌐 Firebase service worker registration failed:', registrationError);
            console.warn('❌ 🌐 Cannot proceed with Firebase messaging without service worker');
            return null;
          }
        }

        // Request notification permission
        const permission = await Notification.requestPermission();
        console.log('🌐 Notification permission result:', permission);

        if (permission !== 'granted') {
          console.log('❌ 🌐 Notification permission denied');
          return null;
        }

        console.log('✅ 🌐 Notification permission granted');

        // Get FCM token
        if (!messaging) {
          console.warn('❌ Firebase messaging not initialized');
          return null;
        }

        console.log('🌐 Getting FCM token with VAPID key...');
        const token = await getToken(messaging, {
          vapidKey: this.vapidKey,
          serviceWorkerRegistration: registration,
        });

        if (token) {
          console.log('✅ 🌐 FCM token obtained:', token.substring(0, 20) + '...');
          return token;
        } else {
          console.warn('❌ 🌐 No FCM token available - check Firebase configuration');
          return null;
        }
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return null;
    }
  }

  // Listen for foreground messages
  onMessageReceived(callback: (payload: any) => void): () => void {
    if (!messaging) {
      console.warn('Firebase Messaging not available for message listening');
      return () => {};
    }

    try {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        callback(payload);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up message listener:', error);
      return () => {};
    }
  }

  // Check if notifications are supported
  async isSupported(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      // On mobile, check if PushNotifications plugin is available
      try {
        const { receive } = await PushNotifications.checkPermissions();
        return receive !== 'denied';
      } catch (error) {
        console.warn('Error checking Capacitor push notification permissions:', error);
        return false;
      }
    } else {
      // On web, check for standard notification support
      return !!(messaging && 'serviceWorker' in navigator && 'Notification' in window);
    }
  }

  // Get current permission status
  async getPermissionStatus(): Promise<NotificationPermission | 'unknown'> {
    if (Capacitor.isNativePlatform()) {
      try {
        const { receive } = await PushNotifications.checkPermissions();
        switch (receive) {
        case 'granted':
          return 'granted';
        case 'denied':
          return 'denied';
        default:
          return 'default';
        }
      } catch (error) {
        console.warn('Error getting Capacitor push notification permission status:', error);
        return 'unknown';
      }
    } else {
      if (!('Notification' in window)) {
        return 'denied';
      }
      return Notification.permission;
    }
  }
}

// Export singleton instance
export const fcmService = FCMService.getInstance();
