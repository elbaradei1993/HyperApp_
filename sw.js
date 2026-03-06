// Service Worker for HyperApp - Offline Functionality with Authentication
const CACHE_NAME = 'hyperapp-v1.0.1';
const STATIC_CACHE = 'hyperapp-static-v1.0.1';
const DYNAMIC_CACHE = 'hyperapp-dynamic-v1.0.1';
const AUTH_CACHE = 'hyperapp-auth-v1.0.1';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/app.js',
  '/config.js',
  '/db-validation.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://telegram.org/js/telegram-web-app.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js'
];

// Authentication state storage
let authState = null;
let isOnline = true;

// Message handling for authentication
self.addEventListener('message', event => {
  const { type, data } = event.data;

  switch (type) {
    case 'STORE_AUTH_STATE':
      storeAuthState(data);
      break;
    case 'GET_AUTH_STATE':
      getAuthState().then(state => {
        event.ports[0].postMessage({ type: 'AUTH_STATE', data: state });
      });
      break;
    case 'CLEAR_AUTH_STATE':
      clearAuthState();
      break;
    case 'SET_ONLINE_STATUS':
      isOnline = data.online;
      handleConnectivityChange(data.online);
      break;
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// Store authentication state for offline use
async function storeAuthState(state) {
  try {
    authState = state;
    const cache = await caches.open(AUTH_CACHE);
    const response = new Response(JSON.stringify(state), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put('/auth-state', response);
    console.log('[SW] Auth state stored for offline use');
  } catch (error) {
    console.error('[SW] Failed to store auth state:', error);
  }
}

// Retrieve stored authentication state
async function getAuthState() {
  try {
    // First try to get from memory
    if (authState) {
      return authState;
    }

    // Then try from cache
    const cache = await caches.open(AUTH_CACHE);
    const response = await cache.match('/auth-state');

    if (response) {
      const state = await response.json();
      authState = state; // Restore to memory
      return state;
    }

    return null;
  } catch (error) {
    console.error('[SW] Failed to get auth state:', error);
    return null;
  }
}

// Clear stored authentication state
async function clearAuthState() {
  try {
    authState = null;
    const cache = await caches.open(AUTH_CACHE);
    await cache.delete('/auth-state');
    console.log('[SW] Auth state cleared');
  } catch (error) {
    console.error('[SW] Failed to clear auth state:', error);
  }
}

// Handle connectivity changes
function handleConnectivityChange(online) {
  isOnline = online;

  if (online) {
    // Back online - sync any pending data
    console.log('[SW] Back online - syncing pending data');
    self.registration.sync.register('background-sync-reports');
  } else {
    // Gone offline - notify clients
    console.log('[SW] Gone offline - enabling offline mode');
    notifyClients({ type: 'OFFLINE_MODE', data: { offline: true } });
  }
}

// Notify all connected clients
async function notifyClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage(message);
  });
}

// Enhanced fetch handler with authentication
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle Supabase authentication requests specially
  if (url.hostname.includes('supabase.co') && (
    url.pathname.includes('/auth/') ||
    request.headers.get('Authorization')
  )) {
    event.respondWith(handleAuthenticatedRequest(request));
    return;
  }

  // Handle API requests differently
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('openweathermap.org') ||
      url.hostname.includes('nominatim.openstreetmap.org')) {
    event.respondWith(networkFirstStrategy(request));
  } else {
    event.respondWith(cacheFirstStrategy(request));
  }
});

// Handle authenticated requests with offline fallback
async function handleAuthenticatedRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Store auth tokens if this is a successful auth response
      if (request.url.includes('/auth/') && networkResponse.status === 200) {
        const clonedResponse = networkResponse.clone();
        const data = await clonedResponse.json();

        if (data.access_token || data.session) {
          // Store auth state for offline use
          const authData = {
            session: data.session || data,
            timestamp: Date.now(),
            offline: false
          };
          await storeAuthState(authData);
        }
      }

      return networkResponse;
    }

    // If network fails, try offline authentication
    return await handleOfflineAuthentication(request);

  } catch (error) {
    console.log('[SW] Auth request failed, trying offline:', error);
    return await handleOfflineAuthentication(request);
  }
}

