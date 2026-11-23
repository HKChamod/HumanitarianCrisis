export function ChartCard({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
          {subtitle && <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
