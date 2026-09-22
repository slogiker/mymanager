import { useState, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export default function GithubReadme() {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    fetch('https://api.github.com/repos/slogiker/slogiker/readme')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(async data => {
        const decoded = atob(data.content);
        const parsed = await marked.parse(decoded);
        return DOMPurify.sanitize(parsed as string);
      })
      .then(parsedHtml => {
        setHtml(parsedHtml);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <section id="portfolio" className="w-full px-[5%] py-20 border-t border-slate-800/40">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-0.5 bg-gradient-to-r from-red-600 to-slate-400" />
          <span className="text-xs font-medium text-red-500 uppercase tracking-widest">Portfolio</span>
        </div>
        <h2 className="section-title text-4xl mb-4">About Me & Activities</h2>
      </div>

      <div className="card p-10">
        {loading ? (
          <div className="flex items-center gap-3 text-slate-400">
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
            </svg>
            <span>Loading portfolio README...</span>
          </div>
        ) : error ? (
          <p className="text-slate-500">Could not load portfolio content.</p>
        ) : (
          <div 
            className="prose prose-invert max-w-none 
                       prose-headings:text-slate-100 prose-headings:font-bold 
                       prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                       prose-p:text-slate-300 prose-p:leading-relaxed
                       prose-a:text-cyan-400 hover:prose-a:text-cyan-300 hover:prose-a:underline
                       prose-code:text-cyan-200 prose-code:bg-slate-950/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                       prose-li:text-slate-300 prose-ul:list-disc prose-ol:list-decimal"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
          />
        )}
      </div>
    </section>
  );
}
