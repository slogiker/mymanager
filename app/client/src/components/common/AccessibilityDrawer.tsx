import { useState, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';

export default function AccessibilityDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { language, setLanguage, t } = useTranslation();

  // State management
  const [fontSize, setFontSizeState] = useState<string>(() => {
    return localStorage.getItem('font-size') || 'normal';
  });
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem('high-contrast') === 'true';
  });
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    return localStorage.getItem('reduced-motion') === 'true';
  });
  const [dyslexicFont, setDyslexicFont] = useState<boolean>(() => {
    return localStorage.getItem('dyslexic-font') === 'true';
  });

  // Apply font size
  useEffect(() => {
    const size = fontSize === 'lg' ? '18px' : fontSize === 'xl' ? '20px' : '16px';
    document.documentElement.style.fontSize = size;
  }, [fontSize]);

  // Apply high contrast
  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  // Apply reduced motion
  useEffect(() => {
    if (reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [reducedMotion]);

  // Apply dyslexic font
  useEffect(() => {
    if (dyslexicFont) {
      document.documentElement.classList.add('dyslexic-font');
    } else {
      document.documentElement.classList.remove('dyslexic-font');
    }
  }, [dyslexicFont]);

  const handleFontSizeChange = (size: string) => {
    setFontSizeState(size);
    localStorage.setItem('font-size', size);
  };

  const handleToggleContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    localStorage.setItem('high-contrast', String(next));
  };

  const handleToggleMotion = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    localStorage.setItem('reduced-motion', String(next));
  };

  const handleToggleDyslexic = () => {
    const next = !dyslexicFont;
    setDyslexicFont(next);
    localStorage.setItem('dyslexic-font', String(next));
  };

  const handleReset = () => {
    setFontSizeState('normal');
    localStorage.setItem('font-size', 'normal');
    setHighContrast(false);
    localStorage.setItem('high-contrast', 'false');
    setReducedMotion(false);
    localStorage.setItem('reduced-motion', 'false');
    setDyslexicFont(false);
    localStorage.setItem('dyslexic-font', 'false');
  };

  // Close on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden text-slate-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-heading"
    >
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-sm bg-[#1e2027] border-l border-slate-800 p-6 flex flex-col shadow-2xl relative overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </span>
              <h2 id="accessibility-heading" className="text-base font-bold text-slate-100">
                {t('side_accessibility')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Controls List */}
          <div className="space-y-6 flex-1">
            {/* Language */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                {t('side_language')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    language === 'en'
                      ? 'border-red-500 text-red-400 bg-red-500/10'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  English (EN)
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('sl')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    language === 'sl'
                      ? 'border-red-500 text-red-400 bg-red-500/10'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  Slovenščina (SL)
                </button>
              </div>
            </div>

            {/* Font size */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                {t('side_fontsize')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['normal', 'lg', 'xl'] as const).map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleFontSizeChange(size)}
                    className={`py-2 px-2 rounded-xl text-[11px] font-semibold border transition-all ${
                      fontSize === size
                        ? 'border-red-500 text-red-400 bg-red-500/10'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {t(`side_font_${size === 'normal' ? 'normal' : size === 'lg' ? 'large' : 'xl'}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* High Contrast Mode Toggle */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-200">{t('side_contrast')}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={highContrast}
                  onClick={handleToggleContrast}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    highContrast ? 'bg-red-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      highContrast ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">{t('side_contrast_desc')}</p>
            </div>

            {/* Reduced Motion Toggle */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-200">{t('side_motion')}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={reducedMotion}
                  onClick={handleToggleMotion}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    reducedMotion ? 'bg-red-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      reducedMotion ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">{t('side_motion_desc')}</p>
            </div>

            {/* Dyslexia-Friendly Font Toggle */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-200">{t('side_dyslexic')}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={dyslexicFont}
                  onClick={handleToggleDyslexic}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    dyslexicFont ? 'bg-red-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      dyslexicFont ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">{t('side_dyslexic_desc')}</p>
            </div>
          </div>

          {/* Footer Reset */}
          <div className="pt-6 border-t border-slate-800 mt-6">
            <button
              type="button"
              onClick={handleReset}
              className="w-full py-2 px-4 rounded-xl text-xs font-semibold border border-slate-700/60 hover:border-slate-500 text-slate-400 hover:text-white transition-colors"
            >
              {t('side_reset')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
