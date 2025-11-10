// Service Worker for Sound Sketcher PWA
const CACHE_NAME = 'sound-sketcher-v1';
const SOUND_CACHE = 'sound-sketcher-sounds-v1';

// 事前キャッシュする音源ファイル
const SOUND_FILES = [
  '/sounds/kick.wav',
  '/sounds/snare.wav',
  '/sounds/hihat-closed.wav',
  '/sounds/hihat-open.wav',
  '/sounds/clap.wav',
  '/sounds/tom.wav',
  '/sounds/cymbal.wav',
  '/sounds/rim.wav',
];

// installイベント: 音源ファイルを事前キャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SOUND_CACHE).then((cache) => {
      return cache.addAll(SOUND_FILES);
    })
  );
  self.skipWaiting();
});

// activateイベント: 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== SOUND_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// fetchイベント: ネットワーク優先、フォールバックでキャッシュ利用
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 音源ファイルはキャッシュ優先
  if (request.url.includes('/sounds/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return cachedResponse || fetch(request);
      })
    );
    return;
  }

  // その他のリクエストはネットワーク優先
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 静的アセットをキャッシュ
        if (request.method === 'GET' && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // ネットワークエラー時はキャッシュから返す
        return caches.match(request);
      })
  );
});
