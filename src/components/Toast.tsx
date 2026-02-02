import React, { createContext, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error";

type ToastItem = {
  id: string;
  kind: ToastKind;
  msg: string;
};

type ToastApi = {
  success: (msg: string) => void;
  error: (msg: string) => void;
};

const Ctx = createContext<ToastApi | null>(null);

function makeId() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(2, 6);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = (kind: ToastKind, msg: string) => {
    const id = makeId();
    setItems((prev) => [...prev, { id, kind, msg }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  };

  const api = useMemo<ToastApi>(
    () => ({
      success: (msg) => push("success", msg),
      error: (msg) => push("error", msg),
    }),
    []
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toastWrap" aria-live="polite" aria-atomic="true">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used inside ToastProvider");
  return v;
}
