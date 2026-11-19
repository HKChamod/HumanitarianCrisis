import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTE_LABELS } from '../../config/adminNavigation';

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-[#64748B]">
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`;
        const label = ROUTE_LABELS[segment] || decodeURIComponent(segment);
        const isLast = index === segments.length - 1;
        return (
          <span key={href} className="inline-flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />}
            {isLast ? (
              <span className="font-semibold text-[#0F172A]">{label}</span>
            ) : (
              <Link to={href} className="hover:text-[#0F766E] transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
