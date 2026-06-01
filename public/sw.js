// 何を: Cache-first Service Worker
// なぜ: 仕様書 §12「オフライン対応・キャッシュ管理・Gemini APIはキャッシュ除外」

const CACHE_NAME = 'fer-cache-v1';

const SHELL = [
  '/fire-extinguisher-register/',
  '/fire-extinguisher-register/index.html',
  '/fire-extinguisher-register/manifest.json',
  '/fire-extinguisher-register/icon-192.png',
  '/fire-extinguisher-register/icon-512.png',
];

// ExcelJS chunk と Gemini API はキャッシュしない
const SKIP_PATTERNS = [
  'generativelanguage.googleapis.com',
  'exceljs',
];

self.addEventListener('install', event => {
  // cache.addAll は1件でも失敗するとインストール全体が失敗するため
  // 個別に add して失敗を無視する（必須シェルのみキャッシュ）
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(SHELL.map(url => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { url } = event.request;

  // スキップ対象はネットワークオンリー
  if (SKIP_PATTERNS.some(p => url.includes(p))) {
    return; // デフォルトのネットワークフェッチに委ねる
  }

  // Cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return res;
      });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
