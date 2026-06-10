'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

// Flips the `dark` class on <html> and persists the choice under the given
// storage key (e.g. 'planta-theme'). The root layout's inline script should
// apply the saved theme before paint to avoid a flash.
export function ThemeToggle({ storageKey = 'app-theme' }: { storageKey?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(storageKey, next ? 'dark' : 'light');
    } catch {
      // ignore
    }
  };

  return (
    <button onClick={toggle} className="btn-ghost p-2" aria-label="Toggle theme">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
