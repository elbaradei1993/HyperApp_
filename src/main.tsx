import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { Capacitor } from '@capacitor/core';

import App from './App';
// SplashScreen will be handled inside App.tsx now
// import SplashScreen from './components/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';

// import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

import './index.css';
import './themes.css';
import './i18n';

// Mobile viewport height fix
const setVH = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

// Set initial viewport height
setVH();

// Update viewport height on resize/orientation change
window.addEventListener('resize', setVH);
window.addEventListener('orientationchange', () => {
  // Delay to account for mobile browser UI changes
  setTimeout(setVH, 100);
});

// Unregister any cached OneSignal service workers and clear related caches
const cleanupOneSignal = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Unregister OneSignal service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        if (registration.scope.includes('onesignal') ||
            registration.active?.scriptURL.includes('onesignal') ||
            registration.waiting?.scriptURL.includes('onesignal') ||
            registration.installing?.scriptURL.includes('onesignal')) {
          console.log('Unregistering OneSignal service worker:', registration.scope);
          await registration.unregister();
        }
      }

      // Clear any OneSignal-related caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          if (cacheName.includes('onesignal') || cacheName.includes('OneSignal')) {
            console.log('Deleting OneSignal cache:', cacheName);
            await caches.delete(cacheName);
          }
        }
      }
    } catch (error) {
      console.log('Error cleaning up OneSignal:', error);
    }
  }
};

// Register main service worker for caching and offline functionality
const registerMainServiceWorker = async () => {
  // Disabled - sw.js file doesn't exist
  console.log('Main service worker registration disabled - sw.js not found');
  // if ('serviceWorker' in navigator) {
  //   try {
  //     // Register main service worker for caching
  //     const registration = await navigator.serviceWorker.register('/sw.js', {
  //       scope: '/'
  //     });

  //     console.log('Main service worker registered successfully:', registration.scope);

  //     // Handle service worker updates
  //     registration.addEventListener('updatefound', () => {
  //       const newWorker = registration.installing;
  //       if (newWorker) {
  //         newWorker.addEventListener('statechange', () => {
  //           if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
  //             // New content is available, notify user
  //             console.log('New content is available and will be used when all tabs for this page are closed.');
  //           }
  //         }
  //       });
  //     });

  //   } catch (error) {
  //     console.error('Main service worker registration failed:', error);
  //   }
  // }
};

// Register Firebase service worker for push notifications with retry logic
const registerFirebaseServiceWorker = async (retries = 3) => {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers not supported');
    return;
  }

  // Firebase service worker removed - using Capacitor for push notifications
  console.log('ℹ️ Firebase messaging removed - use Capacitor for push notifications');
  return null as any;
}

// Initialize service workers sequentially
const initializeServiceWorkers = async () => {
  try {
    console.log('🔧 Initializing service workers...');

    // Step 1: Clean up any cached OneSignal service workers and caches
    await cleanupOneSignal();
    console.log('✅ OneSignal cleanup completed');

    // Step 2: Register main service worker for caching (disabled)
    await registerMainServiceWorker();

    // Step 3: Register Firebase service worker with retry logic
    await registerFirebaseServiceWorker();
    console.log('✅ Service worker initialization completed');

  } catch (error) {
    console.error('❌ Service worker initialization failed:', error);
    // Continue with app initialization even if service workers fail
  }
};

// Initialize service workers
initializeServiceWorkers();

// Initialize Google Auth plugin for mobile (disabled for now to fix 500 error)
// GoogleAuth.initialize({
//   clientId: '1096420795648-tvflndafmrrnibhc90fqkadqdn8cnssu.apps.googleusercontent.com',
//   scopes: ['profile', 'email'],
//   grantOfflineAccess: true,
// }).catch((error: any) => {
//   console.warn('Google Auth initialization failed:', error);
// });



// Capacitor-ready app wrapper
const CapacitorApp: React.FC = () => {
  console.log('🚀 CapacitorApp component rendering...');

  useEffect(() => {
    console.log('🔧 CapacitorApp useEffect running...');
    const initializeCapacitor = async () => {
      try {
        console.log('🔧 Initializing Capacitor...');

        // Initialize Capacitor asynchronously without blocking app render
        if (Capacitor.isNativePlatform()) {
          console.log('📱 Running on native platform, initializing Capacitor...');
          await new Promise(resolve => {
            // Wait for deviceready or DOM ready
            if (document.readyState === 'complete') {
              resolve(void 0);
            } else {
              document.addEventListener('DOMContentLoaded', resolve);
            }
          });

          // Small delay to ensure Capacitor plugins are ready
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('✅ Capacitor ready');
      } catch (error) {
        console.error('❌ Capacitor initialization error:', error);
        // Continue anyway - app should still work
      }
    };

    initializeCapacitor();
  }, []);

  console.log('📦 Rendering ChakraProvider...');
  return (
    <ErrorBoundary>
      <ChakraProvider value={defaultSystem}>
        <NotificationProvider>
          <AuthProvider>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </AuthProvider>
        </NotificationProvider>
      </ChakraProvider>
    </ErrorBoundary>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CapacitorApp />
  </React.StrictMode>,
);
