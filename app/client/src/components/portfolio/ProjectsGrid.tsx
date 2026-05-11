import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import ProjectCard from './ProjectCard';
import type { Project } from '../../types';

export default function ProjectsGrid() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([api.get<Project[]>('/projects'), api.get<string[]>('/projects/tags')])
      .then(([p, t]) => { setProjects(p); setTags(t); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeTag ? projects.filter(p => [...(p.tags || []), ...(p.tech_stack || [])].includes(activeTag)) : projects;

  return (
    <section id="projects" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500" />
          <span className="text-xs font-medium text-cyan-400 uppercase tracking-widest">Portfolio</span>
        </div>
        <h2 className="section-title text-4xl mb-4">Things I've built</h2>
        <p className="text-slate-400 max-w-xl">A collection of projects I've worked on. Most are open-source.</p>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveTag(null)}
            className={`badge border px-3 py-1 transition-colors ${!activeTag
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
              : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:text-slate-200'}`}
          >
            All
          </button>
          {tags.map(tag => (
            <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`badge border px-3 py-1 transition-colors ${activeTag === tag
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
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
