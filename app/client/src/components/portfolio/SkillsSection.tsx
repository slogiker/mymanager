import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Skill } from '../../types';

const CATEGORY_ORDER: string[] = ['Frontend', 'Backend', 'Database', 'DevOps', 'Tools', 'Other'];

interface SkillPillProps {
  skill: Skill;
}

function SkillPill({ skill }: SkillPillProps) {
  return (
    <div className="group relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-slate-600/80 transition-all duration-200 hover:-translate-y-0.5">
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-slate-800"
        style={{ backgroundColor: skill.color || '#64748b', ringColor: skill.color || '#64748b' }}
      />
      <span className="text-sm font-medium text-slate-300 group-hover:text-slate-100 transition-colors">
        {skill.name}
      </span>
      <div className="ml-auto flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`w-1 h-1 rounded-full transition-colors ${i < skill.proficiency ? 'bg-cyan-400' : 'bg-slate-700'}`} />
        ))}
      </div>
    </div>
  );
}

export default function SkillsSection() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.get<Skill[]>('/skills').then(setSkills).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const grouped = skills.reduce<Record<string, Skill[]>>((acc, s) => {
    const cat = s.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const categories = CATEGORY_ORDER.filter(c => grouped[c]);

  return (
    <section id="skills" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 border-t border-slate-800/40">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500" />
          <span className="text-xs font-medium text-cyan-400 uppercase tracking-widest">Tech Stack</span>
        </div>
        <h2 className="section-title text-4xl mb-4">What I work with</h2>
        <p className="text-slate-400 max-w-xl">Technologies and tools I use regularly.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
          {[...Array(8)].map((_, i) => <div key={i} className="h-10 rounded-xl bg-slate-800/40 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map(cat => (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">{cat}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {grouped[cat].map(skill => <SkillPill key={skill.id} skill={skill} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
