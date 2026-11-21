import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PageHeader({ title, subtitle, badge, actions }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-sm text-[#64748B] mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  comparison,
  tone = 'primary',
  to,
}) {
  const toneMap = {
    primary: 'bg-[#F0FDFA] text-[#0F766E] border-teal-100',
    warning: 'bg-amber-50 text-[#F59E0B] border-amber-100',
    critical: 'bg-red-50 text-[#DC2626] border-red-100',
    success: 'bg-emerald-50 text-[#16A34A] border-emerald-100',
    neutral: 'bg-slate-100 text-[#475569] border-slate-200',
  };

  const content = (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 hover:border-[#0F766E]/50 transition-colors h-full flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${toneMap[tone] || toneMap.primary}`}>
          {Icon && <Icon className="w-4.5 h-4.5" />}
        </div>
        {to && <ArrowUpRight className="w-4 h-4 text-[#64748B] group-hover:text-[#0F766E] transition-colors" />}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-[#0F172A] tabular-nums">{value}</div>
        <div className="text-xs font-medium text-[#64748B] mt-0.5">{label}</div>
        {comparison && <div className="text-[11px] text-[#64748B] mt-1.5">{comparison}</div>}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="group block h-full">
        {content}
      </Link>
    );
  }
  return content;
}
