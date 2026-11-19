import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { notificationService } from '../../../services/api/adminServices';
import { PageHeader } from '../../../components/common/PageHeader';
import { FilterPanel } from '../../../components/forms/FormControls';
import { EmptyState, LoadingState } from '../../../components/common/States';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [readFilter, setReadFilter] = useState('');

  useEffect(() => {
    notificationService.list().then((data) => {
      setNotifications(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (categoryFilter && n.category !== categoryFilter) return false;
      if (readFilter === 'unread' && n.isRead) return false;
      if (readFilter === 'read' && !n.isRead) return false;
      return true;
    });
  }, [notifications, categoryFilter, readFilter]);

  const handleMarkRead = async (id) => {
    setNotifications(await notificationService.markAsRead(id));
  };

  const handleMarkAll = async () => {
    setNotifications(await notificationService.markAllAsRead());
  };

  return (
    <div>
      <PageHeader
        title="Notifications Center"
        subtitle="Operational alerts, escalations, and review reminders across the national portal."
        actions={
          <button
            type="button"
            onClick={handleMarkAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F0FDFA] text-[#0F766E] border border-teal-200 hover:bg-teal-100/70"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark All as Read
          </button>
        }
      />

      <FilterPanel
        hasActiveFilters={Boolean(categoryFilter || readFilter)}
        onReset={() => {
          setCategoryFilter('');
          setReadFilter('');
        }}
      >
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
        >
          <option value="">All Categories</option>
          {['Crisis', 'Request', 'Organization', 'Resource', 'AI', 'System'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={readFilter}
          onChange={(e) => setReadFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
        >
          <option value="">All Status</option>
          <option value="unread">Unread Only</option>
          <option value="read">Read Only</option>
        </select>
      </FilterPanel>

      {loading ? (
        <LoadingState message="Loading notifications..." />
      ) : filtered.length === 0 ? (
        <EmptyState title="No notifications" description="You are all caught up on operational alerts." />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`bg-white border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                n.isRead ? 'border-[#E2E8F0]' : 'border-teal-300 bg-[#F0FDFA]/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] border border-teal-200 text-[#0F766E] flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#0F172A]">{n.title}</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-medium text-[#475569]">
                      {n.category}
                    </span>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#0F766E]" />}
                  </div>
                  <p className="text-xs text-[#475569] mt-0.5">{n.message}</p>
                  <div className="text-[11px] text-[#94A3B8] mt-1">
                    {new Date(n.createdAt).toLocaleString('en-LK')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {n.actionUrl && (
                  <Link
                    to={n.actionUrl}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-slate-50"
                  >
                    Open Module
                  </Link>
                )}
                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(n.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0F766E] bg-[#F0FDFA] border border-teal-200 hover:bg-teal-100"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
