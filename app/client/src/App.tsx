import { lazy, Suspense, ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { LanguageProvider } from './context/LanguageContext';
import { UploadProvider } from './context/UploadContext';
import CookieConsent from './components/common/CookieConsent';
import FloatingAccessibilityButton from './components/common/FloatingAccessibilityButton';

const PortfolioPage = lazy(() => import('./pages/Portfolio'));
const LoginPage = lazy(() => import('./pages/Login'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePassword'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const ClipboardPage = lazy(() => import('./pages/Clipboard'));
const FilesPage = lazy(() => import('./pages/Files'));
const SharePage = lazy(() => import('./pages/SharePage'));
const TerminalPage = lazy(() => import('./pages/Terminal'));
const AdminPage = lazy(() => import('./pages/Admin'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicy'));
const CookiePolicyPage = lazy(() => import('./pages/CookiePolicy'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const NotFoundPage = lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return <div className="min-h-screen bg-[#020617]" />;
}

function RequireAuth({ children, ownerOnly = false }: { children: ReactNode; ownerOnly?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (Boolean(user.must_change_password)) return <Navigate to="/change-password" replace />;
  if (ownerOnly && user.role !== 'owner') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  const allowedWithoutPasswordChange = ['/change-password', '/login', '/privacy', '/cookies'];
  if (user && Boolean(user.must_change_password) && !allowedWithoutPasswordChange.includes(location.pathname)) {
    return <Navigate to="/change-password" replace />;
  }
  return (
    <LanguageProvider>
      <UploadProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<PortfolioPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
            <Route path="/clipboard" element={<RequireAuth><ClipboardPage /></RequireAuth>} />
            <Route path="/files" element={<FilesPage />} />
            <Route path="/share/:token" element={<SharePage />} />
            <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            <Route path="/terminal" element={<RequireAuth ownerOnly><TerminalPage /></RequireAuth>} />
            <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/cookies" element={<CookiePolicyPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <FloatingAccessibilityButton />
          <CookieConsent />
        </Suspense>
      </UploadProvider>
    </LanguageProvider>
  );
}
