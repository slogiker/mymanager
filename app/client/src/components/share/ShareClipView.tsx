import React, { useState } from 'react';
import { Download, File, ExternalLink, Copy, Check } from 'lucide-react';

export interface SharedClip {
  id: number;
  type: string;
  title: string | null;
  content: string | null;
  language: string | null;
  filename: string | null;
  file_path: string | null;
  mime_type: string | null;
  created_at: string;
}

export interface ShareClipViewProps {
  clip: SharedClip;
}

export function ShareClipView({ clip }: ShareClipViewProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col flex-1 gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
              Shared Snippet
            </span>
            <span className="text-xs text-slate-500">
              {new Date(clip.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white">
            {clip.title || 'Shared Clipboard Item'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {clip.content && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(clip.content!);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Content'}</span>
            </button>
          )}
          {clip.file_path && (
            <a
              href={clip.file_path}
              download={clip.filename || true}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/30 transition-all"
            >
              <Download size={14} /> Download Attachment
            </a>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-5">
        {clip.type === 'link' && clip.content && (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-blue-400 break-all text-sm">{clip.content}</span>
            <a
              href={clip.content}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0"
            >
              Open Link <ExternalLink size={13} />
            </a>
          </div>
        )}

        {clip.type === 'code' && clip.content && (
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#08090d]">
            <pre className="p-4 font-mono text-xs text-emerald-300 leading-relaxed overflow-x-auto selection:bg-emerald-500/20">
              <code>{clip.content}</code>
            </pre>
          </div>
        )}

        {clip.type !== 'code' && clip.type !== 'link' && clip.content && (
          <div className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed select-text">
            {clip.content}
          </div>
        )}

        {clip.file_path && clip.mime_type?.startsWith('image/') && (
          <div className="pt-2">
            <p className="text-xs font-semibold text-slate-400 mb-2">Attached Image:</p>
            <img
              src={clip.file_path}
              alt={clip.filename || 'Shared snippet image'}
              className="max-h-[550px] max-w-full rounded-xl object-contain border border-slate-800 bg-black/40"
            />
          </div>
        )}

        {clip.file_path && !clip.mime_type?.startsWith('image/') && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-3">
              <File size={22} className="text-amber-400" />
              <span className="text-sm font-medium text-slate-200">{clip.filename || 'Attached file'}</span>
            </div>
            <a
              href={clip.file_path}
              download={clip.filename || true}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5"
            >
              <Download size={13} /> Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
