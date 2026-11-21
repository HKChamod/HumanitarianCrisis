import { AlertCircle, ChevronLeft, ChevronRight, Inbox, Loader2, RefreshCw } from 'lucide-react';

export function LoadingState({ message = 'Loading operational data...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white border border-[#E2E8F0] rounded-xl">
      <Loader2 className="w-7 h-7 text-[#0F766E] animate-spin mb-3" />
      <p className="text-sm font-medium text-[#0F172A]">{message}</p>
      <p className="text-xs text-[#64748B] mt-1">Please wait while records are retrieved.</p>
    </div>
  );
}

export function EmptyState({ title = 'No records found', description = 'Adjust your search or filters to see matching records.', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white border border-[#E2E8F0] rounded-xl">
      <div className="w-11 h-11 rounded-full bg-[#F0FDFA] border border-teal-100 flex items-center justify-center text-[#0F766E] mb-3">
        <Inbox className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
      <p className="text-xs text-[#64748B] mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Unable to load data', message = 'An unexpected error occurred while contacting the service.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-red-50/60 border border-red-200 rounded-xl">
      <AlertCircle className="w-7 h-7 text-[#DC2626] mb-2.5" />
      <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
      <p className="text-xs text-[#64748B] mt-1 max-w-md">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}

export function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }) {
  if (totalItems === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-[#E2E8F0] bg-white text-xs text-[#64748B]">
      <div>
        Showing <span className="font-semibold text-[#0F172A]">{start}</span> to{' '}
        <span className="font-semibold text-[#0F172A]">{end}</span> of{' '}
        <span className="font-semibold text-[#0F172A]">{totalItems}</span> records
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Prev
        </button>
        <span className="px-2.5 py-1 text-xs font-medium text-[#0F172A]">
          Page {page} of {Math.max(1, totalPages)}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
