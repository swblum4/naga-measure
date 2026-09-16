// מדידות — Service Worker: עבודה אופליין אחרי פתיחה ראשונה.
// לקח 16.9.2026: cache-first עם שם קבוע הגיש גרסה ישנה לנצח. לכן:
//   1. index.html (וניווט) = רשת-קודם, מטמון רק כשאין רשת.
//   2. שם-המטמון משתנה בכל פרסום ⇐ המטמון הישן נמחק ב-activate.
const CACHE = 'miki-measure-2026-09-16e';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './jspdf.umd.min.js',
  './heebo-font.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // cache:'reload' — לעקוף גם את מטמון-ה-HTTP של הדפדפן
      Promise.all(CORE.map((u) => fetch(u, { cache: 'reload' }).then((r) => c.put(u, r))))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  const isApp = e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  if (isApp) {
    // רשת-קודם: כל פתיחה עם אינטרנט מביאה את הגרסה העדכנית; בלי אינטרנט — מהמטמון
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // שאר קבצי האפליקציה (אייקונים, manifest): מטמון-קודם
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => cached);
    })
  );
});
