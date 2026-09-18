import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import ProjectCard from './ProjectCard';
import type { Project } from '../../types';
import { useTranslation } from '../../context/LanguageContext';

export default function ProjectsGrid() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { t } = useTranslation();

  useEffect(() => {
    Promise.all([api.get<Project[]>('/projects'), api.get<string[]>('/projects/tags')])
      .then(([p, t]) => { setProjects(p); setTags(t); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeTag ? projects.filter(p => [...(p.tags || []), ...(p.tech_stack || [])].includes(activeTag)) : projects;

  return (
    <section id="projects" className="w-full px-[5%] py-24">
      <div className="mb-14">
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-10 h-0.5 bg-gradient-to-r from-red-600 via-red-500 to-slate-400" />
          <span className="text-xs font-semibold text-red-500 uppercase tracking-widest">{t('portfolio_tag')}</span>
        </div>
        <h2 className="section-title text-5xl mb-5 tracking-tight font-extrabold">{t('portfolio_title')}</h2>
        <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">{t('portfolio_desc')}</p>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveTag(null)}
            className={`badge border px-3 py-1 transition-colors ${!activeTag
              ? 'bg-red-500/20 text-red-500 border-red-500/40'
              : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:text-slate-200'}`}
          >
            {t('portfolio_filter_all')}
          </button>
          {tags.map(tag => (
            <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`badge border px-3 py-1 transition-colors ${activeTag === tag
                ? 'bg-red-500/20 text-red-500 border-red-500/40'
                : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:text-slate-200'}`}>
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card h-48 animate-pulse bg-slate-800/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-center py-12">No projects found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </section>
  );
}
