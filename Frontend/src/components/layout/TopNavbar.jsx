import { useEffect, useRef, useState } from 'react';
import { Bell, Building2, CheckCheck, ChevronDown, Globe, LayoutGrid, LogOut, Menu, Search, ShieldCheck, User, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from './Breadcrumbs';
import { useAuth } from '../../app/providers/AuthProvider';
import { notificationService } from '../../services/api/adminServices';

export function TopNavbar({ onOpenMobileSidebar }) {
  const navigate = useNavigate();
  const { user, logout, loginAsDemoRole, isMockAuth } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef(null);
  const portalRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    notificationService.list().then(setNotifications).catch(() => {});
  }, []);

  useEffect(() => {
    const handleOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (portalRef.current && !portalRef.current.contains(e.target)) setPortalOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleGlobalSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    if (q.includes('crisis') || q.includes('flood') || q.includes('landslide')) {
      navigate(`/admin/crises?q=${encodeURIComponent(searchQuery.trim())}`);
    } else if (q.includes('org')) {
      navigate('/admin/organizations');
    } else if (q.includes('shelter')) {
      navigate('/admin/shelters');
    } else if (q.includes('user')) {
      navigate('/admin/users');
    } else if (q.includes('ai')) {
      navigate('/admin/ai/recommendations');
    } else {
      navigate(`/admin/requests?q=${encodeURIComponent(searchQuery.trim())}`);
    }
    setSearchQuery('');
  };

  const handleMarkAllRead = async () => {
    const updated = await notificationService.markAllAsRead();
    setNotifications(updated);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] px-4 lg:px-6 flex items-center justify-between gap-3 sticky top-0 z-30">
      {/* Left: Mobile menu + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-[#475569] hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Breadcrumbs />
      </div>

      {/* Right: Search + Notifications + Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <form onSubmit={handleGlobalSearch} className="hidden md:block relative w-64">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search crises, requests, orgs..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-[#E2E8F0] rounded-lg text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#0F766E]"
          />
        </form>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            className="relative p-2 rounded-lg text-[#475569] hover:bg-slate-100 hover:text-[#0F172A] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden z-40">
              <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[#0F172A]">Notifications</h4>
                  <p className="text-[11px] text-[#64748B]">{unreadCount} unread operational alerts</p>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0F766E] hover:underline"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[#E2E8F0]">
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    to={n.actionUrl || '/admin/notifications'}
                    onClick={() => {
                      notificationService.markAsRead(n.id).then(setNotifications);
                      setNotifOpen(false);
                    }}
                    className={`block px-4 py-3 hover:bg-[#F0FDFA]/60 transition-colors ${!n.isRead ? 'bg-[#F0FDFA]/40' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#0F172A]">{n.title}</span>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#0F766E] shrink-0" />}
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-0.5 line-clamp-2">{n.message}</p>
                  </Link>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-[#E2E8F0] bg-slate-50 text-center">
                <Link
                  to="/admin/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="text-xs font-medium text-[#0F766E] hover:underline"
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Portal Switcher */}
        <div className="relative" ref={portalRef}>
          <button
            type="button"
            onClick={() => setPortalOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#0F172A] hover:bg-slate-50 transition-colors"
            title="Switch Portal"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#0F766E]" />
            <span className="hidden sm:inline">Portals</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
          </button>

          {portalOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden z-40 p-1.5">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                Switch HCMS Portal
              </div>
              <Link
                to="/"
                onClick={() => setPortalOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#0F172A] hover:bg-slate-50 rounded-lg"
              >
                <Globe className="w-3.5 h-3.5 text-[#0F766E]" />
                <div>
                  <div className="font-medium">Public Portal</div>
                  <div className="text-[10px] text-[#64748B]">Crises, Map &amp; Guest Help</div>
                </div>
              </Link>
              <Link
                to="/citizen"
                onClick={() => setPortalOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#0F172A] hover:bg-slate-50 rounded-lg"
              >
                <Users className="w-3.5 h-3.5 text-[#0F766E]" />
                <div>
                  <div className="font-medium">Citizen Portal</div>
                  <div className="text-[10px] text-[#64748B]">My Requests &amp; Shelters</div>
                </div>
              </Link>
              <Link
                to="/organization"
                onClick={() => setPortalOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#0F172A] hover:bg-slate-50 rounded-lg"
              >
                <Building2 className="w-3.5 h-3.5 text-[#0F766E]" />
                <div>
                  <div className="font-medium">Organization Portal</div>
                  <div className="text-[10px] text-[#64748B]">Teams, Areas &amp; Logistics</div>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex items-center gap-2.5 pl-2 pr-2.5 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-[#0F766E] text-white text-xs font-bold flex items-center justify-center">
              {user?.avatarInitials || 'AD'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-[#0F172A] leading-tight">{user?.fullName || 'Administrator'}</div>
              <div className="text-[10px] font-medium text-[#0F766E] leading-tight">{user?.role || 'Central Admin'}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden z-40">
              <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F0FDFA]/50">
                <div className="text-xs font-semibold text-[#0F172A]">{user?.fullName}</div>
                <div className="text-[11px] text-[#64748B] truncate">{user?.email}</div>
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-teal-200 text-[#0F766E]">
                  <ShieldCheck className="w-3 h-3" />
                  {user?.role}
                </div>
              </div>

              {isMockAuth && (
                <div className="px-4 py-2.5 border-b border-[#E2E8F0]">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">
                    Demo RBAC Role Preview
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        loginAsDemoRole('central_admin');
                        setProfileOpen(false);
                      }}
                      className={`flex-1 px-2 py-1 text-[11px] font-medium rounded-md border ${
                        user?.role === 'Central Administrator'
                          ? 'bg-[#0F766E] text-white border-[#0F766E]'
                          : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-slate-50'
                      }`}
                    >
                      Central Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        loginAsDemoRole('crisis_coordinator');
                        setProfileOpen(false);
                      }}
                      className={`flex-1 px-2 py-1 text-[11px] font-medium rounded-md border ${
                        user?.role === 'Crisis Coordinator'
                          ? 'bg-[#0F766E] text-white border-[#0F766E]'
                          : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-slate-50'
                      }`}
                    >
                      Coordinator
                    </button>
                  </div>
                </div>
              )}

              <div className="p-1.5">
                <Link
                  to="/admin/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-[#0F172A] hover:bg-slate-50 rounded-lg"
                >
                  <User className="w-3.5 h-3.5 text-[#64748B]" />
                  Profile & Settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#DC2626] hover:bg-red-50 rounded-lg"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
