import { api } from './api';

export interface UserPreferences {
  hiddenCategories: string[];
  hiddenServices: number[];
  hiddenGauges: string[];
  compactMode: boolean;
  categoryOrder?: string[];
  categoryWidths?: Record<string, 1 | 2>;
  customCategories?: string[];
  serverGauges?: Record<string, { cpu?: boolean; ram?: boolean; storage?: boolean; net?: boolean; fan?: boolean; temp?: boolean; ports?: boolean; ping?: boolean; down?: boolean; up?: boolean }>;
  widgetVisible?: {
    clock: boolean;
    nodes: boolean;
    notes: boolean;
  };
}

const DEFAULT_PREFERENCES: UserPreferences = {
  hiddenCategories: [],
  hiddenServices: [],
  hiddenGauges: [],
  compactMode: false,
  categoryOrder: [],
  categoryWidths: {},
  customCategories: [],
  serverGauges: {},
  widgetVisible: {
    clock: true,
    nodes: true,
    notes: true,
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
      categoryOrder: Array.isArray(parsed.categoryOrder) ? parsed.categoryOrder : [],
      categoryWidths: typeof parsed.categoryWidths === 'object' && parsed.categoryWidths ? parsed.categoryWidths : {},
      customCategories: Array.isArray(parsed.customCategories) ? parsed.customCategories : [],
      serverGauges: typeof parsed.serverGauges === 'object' && parsed.serverGauges ? parsed.serverGauges : {},
      widgetVisible: parsed.widgetVisible ? {
        clock: parsed.widgetVisible.clock !== false,
        nodes: parsed.widgetVisible.nodes !== false,
        notes: parsed.widgetVisible.notes !== false,
      } : DEFAULT_PREFERENCES.widgetVisible,
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
        } : DEFAULT_PREFERENCES.widgetVisible,
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
