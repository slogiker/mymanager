import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Service } from '../../types';
import { Modal, Field, ErrBox, Spinner } from '../dashboard/common';

function StatusDot({ status }: { status: string | null | undefined }) {
  const color = status === 'online' ? 'bg-green-500' : status === 'offline' || status === 'timeout' ? 'bg-red-500' : 'bg-slate-500';
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color} flex-shrink-0`} title={status || 'unknown'} />;
}

export interface ServiceForm {
  title: string;
  url: string;
  description: string;
  icon: string;
  category: string;
  is_private: boolean;
  requires_vpn: boolean;
}

const SVC_EMPTY: ServiceForm = {
  title: '',
  url: '',
  description: '',
  icon: '',
  category: '',
  is_private: false,
  requires_vpn: false,
};

export function ServicesTab() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [modal, setModal] = useState<boolean>(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(SVC_EMPTY);

  const load = async () => {
    setLoading(true);
    try {
      setServices(await api.get<Service[]>('/services'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (k: keyof ServiceForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value,
    }));

  const openNew = () => {
    setEditing(null);
    setForm(SVC_EMPTY);
    setModal(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      title: s.title || '',
      url: s.url || '',
      description: s.description || '',
      icon: s.icon || '',
      category: s.category || '',
      is_private: !!s.is_private,
      requires_vpn: !!s.requires_vpn,
    });
    setModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) await api.put(`/services/${editing.id}`, form);
      else await api.post('/services', form);
      setModal(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete service?')) return;
    try {
      await api.delete(`/services/${id}`);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-100">Services</h2>
        <button onClick={openNew} className="btn-primary">
          Add service
        </button>
      </div>
      <ErrBox msg={error} />
      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <StatusDot status={s.status} />
                  <h3 className="font-semibold text-slate-100 truncate">{s.title}</h3>
                </div>
                {s.category && (
                  <span className="badge bg-slate-700 text-slate-200 text-xs flex-shrink-0">
                    {s.category}
                  </span>
                )}
              </div>
              {s.description && (
                <p className="text-sm text-slate-300 mb-2 line-clamp-2">{s.description}</p>
              )}
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="block text-xs text-cyan-400 hover:underline truncate"
              >
                {s.url}
              </a>
              <div className="flex flex-wrap gap-1 mt-2">
                {s.is_private && (
                  <span className="badge bg-slate-700 text-slate-300 text-xs">private</span>
                )}
                {s.requires_vpn && (
                  <span className="badge bg-purple-700/40 text-purple-200 text-xs">vpn</span>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(s)} className="btn-outline">
                  Edit
                </button>
                <button onClick={() => remove(s.id)} className="btn-danger">
                  Delete
                </button>
              </div>
            </div>
          ))}
          {services.length === 0 && <div className="text-slate-400 text-sm">No services.</div>}
        </div>
      )}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit service' : 'Add service'}
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn-outline">
              Cancel
            </button>
            <button onClick={submit} className="btn-primary">
              {editing ? 'Save' : 'Create'}
            </button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-3">
          <Field label="Title">
            <input className="input-field" required value={form.title} onChange={set('title')} />
          </Field>
          <Field label="URL">
            <input className="input-field" required value={form.url} onChange={set('url')} />
          </Field>
          <Field label="Description">
            <textarea
              className="input-field"
              rows={2}
              value={form.description}
              onChange={set('description')}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Icon">
              <input className="input-field" value={form.icon} onChange={set('icon')} />
            </Field>
            <Field label="Category">
              <input className="input-field" value={form.category} onChange={set('category')} />
            </Field>
          </div>
          <div className="flex gap-4 text-sm text-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_private}
                onChange={set('is_private')}
              />{' '}
              Private
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.requires_vpn}
                onChange={set('requires_vpn')}
              />{' '}
              Requires VPN
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
