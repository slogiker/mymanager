import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import {
  AnalyticsTab,
  MessagesTab,
  ProjectsTab,
  SkillsTab,
  UsersTab,
} from '../components/dashboard/tabs';
import { ServicesTab } from '../components/admin';

const TABS = [
  { id: 'messages', label: 'Messages' },
  { id: 'users', label: 'Users' },
  { id: 'services', label: 'Services' },
  { id: 'projects', label: 'Projects' },
  { id: 'skills', label: 'Skills' },
  { id: 'analytics', label: 'Analytics' },
];

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'messages';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-24 pb-12">
        <div className="mb-6">
          <h1 className="text-3xl font-bold gradient-text">Admin</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your portfolio content</p>
        </div>
        <nav className="flex flex-wrap gap-1 border-b border-slate-700 mb-6 pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSearchParams({ tab: t.id })}
              className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-slate-800 text-cyan-300 ring-1 ring-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        {tab === 'messages' && <MessagesTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'services' && <ServicesTab />}
        {tab === 'projects' && <ProjectsTab />}
        {tab === 'skills' && <SkillsTab />}
        {tab === 'analytics' && <AnalyticsTab />}
      </main>
    </div>
  );
}
