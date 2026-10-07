import React from 'react';
import { Link } from 'react-router-dom';
import { Hourglass, Folder, RotateCw, Check, ArrowLeft } from 'lucide-react';
import { FileIcon } from '../files/fileIcons';

export interface ShareExpiredViewProps {
  expiredData: {
    expired: boolean;
    item_name?: string;
    expires_at?: string;
    type?: string;
  };
  askCopied: boolean;
  onAskForShare: () => void;
}

export function ShareExpiredView({
  expiredData,
  askCopied,
  onAskForShare,
}: ShareExpiredViewProps) {
  return (
    <div className="min-h-screen bg-[#111216] text-white flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-full max-w-md bg-[#17181e] border border-white/10 rounded-2xl shadow-2xl p-8 text-center relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

        {/* Hourglass Icon */}
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto mb-5 shadow-xl shadow-red-500/10">
          <Hourglass size={36} className="animate-pulse" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Share Link Has Expired</h2>
        <p className="text-xs text-slate-400 mb-6 max-w-sm mx-auto leading-relaxed">
          The owner set this link to expire on{' '}
          <span className="text-slate-200 font-semibold">
            {expiredData.expires_at ? new Date(expiredData.expires_at).toLocaleString() : 'a previous date'}
          </span>
          . For security reasons, the requested content is no longer accessible with this link.
        </p>

        {/* Item details card */}
        <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-xl mb-6 flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 flex items-center justify-center text-base shrink-0">
            {expiredData.type === 'folder' ? <Folder size={20} /> : <FileIcon fileName={expiredData.item_name} size={20} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-200 truncate">{expiredData.item_name}</p>
            <p className="text-[11px] text-slate-500">Access window closed</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-semibold shrink-0">
            Expired
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onAskForShare}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg shadow-red-600/30 transition-all"
          >
            {askCopied ? <Check size={14} className="text-emerald-300" /> : <RotateCw size={14} />}
            <span>{askCopied ? 'Request copied to clipboard!' : 'Ask for share again'}</span>
          </button>
          {askCopied && (
            <p className="text-[11px] text-emerald-400 animate-fadeIn">
              Ready to paste! Send this message to the owner to request a renewed link.
            </p>
          )}
          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
