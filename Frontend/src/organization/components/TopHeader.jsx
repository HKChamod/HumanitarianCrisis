import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut } from 'lucide-react';
import {
  IconBell,
  IconSearch,
  IconPhone
} from './Icons';
import { mockNotifications } from '../data/mockDashboardData';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuth } from '../../app/providers/AuthProvider';
import { useOrganization } from '../../app/providers/OrganizationProvider';

export const TopHeader = ({ onToggleMobile = () => {} }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { orgRoles } = useOrganization();
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = mockNotifications.filter(n => n.unread).length;

  const displayName = user?.fullName || user?.email || 'Authenticated User';
  const displayInitials = user?.avatarInitials || 'US';
  const displayRole =
    orgRoles.length > 0
      ? orgRoles[0]
      : t('header.memberBadge', { defaultValue: 'Organization Member' });

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
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
          <div style={{ position: 'relative' }}>
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
                  </span>
                  <span style={{ fontSize: '11px', color: '#10756F', fontWeight: 600, cursor: 'pointer' }}>
                    {t('header.markAllRead', { defaultValue: 'Mark all as read' })}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {mockNotifications.map(item => (
                    <div
                      key={item.id}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        backgroundColor: item.unread ? '#ECFBF8' : '#F8FAFC',
                        borderLeft: item.unread ? '3px solid #10756F' : '3px solid transparent'
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '12px', color: '#0F172A' }}>{item.title}</div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{item.description}</div>
                      <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>{item.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Organization Member Profile Widget */}
          <div className="org-profile-widget" title={displayName}>
            <div className="org-user-avatar">
              {displayInitials}
            </div>
            <div className="org-user-meta">
              <span className="org-user-name">{displayName}</span>
              <span className="org-user-role">
                {displayRole}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title={t('header.signOut', { defaultValue: 'Sign Out' })}
            aria-label={t('header.signOut', { defaultValue: 'Sign Out' })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <LogOut size={14} />
            <span>{t('header.signOut', { defaultValue: 'Sign Out' })}</span>
          </button>
        </div>
      </header>
    </>
  );
};
