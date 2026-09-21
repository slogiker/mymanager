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
const Custom404 = lazy(() => import('./pages/Custom404'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-[#111216] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-slate-500/20 border border-slate-700/50 flex items-center justify-center">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="w-5 h-5 border-2 border-slate-700 border-t-red-500 rounded-full animate-spin" />
      </div>
    </div>
  );
}

function RequireAuth({ children, ownerOnly = false }: { children: ReactNode; ownerOnly?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (Boolean(user.must_change_password)) return <Navigate to="/change-password" replace />;
  if (ownerOnly && user.role !== 'owner') return <Navigate to="/" replace />;
  return <>{children}</>;
}

/**
 * Renders routes only after auth state has resolved.
 * Kept as a separate component so LanguageProvider and UploadProvider
 * (defined in App below) always stay mounted - they must never unmount
 * during the loading→resolved transition or providers lose their state.
 */
function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Block all route rendering until /auth/me has responded.
  // Without this, lazy-loaded pages would briefly render (Suspense resolves
  // from cache) before auth is known, causing a flash then a redirect.
  if (loading) return <PageLoader />;

  const allowedWithoutPasswordChange = ['/change-password', '/login', '/privacy', '/cookies'];
  if (user && Boolean(user.must_change_password) && !allowedWithoutPasswordChange.includes(location.pathname)) {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<PortfolioPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/clipboard" element={<RequireAuth><ClipboardPage /></RequireAuth>} />
        {/* /files requires auth - unauthenticated users go to /login */}
        <Route path="/files" element={<RequireAuth><FilesPage /></RequireAuth>} />
        <Route path="/share/:token" element={<SharePage />} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/terminal" element={<RequireAuth ownerOnly><TerminalPage /></RequireAuth>} />
        <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/cookies" element={<CookiePolicyPage />} />
        <Route path="*" element={<Custom404 />} />
      </Routes>
      <FloatingAccessibilityButton />
      <CookieConsent />
    </Suspense>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <UploadProvider>
        <AppRoutes />
      </UploadProvider>
    </LanguageProvider>
  );
}

