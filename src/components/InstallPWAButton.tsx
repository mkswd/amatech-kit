'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// "Install app" button.
// - Chromium/Android: one click triggers the native install prompt.
// - iOS Safari (no programmatic install): reveals the Share-sheet hint.
// - Already installed / unsupported: renders nothing.
export function InstallPWAButton({ className }: { className?: string }) {
  const t = useTranslations('common');
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    if (window.matchMedia('(display-mode: standalone)').matches || nav.standalone) {
      setInstalled(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt as EventListener);
    window.addEventListener('appinstalled', onInstalled);

    const ua = nav.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios|chrome|android/i.test(ua);
    if (isIOS && isSafari) setIosHint(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt as EventListener);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || (!deferred && !iosHint)) return null;

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      try {
        await deferred.userChoice;
      } catch {
        /* dismissed */
      }
      setDeferred(null);
      return;
    }
    setShowHint((v) => !v);
  };

  return (
    <div className="relative">
      <button type="button" onClick={onClick} className={className ?? 'btn-secondary'}>
        <Download className="h-4 w-4" /> {t('installApp')}
      </button>
      {showHint && iosHint && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs text-slate-600 shadow-lg dark:bg-slate-100">
          {t('installIosHint')}
        </div>
      )}
    </div>
  );
}
