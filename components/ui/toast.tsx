"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

interface Toast {
  id: string;
  type?: "success" | "error" | "info";
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const isSuccess = t.type === "success";
            const isError = t.type === "error";

            const bgClass = isSuccess ? "bg-emerald text-white" : isError ? "bg-rose text-white" : "bg-marigold text-ink";

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 border-2 border-ink rounded-[12px] shadow-hard ${bgClass}`}
              >
                <div className="flex items-center gap-2.5 font-medium text-sm">
                  {isSuccess && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                  {isError && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                  {!isSuccess && !isError && <Info className="w-5 h-5 flex-shrink-0" />}
                  <span>{t.message}</span>
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  className="p-1 hover:opacity-75 transition-opacity"
                  aria-label="Dismiss toast"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
