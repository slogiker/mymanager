import { api } from './api';

export interface UserPreferences {
  hiddenCategories: string[];
  hiddenServices: number[];
  hiddenGauges: string[];
  compactMode: boolean;
  disableCategories?: boolean;
  categoryOrder?: string[];
  categoryWidths?: Record<string, 1 | 2>;
  customCategories?: string[];
  serverGauges?: Record<string, { cpu?: boolean; ram?: boolean; storage?: boolean; net?: boolean; fan?: boolean; temp?: boolean; ports?: boolean; ping?: boolean; down?: boolean; up?: boolean }>;
  widgetVisible?: {
    clock: boolean;
    nodes: boolean;
    notes: boolean;
    qbittorrent?: boolean;
    speedtest?: boolean;
    pihole?: boolean;
    wireguard?: boolean;
    jellyfin?: boolean;
    jellyseerr?: boolean;
  };
  widgetSizes?: Record<string, { colSpan: number; rowSpan: number }>;
  widgetLayouts?: Record<string, { startCol: number; startRow: number; colSpan: number; rowSpan: number }>;
  syncThemeWithPironman?: boolean;
  pironmanAccentColor?: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  hiddenCategories: [],
  hiddenServices: [],
  hiddenGauges: [],
  compactMode: false,
  disableCategories: false,
  syncThemeWithPironman: false,
  pironmanAccentColor: '#ef4444',
  categoryOrder: [],
  categoryWidths: {},
  customCategories: [],
  serverGauges: {},
  widgetVisible: {
    clock: true,
    nodes: true,
    notes: true,
    qbittorrent: true,
    speedtest: true,
    pihole: true,
    wireguard: true,
    jellyfin: true,
    jellyseerr: true,
  },
  widgetSizes: {
    nodes: { colSpan: 8, rowSpan: 2 },
    qbittorrent: { colSpan: 2, rowSpan: 1 },
    speedtest: { colSpan: 2, rowSpan: 1 },
    clock: { colSpan: 2, rowSpan: 1 },
    notes: { colSpan: 2, rowSpan: 1 },
    pihole: { colSpan: 2, rowSpan: 1 },
    wireguard: { colSpan: 2, rowSpan: 1 },
    jellyfin: { colSpan: 2, rowSpan: 1 },
    jellyseerr: { colSpan: 2, rowSpan: 1 },
  },
  widgetLayouts: {
    nodes: { startCol: 0, startRow: 0, colSpan: 8, rowSpan: 2 },
    qbittorrent: { startCol: 0, startRow: 2, colSpan: 2, rowSpan: 1 },
    speedtest: { startCol: 2, startRow: 2, colSpan: 2, rowSpan: 1 },
    clock: { startCol: 4, startRow: 2, colSpan: 2, rowSpan: 1 },
    notes: { startCol: 6, startRow: 2, colSpan: 2, rowSpan: 1 },
    pihole: { startCol: 0, startRow: 3, colSpan: 2, rowSpan: 1 },
    wireguard: { startCol: 2, startRow: 3, colSpan: 2, rowSpan: 1 },
    jellyfin: { startCol: 4, startRow: 3, colSpan: 2, rowSpan: 1 },
    jellyseerr: { startCol: 6, startRow: 3, colSpan: 2, rowSpan: 1 },
  },
};

