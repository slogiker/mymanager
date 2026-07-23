import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS = [
  { label: 'About', href: '/#hero', id: 'hero' },
  { label: 'Apps', href: '/#apps', id: 'apps' },
  { label: 'Skills', href: '/#skills', id: 'skills' },
  { label: 'Contact', href: '/#contact', id: 'contact' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
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
      const scrollPosition = window.scrollY + 240; // offset for top sticky bar
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
    handleScroll(); // Trigger initially
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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${scrolled ? 'bg-[#020617]/90 backdrop-blur-xl border-slate-800/80 shadow-lg' : 'bg-transparent border-transparent'}`}>
      <div className="w-full px-8 md:px-16 lg:px-24 flex items-center justify-between h-20">
        <button onClick={() => handleNav('/')} className="text-2xl font-black tracking-tight gradient-text hover:opacity-80 transition-opacity">
          slogiker
        </button>

        <nav className="hidden md:flex items-center gap-10">
          {NAV_LINKS.map(link => (
            <button key={link.label} onClick={() => handleNav(link.href)}
              className={`relative py-1 text-[16px] font-bold transition-all duration-300 ${activeSection === link.id && location.pathname === '/' ? 'text-cyan-400' : 'text-slate-400 hover:text-cyan-400'}`}>
              {link.label}
              {activeSection === link.id && location.pathname === '/' && (
                <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-cyan-400 rounded-full animate-fade-in" />
              )}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-6">
          {user ? (
            <>
              {user.role === 'owner' && (
                <>
                  <Link to="/dashboard" className="text-sm font-semibold text-slate-450 hover:text-white transition-colors">Dashboard</Link>
                  <Link to="/terminal" className="text-sm font-semibold text-slate-450 hover:text-white transition-colors">Terminal</Link>
                </>
              )}
              <Link to="/files" className="text-sm font-semibold text-slate-455 hover:text-white transition-colors">Files</Link>
              <button onClick={handleLogout} className="btn-outline text-sm py-2 px-4">Sign out</button>
            </>
          ) : (
            <Link to="/login" className="btn-primary text-sm py-2 px-5">Sign in</Link>
          )}
        </div>

        <button onClick={() => setMenuOpen(v => !v)} className="md:hidden p-2 text-slate-400 hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 px-6 py-4 rounded-b-2xl space-y-2">
          {NAV_LINKS.map(link => (
            <button key={link.label} onClick={() => handleNav(link.href)}
              className="block w-full text-left py-2 text-slate-400 hover:text-white transition-colors">
              {link.label}
            </button>
          ))}
          {user ? (
            <>
              {user.role === 'owner' && (
                <>
                  <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-400 hover:text-white">Dashboard</Link>
                  <Link to="/terminal" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-400 hover:text-white">Terminal</Link>
                </>
              )}
              <Link to="/files" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-400 hover:text-white">Files</Link>
              <button onClick={handleLogout} className="block w-full text-left py-2 text-red-400 hover:text-red-300">Sign out</button>
            </>
          ) : (
            <Link to="/login" onClick={() => setMenuOpen(false)} className="block py-2 text-blue-400 hover:text-blue-300">Sign in</Link>
          )}
        </div>
      )}
    </header>
  );
}
