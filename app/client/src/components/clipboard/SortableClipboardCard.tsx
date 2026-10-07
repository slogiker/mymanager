import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Copy,
  Check,
  Pin,
  Trash2,
  Share2,
  ExternalLink,
  GripVertical,
  Download,
  File as FileIcon,
} from 'lucide-react';
import { ClipboardItem } from '../../types';
import { formatRelativeTime, extractHostname } from './clipboardUtils';

interface SortableClipboardCardProps {
  item: ClipboardItem;
  copied: boolean;
  onCopy: (text: string, id: number) => void;
  onPin: (id: number) => void;
  onShare: () => void;
  onDelete: (id: number) => void;
}

export function SortableClipboardCard({
  item,
  copied,
  onCopy,
  onPin,
  onShare,
  onDelete,
}: SortableClipboardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  const fileName = item.file_name || item.filename;
  const isImage = Boolean(item.file_path && (item.mime_type?.startsWith('image/') || item.type === 'image'));
  const isFile = Boolean(item.file_path && !isImage);
  const isLink = item.type === 'link';
  const isCode = item.type === 'code';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-200 p-4 ${
        item.is_pinned
          ? 'bg-[#13141f] border-amber-500/35 shadow-[0_0_15px_rgba(245,158,11,0.06)]'
          : 'bg-[#11131a] border-slate-800/80 hover:border-slate-700/90 hover:bg-[#13151e]'
      }`}
    >
      {/* Top Bar: Drag Grip + Title / Domain + Relative Time + Action Icon Buttons */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Drag Handle Grip */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-600 hover:text-slate-400 transition-colors"
            title="Drag to reorder card"
          >
            <GripVertical size={14} />
          </button>

          {/* Title or Link Hostname */}
          {item.title ? (
            <span className="text-xs font-semibold text-slate-200 truncate">{item.title}</span>
          ) : isLink && item.content ? (
            <span className="text-[11px] font-mono text-blue-400/90 truncate">
              {extractHostname(item.content)}
            </span>
          ) : (
            <span className="text-[11px] uppercase font-mono tracking-wider text-slate-500">
              {item.type}
            </span>
          )}
        </div>

        {/* Right side: Relative Time and Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] text-slate-500 mr-1 select-none">
            {formatRelativeTime(item.created_at)}
          </span>

          {/* Copy Button */}
          {item.content && (
            <button
              type="button"
              onClick={() => onCopy(item.content!, item.id)}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={copied ? 'Copied!' : 'Copy content'}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          )}

          {/* Link External Open Button */}
          {isLink && item.content && (
            <a
              href={item.content}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
              title="Open URL in new tab"
            >
              <ExternalLink size={13} />
            </a>
          )}

          {/* Share Button (Website users and Public link) */}
          <button
            type="button"
            onClick={onShare}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Share snippet"
          >
            <Share2 size={13} />
          </button>

          {/* Pin Button */}
          <button
            type="button"
            onClick={() => onPin(item.id)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              item.is_pinned
                ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
                : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
            }`}
            title={item.is_pinned ? 'Unpin snippet' : 'Pin snippet'}
          >
            <Pin size={13} className={item.is_pinned ? 'fill-amber-400' : ''} />
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete snippet"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="flex-1 flex flex-col gap-2.5">
        {/* 1. TEXT / CODE / LINK */}
        {isCode && item.content && (
          <div className="relative rounded-xl overflow-hidden border border-slate-850 bg-[#08090d]">
            <pre className="p-3 font-mono text-xs text-emerald-300/90 leading-relaxed overflow-x-auto max-h-48 selection:bg-emerald-500/20">
              <code>{item.content}</code>
            </pre>
          </div>
        )}

        {isLink && item.content && (
          <div className="p-2.5 rounded-xl bg-[#0a0b0f] border border-slate-800/80">
            <a
              href={item.content}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 break-all underline-offset-2 hover:underline leading-relaxed"
            >
              {item.content}
            </a>
          </div>
        )}

        {!isCode && !isLink && item.content && (
          <div className="text-xs text-slate-200/90 whitespace-pre-wrap leading-relaxed select-text font-normal max-h-52 overflow-y-auto">
            {item.content}
          </div>
        )}

        {/* 2. ATTACHED IMAGE (Shown together with text if both exist) */}
        {isImage && (item.file_path || fileName) && (
          <div className="mt-1">
            <a
              href={item.file_path || `/uploads/clipboard/${fileName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block overflow-hidden rounded-xl border border-slate-800 bg-[#0a0b0f] max-h-48 w-full"
            >
              <img
                src={item.file_path || `/uploads/clipboard/${fileName}`}
                alt={item.title || fileName || 'Clipboard image'}
                className="w-full h-36 object-contain hover:scale-[1.02] transition-transform duration-200"
                loading="lazy"
              />
            </a>
          </div>
        )}

        {/* 3. ATTACHED FILE */}
        {isFile && (item.file_path || fileName) && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0a0b0f] border border-slate-800 mt-1">
            <div className="flex items-center gap-2 min-w-0">
              <FileIcon size={14} className="text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">
                  {fileName || 'Download File'}
                </p>
                {item.file_size && (
                  <p className="text-[10px] text-slate-500">
                    {(item.file_size / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
            </div>
            <a
              href={item.file_path || `/uploads/clipboard/${fileName}`}
              download={fileName || true}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center"
              title="Download file"
            >
              <Download size={13} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
