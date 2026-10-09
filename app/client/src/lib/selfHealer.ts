import { getUserPreferences, saveUserPreferences, UserPreferences } from './userPreferences';
import { api } from './api';

export type ErrorCategory =
  | 'UNDEFINED_VARIABLE'
  | 'MISSING_ASSET_OR_CHUNK'
  | 'OFFLINE_NETWORK'
  | 'CORRUPTED_CACHE'
  | 'UNKNOWN';

export interface ErrorAnalysis {
  category: ErrorCategory;
  summary: string;
  details: string;
  faultyPart?: string;
  partLabel?: string;
  canQuarantine: boolean;
  canReloadAssets: boolean;
  canResetLayout: boolean;
  canTriggerRebuild: boolean;
  suggestedAction: string;
}

const PART_LABELS: Record<string, string> = {
  qbittorrent: 'qBittorrent Widget',
  speedtest: 'Speedtest Widget',
  wireguard: 'WireGuard VPN Widget',
  pihole: 'Pi-hole DNS Guard Widget',
  jellyfin: 'Jellyfin Media Widget',
  jellyseerr: 'Jellyseerr Requests Widget',
  nodes: 'Cluster Nodes Telemetry',
};

/**
 * Analyzes an error and component stack to detect the root cause and determine
 * actionable self-healing strategies.
 */
export function analyzeError(error: Error | null, componentStack?: string | null): ErrorAnalysis {
  const msg = (error?.message || '').toLowerCase();
  const stack = ((error?.stack || '') + ' ' + (componentStack || '')).toLowerCase();

  // 1. Missing bundle chunk or 404 asset
  if (
    msg.includes('dynamically imported module') ||
    msg.includes('chunk') ||
    msg.includes('loading chunk') ||
    msg.includes('failed to fetch dynamically imported') ||
    msg.includes('mime type') ||
    stack.includes('import(') ||
    stack.includes('assets/')
  ) {
    if (msg.includes('cannot read') || msg.includes('can\'t access property') || msg.includes('is null')) {
      // It's a variable access error that occurred inside a compiled chunk
    } else {
      return {
        category: 'MISSING_ASSET_OR_CHUNK',
        summary: 'Missing or Outdated Bundle Asset',
        details: 'A requested JavaScript chunk or static asset was not found or has an outdated hash. Clearing the bundle cache will reload the newest build.',
        canQuarantine: false,
        canReloadAssets: true,
        canResetLayout: false,
        canTriggerRebuild: true,
        suggestedAction: 'Purge asset cache and reload fresh bundle',
      };
    }
  }

  // 2. Identify the specific component or part that failed
  let faultyPart: string | undefined;
  if (stack.includes('qbittorrent') || msg.includes('downloadtotal') || msg.includes('uploadtotal') || msg.includes('dlspeed')) {
    faultyPart = 'qbittorrent';
  } else if (stack.includes('speedtest') || msg.includes('downloadmbps') || msg.includes('pingms')) {
    faultyPart = 'speedtest';
  } else if (stack.includes('pihole') || msg.includes('queriestoday') || msg.includes('percentblocked')) {
    faultyPart = 'pihole';
  } else if (stack.includes('wireguard') || msg.includes('transferrx') || msg.includes('publickey')) {
    faultyPart = 'wireguard';
  } else if (stack.includes('jellyfin') || msg.includes('activestreamcount') || msg.includes('ownerstats')) {
    faultyPart = 'jellyfin';
  } else if (stack.includes('jellyseerr') || msg.includes('pendingcount')) {
    faultyPart = 'jellyseerr';
  } else if (stack.includes('servernode') || stack.includes('nodes') || msg.includes('node.ip')) {
    faultyPart = 'nodes';
  }

  // 3. Undefined variable or null dereference
  if (
    msg.includes('cannot read properties') ||
    msg.includes('can\'t access property') ||
    msg.includes('is null') ||
    msg.includes('is undefined') ||
    msg.includes('referenceerror') ||
    msg.includes('typeerror')
  ) {
    const partLabel = faultyPart ? PART_LABELS[faultyPart] : undefined;
    return {
      category: 'UNDEFINED_VARIABLE',
      summary: faultyPart ? `Faulty Variable in ${partLabel}` : 'Runtime Variable Null/Undefined',
      details: error?.message || 'Component tried to access a property on an uninitialized or null value.',
      faultyPart,
      partLabel,
      canQuarantine: Boolean(faultyPart),
      canReloadAssets: false,
      canResetLayout: true,
      canTriggerRebuild: true,
      suggestedAction: faultyPart
        ? `Isolate and temporarily disable ${partLabel} to keep the rest of your dashboard functioning.`
        : 'Reset layout preferences to restore defaults.',
    };
  }

  // 4. Network or VPN unreachable
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('timeout') || msg.includes('abort')) {
    return {
      category: 'OFFLINE_NETWORK',
      summary: 'Network or VPN Endpoint Unreachable',
      details: 'The homelab host or local API endpoint could not be reached over the current connection.',
      faultyPart,
      partLabel: faultyPart ? PART_LABELS[faultyPart] : undefined,
      canQuarantine: Boolean(faultyPart),
      canReloadAssets: false,
      canResetLayout: false,
      canTriggerRebuild: false,
      suggestedAction: 'Check WireGuard VPN connection or local network routing.',
    };
  }

  // 5. Corrupted local preferences or JSON parse error
  if (msg.includes('json') || msg.includes('syntaxerror') || msg.includes('storage')) {
    return {
      category: 'CORRUPTED_CACHE',
      summary: 'Corrupted Local Configuration Cache',
      details: 'Stored settings or layout coordinates in local storage could not be parsed.',
      canQuarantine: false,
      canReloadAssets: false,
      canResetLayout: true,
      canTriggerRebuild: false,
      suggestedAction: 'Clear corrupted layout preferences and restore clean defaults.',
    };
  }

  // Default unknown
  return {
    category: 'UNKNOWN',
    summary: 'Unexpected Component Error',
    details: error?.message || 'An unknown error interrupted rendering.',
    faultyPart,
    partLabel: faultyPart ? PART_LABELS[faultyPart] : undefined,
    canQuarantine: Boolean(faultyPart),
    canReloadAssets: true,
    canResetLayout: true,
    canTriggerRebuild: true,
    suggestedAction: 'Attempt self-healing recovery or reload.',
  };
}

