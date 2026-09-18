export interface UserPreferences {
  hiddenCategories: string[];
  hiddenServices: number[];
  hiddenGauges: string[];
  compactMode: boolean;
  categoryOrder?: string[];
  categoryWidths?: Record<string, 1 | 2>;
  customCategories?: string[];
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

export function saveUserPreferences(userId: number | undefined, prefs: UserPreferences): void {
  if (!userId) return;
  try {
    localStorage.setItem(`mymanager_user_prefs_${userId}`, JSON.stringify(prefs));
    // Dispatch custom storage event so other open components in same window react
    window.dispatchEvent(new CustomEvent('mymanager_prefs_changed', { detail: prefs }));
  } catch (e) {
    console.error('Failed to save user preferences', e);
  }
}
