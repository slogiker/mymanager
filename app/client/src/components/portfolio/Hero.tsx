import { useEffect, useState, useRef } from 'react';
import { api } from '../../lib/api';
import type { Profile } from '../../types';
import { useTranslation } from '../../context/LanguageContext';

export default function Hero() {
  const [resumeExists, setResumeExists] = useState<boolean>(false);
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    api.get<Profile>('/profile').then(p => setResumeExists(!!p.resume_path)).catch(() => {});
    // Trigger entrance animation
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="min-h-screen flex flex-col justify-center relative overflow-hidden"
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/[0.04] rounded-full blur-[200px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-slate-500/[0.03] rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full px-6 md:px-10 lg:px-16 relative z-10">
        {/* Staggered entrance */}
        <div
          className="transition-all duration-1000 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
          }}
        >
          {/* Subtle Role Tag */}
          <div className="flex items-center gap-2.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span className="text-[11px] sm:text-xs font-semibold tracking-[0.25em] uppercase text-red-500/90 font-mono">
              {t('hero_role')}
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-[-0.03em] text-slate-100 leading-[1.05] mb-6">
            {t('hero_title')}
          </h1>
        </div>

        {/* Description - delayed entrance */}
        <div
          className="transition-all duration-1000 ease-out delay-200"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed mb-16 font-light">
            {t('hero_desc')}
          </p>
        </div>

        {/* Actions - delayed entrance */}
        <div
          className="transition-all duration-1000 ease-out delay-500"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => document.getElementById('apps')?.scrollIntoView({ behavior: 'smooth' })}
              className="group inline-flex items-center gap-3 px-7 py-3.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-full transition-all duration-300 hover:shadow-[0_0_40px_-8px_rgba(239,68,68,0.4)]"
            >
              {t('hero_explore')}
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <button
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-3 px-7 py-3.5 text-sm font-semibold text-slate-300 hover:text-white border border-slate-700/50 hover:border-slate-500 rounded-full transition-all duration-300 bg-transparent hover:bg-white/[0.03]"
            >
              {t('hero_getintouch')}
            </button>

            {resumeExists && (
              <a
                href="/api/profile/resume/download"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-slate-400 hover:text-white border border-slate-800/50 hover:border-slate-600 rounded-full transition-all duration-300"
                download
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('hero_resume')}
              </a>
            )}
          </div>

          {/* Social links */}
          <div className="flex items-center gap-1 mt-16">
            <a href="https://github.com/slogiker" target="_blank" rel="noopener noreferrer"
              className="p-3 text-slate-600 hover:text-slate-300 transition-colors duration-300" aria-label="GitHub">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
            <a href="https://www.qrz.com/db/S54DP" target="_blank" rel="noopener noreferrer"
              className="p-3 text-slate-600 hover:text-slate-300 transition-colors duration-300" aria-label="Amateur Radio">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21V11M12 7a2 2 0 100-4 2 2 0 000 4zm0 0v4m0 0H8m4 0h4" />
              </svg>
            </a>
            <a href="mailto:plibersek.daniel@gmail.com"
              className="p-3 text-slate-600 hover:text-slate-300 transition-colors duration-300" aria-label="Email">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 transition-all duration-1000 delay-1000"
        style={{ opacity: visible ? 0.3 : 0 }}
      >
        <div className="w-5 h-8 rounded-full border border-slate-700 flex items-start justify-center p-1.5">
          <div className="w-1 h-2 bg-slate-500 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
}
