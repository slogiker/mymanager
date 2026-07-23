interface AppItem {
  title: string;
  desc: string;
  url: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
}

const APPS: AppItem[] = [
  {
    title: 'MC-BOT',
    desc: 'Discord integration',
    url: 'https://github.com/slogiker/MC-BOT',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.873-.894.077.077 0 01-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 01.077-.011 19.82 19.82 0 0012.244 0 .075.075 0 01.078.012c.12.097.246.194.372.287a.075.075 0 01-.006.128 12.983 12.983 0 01-1.873.894.077.077 0 00-.041.106c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
      </svg>
    ),
  },
  {
    title: 'RGB LED Controller',
    desc: 'Flutter mobile app',
    url: 'https://github.com/slogiker/RGB-led-controller-flutter',
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 0A3.75 3.75 0 0011 18h1zm0-15V1.5m0 21V21m-9-9h1.5m16.5 0H21m-3.485-6.515l-1.06 1.06M6.045 17.955l-1.06 1.06M17.955 17.955l1.06 1.06M6.045 6.045l1.06-1.06" />
      </svg>
    ),
  },
  {
    title: 'Mod Updator',
    desc: 'Python automation utility',
    url: 'https://github.com/slogiker/mod-updator-python',
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-400',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14.25.18l.9.2.73.26.59.3.45.32.38.34.29.34.22.34.14.32.07.3L18 3v1.5h-4.5v-.75c0-.41-.34-.75-.75-.75H9.75c-.41 0-.75.34-.75.75v3.5c0 .41.34.75.75.75h3.5c.41 0 .75-.34.75-.75V7.5H18v3c0 .41-.34.75-.75.75H9.75a2.25 2.25 0 01-2.25-2.25v-3.5A2.25 2.25 0 019.75 3h3.5A2.25 2.25 0 0115.5.75v-.3c0-.1-.08-.18-.18-.18h-1.07zm-4.5 13.5v.75c0 .41.34.75.75.75h3c.41 0 .75-.34.75-.75v-3.5c0-.41-.34-.75-.75-.75h-3c-.41 0-.75.34-.75.75V11H6v-3c0-.41.34-.75.75-.75h7.5A2.25 2.25 0 0116.5 9.5v3.5A2.25 2.25 0 0114.25 15.25h-3A2.25 2.25 0 019 13.5v-.3c0-.1.08-.18.18-.18h1.07L9.75 13.68z" />
      </svg>
    ),
  },
  {
    title: 'MyManager',
    desc: 'Personal infrastructure portal',
    url: 'https://github.com/slogiker/mymanager',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m11.142 0L21.75 12l-4.179-2.25M12 5.75L6.429 9.75 12 13.75l5.571-4L12 5.75zm0 8l-5.571 4L12 21.75l5.571-4-5.571-4z" />
      </svg>
    ),
  },
];

export default function ApplicationsGrid() {
  return (
    <div className="max-w-7xl mx-auto w-full px-8 md:px-12 py-16">
      {/* Applications Section */}
      <section id="apps" className="mb-24">
        <div className="flex items-center gap-3.5 mb-10">
          <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3V7.5a3 3 0 013-3h13.5a3 3 0 013 3v3.75a3 3 0 01-3 3zm-13.5 0a3 3 0 00-3 3v.75a3 3 0 003 3h13.5a3 3 0 003-3v-.75a3 3 0 00-3-3" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Applications</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {APPS.map(app => (
            <a
              key={app.title}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card card-hover p-8 flex items-center gap-6 group"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${app.iconBg} ${app.iconColor}`}>
                {app.icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-slate-100 truncate group-hover:text-cyan-400 transition-colors">
                  {app.title}
                </h3>
                <p className="text-sm text-slate-400 mt-1 truncate">
                  {app.desc}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Websites I've Made Section */}
      <section className="mb-8">
        <div className="flex items-center gap-3.5 mb-10">
          <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Websites I've Made</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'PGD Majšperk Breg',
              desc: 'Official portal for the voluntary fire brigade PGD Majšperk Breg.',
              url: '#',
              iconBg: 'bg-red-500/10',
              iconColor: 'text-red-400',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 0A3.75 3.75 0 0011 18h1z" />
                </svg>
              ),
            },
            {
              title: 'Avtopihi',
              desc: 'Modern transport and vehicle logistics showcase website.',
              url: '#',
              iconBg: 'bg-blue-500/10',
              iconColor: 'text-blue-400',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124l-.09-1.46c-.035-.572-.257-1.118-.627-1.558l-2.45-2.94a2.25 2.25 0 00-1.722-.813H9.75a2.25 2.25 0 00-2.25 2.25v5.375c0 .621.504 1.125 1.125 1.125h9.75" />
                </svg>
              ),
            },
            {
              title: 'Tesarstvo Kamenšek',
              desc: 'Carpentry and premium roofing woodwork services presentation.',
              url: '#',
              iconBg: 'bg-amber-500/10',
              iconColor: 'text-amber-400',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              ),
            },
          ].map(site => (
            <a
              key={site.title}
              href={site.url}
              className="card card-hover p-6 flex flex-col justify-between min-h-[160px] group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${site.iconBg} ${site.iconColor}`}>
                  {site.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">
                  {site.title}
                </h3>
              </div>
              <p className="text-sm text-slate-450 mt-4 leading-relaxed">
                {site.desc}
              </p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
