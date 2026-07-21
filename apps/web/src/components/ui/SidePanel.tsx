'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function SidePanel({ open, onClose, title, description, children, footer }: SidePanelProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col bg-bg-card shadow-hover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary">{title}</h2>
            {!!description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-text-secondary hover:bg-bg-page">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {!!footer && <div className="border-t border-border px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
