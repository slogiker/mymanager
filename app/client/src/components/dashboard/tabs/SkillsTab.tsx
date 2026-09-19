import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Skill } from '../../../types';
import { api } from '../../../lib/api';
import { Modal, Field, ErrBox, Spinner } from '../common/DashboardPrimitives';

export interface SkillForm {
  name: string;
  category: string;
  proficiency: number;
  color: string;
}

const SKILL_EMPTY: SkillForm = { name: '', category: '', proficiency: 4, color: '#ef4444' };

export function SkillsTab() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [modal, setModal] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>('');
  const [editing, setEditing] = useState<Skill | null>(null);
  const [form, setForm] = useState<SkillForm>(SKILL_EMPTY);

  const load = async () => {
    setLoading(true);
    try {
      setSkills(await api.get<Skill[]>('/skills'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(SKILL_EMPTY);
    setModalError('');
    setModal(true);
  };

  const openEdit = (s: Skill) => {
    setEditing(s);
    setForm({
      name: s.name || '',
      category: s.category || '',
      proficiency: s.proficiency ?? 4,
      color: s.color || '#ef4444',
    });
    setModalError('');
    setModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setModalError('');
    try {
      if (editing) await api.put(`/skills/${editing.id}`, form);
      else await api.post('/skills', form);
      setModal(false);
      setModalError('');
      load();
    } catch (e) {
      setModalError((e as Error).message);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete skill?')) return;
    try {
      await api.delete(`/skills/${id}`);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Skills ({skills.length})</h2>
        <button onClick={openNew} className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-all">
          <Plus className="w-3.5 h-3.5" />
          Add Skill
        </button>
      </div>

      <ErrBox msg={error} />

      {loading ? <Spinner /> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {skills.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-[#16181f]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color || '#ef4444' }} />
                <span className="text-xs font-semibold text-slate-200 truncate">{s.name}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <button onClick={() => openEdit(s)} className="p-1 text-slate-500 hover:text-slate-300"><Edit2 className="w-3 h-3" /></button>
                <button onClick={() => remove(s.id)} className="p-1 text-slate-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modal}
        onClose={() => { setModal(false); setModalError(''); }}
        title={editing ? 'Edit Skill' : 'Add Skill'}
        footer={
          <>
            <button onClick={() => { setModal(false); setModalError(''); }} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">Cancel</button>
            <button onClick={submit} className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold">Save</button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-3">
          <ErrBox msg={modalError} />
          <Field label="Skill Name"><input className="input-field" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Category"><input className="input-field" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} /></Field>
          <Field label="Proficiency (1-5)">
            <input type="number" min="1" max="5" className="input-field" value={form.proficiency} onChange={(e) => setForm(f => ({ ...f, proficiency: Number(e.target.value) }))} />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
