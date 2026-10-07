import React, { useRef, useEffect } from 'react';
import {
  Paperclip,
  X,
  Send,
  Plus,
  Minus,
  File as FileIcon,
} from 'lucide-react';

interface ClipboardInputBarProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  inputTitle: string;
  setInputTitle: (val: string) => void;
  showTitle: boolean;
  setShowTitle: React.Dispatch<React.SetStateAction<boolean>>;
  attachedFile: File | null;
  setAttachedFile: (file: File | null) => void;
  filePreviewUrl: string | null;
  saving: boolean;
  onSave: () => void;
  isDragOver: boolean;
  setIsDragOver: (dragOver: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function ClipboardInputBar({
  inputValue,
  setInputValue,
  inputTitle,
  setInputTitle,
  showTitle,
  setShowTitle,
  attachedFile,
  setAttachedFile,
  filePreviewUrl,
  saving,
  onSave,
  isDragOver,
  setIsDragOver,
  onDrop,
  onPaste,
  onKeyDown,
}: ClipboardInputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
  }, [inputValue]);

  return (
    <div
      onDragOver={e => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={onDrop}
      className={`mb-8 bg-[#11131a] border rounded-2xl shadow-xl transition-all duration-200 overflow-hidden ${
        isDragOver
          ? 'border-red-500/80 bg-red-500/[0.04] ring-2 ring-red-500/20'
          : 'border-slate-800/80 hover:border-slate-700/80 focus-within:border-red-500/50 focus-within:ring-1 focus-within:ring-red-500/20'
      }`}
    >
      {/* Collapsible Title row (+ / - toggle) */}
      {showTitle && (
        <div className="px-4 pt-3.5 pb-1 border-b border-slate-800/50">
          <input
            type="text"
            value={inputTitle}
            onChange={e => setInputTitle(e.target.value)}
            placeholder="Title or label (optional)"
            className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
            autoFocus
          />
        </div>
      )}

      {/* Input Textarea */}
      <div className="p-4">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder="Paste anything here: text notes, code, commands, links, or drop images/files..."
          rows={2}
          className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none outline-none leading-relaxed min-h-[58px] max-h-[260px]"
        />

        {/* Attached File/Image Preview Inside Input */}
        {attachedFile && (
          <div className="mt-2.5 flex items-center justify-between p-2.5 rounded-xl bg-[#0a0b0f] border border-slate-800 max-w-md">
            <div className="flex items-center gap-2.5 min-w-0">
              {filePreviewUrl ? (
                <img
                  src={filePreviewUrl}
                  alt="attachment preview"
                  className="w-10 h-10 object-cover rounded-lg border border-slate-700 shrink-0"
                />
              ) : (
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                  <FileIcon size={16} />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{attachedFile.name}</p>
                <p className="text-[10px] text-slate-500">
                  {(attachedFile.size / 1024).toFixed(1)} KB • {attachedFile.type || 'file'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAttachedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-2"
              title="Remove attachment"
            >
              <X size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Bar Controls: Title Toggle (+/-), Attach File, Keyboard Hint and Save */}
      <div className="px-4 py-2.5 bg-[#0d0e14]/80 border-t border-slate-800/60 flex items-center justify-between gap-3">
        {/* Left side: Title (+/-) toggle button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTitle(v => !v)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              showTitle
                ? 'text-red-400 bg-red-500/10 border border-red-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title={showTitle ? 'Hide title field' : 'Add title or label'}
          >
            {showTitle ? <Minus size={13} /> : <Plus size={13} />}
            <span>Title</span>
          </button>
        </div>

        {/* Right side: Attach file, shortcut hint and Save button */}
        <div className="flex items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) setAttachedFile(f);
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
              attachedFile
                ? 'text-amber-400 bg-amber-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Attach file or image"
          >
            <Paperclip size={14} />
            <span className="hidden sm:inline text-xs text-slate-400">Attach</span>
          </button>

          <span className="hidden sm:inline text-[11px] text-slate-500 font-mono px-1">
            Ctrl+↵
          </span>

          <button
            type="button"
            onClick={onSave}
            disabled={saving || (!inputValue.trim() && !attachedFile)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-red-600/20 active:scale-[0.98]"
          >
            {saving ? (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={13} />
            )}
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}
