import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { ExternalLink, Github, X, Timer, Server, Sparkles, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

interface ProjectItem {
  id: string;
  title: string;
  badge: string;
  tagline: string;
  desc: string;
  tech: string[];
  liveUrl?: string;
  githubUrl?: string;
  image?: string;
  highlights: string[];
  icon: typeof Timer;
}

const FEATURED_PROJECTS: ProjectItem[] = [
  {
    id: 'ssv-stoparica',
    title: 'SSV Štoparica',
    badge: 'PWA + Bluetooth',
    tagline: 'Professional Firefighter SSV Competition Stopwatch',
    desc: 'A modern Progressive Web App (PWA) stopwatch designed for Slovenian firefighter SSV (spajanje sesalnega voda) competitions. Replaces expensive hardware clocks with an adaptive, centisecond-accurate mobile and tablet timing system.',
    tech: ['React', 'TypeScript', 'Web Bluetooth BLE', 'PWA', 'Tailwind CSS'],
    liveUrl: 'https://ssv.slogiker.si',
    githubUrl: 'https://github.com/slogiker/ssv-stoparica',
    image: '/images/projects/ssv-stoparica.png',
    highlights: [
      'High-precision centisecond timing engine utilizing requestAnimationFrame',
      'Direct wireless stop button integration via Web Bluetooth (BLE)',
      'Official GZS (Gasilska zveza Slovenije) audio start signals for Summer and Winter disciplines',
      'PWA architecture: fully installable on Android/iOS, operates offline, and prevents screen sleep',
      'Team analytics, personal records tracking, and competition history',
    ],
    icon: Timer,
  },
  {
    id: 'mymanager',
    title: 'MyManager',
    badge: 'Self-Hosted Hub',
    tagline: 'Homelab Command Center & Personal Infrastructure Portal',
    desc: 'A personal infrastructure dashboard and operations hub featuring real-time telemetry, service orchestration, automatic WireGuard VPN detection, and encrypted productivity tools.',
    tech: ['React 18', 'Node.js', 'Express', 'SQLite', 'Docker', 'WireGuard'],
    liveUrl: '/dashboard',
    githubUrl: 'https://github.com/slogiker/mymanager',
    image: '/images/projects/mymanager.png',
    highlights: [
      'Live hardware telemetry gauges (CPU, RAM, NVMe disk pool, temperatures)',
      'Intelligent WAN & WireGuard network verification for secure local services',
      'Interactive drag-and-drop service grid with live status feeds',
      'Integrated web SSH terminal, end-to-end clipboard, and file manager',
    ],
    icon: Server,
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
  const sectionRef = useInView();
  const { t } = useTranslation();
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedProject(null);
    };
    if (selectedProject) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedProject]);

  return (
    <div className="max-w-6xl mx-auto w-full px-6 md:px-10 lg:px-16 py-24">
      {/* Featured Works Section */}
      <section id="apps" ref={sectionRef.ref}>
        <div className="mb-14">
          <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-red-500 font-mono">
            {t('apps_selected') || 'Featured Work'}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-100 mt-2 tracking-tight">
            {t('portfolio_title') || "Things I've Built"}
          </h2>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mt-3 leading-relaxed">
            Highlighted applications and systems built for real-world operations, competitive timing, and self-hosted infrastructure.
          </p>
        </div>

        {/* 2 Featured Project Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURED_PROJECTS.map((project, i) => {
            const Icon = project.icon;
            return (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className="group relative p-7 rounded-3xl border border-slate-800/80 bg-[#141620]/90 hover:bg-[#181a27] hover:border-red-500/40 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/5 flex flex-col justify-between"
                style={{
                  opacity: sectionRef.inView ? 1 : 0,
                  transform: sectionRef.inView ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.12}s`,
                }}
              >
                <div>
                  {/* Top Bar: Icon + Badge */}
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="w-11 h-11 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-red-600/20 transition-all duration-300">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 px-3 py-1 rounded-full border border-slate-800 bg-slate-900/60">
                      {project.badge}
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors mb-2 flex items-center gap-2">
                    {project.title}
                    <Sparkles className="w-4 h-4 text-red-500/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 mb-3">
                    {project.tagline}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-6">
                    {project.desc}
                  </p>
                </div>

                {/* Bottom Bar: Tech Stack + View details hint */}
                <div>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {project.tech.slice(0, 4).map((tech) => (
                      <span
                        key={tech}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800/40 text-slate-400 border border-slate-700/40"
                      >
                        {tech}
                      </span>
                    ))}
                    {project.tech.length > 4 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md text-slate-500">
                        +{project.tech.length - 4}
                      </span>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-red-400 group-hover:text-red-300">
                    <span>View project details & preview</span>
                    <span className="text-lg leading-none transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Interactive Project Detail Modal */}
      {selectedProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedProject(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-700/60 bg-[#12141c] shadow-2xl p-6 sm:p-8 space-y-6 text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                  {React.createElement(selectedProject.icon, { className: 'w-6 h-6' })}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-white tracking-tight">{selectedProject.title}</h3>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-slate-800 bg-slate-900/80 text-slate-400">
                      {selectedProject.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{selectedProject.tagline}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visual Image / Screenshot Placeholder */}
            <div className="relative aspect-video w-full rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-[#181a24] to-slate-950 overflow-hidden flex flex-col items-center justify-center text-center p-6 shadow-inner group/img">
              {/* Optional background image fallback */}
              <div className="w-16 h-16 rounded-3xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-3 group-hover/img:scale-105 transition-transform duration-300">
                <ImageIcon className="w-8 h-8 opacity-80" />
              </div>
              <p className="text-sm font-semibold text-slate-300 mb-1">
                {selectedProject.title} Preview
              </p>
              <p className="text-[11px] font-mono text-slate-500 max-w-sm">
                Screenshot / preview placeholder (ready for image asset)
              </p>
              <div className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-600 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800/60">
                16:9 responsive frame
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">Overview</h4>
              <p className="text-sm text-slate-300 leading-relaxed font-light">
                {selectedProject.desc}
              </p>
            </div>

            {/* Key Features & Highlights */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 font-mono">Key Highlights</h4>
              <div className="space-y-2">
                {selectedProject.highlights.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech Stack Chips */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">Technologies</h4>
              <div className="flex flex-wrap gap-2">
                {selectedProject.tech.map((t) => (
                  <span
                    key={t}
                    className="text-xs font-mono px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-end gap-3">
              {selectedProject.githubUrl && (
                <a
                  href={selectedProject.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl border border-slate-700/60 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors bg-white/[0.02]"
                >
                  <Github className="w-4 h-4" />
                  GitHub Repository
                </a>
              )}
              {selectedProject.liveUrl && (
                <a
                  href={selectedProject.liveUrl}
                  target={selectedProject.liveUrl.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-red-600/20"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Application
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
