'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AlertCircle, X } from 'lucide-react';
import Button from './Button';
import Card from './Card';

export function ErrorNotice({ children, onRetry, retryLabel }: { children: ReactNode; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-mdx border border-danger-500/30 bg-danger-500/10 p-4 text-sm text-danger-500">
      <AlertCircle size={18} className="shrink-0" />
      <span className="min-w-0 flex-1 text-text-200">{children}</span>
      {onRetry && retryLabel ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 p-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-primary-500/15 text-primary-400">
        {icon}
      </span>
      <h2 className="text-lg font-bold text-text-100">{title}</h2>
      <p className="max-w-md text-sm text-text-500">{description}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </Card>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  closeLabel,
  pending,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, pending]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg-950/80 p-4 backdrop-blur-sm" onMouseDown={() => !pending && onClose()}>
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-lg p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="confirm-dialog-title" className="text-xl font-bold text-text-100">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-500">{description}</p>
          </div>
          <button type="button" className="btn-ghost p-2" aria-label={closeLabel} disabled={pending} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={pending}>{cancelLabel}</Button>
          <Button variant="danger" onClick={onConfirm} loading={pending}>{confirmLabel}</Button>
        </div>
      </Card>
    </div>
  );
}