// Handle authentication when offline
async function handleOfflineAuthentication(request) {
  const authState = await getAuthState();

  if (!authState || !authState.session) {
    // No stored auth - return offline error
    return new Response(JSON.stringify({
      error: 'offline_auth_required',
      message: 'Authentication required but you are offline. Please connect to the internet and try again.'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check if stored session is still valid
  const now = Date.now();
  const sessionExpiry = authState.session.expires_at * 1000; // Convert to milliseconds

  if (now > sessionExpiry) {
    // Session expired - clear stored state
    await clearAuthState();
    return new Response(JSON.stringify({
      error: 'offline_session_expired',
      message: 'Your offline session has expired. Please connect to the internet to log in again.'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // For read-only operations, allow with stored session
  if (request.method === 'GET') {
    // Add stored auth token to request
    const headers = new Headers(request.headers);
    headers.set('Authorization', `Bearer ${authState.session.access_token}`);

    const offlineRequest = new Request(request.url, {
      method: request.method,
      headers: headers,
      // Don't include body for GET requests
    });

    try {
      // Try the request with stored token
      const response = await fetch(offlineRequest);
      return response;
    } catch (error) {
      // If that fails, try cached data
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      return new Response(JSON.stringify({
        error: 'offline_data_unavailable',
        message: 'Data unavailable offline. Please connect to the internet.'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // For write operations when offline, store for later sync
  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
    // Store the request for later sync
    await storeOfflineRequest(request);

    return new Response(JSON.stringify({
      success: true,
      message: 'Request stored for offline sync. Will be processed when connection is restored.',
      offline: true
    }), {
      status: 202, // Accepted
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Default offline response
  return new Response(JSON.stringify({
    error: 'offline',
    message: 'This operation is not available offline.'
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Store offline requests for later sync
async function storeOfflineRequest(request) {
  try {
    const requestData = {
      id: Date.now().toString(),
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      timestamp: Date.now()
    };

    // Add body for POST/PUT requests
    if (request.method === 'POST' || request.method === 'PUT') {
      try {
        requestData.body = await request.clone().text();
      } catch (error) {
        console.log('[SW] Could not read request body:', error);
      }
    }

    // Store in IndexedDB
    const dbRequest = indexedDB.open('hyperapp-offline', 2);

    return new Promise((resolve, reject) => {
      dbRequest.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('requests')) {
          db.createObjectStore('requests', { keyPath: 'id' });
        }
      };

      dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        const transaction = db.transaction(['requests'], 'readwrite');
        const store = transaction.objectStore('requests');
        const addRequest = store.add(requestData);

        addRequest.onsuccess = () => {
          console.log('[SW] Offline request stored:', requestData.id);
          resolve();
        };

        addRequest.onerror = () => reject(addRequest.error);
      };

      dbRequest.onerror = () => reject(dbRequest.error);
    });
  } catch (error) {
    console.error('[SW] Failed to store offline request:', error);
  }
}

// Sync offline requests when back online
async function syncOfflineRequests() {
  try {
    const offlineRequests = await getOfflineRequests();

    for (const requestData of offlineRequests) {
      try {
        const headers = new Headers(requestData.headers);

        // Add current auth token if available
        const authState = await getAuthState();
        if (authState && authState.session) {
          headers.set('Authorization', `Bearer ${authState.session.access_token}`);
        }

        const request = new Request(requestData.url, {
          method: requestData.method,
          headers: headers,
          body: requestData.body
        });

        const response = await fetch(request);

        if (response.ok) {
          await removeOfflineRequest(requestData.id);
          console.log('[SW] Synced offline request:', requestData.id);
        } else {
          console.log('[SW] Failed to sync request:', requestData.id, response.status);
        }
      } catch (error) {
        console.log('[SW] Error syncing request:', requestData.id, error);
      }
    }
  } catch (error) {
    console.log('[SW] Error syncing offline requests:', error);
  }
}

// Get stored offline requests
async function getOfflineRequests() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hyperapp-offline', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['requests'], 'readonly');
      const store = transaction.objectStore('requests');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id' });
      }
    };
  });
}

// Remove synced offline request
async function removeOfflineRequest(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hyperapp-offline', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['requests'], 'readwrite');
      const store = transaction.objectStore('requests');
      const deleteRequest = store.delete(id);

      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Install event - cache static files
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache-first failed:', error);
    // Return offline fallback for HTML requests
    if (request.headers.get('accept').includes('text/html')) {
      return caches.match('/index.html');
    }
  }
}

// Network-first strategy for API calls
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful API responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network-first failed, trying cache:', error);

    // Try to serve from cache if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline API fallback
    return new Response(JSON.stringify({
      error: 'offline',
      message: 'You are currently offline. Some features may be limited.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Background sync for offline reports and requests
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync-reports') {
    event.waitUntil(Promise.all([
      syncOfflineReports(),
      syncOfflineRequests()
    ]));
  }
});

// Sync offline reports when back online
async function syncOfflineReports() {
  try {
    const offlineReports = await getOfflineReports();

    for (const report of offlineReports) {
      try {
        // Attempt to submit the report
        const response = await fetch('/api/reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(report)
        });

        if (response.ok) {
          // Remove from offline storage
          await removeOfflineReport(report.id);
          console.log('[SW] Synced offline report:', report.id);
        }
      } catch (error) {
        console.log('[SW] Failed to sync report:', report.id, error);
      }
    }
  } catch (error) {
    console.log('[SW] Background sync failed:', error);
  }
}

// IndexedDB helpers for offline storage
async function getOfflineReports() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hyperapp-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['reports'], 'readonly');
      const store = transaction.objectStore('reports');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('reports')) {
        db.createObjectStore('reports', { keyPath: 'id' });
      }
    };
  });
}

async function removeOfflineReport(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hyperapp-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['reports'], 'readwrite');
      const store = transaction.objectStore('reports');
      const deleteRequest = store.delete(id);

      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Push notifications for emergency alerts
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.message,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    },
    actions: [
      {
        action: 'view',
        title: 'View Details'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'HyperApp Alert', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

// Periodic background tasks
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-weather') {
    event.waitUntil(updateWeatherInBackground());
  }
});

async function updateWeatherInBackground() {
  // This would update weather data in the background
  // Implementation depends on your specific needs
  console.log('[SW] Background weather update');
}

// Error logging
self.addEventListener('error', event => {
  console.error('[SW] Error:', event.error);
  // Send error to logging service
  logError({
    type: 'service_worker_error',
    message: event.error.message,
    stack: event.error.stack,
    url: event.filename,
    line: event.lineno,
    column: event.colno
  });
});

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Unhandled rejection:', event.reason);
  // Send error to logging service
  logError({
    type: 'unhandled_rejection',
    message: event.reason.message || event.reason,
    stack: event.reason.stack
  });
});

function logError(error) {
  // Send to error logging service (e.g., Sentry, LogRocket, etc.)
  // For now, just store locally
  const errorLog = {
    timestamp: Date.now(),
    ...error
  };

  // Store in IndexedDB for later analysis
  storeErrorLog(errorLog);
}

async function storeErrorLog(errorLog) {
  try {
    const request = indexedDB.open('hyperapp-logs', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('errors')) {
        const store = db.createObjectStore('errors', { keyPath: 'timestamp' });
        store.createIndex('type', 'type', { unique: false });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['errors'], 'readwrite');
      const store = transaction.objectStore('errors');
      store.add(errorLog);
    };
  } catch (error) {
    console.error('[SW] Failed to store error log:', error);
  }
}
