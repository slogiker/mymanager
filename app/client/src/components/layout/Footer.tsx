import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/30 py-12 mt-16 text-slate-500">
      <div className="max-w-6xl mx-auto w-full px-6 md:px-10 lg:px-16">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Copyright & Info */}
          <div className="text-xs text-slate-600 text-center md:text-left">
            © {new Date().getFullYear()} Daniel Pliberšek. All rights reserved.
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs">
            <a href="/#hero" className="hover:text-slate-300 transition-colors">
              About
            </a>
            <a href="/#apps" className="hover:text-slate-300 transition-colors">
              Applications
            </a>
            <a href="/#skills" className="hover:text-slate-300 transition-colors">
              Skills
            </a>
            <a href="/#contact" className="hover:text-slate-300 transition-colors">
              Contact
            </a>
            <span className="text-slate-800 hidden sm:inline">|</span>
            <Link to="/privacy" className="hover:text-red-400 transition-colors font-medium">
              Privacy Policy
            </Link>
            <Link to="/cookies" className="hover:text-red-400 transition-colors font-medium">
              Cookie Policy
            </Link>
            <span className="text-slate-800 hidden sm:inline">|</span>
            <a
              href="https://github.com/slogiker"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
