import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { label: 'About', href: '/#hero' },
  { label: 'Projects', href: '/#projects' },
  { label: 'Skills', href: '/#skills' },
  { label: 'Contact', href: '/#contact' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#020617]/90 backdrop-blur-md border-b border-slate-800/80 shadow-lg' : 'bg-transparent'}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <button onClick={() => handleNav('/')} className="text-lg font-bold gradient-text hover:opacity-80 transition-opacity">
          slogiker
        </button>

        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(link => (
            <button key={link.label} onClick={() => handleNav(link.href)}
              className="text-sm text-slate-400 hover:text-white transition-colors">
              {link.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {user.role === 'owner' && (
                <>
                  <Link to="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">Dashboard</Link>
                  <Link to="/admin" className="text-sm text-slate-400 hover:text-white transition-colors">Admin</Link>
                  <Link to="/terminal" className="text-sm text-slate-400 hover:text-white transition-colors">Terminal</Link>
                </>
              )}
              <Link to="/clipboard" className="text-sm text-slate-400 hover:text-white transition-colors">Clipboard</Link>
              <Link to="/files" className="text-sm text-slate-400 hover:text-white transition-colors">Files</Link>
              <button onClick={handleLogout} className="btn-outline text-xs py-1.5">Sign out</button>
            </>
          ) : (
            <Link to="/login" className="btn-primary text-xs py-1.5 px-3">Sign in</Link>
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
        <div className="md:hidden bg-[#020617]/95 backdrop-blur-md border-b border-slate-800 px-4 pb-4 space-y-2">
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
                  <Link to="/admin" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-400 hover:text-white">Admin</Link>
                  <Link to="/terminal" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-400 hover:text-white">Terminal</Link>
                </>
              )}
              <Link to="/clipboard" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-400 hover:text-white">Clipboard</Link>
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
