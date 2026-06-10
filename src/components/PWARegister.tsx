'use client';

import { useEffect } from 'react';

// Registers the service worker so the app is installable (Add to Home Screen).
// updateViaCache:'none' + no-cache headers on /sw.js ensure a fresh worker is
// fetched after deploys; when a new worker takes over an existing one, reload
// once so the page is served by the new worker in a consistent state.
export function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing || !hadController) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {
      // best-effort; the app works fine without it
    });

    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);
  return null;
}
