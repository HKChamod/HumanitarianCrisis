import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconBell,
  IconSearch,
  IconPhone,
  IconShieldCheck
} from './Icons';
import { mockOrganizationProfile, mockNotifications } from '../data/mockDashboardData';
import { LanguageSwitcher } from './LanguageSwitcher';

const NOTIFICATIONS_STORAGE_KEY = 'relieflink_org_notifications';

export const TopHeader = ({ onToggleMobile = () => {} }) => {
  const { t } = useTranslation();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  // Load persistent notification state from localStorage or fallback to mock data
  const [notifications, setNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.warn('Failed to parse stored notifications:', err);
    }
    return mockNotifications;
  });

  // Persist updated notification states (e.g. read status)
  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    } catch (err) {
      console.warn('Failed to persist notifications:', err);
    }
  }, [notifications]);

  // Click outside to close notifications dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleMarkAllAsRead = (e) => {
    e.stopPropagation();
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const handleNotificationClick = (id) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  return (
    <>
      {/* Emergency Hotline Header Banner (Consistent with Citizen Portal) */}
      <div className="org-hotline-banner">
        <IconPhone size={14} color="#92400E" />
        <span>
          {t('hotline.banner', {
            number: '117',
            defaultValue: 'Emergency Operations Hotline: 117 • Sri Lanka Disaster Management Command'
          })}
        </span>
        <span className="org-hotline-badge">
          {t('hotline.badge', { defaultValue: '24/7 Verified' })}
        </span>
      </div>

      {/* Main Top Header */}
      <header className="org-top-header">
        <div className="org-header-left">
          {/* Mobile hamburger button */}
          <button
            className="org-mobile-menu-btn"
            onClick={onToggleMobile}
            aria-label="Toggle navigation menu"
            type="button"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Quick Search */}
          <div className="org-header-search">
            <IconSearch size={16} color="#64748B" />
            <input
              type="text"
              placeholder={t('header.searchPlaceholder', { defaultValue: 'Search incidents, requests, rescue teams, areas...' })}
              aria-label={t('common.search', { defaultValue: 'Search' })}
            />
          </div>
        </div>

        <div className="org-header-right">
          {/* Segmented Language Selector (before notification bell) */}
          <LanguageSwitcher />

          {/* Notifications Trigger */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button
              className="org-notification-trigger"
              onClick={() => setShowNotifications(!showNotifications)}
              title={t('header.notifications', { defaultValue: 'Recent Notifications' })}
              type="button"
              aria-label={t('header.notifications', { defaultValue: 'Notifications' })}
            >
              <IconBell size={18} />
              {unreadCount > 0 && (
                <span className="org-notif-badge">{unreadCount}</span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '50px',
                  width: '320px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
                  border: '1px solid #E2E8F0',
                  padding: '16px',
                  zIndex: 50,
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>
                    {t('header.notifications', { defaultValue: 'Notifications' })}
                    {unreadCount > 0 && (
                      <span style={{ fontSize: '11px', color: '#B45309', marginLeft: '6px', fontWeight: 600 }}>
                        ({unreadCount})
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    disabled={unreadCount === 0}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '2px 4px',
                      fontSize: '11px',
                      color: unreadCount > 0 ? '#10756F' : '#94A3B8',
                      fontWeight: 600,
                      cursor: unreadCount > 0 ? 'pointer' : 'default',
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (unreadCount > 0) e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    {t('header.markAllRead', { defaultValue: 'Mark all as read' })}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '12px', color: '#64748B' }}>
                      No notifications
                    </div>
                  ) : (
                    notifications.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleNotificationClick(item.id);
                          }
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          backgroundColor: item.unread ? '#ECFBF8' : '#F8FAFC',
                          borderLeft: item.unread ? '3px solid #10756F' : '3px solid transparent',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                          outline: 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!item.unread) e.currentTarget.style.backgroundColor = '#F1F5F9';
                        }}
                        onMouseLeave={(e) => {
                          if (!item.unread) e.currentTarget.style.backgroundColor = '#F8FAFC';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ fontWeight: 600, fontSize: '12px', color: '#0F172A' }}>{item.title}</div>
                          {item.unread && (
                            <span
                              style={{
                                display: 'inline-block',
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                backgroundColor: '#10756F',
                                flexShrink: 0,
                                marginTop: '4px'
                              }}
                              title="Unread"
                            />
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{item.description}</div>
                        <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>{item.time}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Organization Coordinator Profile Widget */}
          <div className="org-profile-widget" title="Organization Coordinator Profile">
            <div className="org-user-avatar">
              {mockOrganizationProfile.currentCoordinator.avatar}
            </div>
            <div className="org-user-meta">
              <span className="org-user-name">{mockOrganizationProfile.currentCoordinator.name}</span>
              <span className="org-user-role">
                {t('header.adminBadge', { defaultValue: mockOrganizationProfile.currentCoordinator.role })}
              </span>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
