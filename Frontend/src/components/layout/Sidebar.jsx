import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, PanelLeftClose, PanelLeftOpen, Shield, X } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ADMIN_NAV_GROUPS } from '../../config/adminNavigation';
import { useAuth } from '../../app/providers/AuthProvider';

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { pathname } = useLocation();
  const { hasPermission, hasRole } = useAuth();

  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    ADMIN_NAV_GROUPS.forEach((g) => {
      const hasActiveChild = g.items.some((i) => pathname === i.path || (i.path !== '/admin' && pathname.startsWith(i.path)));
      initial[g.id] = Boolean(g.defaultOpen || hasActiveChild);
    });
    return initial;
  });

  const toggleGroup = (id) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const visibleGroups = ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => hasPermission(item.permission) && hasRole(item.requiredRole)
    ),
  })).filter((group) => group.items.length > 0);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#E2E8F0]">
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-[#E2E8F0] flex items-center justify-between gap-2 shrink-0">
        <Link to="/admin" className="flex items-center gap-2.5 min-w-0" onClick={onCloseMobile}>
          <img
            src="/athwala-emblem.png"
            alt="Athwala"
            className="w-9 h-9 object-contain shrink-0"
          />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#0F172A] truncate leading-tight">HCMS Admin</div>
              <div className="text-[11px] text-[#64748B] truncate">Central Authority Portal</div>
            </div>
          )}
        </Link>

        {/* Desktop collapse button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:inline-flex p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100"
          aria-label="Close navigation menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
        {visibleGroups.map((group) => {
          const GroupIcon = group.icon;
          const isOpen = openGroups[group.id];
          const groupHasActive = group.items.some(
            (i) => pathname === i.path || (i.path !== '/admin' && pathname.startsWith(i.path))
          );

          if (collapsed) {
            const primaryTarget = group.items[0]?.path || '/admin';
            return (
              <Link
                key={group.id}
                to={primaryTarget}
                title={group.label}
                className={`flex items-center justify-center h-10 rounded-lg transition-colors ${
                  groupHasActive
                    ? 'bg-[#F0FDFA] text-[#0F766E] border border-teal-200'
                    : 'text-[#64748B] hover:bg-slate-100 hover:text-[#0F172A]'
                }`}
              >
                <GroupIcon className="w-4.5 h-4.5" />
              </Link>
            );
          }

          return (
            <div key={group.id} className="pb-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  groupHasActive ? 'text-[#0F766E] bg-[#F0FDFA]/70' : 'text-[#475569] hover:bg-slate-50 hover:text-[#0F172A]'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <GroupIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{group.label}</span>
                </span>
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
                )}
              </button>

              {isOpen && (
                <div className="mt-0.5 ml-4 pl-3 border-l border-[#E2E8F0] space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/admin' || item.path === '/admin/crises' || item.path === '/admin/requests' || item.path === '/admin/organizations' || item.path === '/admin/shelters' || item.path === '/admin/volunteers' || item.path === '/admin/donations' || item.path === '/admin/ai' || item.path === '/admin/reports'}
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        `block px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-[#0F766E] text-white'
                            : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F0FDFA]'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Link to Public Portal */}
      <div className="p-3 border-t border-[#E2E8F0] shrink-0">
        <Link
          to="/"
          className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#0F766E] bg-[#F0FDFA] hover:bg-teal-100/70 border border-teal-200 transition-colors`}
          title="Open Public Portal"
        >
          {!collapsed && <span>Public Relief Portal</span>}
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 ${
          collapsed ? 'w-[72px]' : 'w-[264px]'
        } h-screen sticky top-0`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/45" onClick={onCloseMobile} />
          <div className="relative w-[272px] max-w-[85vw] h-full z-10">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
