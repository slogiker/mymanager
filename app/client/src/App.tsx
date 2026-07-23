import { lazy, Suspense, ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

const PortfolioPage = lazy(() => import('./pages/Portfolio'));
const LoginPage = lazy(() => import('./pages/Login'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePassword'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const ClipboardPage = lazy(() => import('./pages/Clipboard'));
const FilesPage = lazy(() => import('./pages/Files'));
const TerminalPage = lazy(() => import('./pages/Terminal'));
const AdminPage = lazy(() => import('./pages/Admin'));
const NotFoundPage = lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return <div className="min-h-screen bg-[#020617]" />;
}

function RequireAuth({ children, ownerOnly = false }: { children: ReactNode; ownerOnly?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  if (ownerOnly && user.role !== 'owner') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<PortfolioPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/dashboard" element={<RequireAuth ownerOnly><DashboardPage /></RequireAuth>} />
        <Route path="/clipboard" element={<RequireAuth><ClipboardPage /></RequireAuth>} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/terminal" element={<RequireAuth ownerOnly><TerminalPage /></RequireAuth>} />
        <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
