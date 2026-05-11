import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { Profile } from '../../types';
import { ReactNode } from 'react';

interface SocialLink {
  label: string;
  href: string;
  icon: ReactNode;
}

const SOCIAL: SocialLink[] = [
  { label: 'GitHub', href: 'https://github.com/slogiker', icon: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  )},
  { label: 'Email', href: 'mailto:plibersek.daniel@gmail.com', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
    </svg>
  )},
];

export default function Hero() {
  const [resumeExists, setResumeExists] = useState<boolean>(false);

  useEffect(() => {
    api.get<Profile>('/profile').then(p => setResumeExists(!!p.resume_path)).catch(() => {});
  }, []);

  return (
    <section id="hero" className="min-h-[92vh] flex items-center pt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full py-20">
        <div className="max-w-3xl animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Available for work
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.05]">
            <span className="text-slate-100">Daniel</span>
            <br />
            <span className="gradient-text">Full Stack</span>
            <br />
            <span className="text-slate-300">Developer</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-xl leading-relaxed">
            I build useful things for fun. From backend systems to polished UIs — if it can be built, I'll figure it out.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-primary px-6 py-2.5 text-sm"
            >
              View my work
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <button
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-outline px-6 py-2.5 text-sm"
            >
              Get in touch
            </button>

            {resumeExists && (
              <a href="/api/profile/resume/download" className="btn-outline px-6 py-2.5 text-sm" download>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Resume
              </a>
            )}
          </div>

          <div className="flex items-center gap-4 mt-10">
            {SOCIAL.map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                className="text-slate-500 hover:text-slate-200 transition-all duration-200 hover:-translate-y-0.5"
                aria-label={s.label}>
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        <div className="absolute right-0 top-1/3 w-[500px] h-[500px] opacity-[0.03] pointer-events-none hidden xl:block">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 blur-3xl" />
        </div>
      </div>
    </section>
  );
}
