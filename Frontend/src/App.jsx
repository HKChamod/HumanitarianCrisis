import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { PublicLayout } from './components/layout/PublicLayout';

// Public Portal Pages (PUB-01 to PUB-14)
import { LandingPage } from './features/public/pages/LandingPage';
import { AboutUsPage } from './features/public/pages/AboutUsPage';
import { ActiveCrisesPage } from './features/public/pages/ActiveCrisesPage';
import { CrisisDetailsPage } from './features/public/pages/CrisisDetailsPage';
import { CrisisMapPage } from './features/public/pages/CrisisMapPage';
import { EmergencyAssistancePage } from './features/public/pages/EmergencyAssistancePage';
import { TrackRequestPage } from './features/public/pages/TrackRequestPage';
import { ShelterFinderPage } from './features/public/pages/ShelterFinderPage';
import { VolunteerRegistrationPage } from './features/public/pages/VolunteerRegistrationPage';
import { DonationInfoPage } from './features/public/pages/DonationInfoPage';
import { ContactEmergencyPage } from './features/public/pages/ContactEmergencyPage';

// Auth Pages
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';

// Import CSS Design System
import './styles/variables.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/forms.css';

function NotFoundPage() {
  return (
    <div style={{ padding: '6rem 1rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0 1rem' }}>Page Not Found</h2>
      <p style={{ color: 'var(--color-slate-600)', marginBottom: '1.5rem' }}>
        The emergency resource or page you are looking for does not exist.
      </p>
      <Link to="/" className="btn btn-primary">
        Return to Public Portal
      </Link>
    </div>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="about" element={<AboutUsPage />} />
            <Route path="crises" element={<ActiveCrisesPage />} />
            <Route path="crises/:id" element={<CrisisDetailsPage />} />
            <Route path="map" element={<CrisisMapPage />} />
            <Route path="request-help" element={<EmergencyAssistancePage />} />
            <Route path="track" element={<TrackRequestPage />} />
            <Route path="shelters" element={<ShelterFinderPage />} />
            <Route path="volunteer" element={<VolunteerRegistrationPage />} />
            <Route path="donations" element={<DonationInfoPage />} />
            <Route path="contact" element={<ContactEmergencyPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
