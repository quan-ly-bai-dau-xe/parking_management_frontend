import { createContext, useContext, useState, useCallback, useMemo } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ message, type = "info", duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const value = useMemo(
    () => ({
      showToast,
      success: (msg, duration) => showToast({ message: msg, type: "success", duration }),
      error: (msg, duration) => showToast({ message: msg, type: "error", duration }),
      info: (msg, duration) => showToast({ message: msg, type: "info", duration }),
      warning: (msg, duration) => showToast({ message: msg, type: "warning", duration }),
      removeToast,
    }),
    [showToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => {
          let badgeColor = "bg-slate-900/90 text-white border-slate-700";
          let icon = "ℹ️";
          if (toast.type === "error") {
            badgeColor = "bg-rose-600 text-white border-rose-700 shadow-rose-900/20";
            icon = "✕";
          } else if (toast.type === "success") {
            badgeColor = "bg-emerald-600 text-white border-emerald-700 shadow-emerald-900/20";
            icon = "✓";
          } else if (toast.type === "warning") {
            badgeColor = "bg-amber-600 text-white border-amber-700 shadow-amber-900/20";
            icon = "⚠️";
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-xs text-xs font-medium transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${badgeColor}`}
            >
              <span className="font-bold flex-shrink-0 mt-0.5">{icon}</span>
              <div className="flex-1 whitespace-pre-line leading-relaxed">{toast.message}</div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="opacity-70 hover:opacity-100 flex-shrink-0 cursor-pointer font-bold px-1"
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
      success: (msg) => console.log("[Toast Success]:", msg),
      error: (msg) => console.error("[Toast Error]:", msg),
      info: (msg) => console.log("[Toast Info]:", msg),
      warning: (msg) => console.warn("[Toast Warning]:", msg),
      removeToast: () => {},
    };
  }
  return context;
}
