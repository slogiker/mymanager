import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

interface Skill {
  id: number;
  name: string;
  proficiency: number; // 1-5 scale
  category: string;
}

const HARDCODED_SKILLS: Skill[] = [
  // Frontend
  { id: 1, name: 'JavaScript', proficiency: 5, category: 'Frontend' },
  { id: 2, name: 'TypeScript', proficiency: 4, category: 'Frontend' },
  { id: 3, name: 'React', proficiency: 4, category: 'Frontend' },
  { id: 4, name: 'Tailwind CSS', proficiency: 5, category: 'Frontend' },
  { id: 5, name: 'HTML5/CSS3', proficiency: 5, category: 'Frontend' },

  // Backend
  { id: 6, name: 'Node.js', proficiency: 4, category: 'Backend' },
  { id: 7, name: 'Express', proficiency: 5, category: 'Backend' },
  { id: 8, name: 'Python', proficiency: 4, category: 'Backend' },

  // Database
  { id: 9, name: 'PostgreSQL', proficiency: 4, category: 'Database' },
  { id: 10, name: 'SQLite', proficiency: 4, category: 'Database' },

  // DevOps & Systems
  { id: 11, name: 'Docker', proficiency: 4, category: 'DevOps' },
  { id: 12, name: 'Linux / Bash', proficiency: 4, category: 'DevOps' },
  { id: 13, name: 'Homelab Admin', proficiency: 5, category: 'DevOps' },

  // Other
  { id: 14, name: 'Amateur Radio / RF', proficiency: 4, category: 'Other' },
];

const CATEGORY_ORDER: string[] = ['Frontend', 'Backend', 'Database', 'DevOps', 'Other'];

const CATEGORY_COLORS: Record<string, string> = {
  Frontend: '#22d3ee', // Cyan
  Backend: '#6366f1',  // Indigo
  Database: '#10b981', // Emerald
  DevOps: '#a855f7',   // Purple
  Other: '#ec4899',    // Pink
};

interface SkillCardProps {
  category: string;
  skills: Skill[];
}

function CategoryCard({ category, skills }: SkillCardProps) {
  const defaultColor = CATEGORY_COLORS[category] || '#64748b';
  return (
    <div className="card p-6 bg-slate-900/10 hover:bg-slate-900/20 border border-slate-850 hover:border-cyan-500/20 transition-all duration-300">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="w-1.5 h-4 rounded" style={{ backgroundColor: defaultColor }} />
        {category}
      </h3>
      <div className="flex flex-wrap gap-2">
        {skills.map(skill => (
          <span
            key={skill.id}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900/30 border border-slate-850 text-sm font-semibold text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition-all duration-200 cursor-default"
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
              style={{ backgroundColor: skill.color || defaultColor }}
            />
            <span>{skill.name}</span>
            <span className="text-[10px] text-yellow-500/60 font-mono tracking-tight ml-0.5">
              {'★'.repeat(skill.proficiency || 0)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SkillsSection() {
  const [skills, setSkills] = useState<Skill[]>([]);

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

  const grouped = skills.reduce<Record<string, Skill[]>>((acc, s) => {
    const cat = s.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  // Get active categories sorted by custom category order first, then alphabetically for any others
  const categories = Object.keys(grouped).sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a);
    const idxB = CATEGORY_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <section id="skills" className="w-full border-t border-slate-900 py-24">
      <div className="max-w-7xl mx-auto w-full px-8 md:px-12">
        <div className="mb-14">
          <div className="flex items-center gap-3.5 mb-5">
            <div className="w-10 h-0.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500" />
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">Tech Stack</span>
          </div>
          <h2 className="section-title text-5xl mb-5 tracking-tight font-extrabold">What I work with</h2>
          <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
            Technologies and tools I use regularly to build apps and manage systems.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(cat => (
            <CategoryCard key={cat} category={cat} skills={grouped[cat]} />
          ))}
        </div>
      </div>
    </section>
  );
}

