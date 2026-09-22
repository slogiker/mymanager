import { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'sl';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const TRANSLATIONS = {
  en: {
    // Navbar
    nav_about: 'About',
    nav_apps: 'Applications',
    nav_skills: 'Skills',
    nav_contact: 'Contact',
    nav_dashboard: 'Dashboard',
    nav_terminal: 'Terminal',
    nav_files: 'Files',
    nav_profile: 'Profile',
    nav_signout: 'Sign out',
    nav_signin: 'Sign in',
    // Hero
    hero_role: 'DEVELOPER & SYSTEM ENTHUSIAST',
    hero_title: 'Daniel Pliberšek',
    hero_desc: 'I am a developer, homelab enthusiast, and amateur radio operator. Constantly building tools, managing systems, and exploring new technologies. Welcome to my personal corner of the web.',
    hero_explore: 'Explore my apps',
    hero_getintouch: 'Get in touch',
    hero_resume: 'Resume',
    // Portfolio/Projects
    portfolio_title: "Things I've built",
    portfolio_desc: "A collection of projects I've worked on. Most are open-source.",
    portfolio_filter_all: 'All Projects',
    portfolio_tag: 'Portfolio',
    // Applications & Selected Projects
    apps_opensource: 'Open Source',
    apps_title: 'Applications',
    apps_selected: 'Selected projects',
    apps_websites_title: 'Selected Websites',
    // Skills
    skills_tag: 'Tech Stack',
    skills_title: 'What I work with',
    skills_desc: 'Technologies and tools I use regularly to build apps and manage systems.',
    // Contact
    contact_tag: 'Contact',
    contact_title: "Let's talk",
    contact_desc: "Got a project in mind, a job opportunity, or just want to say hi? Send a message and I'll get back to you.",
    contact_name: 'Name',
    contact_email: 'Email',
    contact_subject: 'Subject',
    contact_message: 'Message',
    contact_send: 'Send message',
    contact_sending: 'Sending...',
    contact_success: 'Message sent! I\'ll get back to you soon.',
    contact_reset: 'Send another message',
    // Login
    login_welcome: 'Welcome back',
    login_desc: 'Sign in to continue to your dashboard',
    login_user: 'Username',
    login_password: 'Password',
    login_btn: 'Sign in',
    login_signing: 'Signing in...',
    // Sidebar Accessibility
    side_accessibility: 'Accessibility Settings',
    side_language: 'Language / Jezik',
    side_fontsize: 'Text Size',
    side_font_normal: 'Normal',
    side_font_large: 'Large',
    side_font_xl: 'Extra Large',
    side_contrast: 'High Contrast Mode',
    side_contrast_desc: 'Increases contrast and black background for better readability',
    side_motion: 'Reduced Motion',
    side_motion_desc: 'Minimizes animations and transitions',
    side_dyslexic: 'Dyslexia Friendly Font',
    side_dyslexic_desc: 'Changes font family to support readers with dyslexia',
    side_reset: 'Reset to Defaults',
    side_on: 'Enabled',
    side_off: 'Disabled'
  },
  sl: {
    // Navbar
    nav_about: 'O meni',
    nav_apps: 'Aplikacije',
    nav_skills: 'Veščine',
    nav_contact: 'Kontakt',
    nav_dashboard: 'Nadzorna plošča',
    nav_terminal: 'Terminal',
    nav_files: 'Datoteke',
    nav_profile: 'Profil',
    nav_signout: 'Odjava',
    nav_signin: 'Prijava',
    // Hero
    hero_role: 'RAZVIJALEC & SISTEMSKI NAVDUŠENEC',
    hero_title: 'Daniel Pliberšek',
    hero_desc: 'Sem razvijalec, navdušenec nad domačimi strežniki in radioamater. Nenehno gradim orodja, upravljam sisteme in raziskujem nove tehnologije. Dobrodošli v mojem osebnem kotičku spleta.',
    hero_explore: 'Razišči moje aplikacije',
    hero_getintouch: 'Stopi v stik',
    hero_resume: 'Življenjepis',
    // Portfolio/Projects
    portfolio_title: 'Stvari, ki sem jih zgradil',
    portfolio_desc: 'Zbirka projektov, na katerih sem delal. Večina jih je odprtokodnih.',
    portfolio_filter_all: 'Vsi projekti',
    portfolio_tag: 'Portfolio',
    // Applications & Selected Projects
    apps_opensource: 'Odprta koda',
    apps_title: 'Aplikacije',
    apps_selected: 'Izbrani projekti',
    apps_websites_title: 'Izbrana spletna mesta',
    // Skills
    skills_tag: 'Tehnologije',
    skills_title: 'S čim delam',
    skills_desc: 'Tehnologije in orodja, ki jih redno uporabljam za gradnjo aplikacij in upravljanje sistemov.',
    // Contact
    contact_tag: 'Kontakt',
    contact_title: 'Pogovorimo se',
    contact_desc: 'Imate v mislih projekt, priložnost za delo ali pa želite samo reči živijo? Pošljite sporočilo in odgovoril vam bom.',
    contact_name: 'Ime',
    contact_email: 'E-pošta',
    contact_subject: 'Zadeva',
    contact_message: 'Sporočilo',
    contact_send: 'Pošlji sporočilo',
    contact_sending: 'Pošiljanje...',
    contact_success: 'Sporočilo poslano! Kmalu vam bom odgovoril.',
    contact_reset: 'Pošlji novo sporočilo',
    // Login
    login_welcome: 'Dobrodošli nazaj',
    login_desc: 'Prijavite se za nadaljevanje na nadzorno ploščo',
    login_user: 'Uporabniško ime',
    login_password: 'Geslo',
    login_btn: 'Prijava',
    login_signing: 'Prijava...',
    // Sidebar Accessibility
    side_accessibility: 'Nastavitve dostopnosti',
    side_language: 'Language / Jezik',
    side_fontsize: 'Velikost besedila',
    side_font_normal: 'Navadna',
    side_font_large: 'Velika',
    side_font_xl: 'Zelo velika',
    side_contrast: 'Visok kontrast',
    side_contrast_desc: 'Poveča kontrast in črno ozadje za lažje branje',
    side_motion: 'Zmanjšano gibanje',
    side_motion_desc: 'Zmanjša animacije in prehode',
    side_dyslexic: 'Pisava za dislektike',
    side_dyslexic_desc: 'Prilagodi pisavo za lažje branje z disleksijo',
    side_reset: 'Ponastavi na privzeto',
    side_on: 'Vključeno',
    side_off: 'Izključeno'
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('lang') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('lang', lang);
  };

  const t = (key: string): string => {
    return TRANSLATIONS[language][key as keyof typeof TRANSLATIONS['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
