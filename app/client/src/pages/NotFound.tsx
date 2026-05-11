import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center">
      <div className="animate-fade-in">
        <p className="text-8xl font-extrabold gradient-text mb-4 leading-none">404</p>
        <h1 className="text-2xl font-bold text-slate-100 mb-3">Page not found</h1>
        <p className="text-slate-400 mb-8 max-w-sm mx-auto">
          This page doesn't exist or was moved.
        </p>
        <Link to="/" className="btn-primary">← Back to portfolio</Link>
      </div>
    </div>
  );
}
