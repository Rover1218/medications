
self.addEventListener('push', function (event) {
    const data = event.data.json();

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.message,
            icon: '/icons/medication-icon.png',
            badge: '/icons/badge-icon.png',
            vibrate: [200, 100, 200]
        })
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/medications')
    );
});