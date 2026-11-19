import { ArrowLeft, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from './PageHeader';

export function ModulePlaceholderPage({ code, title, description, phase }) {
  return (
    <div>
      <PageHeader
        title={title}
        subtitle={description}
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDFA] text-[#0F766E] border border-teal-200">
            {code} • {phase}
          </span>
        }
        actions={
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-slate-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
        }
      />

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#F0FDFA] border border-teal-200 text-[#0F766E] flex items-center justify-center mx-auto mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h2 className="text-base font-semibold text-[#0F172A]">Module Route Ready — Scheduled for {phase}</h2>
        <p className="text-xs text-[#64748B] mt-1.5 max-w-lg mx-auto leading-relaxed">
          Navigation, RBAC route guards, shared layout, and the API service adapter for <strong>{title}</strong> are
          wired and ready. Ready to implement full interactive tables, forms, and workflows in the next increment.
        </p>
      </div>
    </div>
  );
}
