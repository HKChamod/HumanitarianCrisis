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
import { mockOrganizationProfile, mockNotifications, mockRecentActivities } from '../data/mockDashboardData';
import { mockCrisisEvents } from '../data/mockCrisisEvents';
import { mockAidRequests } from '../data/mockAidRequests';
import { initialResponseTeams } from '../data/mockResponseTeams';
import { initialAssignedAreas } from '../data/mockAssignedAreas';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useOrganization } from '../../app/providers/OrganizationProvider';
import { USE_MOCK_API } from '../../services/api/apiConfig';

const NOTIFICATIONS_STORAGE_KEY = 'relieflink_org_notifications';

export const TopHeader = ({ onToggleMobile = () => { }, onNavigateTab = () => { } }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authContext = useAuth();
  const user = authContext?.user;
  const logout = authContext?.logout;
  const { activeOrganization, activeOrganizationAccess, orgRoles } = useOrganization();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const searchContainerRef = useRef(null);

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

  // Click outside to close notifications, profile, and search dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    if (showNotifications || showProfile || showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications, showProfile, showSearchResults]);

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

  // Live Search Matching Logic across Incidents, Requests, Teams, Areas
  const trimmedQuery = searchQuery.trim().toLowerCase();

  const matchingActivities = trimmedQuery
    ? mockRecentActivities.filter(act =>
      act.incidentCode?.toLowerCase().includes(trimmedQuery) ||
      act.type?.toLowerCase().includes(trimmedQuery) ||
      act.location?.toLowerCase().includes(trimmedQuery) ||
      act.assignedTeam?.toLowerCase().includes(trimmedQuery) ||
      act.status?.toLowerCase().includes(trimmedQuery) ||
      act.priority?.toLowerCase().includes(trimmedQuery)
    )
    : [];

  const matchingCrises = trimmedQuery
    ? mockCrisisEvents.filter(cr =>
      cr.crisisName?.toLowerCase().includes(trimmedQuery) ||
      cr.crisisType?.toLowerCase().includes(trimmedQuery) ||
      cr.district?.toLowerCase().includes(trimmedQuery) ||
      cr.location?.toLowerCase().includes(trimmedQuery) ||
      `cr-${cr.crisisId}`.toLowerCase().includes(trimmedQuery) ||
      String(cr.crisisId).includes(trimmedQuery)
    )
    : [];

  const matchingRequests = trimmedQuery
    ? mockAidRequests.filter(req =>
      req.requestId?.toLowerCase().includes(trimmedQuery) ||
      req.requester?.toLowerCase().includes(trimmedQuery) ||
      req.aidCategory?.toLowerCase().includes(trimmedQuery) ||
      req.location?.toLowerCase().includes(trimmedQuery) ||
      req.district?.toLowerCase().includes(trimmedQuery) ||
      req.status?.toLowerCase().includes(trimmedQuery) ||
      req.priority?.toLowerCase().includes(trimmedQuery)
    )
    : [];

  const matchingTeams = trimmedQuery
    ? initialResponseTeams.filter(team =>
      team.teamId?.toLowerCase().includes(trimmedQuery) ||
      team.teamName?.toLowerCase().includes(trimmedQuery) ||
      team.teamType?.toLowerCase().includes(trimmedQuery) ||
      team.teamLeader?.toLowerCase().includes(trimmedQuery) ||
      team.assignedArea?.toLowerCase().includes(trimmedQuery) ||
      team.district?.toLowerCase().includes(trimmedQuery)
    )
    : [];

  const matchingAreas = trimmedQuery
    ? initialAssignedAreas.filter(area =>
      area.areaId?.toLowerCase().includes(trimmedQuery) ||
      area.areaName?.toLowerCase().includes(trimmedQuery) ||
      area.district?.toLowerCase().includes(trimmedQuery) ||
      area.province?.toLowerCase().includes(trimmedQuery) ||
      area.crisisType?.toLowerCase().includes(trimmedQuery) ||
      area.riskLevel?.toLowerCase().includes(trimmedQuery)
    )
    : [];

  const totalResultsCount =
    matchingActivities.length +
    matchingCrises.length +
    matchingRequests.length +
    matchingTeams.length +
    matchingAreas.length;

  const handleSelectResult = (tab) => {
    onNavigateTab(tab);
    setShowSearchResults(false);
  };

  const handleKeyDownSearch = (e) => {
    if (e.key === 'Escape') {
      setShowSearchResults(false);
    } else if (e.key === 'Enter') {
      if (matchingActivities.length > 0 || matchingCrises.length > 0) {
        handleSelectResult('incidents');
      } else if (matchingRequests.length > 0) {
        handleSelectResult('requests');
      } else if (matchingTeams.length > 0) {
        handleSelectResult('teams');
      } else if (matchingAreas.length > 0) {
        handleSelectResult('areas');
      }
    }
  };

  // Derive profile info from authenticated user and validated active organization context
  const settings = USE_MOCK_API ? organizationSettingsService.getSettings() : {};
  const adminProfile = USE_MOCK_API ? settings.admin || {} : {};
  const orgProfile = USE_MOCK_API ? settings.organization || {} : {};

  const primaryOrgRole =
    orgRoles.length > 0
      ? orgRoles[0]
      : t('header.memberBadge', { defaultValue: 'Organization Member' });
  const allOrgRoles =
    orgRoles.length > 0
      ? orgRoles.join(', ')
      : t('header.memberBadge', { defaultValue: 'Approved Member' });

  const displayName =
    user?.fullName ||
    user?.email ||
    (USE_MOCK_API
      ? adminProfile.fullName || mockOrganizationProfile.currentCoordinator.name
      : 'Authenticated User');
  const displayEmail =
    user?.email ||
    (USE_MOCK_API
      ? adminProfile.email || mockOrganizationProfile.currentCoordinator.email
      : '—');
  const displayRole =
    orgRoles.length > 0
      ? primaryOrgRole
      : USE_MOCK_API
        ? adminProfile.role || mockOrganizationProfile.currentCoordinator.role
        : primaryOrgRole;
  const displayDesignation =
    orgRoles.length > 0
      ? allOrgRoles
      : USE_MOCK_API
        ? adminProfile.designation || mockOrganizationProfile.currentCoordinator.role
        : primaryOrgRole;
  const displayInitials =
    user?.avatarInitials ||
    (USE_MOCK_API
      ? adminProfile.avatarInitials || mockOrganizationProfile.currentCoordinator.avatar
      : 'US');
  const displayPhone =
    user?.phoneNumber ||
    (USE_MOCK_API ? adminProfile.phone || '+94 77 123 4567' : 'Not provided');
  const displayOrgName =
    activeOrganizationAccess?.organizationName ||
    activeOrganization?.organizationName ||
    (USE_MOCK_API ? orgProfile.name || mockOrganizationProfile.name : 'Organization Workspace');
  const displayChapter =
    activeOrganizationAccess?.membershipStatus
      ? `${activeOrganizationAccess.membershipStatus} Membership`
      : USE_MOCK_API
        ? orgProfile.chapter || mockOrganizationProfile.chapter
        : 'Active Organization';
  const displayRegNumber =
    activeOrganization?.registrationNumber ||
    (USE_MOCK_API
      ? orgProfile.registrationNumber || mockOrganizationProfile.registrationNumber
      : activeOrganizationAccess?.organizationId
        ? `ORG-${activeOrganizationAccess.organizationId}`
        : 'Verified');

  return (
    <>
      {/* Emergency Hotline Header Banner */}
      <div className="org-hotline-banner">
        <IconPhone size={14} color="#92400E" />

        <span>
          {t('hotline.banner', {
            number: '117',
            defaultValue:
              'Emergency Operations Hotline: 117 • Sri Lanka Disaster Management Command'
          })}
        </span>

        <span className="org-hotline-badge">
          {t('hotline.badge', {
            defaultValue: '24/7 Verified'
          })}
        </span>
      </div>

      {/* Main Top Header */}
      <header className="org-top-header">

        <div className="org-header-left">

          {/* Mobile Menu Button */}
          <button
            className="org-mobile-menu-btn"
            onClick={onToggleMobile}
            aria-label="Toggle navigation menu"
            type="button"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0F172A"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Quick Search */}
          <div
            className="org-header-search"
            ref={searchContainerRef}
            style={{ position: 'relative' }}
          >
            <IconSearch size={16} color="#64748B" />

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => {
                if (searchQuery.trim()) setShowSearchResults(true);
              }}
              onKeyDown={handleKeyDownSearch}
              placeholder={t('header.searchPlaceholder', { defaultValue: 'Search incidents, requests, rescue teams, areas...' })}
              aria-label={t('common.search', { defaultValue: 'Search' })}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchResults(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  fontSize: '18px',
                  fontWeight: 600,
                  lineHeight: 1,
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Clear search"
                aria-label="Clear search"
              >
                ×
              </button>
            )}

            {/* Live Search Results Dropdown Popover */}
            {showSearchResults && searchQuery.trim().length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  width: '460px',
                  maxWidth: '92vw',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.16)',
                  border: '1px solid #E2E8F0',
                  zIndex: 100,
                  maxHeight: '420px',
                  overflowY: 'auto',
                  textAlign: 'left'
                }}
              >
                {/* Search Header Status */}
                <div
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #F1F5F9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#F8FAFC',
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px'
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                    Search Results ({totalResultsCount})
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    Press Esc to close
                  </span>
                </div>

                {totalResultsCount === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    <div style={{ fontSize: '22px', marginBottom: '6px' }}>🔍</div>
                    <div style={{ fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>
                      No matching records found
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      Try searching by incident code (e.g. CR-COL-042), request ID (AR-1042), team, or area.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Incidents & Operations */}
                    {(matchingActivities.length > 0 || matchingCrises.length > 0) && (
                      <div>
                        <div
                          style={{
                            padding: '6px 14px',
                            backgroundColor: '#F1F5F9',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>🚨</span>
                          <span>Crisis Incidents & Operations ({matchingActivities.length + matchingCrises.length})</span>
                        </div>
                        {matchingActivities.map((act) => (
                          <div
                            key={act.id}
                            onClick={() => handleSelectResult('incidents')}
                            style={{
                              padding: '10px 14px',
                              borderBottom: '1px solid #F8FAFC',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ECFBF8'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                              <span style={{ fontWeight: 700, fontSize: '13px', color: '#0F766E' }}>
                                {act.incidentCode} • {act.type}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  fontWeight: 600,
                                  backgroundColor: act.priority === 'High' ? '#FEE2E2' : '#FEF3C7',
                                  color: act.priority === 'High' ? '#DC2626' : '#D97706'
                                }}
                              >
                                {act.priority} Priority
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>
                              📍 {act.location} • Unit: <strong style={{ color: '#334155' }}>{act.assignedTeam}</strong> • {act.status}
                            </div>
                          </div>
                        ))}
                        {matchingCrises.map((cr) => (
                          <div
                            key={cr.crisisId}
                            onClick={() => handleSelectResult('incidents')}
                            style={{
                              padding: '10px 14px',
                              borderBottom: '1px solid #F8FAFC',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ECFBF8'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                              <span style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>
                                {cr.crisisName}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  fontWeight: 600,
                                  backgroundColor: cr.severityLevel === 'Critical' ? '#FEE2E2' : '#FEF3C7',
                                  color: cr.severityLevel === 'Critical' ? '#DC2626' : '#D97706'
                                }}
                              >
                                {cr.severityLevel}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>
                              📍 {cr.district} • {cr.location} • Type: {cr.crisisType}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Aid Requests */}
                    {matchingRequests.length > 0 && (
                      <div>
                        <div
                          style={{
                            padding: '6px 14px',
                            backgroundColor: '#F1F5F9',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>📦</span>
                          <span>Aid Requests ({matchingRequests.length})</span>
                        </div>
                        {matchingRequests.map((req) => (
                          <div
                            key={req.requestId}
                            onClick={() => handleSelectResult('requests')}
                            style={{
                              padding: '10px 14px',
                              borderBottom: '1px solid #F8FAFC',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ECFBF8'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                              <span style={{ fontWeight: 700, fontSize: '13px', color: '#0F766E' }}>
                                {req.requestId} • {req.aidCategory}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  fontWeight: 600,
                                  backgroundColor: req.priority === 'Critical' ? '#FEE2E2' : '#E0F2FE',
                                  color: req.priority === 'Critical' ? '#DC2626' : '#0369A1'
                                }}
                              >
                                {req.status}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>
                              Requester: <strong style={{ color: '#334155' }}>{req.requester}</strong> • 📍 {req.location}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Response Teams */}
                    {matchingTeams.length > 0 && (
                      <div>
                        <div
                          style={{
                            padding: '6px 14px',
                            backgroundColor: '#F1F5F9',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>👥</span>
                          <span>Response Teams ({matchingTeams.length})</span>
                        </div>
                        {matchingTeams.map((team) => (
                          <div
                            key={team.teamId}
                            onClick={() => handleSelectResult('teams')}
                            style={{
                              padding: '10px 14px',
                              borderBottom: '1px solid #F8FAFC',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ECFBF8'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                              <span style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>
                                {team.teamName} ({team.teamId})
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  fontWeight: 600,
                                  backgroundColor: team.status === 'Deployed' ? '#DBEAFE' : '#DCFCE7',
                                  color: team.status === 'Deployed' ? '#1D4ED8' : '#15803D'
                                }}
                              >
                                {team.status}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>
                              Leader: <strong style={{ color: '#334155' }}>{team.teamLeader}</strong> • Sector: {team.assignedArea}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Assigned Areas */}
                    {matchingAreas.length > 0 && (
                      <div>
                        <div
                          style={{
                            padding: '6px 14px',
                            backgroundColor: '#F1F5F9',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>📍</span>
                          <span>Assigned Areas ({matchingAreas.length})</span>
                        </div>
                        {matchingAreas.map((area) => (
                          <div
                            key={area.areaId}
                            onClick={() => handleSelectResult('areas')}
                            style={{
                              padding: '10px 14px',
                              borderBottom: '1px solid #F8FAFC',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ECFBF8'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                              <span style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>
                                {area.areaName} ({area.areaId})
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  fontWeight: 600,
                                  backgroundColor: area.riskLevel === 'Critical' ? '#FEE2E2' : '#FEF3C7',
                                  color: area.riskLevel === 'Critical' ? '#DC2626' : '#D97706'
                                }}
                              >
                                {area.riskLevel} Risk
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>
                              {area.district} District • {area.crisisType} • {area.responseStatus}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Header Right */}
        <div className="org-header-right">

          {/* Language Selector */}
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
              aria-label={t('header.notifications', {
                defaultValue: 'Notifications'
              })}
            >
              <IconBell size={18} />

              {unreadCount > 0 && (
                <span className="org-notif-badge">
                  {unreadCount}
                </span>
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
                  boxShadow:
                    '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
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
                  {displayRole}
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

export default TopHeader;