export function getUserPreferences(userId?: number): UserPreferences {
  if (!userId) return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(`mymanager_user_prefs_${userId}`);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      hiddenCategories: Array.isArray(parsed.hiddenCategories) ? parsed.hiddenCategories : [],
      hiddenServices: Array.isArray(parsed.hiddenServices) ? parsed.hiddenServices : [],
      hiddenGauges: Array.isArray(parsed.hiddenGauges) ? parsed.hiddenGauges : [],
      compactMode: typeof parsed.compactMode === 'boolean' ? parsed.compactMode : false,
      disableCategories: typeof parsed.disableCategories === 'boolean' ? parsed.disableCategories : false,
      categoryOrder: Array.isArray(parsed.categoryOrder) ? parsed.categoryOrder : [],
      categoryWidths: typeof parsed.categoryWidths === 'object' && parsed.categoryWidths ? parsed.categoryWidths : {},
      customCategories: Array.isArray(parsed.customCategories) ? parsed.customCategories : [],
      serverGauges: typeof parsed.serverGauges === 'object' && parsed.serverGauges ? parsed.serverGauges : {},
      widgetVisible: parsed.widgetVisible ? {
        clock: parsed.widgetVisible.clock !== false,
        nodes: parsed.widgetVisible.nodes !== false,
        notes: parsed.widgetVisible.notes !== false,
        qbittorrent: parsed.widgetVisible.qbittorrent !== false,
        speedtest: parsed.widgetVisible.speedtest !== false,
        pihole: parsed.widgetVisible.pihole !== false,
        wireguard: parsed.widgetVisible.wireguard !== false,
        jellyfin: parsed.widgetVisible.jellyfin !== false,
        jellyseerr: parsed.widgetVisible.jellyseerr !== false,
      } : DEFAULT_PREFERENCES.widgetVisible,
      widgetSizes: typeof parsed.widgetSizes === 'object' && parsed.widgetSizes ? {
        ...DEFAULT_PREFERENCES.widgetSizes,
        ...parsed.widgetSizes,
      } : DEFAULT_PREFERENCES.widgetSizes,
      widgetLayouts: typeof parsed.widgetLayouts === 'object' && parsed.widgetLayouts ? {
        ...DEFAULT_PREFERENCES.widgetLayouts,
        ...parsed.widgetLayouts,
      } : DEFAULT_PREFERENCES.widgetLayouts,
      syncThemeWithPironman: Boolean(parsed.syncThemeWithPironman),
      pironmanAccentColor: parsed.pironmanAccentColor || DEFAULT_PREFERENCES.pironmanAccentColor,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function syncUserPreferencesFromBackend(userId?: number): Promise<UserPreferences> {
  if (!userId) return DEFAULT_PREFERENCES;
  try {
    const remote = await api.get<Partial<UserPreferences>>('/services/user-preferences');
    if (remote && typeof remote === 'object' && Object.keys(remote).length > 0) {
      const merged: UserPreferences = {
        ...DEFAULT_PREFERENCES,
        ...remote,
        disableCategories: typeof remote.disableCategories === 'boolean' ? remote.disableCategories : false,
        serverGauges: typeof remote.serverGauges === 'object' && remote.serverGauges ? remote.serverGauges : {},
        categoryWidths: typeof remote.categoryWidths === 'object' && remote.categoryWidths ? remote.categoryWidths : {},
        categoryOrder: Array.isArray(remote.categoryOrder) ? remote.categoryOrder : [],
        customCategories: Array.isArray(remote.customCategories) ? remote.customCategories : [],
        hiddenCategories: Array.isArray(remote.hiddenCategories) ? remote.hiddenCategories : [],
        hiddenServices: Array.isArray(remote.hiddenServices) ? remote.hiddenServices : [],
        hiddenGauges: Array.isArray(remote.hiddenGauges) ? remote.hiddenGauges : [],
        widgetVisible: remote.widgetVisible ? {
          clock: remote.widgetVisible.clock !== false,
          nodes: remote.widgetVisible.nodes !== false,
          notes: remote.widgetVisible.notes !== false,
          qbittorrent: remote.widgetVisible.qbittorrent !== false,
          speedtest: remote.widgetVisible.speedtest !== false,
          pihole: remote.widgetVisible.pihole !== false,
          wireguard: remote.widgetVisible.wireguard !== false,
          jellyfin: remote.widgetVisible.jellyfin !== false,
          jellyseerr: remote.widgetVisible.jellyseerr !== false,
        } : DEFAULT_PREFERENCES.widgetVisible,
        widgetSizes: typeof remote.widgetSizes === 'object' && remote.widgetSizes ? {
          ...DEFAULT_PREFERENCES.widgetSizes,
          ...remote.widgetSizes,
        } : DEFAULT_PREFERENCES.widgetSizes,
        widgetLayouts: typeof remote.widgetLayouts === 'object' && remote.widgetLayouts ? {
          ...DEFAULT_PREFERENCES.widgetLayouts,
          ...remote.widgetLayouts,
        } : DEFAULT_PREFERENCES.widgetLayouts,
        syncThemeWithPironman: typeof remote.syncThemeWithPironman === 'boolean' ? remote.syncThemeWithPironman : Boolean(DEFAULT_PREFERENCES.syncThemeWithPironman),
        pironmanAccentColor: remote.pironmanAccentColor || DEFAULT_PREFERENCES.pironmanAccentColor,
      };
      localStorage.setItem(`mymanager_user_prefs_${userId}`, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('mymanager_prefs_changed', { detail: merged }));
      return merged;
    }
  } catch (e) {
    // Non-fatal, fallback to local storage
  }
  return getUserPreferences(userId);
}

export function saveUserPreferences(userId: number | undefined, prefs: UserPreferences): void {
  if (!userId) return;
  try {
    localStorage.setItem(`mymanager_user_prefs_${userId}`, JSON.stringify(prefs));
    // Dispatch custom storage event so other open components in same window react
    window.dispatchEvent(new CustomEvent('mymanager_prefs_changed', { detail: prefs }));
    // Persist to backend
    api.patch('/services/user-preferences', prefs).catch(() => {});
  } catch (e) {
    console.error('Failed to save user preferences', e);
  }
}
