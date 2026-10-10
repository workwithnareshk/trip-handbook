"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type Tone = "success" | "error";
type ToastMsg = { id: number; text: string; tone: Tone };

const ToastContext = createContext<{ show: (text: string, tone?: Tone) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const next = useRef(1);

  const show = useCallback((text: string, tone: Tone = "success") => {
    const id = next.current++;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 6000 : 2500);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="no-print pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex max-w-md items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
              t.tone === "error" ? "bg-rose-700 text-white" : "bg-palm-800 text-white"
            }`}
          >
            {t.tone === "error" ? <AlertCircle size={18} aria-hidden /> : <CheckCircle2 size={18} aria-hidden />}
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
