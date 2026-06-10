'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

type ToastKind = 'success' | 'error';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastCtx {
  show: (message: string, kind?: ToastKind) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) return { show: () => {} };
  return ctx;
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      const id = nextId++;
      setToasts((t) => [...t, { id, kind, message }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-soft animate-fade-up dark:bg-slate-100"
          >
            {t.kind === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[color:var(--kit-accent,#16a34a)]" />
            ) : (
              <XCircle className="h-5 w-5 shrink-0 text-red-500" />
            )}
            <span className="text-slate-800">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="ml-2 text-slate-400 transition hover:text-slate-700"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
