const CACHE_NAME = 'mendan-app-v1';
// キャッシュする静的ファイルのリスト
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
];

// 1. インストール処理（必要なファイルをキャッシュ保存）
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. 有効化処理（古いキャッシュの削除）
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. フェッチ処理（ネットワーク通信失敗時にキャッシュを返す）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// 4. プッシュ通知の受信用イベント
self.addEventListener('push', (event) => {
  let data = { title: '面談順番のご案内', body: 'もうすぐあなたの順番です！' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: './icon.png',
    badge: './icon.png',
    vibrate: [200, 100, 200], // スマホの振動パターン
    data: {
      url: self.registration.scope
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 5. 通知がタップされたときの処理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // 既にアプリが開いていればそのタブにフォーカス、開いていなければ新規で開く
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});
