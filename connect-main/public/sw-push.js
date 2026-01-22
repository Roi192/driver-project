// Service Worker for Push Notifications
const CACHE_NAME = 'bvt-driving-v1';

self.addEventListener('install', (event) => {
  console.log('Push Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Push Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let data = {
    title: 'התראת משמרת',
    body: 'יש לך משמרת בקרוב',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'shift-notification',
    renotify: true,
    requireInteraction: true,
    dir: 'rtl',
    lang: 'he'
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: data.vibrate,
      tag: data.tag,
      renotify: data.renotify,
      requireInteraction: data.requireInteraction,
      dir: data.dir,
      lang: data.lang,
      data: {
        url: '/'
      }
    })
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If there's already a window open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
  );
});

// Background sync for checking notifications
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-shifts') {
    event.waitUntil(checkForUpcomingShifts());
  }
});

async function checkForUpcomingShifts() {
  // This would be called periodically to check for upcoming shifts
  console.log('Checking for upcoming shifts...');
}