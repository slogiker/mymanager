import React from 'react';
import { CheckCircle2, Check } from 'lucide-react';
import { UserPreferences, Service } from '../../types';

interface DashboardPreferencesSectionProps {
  prefs: UserPreferences;
  allCategories: string[];
  services: Service[];
  prefsSavedMessage: boolean;
  onToggleCategory: (cat: string) => void;
  onToggleGauge: (gauge: string) => void;
  onResetPreferences: () => void;
}

export function DashboardPreferencesSection({
  prefs,
  allCategories,
  services,
  prefsSavedMessage,
  onToggleCategory,
  onToggleGauge,
  onResetPreferences,
}: DashboardPreferencesSectionProps) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-[#16181f] p-6 sm:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-1">
            Customize Dashboard View
          </h3>
          <p className="text-xs text-slate-500">
            Select which service categories and system widgets you want to see on your dashboard.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {prefsSavedMessage && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
            </span>
          )}
          <button
            onClick={onResetPreferences}
            className="px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-[11px] font-mono text-slate-400 hover:text-white transition-colors"
          >
            Reset Defaults
          </button>
        </div>
      </div>

      {/* Service Categories Visibility */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
          Visible Service Categories
        </h4>
        <p className="text-xs text-slate-500">
          Toggle categories on or off to tailor your dashboard columns:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          {allCategories.map((cat) => {
            const isHidden = prefs.hiddenCategories.includes(cat);
            const count = services.filter(s => (s.category?.trim() || 'Services') === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onToggleCategory(cat)}
                className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                  !isHidden
                    ? 'bg-slate-900/90 border-slate-700/80 text-white'
                    : 'bg-slate-950/40 border-slate-800/50 text-slate-500 opacity-60'
                }`}
              >
                <div>
                  <div className="font-semibold text-xs">{cat}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {count} {count === 1 ? 'service' : 'services'}
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                  !isHidden ? 'bg-red-600 border-red-500 text-white' : 'border-slate-700 bg-slate-800/50'
                }`}>
                  {!isHidden && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* System Gauge Widgets */}
      <div className="space-y-3 pt-4 border-t border-slate-800/60">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
          System Status Gauges
        </h4>
        <p className="text-xs text-slate-500">
          Choose which status indicators appear in the top banner:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {[
            { id: 'cpu', label: 'CPU Load' },
            { id: 'memory', label: 'RAM / Memory' },
            { id: 'disk', label: 'Disk Storage' },
            { id: 'temperature', label: 'Temperature' },
          ].map((gauge) => {
            const isHidden = prefs.hiddenGauges.includes(gauge.id);
            return (
              <button
                key={gauge.id}
                type="button"
                onClick={() => onToggleGauge(gauge.id)}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  !isHidden
                    ? 'bg-slate-900/90 border-slate-700/80 text-white'
                    : 'bg-slate-950/40 border-slate-800/50 text-slate-500 opacity-60'
                }`}
              >
                <span className="text-xs font-medium">{gauge.label}</span>
                <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                  !isHidden ? 'bg-red-600 border-red-500 text-white' : 'border-slate-700 bg-slate-800/50'
                }`}>
                  {!isHidden && <Check className="w-3 h-3 stroke-[2.5]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
