// 何を: Cache-first Service Worker
// なぜ: 仕様書 §12「オフライン対応・キャッシュ管理・Gemini APIはキャッシュ除外」

const CACHE_NAME = 'fer-cache-v1';

// キャッシュするアプリシェル（相対パス）
const SHELL = [
  '/fire-extinguisher-register/',
  '/fire-extinguisher-register/index.html',
  '/fire-extinguisher-register/manifest.json',
  '/fire-extinguisher-register/icon-192.png',
  '/fire-extinguisher-register/icon-512.png',
];

// ExcelJS の chunk は容量が大きいためキャッシュしない
const SKIP_PATTERNS = [
  'generativelanguage.googleapis.com',  // Gemini API はキャッシュ除外
  'exceljs',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    // 古いキャッシュを削除
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { url } = event.request;

  // スキップ対象はネットワークオンリー
  if (SKIP_PATTERNS.some(p => url.includes(p))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        // 成功レスポンスはキャッシュに追加
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => cached ?? new Response('Offline', { status: 503 }));
    })
  );
});

// 更新通知: 新しい SW がインストールされたらクライアントに通知
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
