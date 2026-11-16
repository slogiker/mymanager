import React from 'react';
import {
  Search,
  SlidersHorizontal,
  RefreshCw,
  Plus,
  Layers,
  LayoutGrid,
  FolderPlus,
} from 'lucide-react';

export interface DashboardToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  user: any;
  disableCategories?: boolean;
  onToggleDisableCategories?: () => void;
  hiddenCategoriesCount?: number;
  onOpenAddCategory?: () => void;
  onOpenCustomize: () => void;
  onOpenServerGauges?: () => void;
  onOpenPironman?: () => void;
  onRefresh: () => void;
  onAddService: () => void;
}

export function DashboardToolbar({
  search,
  onSearchChange,
  user,
  disableCategories = false,
  onToggleDisableCategories,
  hiddenCategoriesCount = 0,
  onOpenAddCategory,
  onOpenCustomize,
  onOpenServerGauges,
  onOpenPironman,
  onRefresh,
  onAddService,
}: DashboardToolbarProps) {
  const isOwner = user?.role === 'owner';

  return (
    <div className="flex w-full min-w-0 flex-col gap-2.5 border-b border-slate-800/60 pb-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pb-2">
      <div className="flex w-full min-w-0 items-center gap-2 sm:max-w-sm">
        <div className="relative min-w-0 flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search widgets and services..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#17181e] border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-colors sm:py-2"
          />
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="p-2.5 text-slate-400 border border-slate-800 rounded-xl bg-white/[0.02] active:bg-white/[0.06] transition-colors sm:hidden"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0">
        {onToggleDisableCategories && (
          <button
            type="button"
            onClick={onToggleDisableCategories}
            className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold transition-all ${
              disableCategories
                ? 'border-slate-800 hover:border-slate-700 bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 hover:text-white'
                : 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
            }`}
            title={
              disableCategories
                ? 'Current: Flat Grid. Click to switch to Category Mode (widgets top, categories bottom)'
                : 'Current: Category Mode. Click to switch to Flat Grid Mode (unified canvas)'
            }
          >
            {disableCategories ? (
              <>
                <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
                <span>Flat Mode</span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5 text-red-400" />
                <span>Category Mode</span>
              </>
            )}
          </button>
        )}

        {user && !disableCategories && onOpenAddCategory && (
          <button
            type="button"
            onClick={onOpenAddCategory}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 border border-slate-800 hover:border-slate-700 bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
            title="Create a new custom category box"
          >
            <FolderPlus className="w-3.5 h-3.5 text-red-400" />
            <span>Add Category</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenCustomize}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-red-500/30 bg-red-600/10 px-3.5 py-2 text-xs font-semibold text-red-400 shadow-sm transition-all hover:border-red-500/50 hover:bg-red-600/20 hover:text-red-300"
          title="Dashboard Settings & Layer Customization"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-red-400" />
          <span>Settings</span>
          {hiddenCategoriesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 font-mono">
              {hiddenCategoriesCount} hidden
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onRefresh}
          className="hidden shrink-0 rounded-xl border border-slate-800 bg-white/[0.02] p-2 text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white sm:block"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {user && (
          <button
            type="button"
            onClick={onAddService}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)] transition-all hover:bg-red-500"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Service
          </button>
        )}
      </div>
    </div>
  );
}
