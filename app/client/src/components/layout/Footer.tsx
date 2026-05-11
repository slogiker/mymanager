export default function Footer() {
  return (
    <footer className="border-t border-slate-800/60 py-8 mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-slate-500 text-sm">
          © {new Date().getFullYear()} Daniel Pliberšek
        </p>
        <p className="text-slate-600 text-xs">Built with React & Express</p>
      </div>
    </footer>
  );
}
