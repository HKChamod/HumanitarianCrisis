import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { citizenApi } from '../../services/api/citizenApi';
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
import { ShieldCheck } from 'lucide-react';
import '../../styles/citizen.css';

export function CitizenDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Food');
  const [selectedRequestForTracking, setSelectedRequestForTracking] = useState(null);

  // Citizen Profile
  const [citizenUser, setCitizenUser] = useState(() => {
    try {
      const stored = localStorage.getItem('hcms_citizen_user');
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      fullName: 'Kavinda Perera',
      email: 'kavinda.perera@example.com',
      phone: '+94 77 123 4567',
      district: 'Kalutara',
      address: 'No. 42, Temple Road, Nagoda, Kalutara',
      emergencyContact: '+94 71 987 6543 (Brother)',
    };
  });

  // Load citizen data
  const loadCitizenData = async () => {
    try {
      const [reqRes, notifRes] = await Promise.all([
        citizenApi.getMyRequests(),
        citizenApi.getNotifications(),
      ]);
      setRequests(reqRes.data || []);
      setNotifications(notifRes.data || []);
    } catch (err) {
      console.error('Error fetching citizen data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCitizenData();
  }, []);

  // Quick category click from "What do you need?"
  const handleSelectCategory = (catKey) => {
    setSelectedCategory(catKey);
    setIsSubmitModalOpen(true);
  };

  // Submit new request
  const handleSubmitSuccess = async (payload) => {
    await citizenApi.submitRequest(payload);
    await loadCitizenData();
  };

  // Advance lifecycle status for testing/checking
  const handleAdvanceStatus = async (requestId) => {
    const res = await citizenApi.advanceRequestStatus(requestId);
    if (res?.data && selectedRequestForTracking?.id === requestId) {
      setSelectedRequestForTracking(res.data);
    }
    await loadCitizenData();
  };

  // Reset / clear all test data
  const handleClearAllData = async () => {
    if (window.confirm('Clear all submitted requests to test clean again?')) {
      citizenApi.clearAllCitizenData();
      await loadCitizenData();
    }
  };

  // Cancel request
  const handleCancelRequest = async (requestId) => {
    if (window.confirm('Are you sure you want to cancel this assistance request?')) {
      await citizenApi.cancelRequest(requestId);
      await loadCitizenData();
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

        {/* Real-time Assistance Requests Tracker */}
        <ActiveRequestsTracker
          requests={requests}
          onSelectRequest={handleSelectRequest}
          onCancelRequest={handleCancelRequest}
          onOpenSubmitModal={() => {
            setSelectedCategory('Food');
            setIsSubmitModalOpen(true);
          }}
          onAdvanceStatus={handleAdvanceStatus}
          onClearAllData={handleClearAllData}
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
        onAdvanceStatus={handleAdvanceStatus}
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
            <div className="citizen-footer-brand">
              <ShieldCheck size={18} color="#0F766E" />
              ReliefLink &bull; Humanitarian Crisis Management System
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
