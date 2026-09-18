import { useEffect, useRef, useState } from 'react';

interface AppItem {
  title: string;
  desc: string;
  url: string;
  tech: string;
}

const APPS: AppItem[] = [
  {
    title: 'MC-BOT',
    desc: 'Discord integration for Minecraft server management',
    url: 'https://github.com/slogiker/MC-BOT',
    tech: 'Discord.js',
  },
  {
    title: 'RGB LED Controller',
    desc: 'Mobile app for controlling RGB LED strips via BLE',
    url: 'https://github.com/slogiker/RGB-led-controller-flutter',
    tech: 'Flutter',
  },
  {
    title: 'Mod Updator',
    desc: 'Automated mod management and updating tool',
    url: 'https://github.com/slogiker/mod-updator-python',
    tech: 'Python',
  },
  {
    title: 'MyManager',
    desc: 'Personal infrastructure portal and homelab hub',
    url: 'https://github.com/slogiker/mymanager',
    tech: 'React + Express',
  },
];

interface WebsiteItem {
  title: string;
  desc: string;
  url: string;
}

const WEBSITES: WebsiteItem[] = [
  {
    title: 'PGD Majšperk Breg',
    desc: 'Voluntary fire brigade portal',
    url: '#',
  },
  {
    title: 'Avtopihi',
    desc: 'Transport & vehicle logistics',
    url: '#',
  },
  {
    title: 'Tesarstvo Kamenšek',
    desc: 'Carpentry & roofing services',
    url: '#',
  },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

export default function ApplicationsGrid() {
  const appsSection = useInView();
  const websitesSection = useInView();

  return (
    <div className="max-w-6xl mx-auto w-full px-6 md:px-10 lg:px-16 py-24">
      {/* Applications */}
      <section id="apps" ref={appsSection.ref}>
        <div className="mb-12">
          <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-slate-600">
            Open Source
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mt-2 tracking-tight">
            Applications
          </h2>
        </div>

        <div className="space-y-1">
          {APPS.map((app, i) => (
            <a
              key={app.title}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between py-5 px-1 border-b border-slate-800/40 hover:border-slate-700 transition-all duration-300"
              style={{
                opacity: appsSection.inView ? 1 : 0,
                transform: appsSection.inView ? 'translateY(0)' : 'translateY(12px)',
                transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.08}s`,
              }}
            >
              <div className="flex items-center gap-6 min-w-0">
                <span className="text-xs font-mono text-slate-700 w-6 flex-shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-200 group-hover:text-white transition-colors truncate">
                    {app.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5 truncate">
                    {app.desc}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                <span className="hidden sm:inline-flex text-[11px] font-medium text-slate-600 px-2.5 py-1 rounded-full border border-slate-800/60">
                  {app.tech}
                </span>
                <svg
                  className="w-4 h-4 text-slate-700 group-hover:text-red-500 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 17L17 7M17 7H7M17 7v10" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Websites */}
      <section className="mt-32" ref={websitesSection.ref}>
        <div className="mb-12">
          <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-slate-600">
            Client Work
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mt-2 tracking-tight">
            Websites I've Made
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {WEBSITES.map((site, i) => (
            <a
              key={site.title}
              href={site.url}
              className="group relative p-6 rounded-2xl border border-slate-800/40 hover:border-slate-700/60 bg-white/[0.01] hover:bg-white/[0.025] transition-all duration-500"
              style={{
                opacity: websitesSection.inView ? 1 : 0,
                transform: websitesSection.inView ? 'translateY(0)' : 'translateY(16px)',
                transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.1}s`,
              }}
            >
              <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                {site.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {site.desc}
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-600 group-hover:text-red-500/70 transition-colors">
                <span>Visit</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