/**
 * Quarantines (disables) a failing widget so that the rest of the application
 * continues rendering cleanly without repeated render crashes.
 */
export function quarantinePart(partId: string, userId?: number): boolean {
  try {
    const currentPrefs = getUserPreferences(userId);
    const updated: UserPreferences = {
      ...currentPrefs,
      widgetVisible: {
        ...(currentPrefs.widgetVisible || {}),
        [partId]: false,
      },
    };
    saveUserPreferences(userId, updated);
    window.dispatchEvent(new CustomEvent('mymanager_prefs_changed', { detail: updated }));
    return true;
  } catch (e) {
    console.error('[SelfHealer] Failed to quarantine part:', partId, e);
    return false;
  }
}

/**
 * Clears browser CacheStorage, unregisters stale service workers,
 * and forces a cache-busting reload of the latest asset bundles.
 */
export async function recoverAssetsAndReload(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    console.warn('[SelfHealer] CacheStorage clear skipped:', e);
  }

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
  } catch (e) {
    console.warn('[SelfHealer] Service worker unregister skipped:', e);
  }

  // Reload with cache-busting timestamp
  const url = new URL(window.location.href);
  url.searchParams.set('_heal', String(Date.now()));
  window.location.href = url.toString();
}

/**
 * Resets grid layout preferences in local storage while preserving credentials.
 */
export function resetLayoutPreferences(userId?: number): void {
  try {
    const current = getUserPreferences(userId);
    const cleaned: UserPreferences = {
      ...current,
      widgetLayouts: undefined,
      mobileOrder: undefined,
      disableCategories: false,
    };
    saveUserPreferences(userId, cleaned);
    window.dispatchEvent(new CustomEvent('mymanager_prefs_changed', { detail: cleaned }));
  } catch (e) {
    console.warn('[SelfHealer] Reset preferences error:', e);
  }
}

/**
 * Triggers server-side client build regeneration / container refresh.
 */
export async function triggerServerRebuild(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await api.post<{ success: boolean; message: string }>('/admin/system/rebuild');
    return res;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Server rebuild request failed',
    };
  }
}
