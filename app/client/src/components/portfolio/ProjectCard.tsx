import type { Project } from '../../types';

interface TagColors {
  [key: string]: string;
}

const TAG_COLORS: TagColors = {
  JavaScript: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  TypeScript: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  React: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Python: 'bg-green-500/10 text-green-400 border-green-500/20',
  'Node.js': 'bg-green-600/10 text-green-300 border-green-600/20',
  Docker: 'bg-blue-600/10 text-blue-300 border-blue-600/20',
  default: 'bg-slate-700/50 text-slate-400 border-slate-600/50',
};

interface TagProps {
  name: string;
}

function Tag({ name }: TagProps) {
  const cls = TAG_COLORS[name] || TAG_COLORS.default;
  return (
    <span className={`badge border ${cls}`}>{name}</span>
  );
}

interface ProjectCardProps {
  project: Project & { live_url?: string | null };
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const { title, description, github_url, live_url, tech_stack = [], tags = [] } = project;
  const allTags = [...new Set([...tags, ...tech_stack])];

  return (
    <article className="card card-hover p-6 flex flex-col gap-4 h-full group">
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-slate-700/50 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <div className="flex gap-2">
          {github_url && (
            <a href={github_url} target="_blank" rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-200 transition-colors" aria-label="GitHub">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          )}
          {live_url && (
            <a href={live_url} target="_blank" rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-200 transition-colors" aria-label="Live demo">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-slate-100 mb-2 group-hover:text-cyan-400 transition-colors">{title}</h3>
        {description && <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">{description}</p>}
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.slice(0, 4).map(tag => <Tag key={tag} name={tag} />)}
          {allTags.length > 4 && <span className="badge bg-slate-700/50 text-slate-500 border-slate-600/50">+{allTags.length - 4}</span>}
        </div>
      )}
    </article>
  );
}
