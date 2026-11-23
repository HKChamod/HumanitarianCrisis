import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { citizenApi } from '../../services/api/citizenApi';
import { USE_MOCK_API } from '../../services/api/apiConfig';
import { CitizenHeader } from './components/CitizenHeader';
import { CitizenHero } from './components/CitizenHero';
import { CitizenStats } from './components/CitizenStats';
import { CategoryQuickLauncher } from './components/CategoryQuickLauncher';
import { ActiveRequestsTracker } from './components/ActiveRequestsTracker';
import { SubmitRequestModal } from './components/SubmitRequestModal';
import { TrackRequestModal } from './components/TrackRequestModal';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { VerifiedAlertsWidget } from './components/VerifiedAlertsWidget';
import { NearbySheltersWidget } from './components/NearbySheltersWidget';
import { CitizenProfileModal } from './components/CitizenProfileModal';
import { ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import '../../styles/citizen.css';

export function CitizenDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const loadSeqRef = useRef(0);

  // Modals state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Food');
  const [selectedRequestForTracking, setSelectedRequestForTracking] = useState(null);

  // Citizen Profile (live mode uses authenticated user; mock mode allows local demo profile)
  const [citizenUser, setCitizenUser] = useState(() => {
    if (!USE_MOCK_API && user) {
      return {
        fullName: user.fullName || user.email || 'Authenticated Citizen',
        email: user.email || '',
        phone: user.phoneNumber || '',
        district: 'Sri Lanka',
        address: '',
        emergencyContact: '',
      };
    }
    try {
      const stored = localStorage.getItem('hcms_citizen_user');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore storage errors
    }
    return {
      fullName: USE_MOCK_API ? 'Kavinda Perera' : 'Authenticated Citizen',
      email: USE_MOCK_API ? 'kavinda.perera@example.com' : '',
      phone: USE_MOCK_API ? '+94 77 123 4567' : '',
      district: USE_MOCK_API ? 'Kalutara' : 'Sri Lanka',
      address: USE_MOCK_API ? 'No. 42, Temple Road, Nagoda, Kalutara' : '',
      emergencyContact: USE_MOCK_API ? '+94 71 987 6543 (Brother)' : '',
    };
  });

  // Load citizen data with stale-response protection and explicit error state
  const loadCitizenData = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setLoadError('');
    try {
      const [reqRes, notifRes] = await Promise.all([
        citizenApi.getMyRequests(),
        citizenApi.getNotifications(),
      ]);
      if (loadSeqRef.current !== seq) return;
      setRequests(reqRes.data || []);
      setNotifications(notifRes.data || []);
    } catch (err) {
      if (loadSeqRef.current !== seq) return;
      setRequests([]);
      setLoadError(err?.detail || err?.message || 'Unable to load your assistance requests from the server.');
    } finally {
      if (loadSeqRef.current === seq) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadCitizenData();
    return () => {
      loadSeqRef.current += 1;
    };
  }, [loadCitizenData]);

  // Quick category click from "What do you need?"
  const handleSelectCategory = (catKey) => {
    setSelectedCategory(catKey);
    setIsSubmitModalOpen(true);
  };

  // Submit new request
  const handleSubmitSuccess = async (payload) => {
    setActionError('');
    await citizenApi.submitRequest(payload);
    await loadCitizenData();
  };

  // Advance lifecycle status for mock testing only
  const handleAdvanceStatus = async (requestId) => {
    if (!USE_MOCK_API) return;
    const res = await citizenApi.advanceRequestStatus(requestId);
    if (res?.data && selectedRequestForTracking?.id === requestId) {
      setSelectedRequestForTracking(res.data);
    }
    await loadCitizenData();
  };

  // Reset / clear all mock test data
  const handleClearAllData = async () => {
    if (!USE_MOCK_API) return;
    if (window.confirm('Clear all submitted requests to test clean again?')) {
      citizenApi.clearAllCitizenData();
      await loadCitizenData();
    }
  };

  // Cancel / delete Pending request
  const handleCancelRequest = async (requestId) => {
    if (window.confirm('Are you sure you want to cancel this assistance request?')) {
      setActionError('');
      try {
        await citizenApi.cancelRequest(requestId);
        await loadCitizenData();
      } catch (err) {
        setActionError(err?.detail || err?.message || 'Unable to cancel assistance request.');
      }
    }
  };

  // Select request to view detail/track
  const handleSelectRequest = (req) => {
    setSelectedRequestForTracking(req);
    setIsTrackModalOpen(true);
  };

  // Open track modal by ref string (e.g. from notification)
  const handleTrackByReference = async (refNum) => {
    try {
      const res = await citizenApi.trackRequest(refNum);
      setSelectedRequestForTracking(res.data);
      setIsTrackModalOpen(true);
    } catch {
      setIsTrackModalOpen(true);
    }
  };

  // Mark notifications read
  const handleMarkAllRead = async () => {
    await citizenApi.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Update profile
  const handleSaveProfile = (updatedProfile) => {
    setCitizenUser(updatedProfile);
    localStorage.setItem('hcms_citizen_user', JSON.stringify(updatedProfile));
  };

  // Sign out citizen
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="citizen-portal-root">
      {/* Header */}
      <CitizenHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadCount={unreadCount}
        onOpenNotifications={() => setIsNotifDrawerOpen(true)}
        onOpenSubmitModal={() => {
          setSelectedCategory('Food');
          setIsSubmitModalOpen(true);
        }}
        onOpenTrackModal={() => {
          setSelectedRequestForTracking(null);
          setIsTrackModalOpen(true);
        }}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        citizenUser={citizenUser}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="citizen-dashboard-container">
        {/* Hero Card */}
        <CitizenHero
          onOpenSubmitModal={() => {
            setSelectedCategory('Food');
            setIsSubmitModalOpen(true);
          }}
          onOpenTrackModal={() => {
            setSelectedRequestForTracking(null);
            setIsTrackModalOpen(true);
          }}
          district={`${citizenUser.district} District`}
        />

        {/* 4 Stats KPI Cards (CIT-01) */}
        <CitizenStats requests={requests} />

        {/* "What do you need?" Category Quick Launcher */}
        <CategoryQuickLauncher onSelectCategory={handleSelectCategory} />

        {/* Error Banners for Live Mode */}
        {(loadError || actionError) && (
          <div
            style={{
              background: '#FEE2E2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>{loadError || actionError}</span>
            </div>
            {loadError && (
              <button
                type="button"
                onClick={loadCitizenData}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  background: '#FFFFFF',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  borderRadius: '6px',
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={13} /> Retry
              </button>
            )}
          </div>
        )}

        {/* Real-time Assistance Requests Tracker */}
        <ActiveRequestsTracker
          requests={requests}
          loading={loading}
          onSelectRequest={handleSelectRequest}
          onCancelRequest={handleCancelRequest}
          onOpenSubmitModal={() => {
            setSelectedCategory('Food');
            setIsSubmitModalOpen(true);
          }}
          onAdvanceStatus={USE_MOCK_API ? handleAdvanceStatus : undefined}
          onClearAllData={USE_MOCK_API ? handleClearAllData : undefined}
        />

        {/* Two-Column Widget Grid: Verified Alerts & Open Shelters */}
        <div className="citizen-two-col-grid">
          <VerifiedAlertsWidget />
          <NearbySheltersWidget />
        </div>

        {/* How It Works (3-Step Reassurance Guide) */}
        <section className="how-it-works-section" aria-label="How Disaster Assistance Works">
          <div className="section-eyebrow">Simple &amp; Coordinated</div>
          <h2 className="section-heading">How emergency assistance works</h2>
          <p className="section-desc" style={{ marginBottom: 0 }}>
            Our verified humanitarian coordination network ensures rapid aid delivery.
          </p>

          <div className="how-steps-grid">
            <div className="how-step-card">
              <div className="how-step-number">1</div>
              <p className="how-step-title">Tell us what you need</p>
              <p className="how-step-desc">
                Choose the category of help (food, medicine, shelter, transport) and share your location.
              </p>
            </div>

            <div className="how-step-card">
              <div className="how-step-number">2</div>
              <p className="how-step-title">We check and prioritise</p>
              <p className="how-step-desc">
                Authorized Disaster Management Centre desk officers verify and allocate relief stocks.
              </p>
            </div>

            <div className="how-step-card">
              <div className="how-step-number">3</div>
              <p className="how-step-title">Help is assigned</p>
              <p className="how-step-desc">
                Partner humanitarian organizations and rescue teams dispatch assistance directly.
              </p>
            </div>
          </div>

          <div className="guarantee-callout">
            <ShieldCheck size={18} />
            <span>Every request is reviewed and tracked by trained response personnel. Zero charges or fees.</span>
          </div>
        </section>
      </main>

      {/* Modals & Drawers */}
      <SubmitRequestModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        initialCategory={selectedCategory}
        onSubmitSuccess={handleSubmitSuccess}
        citizenUser={citizenUser}
      />

      <TrackRequestModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        initialRequest={selectedRequestForTracking}
        onFeedbackSubmit={loadCitizenData}
        onAdvanceStatus={USE_MOCK_API ? handleAdvanceStatus : undefined}
      />

      <NotificationsDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        onSelectReference={handleTrackByReference}
      />

      <CitizenProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        citizenUser={citizenUser}
        onSaveProfile={handleSaveProfile}
      />

      {/* Clean Humanitarian Dark Footer */}
      <footer className="citizen-footer">
        <div className="citizen-footer-inner">
          <div>
            <div className="citizen-footer-brand" style={{ fontSize: '1.05rem', gap: '0.65rem' }}>
              <img
                src="/athwala-emblem.png"
                alt="Athwala"
                style={{ width: '32px', height: '32px', objectFit: 'contain' }}
              />
              Athwala &bull; Humanitarian Crisis Management System
            </div>
            <p style={{ margin: '0.4rem 0 0', color: '#64748B', fontSize: '0.75rem' }}>
              Your information is securely encrypted and shared only with authorized disaster responders.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontWeight: 700, color: '#FFFFFF', margin: '0 0 0.25rem', fontSize: '0.8rem' }}>
                Emergency Hotline
              </p>
              <p style={{ margin: 0, color: '#F59E0B', fontWeight: 700 }}>
                117 (Toll-Free 24/7)
              </p>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: '#FFFFFF', margin: '0 0 0.25rem', fontSize: '0.8rem' }}>
                Assistance Desk
              </p>
              <p style={{ margin: 0 }}>
                support@relief.gov.lk
              </p>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: '#FFFFFF', margin: '0 0 0.25rem', fontSize: '0.8rem' }}>
                Language
              </p>
              <p style={{ margin: 0, color: '#0F766E', fontWeight: 700 }}>
                English
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default CitizenDashboard;
