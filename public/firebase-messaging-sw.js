// Firebase Cloud Messaging Service Worker
// This service worker handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
const firebaseConfig = {
  apiKey: "AIzaSyBJMAB9zWAcZJBpKh60d3Dj-NkmuuqfcgQ",
  authDomain: "hyper-7e997.firebaseapp.com",
  projectId: "hyper-7e997",
  storageBucket: "hyper-7e997.firebasestorage.app",
  messagingSenderId: "1096420795648",
  appId: "1:1096420795648:web:d4f1a2c051cc84f99ebfe5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('📨 Received background message:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'Safety Alert';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'New safety information available',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: payload.data?.reportId || 'safety-alert',
    requireInteraction: payload.data?.type === 'emergency',
    data: payload.data,
    actions: [
      {
        action: 'view',
        title: 'View Details'
      }
    ]
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event);

  event.notification.close();

  // Handle action clicks
  if (event.action === 'view') {
    // Open the app and navigate to the relevant location
    const reportData = event.notification.data;
    if (reportData && reportData.latitude && reportData.longitude) {
      // Navigate to map with specific coordinates
      const url = `/map?lat=${reportData.latitude}&lng=${reportData.longitude}`;
      event.waitUntil(
        clients.openWindow(url)
      );
    } else {
      // Just open the app
      event.waitUntil(
        clients.openWindow('/')
      );
    }
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('🔧 Firebase service worker installed');
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('🚀 Firebase service worker activated');
  event.waitUntil(clients.claim());
});
