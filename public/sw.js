// PWA Service Worker — キャッシュ戦略テンプレート
// ナビゲーション（HTML）とmanifest.json: Network-first
//   → 壊れたデプロイで404がキャッシュされても、正常デプロイ後に自己回復する
// アセット（JS/CSS/画像）: Cache-first
//   → 大容量バンドルの再ダウンロードを避け、オフライン動作を保証する
//
// 仕様書 §12「オフライン対応・キャッシュ管理・Gemini APIはキャッシュ除外」

// バージョンを上げると古いキャッシュが自動削除される
const CACHE_NAME = 'fer-cache-v2';

// プリキャッシュ対象: アセットのみ（manifest.jsonはNetwork-firstなのでここに入れない）
// 注意: cache.addAll は1件でも失敗するとインストール失敗するため Promise.allSettled で個別処理
const SHELL = [
  '/fire-extinguisher-register/',
  '/fire-extinguisher-register/index.html',
  '/fire-extinguisher-register/icon-192.png',
  '/fire-extinguisher-register/icon-512.png',
];

// これらのURLはSWを介さずブラウザ直通にする
// Gemini API: リクエストをキャッシュすると誤回答が固定される
// exceljs: dynamic importのchunkは別チャンネルでロードされるため不要
const SKIP_PATTERNS = [
  'generativelanguage.googleapis.com',
  'exceljs',
];

// --- インストール: プリキャッシュ ---
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(SHELL.map(url => cache.add(url))))
      .then(() => self.skipWaiting()) // 待機をスキップして即アクティブ化
  );
});

// --- アクティベート: 古いキャッシュを削除 ---
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim()) // 既存ページを即座に制御下に置く
  );
});

// --- フェッチ: リクエスト種別でキャッシュ戦略を分岐 ---
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = request.url;

  // SWを介さない（ブラウザのデフォルト動作に委ねる）
  if (SKIP_PATTERNS.some(p => url.includes(p))) return;

  // ── Network-first: ナビゲーション（HTMLページ）とmanifest.json ──
  // 常に最新を取得しようとし、失敗時のみキャッシュにフォールバック。
  // これにより、壊れたHTMLやmanifestがキャッシュに残り続ける問題を防ぐ。
  if (request.mode === 'navigate' || url.endsWith('manifest.json')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request)) // オフライン時はキャッシュを返す
    );
    return;
  }

  // ── Cache-first: JS/CSS/画像などの静的アセット ──
  // ハッシュ付きファイル名（Viteビルド）は内容変化時にURLも変わるため
  // キャッシュが古くなることがない。
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      });
    })
  );
});

// メッセージ受信: App.jsxの「更新」ボタンから呼ばれる
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
