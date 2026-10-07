import React from 'react';
import Navbar from '../components/layout/Navbar';
import ShareModal from '../components/files/ShareModal';
import {
  DndContext,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Pin,
  ExternalLink,
  Paperclip,
  X,
  Search,
  FileText,
  AlertCircle,
  Layers,
} from 'lucide-react';
import {
  useClipboardManager,
  SortableClipboardCard,
  ClipboardInputBar,
} from '../components/clipboard';

export default function ClipboardPage() {
  const {
    items,
    loading,
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
    error,
    setError,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    copiedId,
    shareItem,
    setShareItem,
    isDragOver,
    setIsDragOver,
    sensors,
    filteredItems,
    handleSave,
    handleKeyDown,
    handlePaste,
    handleDrop,
    togglePin,
    handleDelete,
    clearAll,
    copyToClipboard,
    handleDragEnd,
  } = useClipboardManager();

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-slate-100 flex flex-col selection:bg-red-500/25 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-24 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Clipboard</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/50 font-medium">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Unified cloud clipboard: paste text, code, links, and images together
            </p>
          </div>

          {items.length > 0 && (
            <button
              onClick={clearAll}
              className="self-start sm:self-auto text-xs text-slate-500 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-center gap-3">
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="p-1 hover:text-red-200">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Unified Global Input Bar at Top */}
        <ClipboardInputBar
          inputValue={inputValue}
          setInputValue={setInputValue}
          inputTitle={inputTitle}
          setInputTitle={setInputTitle}
          showTitle={showTitle}
          setShowTitle={setShowTitle}
          attachedFile={attachedFile}
          setAttachedFile={setAttachedFile}
          filePreviewUrl={filePreviewUrl}
          saving={saving}
          onSave={handleSave}
          isDragOver={isDragOver}
          setIsDragOver={setIsDragOver}
          onDrop={handleDrop}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
        />

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All', icon: Layers },
              { id: 'pinned', label: 'Pinned', icon: Pin },
              { id: 'link', label: 'Links', icon: ExternalLink },
              { id: 'code', label: 'Code', icon: FileText },
              { id: 'text', label: 'Text', icon: FileText },
              { id: 'media', label: 'Media & Files', icon: Paperclip },
            ].map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                    isActive
                      ? 'bg-slate-800 text-white border border-slate-700/80 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <TabIcon size={13} className={isActive ? 'text-red-400' : ''} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search snippets..."
              className="w-full bg-[#11131a] border border-slate-800/80 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-slate-700 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Grid with Drag-and-Drop Reordering */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div
                key={n}
                className="h-36 bg-[#11131a]/60 border border-slate-800/50 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-800/80 rounded-2xl bg-[#11131a]/30">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mx-auto mb-3 text-slate-500">
              <FileText size={22} />
            </div>
            <p className="text-slate-300 font-medium text-sm">No clipboard items found</p>
            <p className="text-slate-500 text-xs mt-1">
              {searchQuery ? 'Try matching a different search term' : 'Paste notes, code, links, or drop images above'}
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredItems.map(i => i.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(item => (
                  <SortableClipboardCard
                    key={item.id}
                    item={item}
                    copied={copiedId === item.id}
                    onCopy={copyToClipboard}
                    onPin={togglePin}
                    onShare={() => setShareItem(item)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      {/* Share Modal (Public link and Share to website notes) */}
      {shareItem && (
        <ShareModal
          open={Boolean(shareItem)}
          type="clip"
          itemId={shareItem.id}
          itemName={shareItem.title || (shareItem.content ? shareItem.content.slice(0, 30) : 'Clipboard Snippet')}
          onClose={() => setShareItem(null)}
        />
      )}
    </div>
  );
}
