import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Modal, Field, ErrBox } from '../common';
import { api } from '../../../lib/api';

export interface ServiceForm {
  title: string;
  url: string;
  description: string;
  icon: string;
  category: string;
  is_private: boolean;
  requires_vpn: boolean;
}

export interface ServiceFormModalProps {
  open: boolean;
  onClose: () => void;
  form: ServiceForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  isEditing: boolean;
  modalError: string;
  onSubmit: (e: React.FormEvent) => void;
}

export function ServiceFormModal({
  open,
  onClose,
  form,
  setForm,
  isEditing,
  modalError,
  onSubmit,
}: ServiceFormModalProps) {
  const [testingUrl, setTestingUrl] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'online' | 'error' | 'offline' | 'timeout';
    statusCode?: number;
    statusText?: string;
    error?: string;
    latency?: string;
  } | null>(null);

  const setFormField = (k: keyof ServiceForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const val = e.target.type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.value;
    setForm(f => ({ ...f, [k]: val }));
  };

  const testUrl = async () => {
    if (!form.url || !form.url.startsWith('http')) {
      setTestResult({
        status: 'offline',
        error: 'Please enter a valid http:// or https:// URL first',
        latency: '0ms',
      });
      return;
    }
    setTestingUrl(true);
    setTestResult(null);
    try {
      const res = await api.post<any>('/services/test', { url: form.url });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        status: 'offline',
        error: err.message || 'Service is unreachable or offline',
        latency: 'timeout',
      });
    } finally {
      setTestingUrl(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Service Card' : 'Add New Service Card'}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/20 transition-all"
          >
            {isEditing ? 'Save Changes' : 'Create Service Card'}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <ErrBox msg={modalError} />
        <Field label="Service Name" required>
          <input
            className="input-field"
            value={form.title}
            onChange={setFormField('title')}
            placeholder="Jellyfin, Home Assistant, Pi-hole..."
            required
            autoFocus
          />
        </Field>
        <Field label="Destination URL (Local IP, Domain, or Port)" required>
          <div className="flex gap-2">
            <input
              className="input-field flex-1 font-mono text-xs"
              value={form.url}
              onChange={setFormField('url')}
              placeholder="http://192.168.1.136:8096"
              required
            />
            <button
              type="button"
              disabled={testingUrl}
              onClick={testUrl}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5"
            >
              {testingUrl ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Pinging...</span>
                </>
              ) : (
                <span>Test Online</span>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between mt-2 pt-1 text-[11px] text-slate-400">
            <span>Force HTTPS (SSL)</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.url.startsWith('https://')}
                onChange={(e) => {
                  const checked = e.target.checked;
                  let raw = form.url.replace(/^https?:\/\//, '');
                  setForm(f => ({ ...f, url: checked ? `https://${raw}` : `http://${raw}` }));
                }}
                className="sr-only peer"
              />
              <button
                type="button"
                onClick={() => {
                  const isHttps = form.url.startsWith('https://');
                  let raw = form.url.replace(/^https?:\/\//, '');
                  setForm(f => ({ ...f, url: isHttps ? `http://${raw}` : `https://${raw}` }));
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  form.url.startsWith('https://') ? 'bg-red-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    form.url.startsWith('https://') ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </label>
          </div>

          {testResult && (
            <div
              className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono border ${
                testResult.status === 'online'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  testResult.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>
                {testResult.status === 'online'
                  ? `Online · HTTP ${testResult.statusCode || 200} ${testResult.statusText || 'OK'} (${testResult.latency})`
                  : `Offline · ${testResult.error || 'Connection failed'} (${testResult.latency})`}
              </span>
            </div>
          )}
        </Field>
        <Field label="Description (Optional note)">
          <textarea
            className="input-field"
            rows={2}
            value={form.description}
            onChange={setFormField('description')}
            placeholder="Self-hosted personal media streaming service..."
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Icon Name or URL">
            <input
              className="input-field"
              value={form.icon}
              onChange={setFormField('icon')}
              placeholder="plex, docker, or http://..."
            />
          </Field>
          <Field label="Category / Column">
            <input
              className="input-field"
              value={form.category}
              onChange={setFormField('category')}
              placeholder="Media, Storage, Infrastructure..."
            />
          </Field>
        </div>
        <div className="pt-2 text-xs text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.requires_vpn}
              onChange={setFormField('requires_vpn')}
              className="rounded accent-red-500"
            />
            <span>Requires WireGuard / VPN</span>
          </label>
        </div>
      </form>
    </Modal>
  );
}
