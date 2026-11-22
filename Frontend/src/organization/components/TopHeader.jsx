import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { organizationSettingsService } from '../services/organizationSettingsService';
import {
  IconBell,
  IconSearch,
  IconPhone,
  IconShieldCheck,
  IconMail,
  IconBuilding,
  IconSettings,
  IconCheckCircle
} from './Icons';
import { mockOrganizationProfile, mockNotifications } from '../data/mockDashboardData';
import { LanguageSwitcher } from './LanguageSwitcher';

const NOTIFICATIONS_STORAGE_KEY = 'relieflink_org_notifications';

export const TopHeader = ({ onToggleMobile = () => {}, onNavigateTab = () => {} }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authContext = useAuth();
  const user = authContext?.user;
  const logout = authContext?.logout;

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

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

  // Click outside to close notifications and profile dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    };
    if (showNotifications || showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications, showProfile]);

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

  // Derive profile info from settings or auth
  const settings = organizationSettingsService.getSettings();
  const adminProfile = settings.admin || {};
  const orgProfile = settings.organization || {};

  const displayName = user?.fullName || adminProfile.fullName || mockOrganizationProfile.currentCoordinator.name;
  const displayEmail = user?.email || adminProfile.email || mockOrganizationProfile.currentCoordinator.email;
  const displayRole = user?.role || adminProfile.role || mockOrganizationProfile.currentCoordinator.role;
  const displayDesignation = adminProfile.designation || mockOrganizationProfile.currentCoordinator.role;
  const displayInitials = user?.avatarInitials || adminProfile.avatarInitials || mockOrganizationProfile.currentCoordinator.avatar;
  const displayPhone = user?.phoneNumber || adminProfile.phone || '+94 77 123 4567';
  const displayOrgName = orgProfile.name || mockOrganizationProfile.name;
  const displayChapter = orgProfile.chapter || mockOrganizationProfile.chapter;
  const displayRegNumber = orgProfile.registrationNumber || mockOrganizationProfile.registrationNumber;

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
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (showProfile) setShowProfile(false);
              }}
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
          <div style={{ position: 'relative' }} ref={profileRef}>
            <button
              type="button"
              className="org-profile-widget"
              onClick={() => {
                setShowProfile(!showProfile);
                if (showNotifications) setShowNotifications(false);
              }}
              title="View profile details"
              aria-expanded={showProfile}
              aria-haspopup="true"
              style={{
                font: 'inherit',
                textAlign: 'inherit',
                outline: 'none',
              }}
            >
              <div className="org-user-avatar">
                {displayInitials}
              </div>
              <div className="org-user-meta">
                <span className="org-user-name">{displayName}</span>
                <span className="org-user-role">
                  {t('header.adminBadge', { defaultValue: displayRole })}
                </span>
              </div>
            </button>

            {/* Profile Details Dropdown Popover */}
            {showProfile && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '52px',
                  width: '320px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '14px',
                  boxShadow: '0 15px 35px -5px rgba(15, 23, 42, 0.18)',
                  border: '1px solid #E2E8F0',
                  padding: '16px',
                  zIndex: 60,
                  textAlign: 'left',
                }}
              >
                {/* Profile Identity Card */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      backgroundColor: '#10756F',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: 700,
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(16, 117, 111, 0.25)',
                    }}
                  >
                    {displayInitials}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A', lineHeight: 1.2 }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      {displayDesignation}
                    </div>
                    <div
                      style={{
                        marginTop: '5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: '#ECFBF8',
                        border: '1px solid #CCFBEF',
                        color: '#0F766E',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 600,
                      }}
                    >
                      <IconShieldCheck size={12} color="#0F766E" />
                      <span>{displayRole}</span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '12px 0' }} />

                {/* Detailed Contact & Org Metadata */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', color: '#334155' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconMail size={13} color="#64748B" />
                    </div>
                    <span style={{ fontSize: '11px', wordBreak: 'break-all' }}>{displayEmail}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', color: '#334155' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconPhone size={13} color="#64748B" />
                    </div>
                    <span style={{ fontSize: '11px' }}>{displayPhone}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', color: '#334155' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      <IconBuilding size={13} color="#64748B" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '12px', color: '#0F172A' }}>{displayOrgName}</div>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>{displayChapter}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', color: '#334155' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconCheckCircle size={13} color="#10756F" />
                    </div>
                    <span style={{ fontSize: '10.5px', color: '#475569' }}>
                      {displayRegNumber} • <strong style={{ color: '#0F766E' }}>Verified</strong>
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '12px 0' }} />

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfile(false);
                      onNavigateTab('settings');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      backgroundColor: '#F0FDFA',
                      border: '1px solid #CCFBEF',
                      color: '#0F766E',
                      borderRadius: '8px',
                      padding: '7px 12px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E6FFFA'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F0FDFA'; }}
                  >
                    <IconSettings size={13} color="#0F766E" />
                    <span>Manage Organization Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfile(false);
                      if (logout) logout();
                      navigate('/login');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #FECACA',
                      color: '#DC2626',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
