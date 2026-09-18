import { useState, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';

type ConsentState = 'pending' | 'accepted' | 'rejected';

function getConsent(): ConsentState {
  const val = localStorage.getItem('cookie_consent');
  if (val === 'accepted' || val === 'rejected') return val;
  return 'pending';
}

export default function CookieConsent() {
  const [consent, setConsent] = useState<ConsentState>(() => getConsent());
  const [visible, setVisible] = useState(false);
  const { language } = useTranslation();

  useEffect(() => {
    if (consent === 'pending') {
      // Slight delay so the page loads first
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [consent]);

  function accept() {
    localStorage.setItem('cookie_consent', 'accepted');
    document.cookie = 'cookie_consent=accepted; path=/; max-age=31536000; SameSite=Lax';
    setConsent('accepted');
    setVisible(false);
  }

  function reject() {
    localStorage.setItem('cookie_consent', 'rejected');
    document.cookie = 'cookie_consent=rejected; path=/; max-age=31536000; SameSite=Lax';
    // Clear analytics cookie if it exists
    document.cookie = 'analytics_session=; path=/; max-age=0';
    setConsent('rejected');
    setVisible(false);
  }

  if (consent !== 'pending' || !visible) return null;

  const text = language === 'sl'
    ? {
        message: 'Ta spletna stran uporablja nujne piškotke za delovanje in analitične piškotke za izboljšanje izkušnje.',
        privacy: 'Politika zasebnosti',
        cookies: 'Politika piškotkov',
        accept: 'Sprejmi vse',
        reject: 'Samo nujni',
      }
    : {
        message: 'This site uses essential cookies to function and analytics cookies to improve your experience.',
        privacy: 'Privacy Policy',
        cookies: 'Cookie Policy',
        accept: 'Accept all',
        reject: 'Essential only',
      };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
      }}
    >
      <div className="max-w-2xl mx-auto bg-[#1a1c22] border border-slate-800/60 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
        <p className="text-sm text-slate-400 leading-relaxed mb-4">
          {text.message}{' '}
          <a href="/privacy" className="text-red-400 hover:text-red-300 underline underline-offset-2">{text.privacy}</a>
          {' · '}
          <a href="/cookies" className="text-red-400 hover:text-red-300 underline underline-offset-2">{text.cookies}</a>
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={accept}
            className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-full transition-colors"
          >
            {text.accept}
          </button>
          <button
            onClick={reject}
            className="px-5 py-2 border border-slate-700/50 hover:border-slate-600 text-slate-400 hover:text-white text-sm font-medium rounded-full transition-colors"
          >
            {text.reject}
          </button>
        </div>
      </div>
    </div>
  );
}
