const STATUS_STYLES = {
  Active: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
  Open: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
  Approved: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
  Accepted: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
  Verified: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
  Completed: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
  Delivered: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
  Distributed: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
  Available: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
  Good: 'bg-emerald-50 text-[#16A34A] border-emerald-200',

  Pending: 'bg-amber-50 text-amber-800 border-amber-200',
  'Pending Review': 'bg-amber-50 text-amber-800 border-amber-200',
  'Under Review': 'bg-amber-50 text-amber-800 border-amber-200',
  'Further Review': 'bg-amber-50 text-amber-800 border-amber-200',
  'Near Capacity': 'bg-amber-50 text-amber-800 border-amber-200',
  Monitoring: 'bg-amber-50 text-amber-800 border-amber-200',
  'Expiring Soon': 'bg-amber-50 text-amber-800 border-amber-200',
  Fair: 'bg-amber-50 text-amber-800 border-amber-200',
  Pledged: 'bg-amber-50 text-amber-800 border-amber-200',

  Assigned: 'bg-teal-50 text-[#0F766E] border-teal-200',
  Dispatched: 'bg-teal-50 text-[#0F766E] border-teal-200',
  'In Transit': 'bg-teal-50 text-[#0F766E] border-teal-200',
  'In Progress': 'bg-teal-50 text-[#0F766E] border-teal-200',
  Modified: 'bg-teal-50 text-[#0F766E] border-teal-200',
  Received: 'bg-teal-50 text-[#0F766E] border-teal-200',

  Rejected: 'bg-red-50 text-[#DC2626] border-red-200',
  Suspended: 'bg-red-50 text-[#DC2626] border-red-200',
  Full: 'bg-red-50 text-[#DC2626] border-red-200',
  Cancelled: 'bg-red-50 text-[#DC2626] border-red-200',
  Inactive: 'bg-slate-100 text-[#64748B] border-slate-200',
  Resolved: 'bg-slate-100 text-[#475569] border-slate-200',
  Closed: 'bg-slate-100 text-[#64748B] border-slate-200',
  Draft: 'bg-slate-100 text-[#64748B] border-slate-200',
};

const SEVERITY_STYLES = {
  Critical: 'bg-red-50 text-[#DC2626] border-red-200',
  High: 'bg-amber-50 text-amber-800 border-amber-200',
  Medium: 'bg-sky-50 text-sky-800 border-sky-200',
  Low: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
};

const SEVERITY_DOTS = {
  Critical: 'bg-[#DC2626]',
  High: 'bg-[#F59E0B]',
  Medium: 'bg-sky-500',
  Low: 'bg-[#16A34A]',
};

export function StatusBadge({ status, className = '' }) {
  const style = STATUS_STYLES[status] || 'bg-slate-100 text-[#475569] border-slate-200';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${style} ${className}`}
    >
      {status}
    </span>
  );
}

export function SeverityBadge({ severity, className = '' }) {
  const style = SEVERITY_STYLES[severity] || 'bg-slate-100 text-[#475569] border-slate-200';
  const dot = SEVERITY_DOTS[severity] || 'bg-slate-400';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${style} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {severity}
    </span>
  );
}
