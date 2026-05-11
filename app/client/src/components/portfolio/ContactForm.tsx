import { useState } from 'react';
import { api } from '../../lib/api';

interface FormState {
  name: string;
  email: string;
  subject: string;
  content: string;
  _hp: string;
}

type SubmitState = 'idle' | 'loading' | 'success' | 'error';

export default function ContactForm() {
  const [form, setForm] = useState<FormState>({ name: '', email: '', subject: '', content: '', _hp: '' });
  const [state, setState] = useState<SubmitState>('idle');
  const [error, setError] = useState<string>('');

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setState('loading');
    setError('');
    try {
      await api.post('/messages', { name: form.name, email: form.email, subject: form.subject, content: form.content, _honeypot: form._hp });
      setState('success');
    } catch (err) {
      setError((err as Error).message || 'Failed to send. Try again.');
      setState('error');
    }
  }

  return (
    <section id="contact" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 border-t border-slate-800/40">
      <div className="grid lg:grid-cols-2 gap-12 items-start">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500" />
            <span className="text-xs font-medium text-cyan-400 uppercase tracking-widest">Contact</span>
          </div>
          <h2 className="section-title text-4xl mb-4">Let's talk</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Got a project in mind, a job opportunity, or just want to say hi? Send a message and I'll get back to you.
          </p>
          <div className="space-y-3">
            <a href="mailto:plibersek.daniel@gmail.com" className="flex items-center gap-3 text-slate-400 hover:text-slate-200 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              plibersek.daniel@gmail.com
            </a>
            <a href="https://github.com/slogiker" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-slate-400 hover:text-slate-200 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
              </div>
              github.com/slogiker
            </a>
          </div>
        </div>

        <div className="card p-6">
          {state === 'success' ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Message sent!</h3>
              <p className="text-slate-400 text-sm mb-4">I'll get back to you soon.</p>
              <button onClick={() => { setState('idle'); setForm({ name: '', email: '', subject: '', content: '', _hp: '' }); }}
                className="btn-outline text-sm">
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Name *</label>
                  <input className="input-field" placeholder="Your name" value={form.name} onChange={set('name')} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Email *</label>
                  <input type="email" className="input-field" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Subject</label>
                <input className="input-field" placeholder="What's it about?" value={form.subject} onChange={set('subject')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Message *</label>
                <textarea className="input-field resize-none" rows={5} placeholder="Your message..." value={form.content} onChange={set('content')} required />
              </div>

              {/* honeypot */}
              <input type="text" name="_hp" value={form._hp} onChange={set('_hp')} style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button type="submit" disabled={state === 'loading'} className="btn-primary w-full justify-center py-2.5">
                {state === 'loading' ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</>
                ) : 'Send message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
