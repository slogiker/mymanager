export default function Footer() {
  return (
    <footer className="border-t border-slate-900 bg-[#06050a]/40 backdrop-blur-md py-16 mt-24">
      <div className="w-full px-8 md:px-16 lg:px-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 text-slate-400">
        <div>
          <h3 className="text-white text-lg font-black tracking-tight mb-4">slogiker</h3>
          <p className="text-sm text-slate-505 leading-relaxed max-w-sm">
            Personal homelab portal, application coordinator, and development hub. 
            Built with Express, PostgreSQL & React.
          </p>
          <p className="text-xs text-slate-650 mt-6">
            © {new Date().getFullYear()} Daniel Pliberšek. All rights reserved.
          </p>
        </div>
        
        <div>
          <h4 className="text-white text-sm font-extrabold tracking-wider uppercase mb-4">Quick Links</h4>
          <ul className="space-y-2.5 text-sm font-medium">
            <li>
              <a href="#hero" className="hover:text-cyan-400 transition-colors">About</a>
            </li>
            <li>
              <a href="#apps" className="hover:text-cyan-400 transition-colors">Applications</a>
            </li>
            <li>
              <a href="#skills" className="hover:text-cyan-400 transition-colors">Skills</a>
            </li>
            <li>
              <a href="#contact" className="hover:text-cyan-400 transition-colors">Contact</a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-white text-sm font-extrabold tracking-wider uppercase mb-4">Sites I've Made</h4>
          <ul className="space-y-2.5 text-sm font-medium">
            <li>
              {/* EDIT LINK HERE -> File: app/client/src/components/layout/Footer.tsx:38 */}
              <a href="#" className="hover:text-cyan-400 transition-colors">
                PGD Majšperk Breg
              </a>
            </li>
            <li>
              {/* EDIT LINK HERE -> File: app/client/src/components/layout/Footer.tsx:44 */}
              <a href="#" className="hover:text-cyan-400 transition-colors">
                Avtopihi
              </a>
            </li>
            <li>
              {/* EDIT LINK HERE -> File: app/client/src/components/layout/Footer.tsx:50 */}
              <a href="#" className="hover:text-cyan-400 transition-colors">
                Tesarstvo Kamenšek
              </a>
            </li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-white text-sm font-extrabold tracking-wider uppercase mb-4">Connect</h4>
          <ul className="space-y-2.5 text-sm font-medium">
            <li>
              <a href="https://github.com/slogiker" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">
                GitHub Profile
              </a>
            </li>
            <li>
              <a href="https://www.qrz.com/db/S54DP" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">
                Amateur Radio (QRZ)
              </a>
            </li>
            <li>
              <a href="mailto:plibersek.daniel@gmail.com" className="hover:text-cyan-400 transition-colors">
                Email Inquiry
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
