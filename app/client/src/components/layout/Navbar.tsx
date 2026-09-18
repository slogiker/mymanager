import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../context/LanguageContext';
import AccessibilityDrawer from '../common/AccessibilityDrawer';

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

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('hero');
  const location = useLocation();
  const navigate = useNavigate();

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
    setMenuOpen(false);
    if (href.startsWith('/#') && location.pathname === '/') {
      const id = href.slice(2);
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(href);
    }
  }

  async function handleLogout(): Promise<void> {
    await logout();
    navigate('/');
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#22242a]/90 backdrop-blur-xl border-b border-red-500/40 shadow-[0_4px_20px_-4px_rgba(239,68,68,0.15)]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="w-full px-6 sm:px-10 lg:px-14 flex items-center justify-between h-16">
        {/* Logo */}
        <button
          onClick={() => handleNav('/')}
          className="text-lg font-bold tracking-tight text-slate-200 hover:text-white transition-colors"
        >
          slogiker
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(link => (
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
          ))}
        </nav>

        {/* Desktop right actions */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm font-medium px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] transition-colors">{t('nav_dashboard')}</Link>
              {user.role === 'owner' && (
                <Link to="/terminal" className="text-sm font-medium px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] transition-colors">{t('nav_terminal')}</Link>
              )}
              <Link to="/profile" className="text-sm font-medium px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] transition-colors">{t('nav_profile')}</Link>
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

          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2.5 text-slate-600 hover:text-slate-400 rounded-lg hover:bg-white/[0.03] transition-colors"
            aria-label="Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Mobile buttons */}
        <div className="flex md:hidden items-center gap-2">
          <button onClick={() => setSettingsOpen(true)} className="p-2 text-slate-500 hover:text-slate-300 transition-colors" aria-label="Settings">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button onClick={() => setMenuOpen(v => !v)} className="p-2 text-slate-500 hover:text-slate-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8h16M4 16h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#22242a]/95 backdrop-blur-xl border-t border-slate-800/40 px-8 py-5 space-y-1">
          {NAV_LINKS.map(link => (
            <button key={link.key} onClick={() => handleNav(link.href)}
              className="block w-full text-left py-2.5 text-sm text-slate-400 hover:text-white transition-colors">
              {t(link.key)}
            </button>
          ))}
          <div className="border-t border-slate-800/40 pt-3 mt-3">
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-slate-400 hover:text-white">{t('nav_dashboard')}</Link>
                {user.role === 'owner' && (
                  <Link to="/terminal" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-slate-400 hover:text-white">{t('nav_terminal')}</Link>
                )}
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-slate-400 hover:text-white">{t('nav_profile')}</Link>
                <button onClick={handleLogout} className="block w-full text-left py-2 text-sm text-red-400 hover:text-red-300">{t('nav_signout')}</button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-red-500 hover:text-red-400">{t('nav_signin')}</Link>
            )}
          </div>
        </div>
      )}

      {/* Full WCAG/ZEKom-2 Accessibility Drawer */}
      <AccessibilityDrawer isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}
