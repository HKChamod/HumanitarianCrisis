import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Bell, PhoneCall, User, PlusCircle, Search, LogOut } from 'lucide-react';

export function CitizenHeader({
  activeTab,
  setActiveTab,
  unreadCount,
  onOpenNotifications,
  onOpenSubmitModal,
  onOpenTrackModal,
  onOpenProfileModal,
  citizenUser,
  onLogout
}) {
  return (
    <>
      {/* 24/7 Emergency Hotline Bar */}
      <div className="citizen-helpline-bar" role="banner">
        <span>Emergency Helpline: <strong>117</strong> &bull; Disaster Management Centre &bull; Available 24/7</span>
        <a href="tel:117" aria-label="Call emergency helpline 117">
          <PhoneCall size={13} /> Call 117 Now
        </a>
      </div>

      {/* Main Citizen Header */}
      <header className="citizen-navbar">
        <div className="citizen-navbar-container">
          {/* Brand */}
          <Link to="/citizen" className="citizen-brand" onClick={() => setActiveTab('dashboard')}>
            <div className="citizen-brand-badge">
              <Shield size={20} strokeWidth={2.4} />
            </div>
            <div>
              <span style={{ color: '#0F766E' }}>Relief</span>Link
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B', display: 'block', lineHeight: 1 }}>
                Citizen Portal
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="citizen-nav-links" aria-label="Citizen Navigation">
            <button
              type="button"
              className={`citizen-nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className={`citizen-nav-link ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              My Requests
            </button>
            <button
              type="button"
              className="citizen-nav-link"
              onClick={onOpenSubmitModal}
            >
              <PlusCircle size={15} color="#0F766E" />
              Request Help
            </button>
            <button
              type="button"
              className="citizen-nav-link"
              onClick={onOpenTrackModal}
            >
              <Search size={15} />
              Track Request
            </button>
          </nav>

          {/* Right Actions */}
          <div className="citizen-header-actions">
            {/* Notifications Trigger */}
            <button
              type="button"
              className="citizen-icon-btn"
              onClick={onOpenNotifications}
              title="Notifications"
              aria-label="View Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="citizen-badge-counter">{unreadCount}</span>
              )}
            </button>

            {/* Citizen Profile Chip */}
            <button
              type="button"
              className="citizen-user-chip"
              onClick={onOpenProfileModal}
              title="Citizen Profile"
            >
              <div className="citizen-avatar">
                {citizenUser?.fullName ? citizenUser.fullName.charAt(0) : 'K'}
              </div>
              <span className="hidden sm:inline">
                {citizenUser?.fullName || 'Kavinda Perera'}
              </span>
            </button>

            {/* Role-Based Logout / Sign Out */}
            {onLogout && (
              <button
                type="button"
                className="citizen-nav-link"
                onClick={onLogout}
                style={{ color: '#DC2626', padding: '0.35rem 0.65rem' }}
                title="Sign Out of Citizen Portal"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
