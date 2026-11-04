/* Cache the app files. Customer data stays in IndexedDB. */
const cacheName = 'alfred-maskin-app-v4';
const appFiles = [
    './index.html',
    './manifest.webmanifest',
    './style.css',
    './continuous-corners.css',
    './js/navigation.js',
    './js/press.js',
    './js/storage.js',
    './js/app.js',
    './js/kunder.js',
    './js/round.js',
    './js/arbeid.js',
    './js/backup.js',
    './assets/back.svg',
    './assets/calendar.svg',
    './assets/customers.svg',
    './assets/history.svg',
    './assets/rounds.svg',
    './assets/continuous-corners.svg',
    './assets/continuous-outline-medium.svg',
    './assets/fonts/NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf',
    './assets/Nettside%20for%20ALFRED%20MASKIN/favicon.webp'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(cacheName)
        .then(cache => cache.addAll(appFiles.map(file => new Request(file, { cache: "reload" }))))
        .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys
        .filter(key => key.startsWith('alfred-maskin-app-') && key !== cacheName)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim()));
});

const scope = new URL(self.registration.scope);
const home = new URL('index.html', scope).href;

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== scope.origin) {
        return;
    }

    if (request.mode === 'navigate' && (url.pathname === scope.pathname || url.pathname === new URL(home).pathname)) {
        event.respondWith(caches.open(cacheName).then(cache => cache.match(home)).then(response => response ?? fetch(request)));
    } else if (appFiles.some(file => new URL(file, scope).href === url.href)) {
        event.respondWith(caches.open(cacheName).then(cache => cache.match(request)).then(response => response ?? fetch(request)));
    }
});
