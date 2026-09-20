import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Copy, Check, Presentation, FileText,
  Table, BookOpen, Search
} from 'lucide-react';

export interface SheetData {
  name: string;
  rowCount: number;
  colCount: number;
  rows: string[][];
}

export interface ChapterData {
  chapterIndex: number;
  title: string;
  html: string;
}

export interface DocumentData {
  type: 'document' | 'presentation' | 'spreadsheet' | 'epub';
  format: string;
  html?: string;
  text?: string;
  slideCount?: number;
  slides?: Array<{
    slideNumber: number;
    title: string;
    content: string[];
  }>;
  sheetCount?: number;
  sheets?: SheetData[];
  chapterCount?: number;
  chapters?: ChapterData[];
  error?: string;
}

interface Props {
  data: DocumentData | null;
  loading: boolean;
  fileName: string;
  fullscreen?: boolean;
}

function idxToColRef(idx: number): string {
  let s = '';
  let n = idx;
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

export default function DocumentViewer({ data, loading, fileName, fullscreen = false }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentSheetIdx, setCurrentSheetIdx] = useState(0);
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Reset indices when file changes
  useEffect(() => {
    setCurrentSlide(0);
    setCurrentSheetIdx(0);
    setCurrentChapterIdx(0);
    setSearchQuery('');
  }, [fileName]);

  // Keyboard navigation for presentation slides
  useEffect(() => {
    if (data?.type !== 'presentation' || !data.slides?.length) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        setCurrentSlide(prev => Math.min((data.slides?.length ?? 1) - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide(prev => Math.max(0, prev - 1));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [data]);

  // Current sheet data
  const currentSheet = data?.sheets?.[currentSheetIdx] || data?.sheets?.[0];

  // Filtered rows for spreadsheet search
  const filteredRows = useMemo(() => {
    if (!currentSheet?.rows) return [];
    if (!searchQuery.trim()) return currentSheet.rows;
    const q = searchQuery.toLowerCase();
    return currentSheet.rows.filter(row =>
      row.some(cell => String(cell).toLowerCase().includes(q))
    );
  }, [currentSheet, searchQuery]);

  // Maximum columns in the current sheet
  const maxColumns = useMemo(() => {
    if (!currentSheet?.rows) return 0;
    return Math.max(currentSheet.colCount || 0, ...currentSheet.rows.map(r => r.length));
  }, [currentSheet]);

  function handleCopyText() {
    if (!data) return;
    let textToCopy = '';

    if (data.type === 'spreadsheet' && currentSheet) {
      textToCopy = currentSheet.rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    } else if (data.type === 'presentation' && data.slides) {
      textToCopy = data.slides.map(s => `--- ${s.title} ---\n${s.content.join('\n')}`).join('\n\n');
    } else if (data.type === 'epub' && data.chapters) {
      textToCopy = data.chapters[currentChapterIdx]?.html.replace(/<[^>]+>/g, '') || '';
    } else {
      textToCopy = data.text || '';
    }

    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Parsing {fileName}…</p>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="p-6 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
        <FileText size={32} className="opacity-40" />
        <p>{data?.error || 'Unable to render document preview.'}</p>
      </div>
    );
  }

  // 1. SPREADSHEET VIEWER (.xlsx, .ods, .csv, .tsv)
  if (data.type === 'spreadsheet') {
    return (
      <div className={`flex flex-col h-full ${fullscreen ? 'max-w-6xl w-full mx-auto' : ''}`}>
        {/* Spreadsheet Top Bar */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <Table size={15} /> {data.format.toUpperCase()} Spreadsheet
            </span>
            {currentSheet && (
              <span className="text-[11px] text-slate-500 font-mono">
                ({currentSheet.rowCount} rows &times; {maxColumns} cols)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Row Search Filter */}
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter rows…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-slate-700/60 rounded-lg pl-7 pr-2.5 py-1 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500/60 w-32 sm:w-44 transition-all"
              />
            </div>

            <button
              onClick={handleCopyText}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
              title="Copy sheet as CSV"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copied ? 'Copied CSV' : 'Copy CSV'}
            </button>
          </div>
        </div>

        {/* Sheet Tabs (if multi-sheet workbook) */}
        {data.sheets && data.sheets.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 border-b border-slate-800/60 shrink-0">
            {data.sheets.map((s, idx) => (
              <button
                key={idx}
                onClick={() => { setCurrentSheetIdx(idx); setSearchQuery(''); }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  currentSheetIdx === idx
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Data Grid */}
        <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-[#111216] max-h-[550px] shadow-inner select-text">
          {filteredRows.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              {searchQuery ? `No rows matching "${searchQuery}"` : 'Empty spreadsheet'}
            </div>
          ) : (
            <table className="w-full border-collapse text-xs text-left font-mono">
              <thead className="sticky top-0 bg-[#17181e] z-10 border-b border-slate-700 shadow-sm">
                <tr>
                  {/* Row index header */}
                  <th className="p-2 border-r border-slate-800 text-[10px] text-slate-500 w-10 text-center font-bold select-none bg-black/20">
                    #
                  </th>
                  {Array.from({ length: maxColumns }).map((_, cIdx) => (
                    <th
                      key={cIdx}
                      className="p-2 border-r border-slate-800 text-[11px] text-slate-400 font-semibold tracking-wider min-w-[90px] max-w-[220px] truncate"
                    >
                      {idxToColRef(cIdx)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.03] transition-colors group">
                    {/* Row line number */}
                    <td className="p-2 border-r border-slate-800/80 text-[10px] text-slate-600 font-bold text-center select-none bg-white/[0.01]">
                      {rIdx + 1}
                    </td>
                    {Array.from({ length: maxColumns }).map((_, cIdx) => {
                      const cellValue = row[cIdx] ?? '';
                      return (
                        <td
                          key={cIdx}
                          className="p-2 border-r border-slate-850 text-slate-200 text-xs min-w-[90px] max-w-[220px] truncate group-hover:text-white"
                          title={String(cellValue)}
                        >
                          {cellValue || <span className="opacity-10">&middot;</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // 2. PRESENTATION VIEWER (.pptx, .odp)
  if (data.type === 'presentation' && data.slides && data.slides.length > 0) {
    const slide = data.slides[currentSlide] || data.slides[0];
    const totalSlides = data.slides.length;

    return (
      <div className={`flex flex-col h-full select-none ${fullscreen ? 'max-w-4xl w-full mx-auto' : ''}`}>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Presentation size={15} className="text-red-400" />
            <span className="font-semibold text-slate-200">Slide {currentSlide + 1} of {totalSlides}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
              disabled={currentSlide === 0}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-slate-300 transition-colors"
              title="Previous slide (Left Arrow)"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentSlide(prev => Math.min(totalSlides - 1, prev + 1))}
              disabled={currentSlide === totalSlides - 1}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-slate-300 transition-colors"
              title="Next slide (Right Arrow)"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={handleCopyText}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors ml-1"
              title="Copy all slide text"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className={`relative bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl flex flex-col justify-between overflow-y-auto ${fullscreen ? 'min-h-[420px]' : 'min-h-[260px] flex-1'}`}>
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">{slide.title}</h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                #{slide.slideNumber}
              </span>
            </div>

            {slide.content.length > 0 ? (
              <ul className="space-y-2.5 my-2">
                {slide.content.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-2" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic mt-6 text-center">No text on this slide</p>
            )}
          </div>

          <div className="pt-4 mt-auto flex items-center justify-between text-[10px] text-slate-600 border-t border-slate-850">
            <span>{fileName}</span>
            <span>Use Left / Right arrow keys to navigate</span>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto py-2.5 mt-2 max-w-full">
          {data.slides.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`shrink-0 w-14 h-10 rounded border text-[10px] font-mono flex flex-col items-center justify-center transition-all ${
                currentSlide === idx
                  ? 'border-red-500 bg-red-500/10 text-white shadow-lg'
                  : 'border-slate-800 bg-slate-900/60 text-slate-500 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              <span>#{s.slideNumber}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 3. E-BOOK READER (.epub)
  if (data.type === 'epub' && data.chapters && data.chapters.length > 0) {
    const chapter = data.chapters[currentChapterIdx] || data.chapters[0];
    return (
      <div className={`flex flex-col h-full ${fullscreen ? 'max-w-4xl w-full mx-auto' : ''}`}>
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-amber-400" />
            <select
              value={currentChapterIdx}
              onChange={e => setCurrentChapterIdx(parseInt(e.target.value, 10))}
              className="bg-[#111216] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none"
            >
              {data.chapters.map((ch, idx) => (
                <option key={idx} value={idx}>
                  {ch.title} ({idx + 1} of {data.chapters!.length})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCopyText}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-slate-300 text-sm leading-relaxed prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: chapter.html }}
        />
      </div>
    );
  }

  // 4. REGULAR DOCUMENT VIEWER (.docx, .odt, .doc, .rtf)
  return (
    <div className={`flex flex-col h-full ${fullscreen ? 'max-w-4xl w-full mx-auto' : ''}`}>
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-slate-400 shrink-0">
        <span className="flex items-center gap-1.5 font-medium text-slate-300">
          <FileText size={14} className="text-blue-400" />
          {data.format.toUpperCase()} Document
        </span>
        <button
          onClick={handleCopyText}
          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
          title="Copy text"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy text'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-slate-300 text-xs sm:text-sm leading-relaxed prose prose-invert max-w-none">
        {data.html ? (
          <div dangerouslySetInnerHTML={{ __html: data.html }} />
        ) : (
          <pre className="whitespace-pre-wrap font-sans">{data.text || 'No text content found.'}</pre>
        )}
      </div>
    </div>
  );
}
