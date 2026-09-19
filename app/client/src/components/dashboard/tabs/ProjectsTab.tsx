import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Project } from '../../../types';
import { api } from '../../../lib/api';
import { Modal, Field, ErrBox, Spinner } from '../common/DashboardPrimitives';

export interface ProjectForm {
  title: string;
  description: string;
  url: string;
  demo_url: string;
  github_url: string;
  thumbnail_url: string;
  tech_stack: string;
  tags: string;
  featured: boolean;
}

const PROJ_EMPTY: ProjectForm = {
  title: '',
  description: '',
  url: '',
  demo_url: '',
  github_url: '',
  thumbnail_url: '',
  tech_stack: '',
  tags: '',
  featured: false,
};

export function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [modal, setModal] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>('');
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectForm>(PROJ_EMPTY);

  const load = async () => {
    setLoading(true);
    try {
      setProjects(await api.get<Project[]>('/projects'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k: keyof ProjectForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const toArr = (s: string): string[] => s.split(',').map((x) => x.trim()).filter(Boolean);
  const fromArr = (v: string[] | string | null | undefined): string => (Array.isArray(v) ? v.join(', ') : (v || ''));

  const openNew = () => {
    setEditing(null);
    setForm(PROJ_EMPTY);
    setModalError('');
    setModal(true);
  };

  const openEdit = (p: Project) => {
    setEditing(p);
    setForm({
      title: p.title || '',
      description: p.description || '',
      url: p.url || '',
      demo_url: p.demo_url || '',
      github_url: p.github_url || '',
      thumbnail_url: p.thumbnail_url || '',
      tech_stack: fromArr(p.tech_stack),
      tags: fromArr(p.tags),
      featured: !!p.featured,
    });
    setModalError('');
    setModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setModalError('');
    const payload = { ...form, tech_stack: toArr(form.tech_stack), tags: toArr(form.tags) };
    try {
      if (editing) await api.put(`/projects/${editing.id}`, payload);
      else await api.post('/projects', payload);
      setModal(false);
      setModalError('');
      load();
    } catch (e) {
      setModalError((e as Error).message);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete project?')) return;
    try {
      await api.delete(`/projects/${id}`);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">All Projects ({projects.length})</h2>
        <button onClick={openNew} className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-all">
          <Plus className="w-3.5 h-3.5" />
          Add Project
        </button>
      </div>

      <ErrBox msg={error} />

      {loading ? <Spinner /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {projects.map((p) => (
            <div key={p.id} className="flex flex-col justify-between p-4 rounded-xl border border-slate-800 bg-[#16181f] hover:border-slate-700 transition-colors">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm text-slate-100">{p.title}</h3>
                  {p.featured && <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/20">featured</span>}
                </div>
                {p.description && <p className="text-xs text-slate-400 mt-2 line-clamp-2">{p.description}</p>}
                <div className="flex flex-wrap gap-1 mt-3">
                  {(p.tech_stack || []).map(t => (
                    <span key={t} className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-750">{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-800/80">
                <div className="flex gap-2">
                  {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-red-400 hover:underline">Link</a>}
                  {p.github_url && <a href={p.github_url} target="_blank" rel="noreferrer" className="text-xs text-slate-400 hover:underline">GitHub</a>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(p)} className="p-1 text-slate-500 hover:text-slate-200"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => remove(p.id)} className="p-1 text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modal}
        onClose={() => { setModal(false); setModalError(''); }}
        title={editing ? 'Edit Project' : 'Add Project'}
        footer={
          <>
            <button onClick={() => { setModal(false); setModalError(''); }} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">Cancel</button>
            <button onClick={submit} className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold">Save</button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-3">
          <ErrBox msg={modalError} />
          <Field label="Title"><input className="input-field" required value={form.title} onChange={set('title')} /></Field>
          <Field label="Description"><textarea className="input-field" rows={2} value={form.description} onChange={set('description')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Live URL"><input className="input-field" value={form.url} onChange={set('url')} /></Field>
            <Field label="GitHub URL"><input className="input-field" value={form.github_url} onChange={set('github_url')} /></Field>
          </div>
          <Field label="Tech Stack (comma separated)"><input className="input-field" value={form.tech_stack} onChange={set('tech_stack')} /></Field>
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
            <input type="checkbox" checked={form.featured} onChange={set('featured')} className="rounded accent-red-500" />
            <span>Feature on front page</span>
          </label>
        </form>
      </Modal>
    </div>
  );
}
