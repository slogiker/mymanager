import React from 'react';
import { Sparkles, Sliders, Palette, RefreshCw, Check, X, Flame, Radio } from 'lucide-react';
import {
  usePironmanConfig,
  STYLE_OPTIONS,
  COLOR_PRESETS,
} from './usePironmanConfig';

export interface PironmanConfigModalProps {
  open: boolean;
  onClose: () => void;
  syncThemeWithPironman?: boolean;
  onToggleSyncTheme?: (enabled: boolean, color: string) => void;
}

export function PironmanConfigModal({
  open,
  onClose,
  syncThemeWithPironman = false,
  onToggleSyncTheme,
}: PironmanConfigModalProps) {
  const {
    loading,
    saving,
    liveSyncing,
    savedSuccess,
    error,
    enable,
    setEnable,
    style,
    setStyle,
    color,
    setColor,
    brightness,
    setBrightness,
    speed,
    setSpeed,
    themeSync,
    setThemeSync,
    handleManualApply,
    animDurationSec,
    glowIntensity,
    coreOpacity,
  } = usePironmanConfig({
    open,
    syncThemeWithPironman,
    onToggleSyncTheme,
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-700/80 bg-[#12141d] shadow-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CSS Keyframes for 100% Accurate Pironman Lighting Visualizer */}
        <style>{`
          @keyframes pironmanRainbow {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }
          @keyframes pironmanRainbowRev {
            0% { background-position: 200% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes pironmanFlow {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }
          @keyframes pironmanFlowRev {
            0% { background-position: 200% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes pironmanBreathe {
            0%, 100% {
              opacity: 0.2;
              filter: brightness(0.4) drop-shadow(0 0 2px ${color});
            }
            50% {
              opacity: ${coreOpacity};
              filter: brightness(1.2) drop-shadow(0 0 ${glowIntensity}px ${color});
            }
          }
          @keyframes pironmanHueCycle {
            0% { filter: hue-rotate(0deg); }
            100% { filter: hue-rotate(360deg); }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#161824]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Pironman 5 RGB Controls</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                  192.168.1.136
                </span>
                {liveSyncing && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5 animate-pulse" /> Live
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">Tower case RGB lighting, styles, and animation speed</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 font-mono">
              <RefreshCw className="w-5 h-5 animate-spin text-red-500" />
              <span>Connecting to Pironman 5 Tower on LAN...</span>
            </div>
          ) : (
            <>
              {/* 100% Synced Tower LED Acrylic Visualizer */}
              <div className="p-4 rounded-xl border border-slate-800 bg-[#0d0f17] space-y-3 relative overflow-hidden shadow-inner">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-red-400" /> Tower Case RGB Visualizer
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[10px]">Cycle: {animDurationSec}s</span>
                    <span className="text-slate-200 font-bold capitalize">
                      {enable ? `${style || 'Solid'} (${brightness}%)` : 'Off'}
                    </span>
                  </div>
                </div>

                {/* Simulated Frosted Acrylic Case Light Bar */}
                <div className="relative h-6 rounded-lg border border-white/10 bg-black/60 overflow-hidden flex items-center px-3">
                  {/* Active Lighting Effect */}
                  {enable && (
                    <div
                      className="absolute inset-0 transition-opacity duration-200"
                      style={{
                        opacity: coreOpacity,
                        boxShadow: `inset 0 0 12px ${color}, 0 0 ${glowIntensity}px ${color}`,
                        ...(style === 'rainbow'
                          ? {
                              background: 'linear-gradient(90deg, #ff0000, #ff7700, #ffff00, #00ff00, #00ffff, #0000ff, #8a2be2, #ff0000)',
                              backgroundSize: '200% 100%',
                              animation: `pironmanRainbow ${animDurationSec}s linear infinite`,
                            }
                          : style === 'rainbow_reverse'
                          ? {
                              background: 'linear-gradient(90deg, #ff0000, #ff7700, #ffff00, #00ff00, #00ffff, #0000ff, #8a2be2, #ff0000)',
                              backgroundSize: '200% 100%',
                              animation: `pironmanRainbowRev ${animDurationSec}s linear infinite`,
                            }
                          : style === 'flow'
                          ? {
                              background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
                              backgroundSize: '200% 100%',
                              animation: `pironmanFlow ${animDurationSec}s linear infinite`,
                            }
                          : style === 'flow_reverse'
                          ? {
                              background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
                              backgroundSize: '200% 100%',
                              animation: `pironmanFlowRev ${animDurationSec}s linear infinite`,
                            }
                          : style === 'breathing'
                          ? {
                              backgroundColor: color,
                              animation: `pironmanBreathe ${animDurationSec}s ease-in-out infinite`,
                            }
                          : style === 'hue_cycle'
                          ? {
                              backgroundColor: color,
                              animation: `pironmanHueCycle ${animDurationSec}s linear infinite`,
                            }
                          : {
                              backgroundColor: color,
                            }),
                      }}
                    />
                  )}

                  {/* 4 Simulated WS2812 LED Emitters */}
                  <div className="relative z-10 flex items-center justify-between w-full px-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-2.5 h-2.5 rounded-full border border-white/20 transition-all"
                        style={{
                          backgroundColor: enable ? (style.includes('rainbow') ? '#fff' : color) : '#334155',
                          boxShadow: enable ? `0 0 8px ${color}` : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Master Power Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/40">
                <div>
                  <div className="font-semibold text-white">Enable RGB Lighting</div>
                  <div className="text-[11px] text-slate-400">Power on or off the WS2812 tower LED strips</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enable}
                  onClick={() => setEnable(!enable)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    enable ? 'bg-red-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ${
                      enable ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Sync Website with Pironman Case */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/40">
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sync Dashboard Theme with Pironman</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Adapt website glowing borders, accent colors, and buttons to match case RGB
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={themeSync}
                  onClick={() => {
                    const next = !themeSync;
                    setThemeSync(next);
                    if (onToggleSyncTheme) onToggleSyncTheme(next, color);
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    themeSync ? 'bg-red-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ${
                      themeSync ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Style Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Animation Style
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {STYLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStyle(opt.value)}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        style === opt.value
                          ? 'bg-red-600/10 border-red-500/50 text-white font-bold shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Presets & Hex Picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-slate-400" /> Color Selection
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                      title="Custom color picker"
                    />
                    <span className="font-mono text-[11px] text-slate-400 uppercase">{color}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setColor(p.hex)}
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-transform hover:scale-110 ${
                        color.toLowerCase() === p.hex.toLowerCase()
                          ? 'border-white ring-2 ring-red-500/40 scale-105'
                          : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: p.hex }}
                      title={p.name}
                    >
                      {color.toLowerCase() === p.hex.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-black drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders: Brightness & Speed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5 p-3 rounded-xl border border-slate-800 bg-slate-900/40">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300">Brightness</span>
                    <span className="font-mono text-red-400 font-bold">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                    className="w-full accent-red-500"
                  />
                </div>

                <div className="space-y-1.5 p-3 rounded-xl border border-slate-800 bg-slate-900/40">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300">Animation Speed</span>
                    <span className="font-mono text-red-400 font-bold">{speed}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={speed}
                    onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
                    className="w-full accent-red-500"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-[#161824]">
          {savedSuccess ? (
            <span className="text-emerald-400 font-semibold font-mono flex items-center gap-1.5">
              <Check className="w-4 h-4" /> Saved & Synchronized!
            </span>
          ) : liveSyncing ? (
            <span className="text-amber-400 font-mono text-[11px] flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 animate-spin" /> Syncing to Tower...
            </span>
          ) : (
            <span className="text-[11px] font-mono text-slate-500">
              100% Live Hardware Sync
            </span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              disabled={loading || saving}
              onClick={handleManualApply}
              className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl transition-all shadow-lg flex items-center gap-1.5"
            >
              {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Apply Lighting</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
