import React from 'react';
import {
  Search,
  SlidersHorizontal,
  RefreshCw,
  Plus,
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
  hiddenCategoriesCount = 0,
  onOpenCustomize,
  onOpenServerGauges,
  onOpenPironman,
  onRefresh,
  onAddService,
}: DashboardToolbarProps) {
  const isOwner = user?.role === 'owner';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/60 w-full min-w-0">
      <div className="relative w-full sm:max-w-sm min-w-0">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search widgets and services..."
          className="w-full pl-10 pr-4 py-2 bg-[#17181e] border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-colors"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">

        <button
          type="button"
          onClick={onOpenCustomize}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-red-500/30 hover:border-red-500/50 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 rounded-xl text-xs font-semibold shadow-sm transition-all"
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
          className="p-2 text-slate-400 hover:text-white border border-slate-800 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {user && (
          <button
            type="button"
            onClick={onAddService}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Service
          </button>
        )}
      </div>
    </div>
  );
}
