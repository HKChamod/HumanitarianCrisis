import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export function Modal({ open, onClose, title, subtitle, children, footer, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[1px]">
      <div
        className={`w-full ${maxWidth} bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden flex flex-col max-h-[90vh]`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-base font-semibold text-[#0F172A]">{title}</h2>
            {subtitle && <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-transparent text-[#334155] hover:text-[#0F172A] hover:bg-slate-100 hover:border-slate-300"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-5 py-3.5 border-t border-[#E2E8F0] bg-slate-50 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <div className="w-full max-w-lg bg-white h-full border-l border-[#E2E8F0] shadow-xl flex flex-col">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-base font-semibold text-[#0F172A]">{title}</h2>
            {subtitle && <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-transparent text-[#334155] hover:text-[#0F172A] hover:bg-slate-100 hover:border-slate-300"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-5 py-3.5 border-t border-[#E2E8F0] bg-slate-50 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'primary',
  loading = false,
}) {
  const confirmClasses =
    variant === 'danger'
      ? 'bg-[#DC2626] hover:bg-red-700 text-white'
      : variant === 'warning'
        ? 'bg-[#F59E0B] hover:bg-amber-600 text-white'
        : 'bg-[#0F766E] hover:bg-[#115E59] text-white';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#94A3B8] bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0] disabled:bg-[#E2E8F0] disabled:text-[#64748B]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors disabled:bg-[#E2E8F0] disabled:text-[#64748B] ${confirmClasses}`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            variant === 'danger' ? 'bg-red-50 text-[#DC2626]' : 'bg-amber-50 text-[#F59E0B]'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm text-[#475569] leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
}
