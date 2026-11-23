import { Outlet } from 'react-router-dom';
import { EmergencyBanner } from './EmergencyBanner';
import { Header } from './Header';
import { Footer } from './Footer';

export function PublicLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <EmergencyBanner />
      <Header />
      <main style={{ flex: '1 0 auto' }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
