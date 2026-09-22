import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../context/LanguageContext';
import {
  LayoutDashboard,
  Terminal as TermIcon,
  User as UserIcon,
  FolderOpen,
  ClipboardList,
  X,
} from 'lucide-react';

interface NavLink {
  key: string;
  href: string;
  id: string;
}

const NAV_LINKS: NavLink[] = [
  { key: 'nav_about', href: '/#hero', id: 'hero' },
  { key: 'nav_apps', href: '/#apps', id: 'apps' },
  { key: 'nav_skills', href: '/#skills', id: 'skills' },
  { key: 'nav_contact', href: '/#contact', id: 'contact' },
];

const APP_PAGES: Record<string, { label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  '/dashboard': { label: 'Dashboard', Icon: LayoutDashboard },
  '/terminal':  { label: 'SSH Terminal', Icon: TermIcon },
  '/profile':   { label: 'Profile', Icon: UserIcon },
  '/files':     { label: 'File Manager', Icon: FolderOpen },
  '/clipboard': { label: 'Clipboard', Icon: ClipboardList },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('hero');
  const location = useLocation();
  const navigate = useNavigate();

  const appPage = Object.entries(APP_PAGES).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  );
  const isAppPage = Boolean(appPage);
  const CurrentPageIcon = appPage?.[1].Icon;
  const currentPageLabel = appPage?.[1].label;

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Lock body scroll when sidebar open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (location.pathname !== '/') return;
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 240;
      const sections = ['hero', 'apps', 'skills', 'contact'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  function handleNav(href: string): void {
    setSidebarOpen(false);
    if (href.startsWith('/#') && location.pathname === '/') {
      const id = href.slice(2);
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(href);
    }
  }

  async function handleLogout(): Promise<void> {
    setSidebarOpen(false);
    await logout();
    navigate('/');
  }

  return (
    <>
      {/* ─── Top navbar ─── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[#22242a]/90 backdrop-blur-xl border-b border-red-500/40 shadow-[0_4px_20px_-4px_rgba(239,68,68,0.15)]'
            : isAppPage
              ? 'bg-[#111216]/80 backdrop-blur-md border-b border-slate-800/60'
              : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="w-full px-6 sm:px-10 lg:px-14 flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="text-lg font-bold tracking-tight text-slate-200 hover:text-white transition-colors"
          >
            slogiker
          </button>

          {/* Center: section links or page breadcrumb */}
          <div className="hidden md:flex items-center gap-1">
            {isAppPage ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                {CurrentPageIcon && <CurrentPageIcon size={14} className="text-red-400" />}
                <span className="text-sm font-semibold text-slate-200">{currentPageLabel}</span>
              </div>
            ) : (
              NAV_LINKS.map(link => (
                <button
                  key={link.key}
                  onClick={() => handleNav(link.href)}
                  className={`relative text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-300 ${
                    activeSection === link.id && location.pathname === '/'
                      ? 'text-slate-200'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                  }`}
                >
                  {t(link.key)}
                  {activeSection === link.id && location.pathname === '/' && (
                    <span className="absolute bottom-0.5 left-3 right-3 h-px bg-red-500/60 animate-fade-in" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Right: auth actions (desktop) */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                {location.pathname !== '/dashboard' && (
                  <Link to="/dashboard" className="text-sm font-medium px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] transition-colors">
                    {t('nav_dashboard')}
                  </Link>
                )}
                {Boolean(user.flags?.terminal_enabled) && user.role === 'owner' && location.pathname !== '/terminal' && (
                  <Link to="/terminal" className="text-sm font-medium px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] transition-colors">
                    {t('nav_terminal')}
                  </Link>
                )}
                {location.pathname !== '/profile' && (
                  <Link to="/profile" className="text-sm font-medium px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] transition-colors">
                    {t('nav_profile')}
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium px-3 py-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/[0.04] transition-colors"
                >
                  {t('nav_signout')}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-sm font-medium px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                {t('nav_signin')}
              </Link>
            )}
          </div>

          {/* Mobile: hamburger only (no gear) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8h16M4 16h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* ─── Mobile left sidebar ─── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar panel */}
      <div
        className={`fixed top-0 left-0 z-[70] h-full w-72 bg-[#111216] border-r border-slate-800/60 flex flex-col
          transition-transform duration-300 ease-in-out md:hidden
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-slate-800/50 shrink-0">
          <button
            onClick={() => { setSidebarOpen(false); navigate('/'); }}
            className="text-lg font-bold tracking-tight text-slate-200 hover:text-white transition-colors"
          >
            slogiker
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-white/[0.05] transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sidebar body */}
        <div className="flex-1 overflow-y-auto py-4 px-4">
          {/* Current page indicator (app pages) */}
          {isAppPage && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 mb-4 rounded-xl bg-red-500/10 border border-red-500/20">
              {CurrentPageIcon && <CurrentPageIcon size={15} className="text-red-400" />}
              <span className="text-sm font-semibold text-red-300">{currentPageLabel}</span>
            </div>
          )}

          {/* Portfolio section links (only on /) */}
          {!isAppPage && (
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-3 mb-2">Navigation</p>
              {NAV_LINKS.map(link => (
                <button
                  key={link.key}
                  onClick={() => handleNav(link.href)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  {t(link.key)}
                </button>
              ))}
            </div>
          )}

          {/* App links */}
          {user && (
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-3 mb-2">App</p>
              <Link
                to="/dashboard"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
              >
                <LayoutDashboard size={15} className="text-slate-500" />
                {t('nav_dashboard')}
              </Link>
              {Boolean(user.flags?.terminal_enabled) && user.role === 'owner' && (
                <Link
                  to="/terminal"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  <TermIcon size={15} className="text-slate-500" />
                  {t('nav_terminal')}
                </Link>
              )}
              {Boolean(user.flags?.files_enabled) && (
                <Link
                  to="/files"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  <FolderOpen size={15} className="text-slate-500" />
                  {t('nav_files')}
                </Link>
              )}
              <Link
                to="/profile"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
              >
                <UserIcon size={15} className="text-slate-500" />
                {t('nav_profile')}
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar footer: sign in / out */}
        <div className="shrink-0 px-4 py-4 border-t border-slate-800/50">
          {user ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/[0.08] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {t('nav_signout')}
            </button>
          ) : (
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors"
            >
              {t('nav_signin')}
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
