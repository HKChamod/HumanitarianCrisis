import { X, Bell, CheckCheck, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

export function NotificationsDrawer({
  isOpen,
  onClose,
  notifications = [],
  onMarkAllRead,
  onMarkRead,
  onSelectReference
}) {
  if (!isOpen) return null;

  return (
    <div className="citizen-drawer-overlay" role="dialog" aria-modal="true" aria-labelledby="drawer-notif-title">
      <div className="citizen-drawer-content">
        {/* Header */}
        <div className="citizen-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} color="#0F766E" />
            <h2 id="drawer-notif-title" className="citizen-modal-title" style={{ fontSize: '1.05rem' }}>
              Notifications ({notifications.filter((n) => !n.read).length} unread)
            </h2>
          </div>
          <button
            type="button"
            className="citizen-modal-close-btn"
            onClick={onClose}
            aria-label="Close notifications drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mark All Read Bar */}
        <div style={{ padding: '0.6rem 1rem', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onMarkAllRead}
            style={{
              background: 'none',
              border: 'none',
              color: '#0F766E',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <CheckCheck size={14} /> Mark all as read
          </button>
        </div>

        {/* Notifications List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.875rem' }}>
              <Bell size={32} color="#CBD5E1" style={{ margin: '0 auto 0.5rem' }} />
              <p>No new notifications at this time.</p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`notification-item-card ${!item.read ? 'unread' : ''}`}
                onClick={() => {
                  if (!item.read && onMarkRead) {
                    onMarkRead(item.id);
                  }
                  if (item.referenceNumber && onSelectReference) {
                    onSelectReference(item.referenceNumber);
                    onClose();
                  }
                }}
                style={{ cursor: item.referenceNumber || !item.read ? 'pointer' : 'default' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <div style={{ marginTop: '2px' }}>
                    {item.type === 'urgent' ? (
                      <AlertTriangle size={16} color="#DC2626" />
                    ) : item.type === 'success' ? (
                      <CheckCircle2 size={16} color="#059669" />
                    ) : (
                      <Info size={16} color="#0F766E" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className="notif-title">{item.title}</p>
                    <p className="notif-msg">{item.message}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="notif-time">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {item.referenceNumber && (
                        <span style={{ fontSize: '0.7rem', color: '#0F766E', fontWeight: 700 }}>
                          {item.referenceNumber} &rarr;
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
