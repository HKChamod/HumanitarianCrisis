import { ShieldOff } from 'lucide-react';
import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-[#DC2626] mb-4">
        <ShieldOff className="w-7 h-7" />
      </div>
      <h1 className="text-xl font-bold text-[#0F172A]">Access Denied (403)</h1>
      <p className="text-sm text-[#64748B] mt-2 max-w-md">
        Your current administrator role does not include permission to view or perform actions in this module. Contact a
        Central Administrator if you require elevated access.
      </p>
      <div className="mt-5 flex items-center gap-3">
        <Link
          to="/admin"
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59]"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
