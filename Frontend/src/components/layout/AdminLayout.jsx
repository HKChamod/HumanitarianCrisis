import { useState } from 'react';
import { Info } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { USE_MOCK_API } from '../../services/api/axiosClient';

export function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#F0FDFA]/50 text-[#0F172A]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        {USE_MOCK_API && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 lg:px-6 py-1.5 flex items-center gap-2 text-xs text-amber-900">
            <Info className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
            <span>
              <strong>Mock Integration Mode Active</strong> — Displaying clearly separated sample operational data. Set{' '}
              <code className="font-mono bg-amber-100/80 px-1 rounded">VITE_USE_MOCK_API=false</code> to connect live .NET 10 endpoints.
            </span>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
