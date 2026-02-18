"use client";

import { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  dismissable?: boolean;
};

export function Modal({
  open,
  title,
  children,
  onClose,
  dismissable = true,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (dismissable) onClose?.();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 text-[var(--ink)] shadow-[var(--shadow)]"
      >
        {title && <h2 className="text-lg font-semibold">{title}</h2>}
        <div className="mt-4">{children}</div>
        {dismissable && onClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
