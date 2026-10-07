import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';

export const STYLE_OPTIONS = [
  { value: 'breathing', label: 'Breathing' },
  { value: 'solid', label: 'Solid Color' },
  { value: 'flow', label: 'Flow' },
  { value: 'flow_reverse', label: 'Flow Reverse' },
  { value: 'rainbow', label: 'Rainbow' },
  { value: 'rainbow_reverse', label: 'Rainbow Reverse' },
  { value: 'hue_cycle', label: 'Hue Cycle' },
  { value: '', label: 'Disabled / Off' },
];

export const COLOR_PRESETS = [
  { name: 'Crimson Red', hex: '#ef4444' },
  { name: 'Sunset Orange', hex: '#f97316' },
  { name: 'Amber Yellow', hex: '#eab308' },
  { name: 'Emerald Green', hex: '#10b981' },
  { name: 'Teal Cyan', hex: '#06b6d4' },
  { name: 'Sky Blue', hex: '#3b82f6' },
  { name: 'Electric Purple', hex: '#a855f7' },
  { name: 'Neon Pink', hex: '#ec4899' },
  { name: 'Pure White', hex: '#ffffff' },
];

export interface UsePironmanConfigProps {
  open: boolean;
  syncThemeWithPironman?: boolean;
  onToggleSyncTheme?: (enabled: boolean, color: string) => void;
}

export function usePironmanConfig({
  open,
  syncThemeWithPironman = false,
  onToggleSyncTheme,
}: UsePironmanConfigProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [liveSyncing, setLiveSyncing] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const [enable, setEnable] = useState<boolean>(true);
  const [style, setStyle] = useState<string>('breathing');
  const [color, setColor] = useState<string>('#ef4444');
  const [brightness, setBrightness] = useState<number>(30);
  const [speed, setSpeed] = useState<number>(50);
  const [themeSync, setThemeSync] = useState<boolean>(syncThemeWithPironman);

  const initialLoadedRef = useRef<boolean>(false);
  const syncTimeoutRef = useRef<any>(null);

  // Fetch initial hardware config when modal opens
  useEffect(() => {
    if (!open) {
      initialLoadedRef.current = false;
      return;
    }

    setLoading(true);
    setError('');
    setSavedSuccess(false);

    api.get<any>('/admin/pironman/config')
      .then((cfg) => {
        if (cfg) {
          if (typeof cfg.rgb_enable === 'boolean') setEnable(cfg.rgb_enable);
          if (cfg.rgb_style !== undefined) setStyle(cfg.rgb_style || '');
          if (cfg.rgb_color) setColor(cfg.rgb_color);
          if (typeof cfg.rgb_brightness === 'number') setBrightness(cfg.rgb_brightness);
          if (typeof cfg.rgb_speed === 'number') setSpeed(cfg.rgb_speed);
        }
        setTimeout(() => {
          initialLoadedRef.current = true;
        }, 300);
      })
      .catch((err) => {
        setError(err.message || 'Failed to connect to Pironman 5 on 192.168.1.136:34001');
      })
      .finally(() => setLoading(false));
  }, [open]);

  // Live real-time hardware sync when controls change (debounced 220ms)
  useEffect(() => {
    if (!open || !initialLoadedRef.current || loading) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    setLiveSyncing(true);
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await api.post('/admin/pironman/rgb', {
          enable,
          style,
          color,
          brightness,
          speed,
        });
        if (themeSync && onToggleSyncTheme) {
          onToggleSyncTheme(true, color);
        }
      } catch (err: any) {
        // Silently continue
      } finally {
        setLiveSyncing(false);
      }
    }, 220);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [enable, style, color, brightness, speed, themeSync, open, loading, onToggleSyncTheme]);

  const handleManualApply = async () => {
    setSaving(true);
    setError('');
    setSavedSuccess(false);

    try {
      await api.post('/admin/pironman/rgb', {
        enable,
        style,
        color,
        brightness,
        speed,
      });
      if (onToggleSyncTheme) {
        onToggleSyncTheme(themeSync, color);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to apply RGB changes');
    } finally {
      setSaving(false);
    }
  };

  const animDurationSec = Math.max(0.35, ((105 - Math.max(1, speed)) * 0.04)).toFixed(2);
  const glowIntensity = enable ? Math.max(6, Math.round((brightness / 100) * 28)) : 0;
  const coreOpacity = enable ? Math.max(0.25, brightness / 100) : 0.15;

  return {
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
  };
}
