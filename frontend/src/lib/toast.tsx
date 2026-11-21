import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type ToastKind = 'success' | 'error' | 'info';
interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
}

const Ctx = createContext<(message: string, kind?: ToastKind) => void>(() => {});

const ICONS: Record<ToastKind, string> = {
  success: 'fa-check bg-brand-500',
  error: 'fa-triangle-exclamation bg-rose-500',
  info: 'fa-circle-info bg-sky-500',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message, kind });
    timer.current = window.setTimeout(() => setToast(null), kind === 'error' ? 6000 : 3500);
  }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" className="fixed bottom-6 right-6 left-6 sm:left-auto z-[70] flex justify-end pointer-events-none">
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto max-w-sm bg-slate-900 text-white px-5 py-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3"
            role={toast.kind === 'error' ? 'alert' : 'status'}
          >
            <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-sm shrink-0 ${ICONS[toast.kind].split(' ')[1]}`}>
              <i className={`fa-solid ${ICONS[toast.kind].split(' ')[0]}`} />
            </div>
            <p className="text-xs sm:text-sm text-slate-200 font-medium whitespace-pre-line">{toast.message}</p>
            <button onClick={() => setToast(null)} className="ml-1 text-slate-400 hover:text-white" aria-label="Dismiss">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
