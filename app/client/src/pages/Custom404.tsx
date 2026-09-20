import { ArrowLeft, Compass } from 'lucide-react';

export function Custom404() {
  return (
    <div className="min-h-screen bg-[#111216] text-slate-200 flex items-center justify-center px-4 relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-slate-700/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-10 max-w-md w-full mx-auto text-center p-8 sm:p-10 rounded-2xl bg-[#16181f]/80 border border-slate-800/80 backdrop-blur-xl shadow-2xl animate-fade-in">
        {/* Minimal Icon Badge */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-slate-800/40 border border-slate-700/60 text-red-500 mb-6 shadow-[0_0_20px_-4px_rgba(239,68,68,0.3)]">
          <Compass className="w-7 h-7 animate-pulse-slow" />
        </div>

        {/* 404 Status Code */}
        <p className="text-7xl sm:text-8xl font-black tracking-tight bg-gradient-to-b from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-2 select-none">
          404
        </p>

        {/* Heading */}
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 mb-3 tracking-tight">
          Page Not Found
        </h1>

        {/* Description */}
        <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
          The page you are looking for does not exist, has been moved, or is temporarily unavailable.
        </p>

        {/* Back to Main Link */}
        <div>
          <a
            href="https://slogiker.si"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-[#7F1D1D] hover:from-red-500 hover:to-red-700 text-white text-sm font-semibold shadow-[0_0_25px_-5px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.6)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Main</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default Custom404;
