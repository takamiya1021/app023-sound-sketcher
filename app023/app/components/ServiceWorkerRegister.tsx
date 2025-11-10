'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    // 開発環境ではService Workerを登録しない（HMRキャッシュ問題回避）
    if (process.env.NODE_ENV !== 'production') {
      console.log('[SW] Development mode: Service Worker registration skipped');
      return;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}
