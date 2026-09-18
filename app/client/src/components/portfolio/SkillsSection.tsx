import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { useTranslation } from '../../context/LanguageContext';

interface Skill {
  id: number;
  name: string;
  proficiency: number;
  category: string;
}

const HARDCODED_SKILLS: Skill[] = [
  { id: 1, name: 'JavaScript', proficiency: 5, category: 'Frontend' },
  { id: 2, name: 'TypeScript', proficiency: 4, category: 'Frontend' },
  { id: 3, name: 'React', proficiency: 4, category: 'Frontend' },
  { id: 4, name: 'Tailwind CSS', proficiency: 5, category: 'Frontend' },
  { id: 5, name: 'HTML5 / CSS3', proficiency: 5, category: 'Frontend' },
  { id: 6, name: 'Node.js', proficiency: 4, category: 'Backend' },
  { id: 7, name: 'Express', proficiency: 5, category: 'Backend' },
  { id: 8, name: 'Python', proficiency: 4, category: 'Backend' },
  { id: 9, name: 'PostgreSQL', proficiency: 4, category: 'Database' },
  { id: 10, name: 'SQLite', proficiency: 4, category: 'Database' },
  { id: 11, name: 'Docker', proficiency: 4, category: 'DevOps' },
  { id: 12, name: 'Linux / Bash', proficiency: 4, category: 'DevOps' },
  { id: 13, name: 'Homelab Admin', proficiency: 5, category: 'DevOps' },
  { id: 14, name: 'Amateur Radio / RF', proficiency: 4, category: 'Other' },
];

export default function SkillsSection() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    async function loadSkills() {
      try {
        const fetched = await api.get<Skill[]>('/skills');
        if (Array.isArray(fetched) && fetched.length > 0) {
          setSkills(fetched);
        } else {
          setSkills(HARDCODED_SKILLS);
        }
      } catch (err) {
        setSkills(HARDCODED_SKILLS);
      }
    }
    loadSkills();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Repeat items 4x so the strip never runs out
  const repeated = [...skills, ...skills, ...skills, ...skills];
  const duration = skills.length * 3;

  return (
    <section id="skills" ref={ref} className="py-32">
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      <div className="max-w-6xl mx-auto w-full px-6 md:px-10 lg:px-16">
        <div
          className="mb-12"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-slate-600">
            {t('skills_tag')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mt-2 tracking-tight">
            {t('skills_title')}
          </h2>
          <p className="text-slate-500 text-base mt-3 max-w-xl leading-relaxed font-light">
            {t('skills_desc')}
          </p>
        </div>

        {/* Contained marquee */}
        <div
          className="relative overflow-hidden rounded-2xl border border-slate-800/30 bg-white/[0.01] py-5 group"
          style={{
            opacity: inView ? 1 : 0,
            transition: 'opacity 0.8s ease-out 0.3s',
          }}
        >
          {/* Edge fades */}
          <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-r from-[#22242a] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-l from-[#22242a] to-transparent z-10 pointer-events-none" />

          <div
            className="flex gap-3 w-max group-hover:[animation-play-state:paused]"
            style={{ animation: `ticker ${duration}s linear infinite` }}
          >
            {repeated.map((skill, i) => (
              <span
                key={`${skill.id}-${i}`}
                className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-slate-400 border border-slate-800/40 whitespace-nowrap select-none hover:text-white hover:border-slate-600 transition-colors duration-300 cursor-default"
              >
                {skill.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
