import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { useTranslation } from '../../context/LanguageContext';

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
  const [error, setError] = useState<string | null>(null);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }));
  };

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (form._hp) return;
    setState('loading');
    setError(null);

    try {
      await api.post('/contact', {
        name: form.name,
        email: form.email,
        subject: form.subject,
        content: form.content
      });
      setState('success');
    } catch (err) {
      setError((err as Error).message || 'Failed to send. Try again.');
      setState('error');
    }
  }

  return (
    <section id="contact" ref={ref} className="py-32">
      <div className="max-w-6xl mx-auto w-full px-6 md:px-10 lg:px-16">
        <div
          className="grid lg:grid-cols-2 gap-20 items-start"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Left side — info */}
          <div>
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-slate-600">
              {t('contact_tag')}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mt-2 tracking-tight">
              {t('contact_title')}
            </h2>
            <p className="text-slate-500 text-base mt-4 leading-relaxed font-light max-w-md">
              {t('contact_desc')}
            </p>

            <div className="mt-10 space-y-4">
              <a href="mailto:plibersek.daniel@gmail.com"
                className="flex items-center gap-3 text-sm text-slate-500 hover:text-slate-300 transition-colors duration-300 group">
                <div className="w-9 h-9 rounded-lg border border-slate-800/60 flex items-center justify-center group-hover:border-slate-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                plibersek.daniel@gmail.com
              </a>
              <a href="https://github.com/slogiker" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-slate-500 hover:text-slate-300 transition-colors duration-300 group">
                <div className="w-9 h-9 rounded-lg border border-slate-800/60 flex items-center justify-center group-hover:border-slate-600 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                </div>
                github.com/slogiker
              </a>
            </div>
          </div>

          {/* Right side — form */}
          <div>
            {state === 'success' ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-full border border-green-500/30 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-slate-300 text-sm font-medium mb-5">{t('contact_success')}</p>
                <button
                  onClick={() => { setState('idle'); setForm({ name: '', email: '', subject: '', content: '', _hp: '' }); }}
                  className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4 transition-colors"
                >
                  {t('contact_reset')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-2 tracking-wide uppercase">
                      {t('contact_name')}
                    </label>
                    <input
                      className="w-full px-4 py-3 bg-transparent border border-slate-700/60 rounded-xl text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-red-500/50 transition-colors duration-300"
                      placeholder={t('contact_name')}
                      value={form.name}
                      onChange={set('name')}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-2 tracking-wide uppercase">
                      {t('contact_email')}
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 bg-transparent border border-slate-700/60 rounded-xl text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-red-500/50 transition-colors duration-300"
                      placeholder={t('contact_email')}
                      value={form.email}
                      onChange={set('email')}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-2 tracking-wide uppercase">
                    {t('contact_subject')}
                  </label>
                  <input
                    className="w-full px-4 py-3 bg-transparent border border-slate-700/60 rounded-xl text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-red-500/50 transition-colors duration-300"
                    placeholder={t('contact_subject')}
                    value={form.subject}
                    onChange={set('subject')}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-2 tracking-wide uppercase">
                    {t('contact_message')}
                  </label>
                  <textarea
                    className="w-full px-4 py-3 bg-transparent border border-slate-700/60 rounded-xl text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-red-500/50 transition-colors duration-300 resize-none"
                    rows={5}
                    placeholder={t('contact_message')}
                    value={form.content}
                    onChange={set('content')}
                    required
                  />
                </div>

                {/* honeypot */}
                <input type="text" name="_hp" value={form._hp} onChange={set('_hp')} style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

                {error && (
                  <p className="text-red-400/80 text-sm">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={state === 'loading'}
                  className="inline-flex items-center gap-2.5 px-7 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-full transition-all duration-300 hover:shadow-[0_0_30px_-8px_rgba(239,68,68,0.35)]"
                >
                  {state === 'loading' ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('contact_sending')}
                    </>
                  ) : t('contact_send')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
