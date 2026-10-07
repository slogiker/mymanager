import React, { useState, useEffect, useMemo } from 'react';
import { GRID_CONSTANTS } from '../../../lib/cardGridEngine';
import { UserPreferences } from '../../../lib/userPreferences';
import {
  QbittorrentStats,
  SpeedtestResult,
  ServerNode,
  PiholeStats,
  WireguardStats,
  JellyfinStats,
  JellyseerrStats,
  Service,
} from '../../../types';
import { QbittorrentWidget } from './QbittorrentWidget';
import { SpeedtestWidget } from './SpeedtestWidget';
import { TimeWidget } from './TimeWidget';
import { NotesWidget } from './NotesWidget';
import { ServerNodeWidget } from './ServerNodeWidget';
import { PiholeWidget } from './PiholeWidget';
import { WireguardWidget } from './WireguardWidget';
import { JellyfinWidget } from './JellyfinWidget';
import { JellyseerrWidget } from './JellyseerrWidget';
import { ServiceCardItem } from './ServiceCardItem';
import { CategoryCardItem } from './CategoryCardItem';
import {
  RawWidgetDefinition,
  PlacedWidget,
  computePlacedWidgets,
} from './widgetGridPlacement';

export type { PlacedWidget };

export interface UseWidgetRegistryProps {
  prefs: UserPreferences;
  nodes?: ServerNode[];
  uptime?: string;
  speedtest?: SpeedtestResult | null;
  onRunSpeedtest?: () => void;
  isRunningSpeedtest?: boolean;
  qbitStats?: QbittorrentStats | null;
  piholeStats?: PiholeStats | null;
  wgStats?: WireguardStats | null;
  jellyfinStats?: JellyfinStats | null;
  jellyseerrStats?: JellyseerrStats | null;
  onOpenInspector?: (type: 'wireguard' | 'pihole' | 'qbittorrent' | 'jellyfin' | 'jellyseerr') => void;
  serverGauges?: Record<string, any>;
  onOpenPironman?: () => void;
  searchQuery?: string;
  flatMode?: boolean;
  categories?: string[];
  services?: Service[];
  isAdmin?: boolean;
  onCardClick?: (s: Service, e?: React.MouseEvent) => void;
  onEditService?: (s: Service) => void;
  onDeleteService?: (id: number) => void;
  onAddService?: (category: string) => void;
  onRenameCategory?: (category: string) => void;
  isServiceVpnLocked?: (s: Service) => boolean;
}

export function useWidgetRegistry({
  prefs,
  nodes = [],
  uptime,
  speedtest,
  onRunSpeedtest,
  isRunningSpeedtest,
  qbitStats,
  piholeStats,
  wgStats,
  jellyfinStats,
  jellyseerrStats,
  onOpenInspector,
  serverGauges = {},
  onOpenPironman,
  searchQuery,
  flatMode = false,
  categories = [],
  services = [],
  isAdmin = false,
  onCardClick,
  onEditService,
  onDeleteService,
  onAddService,
  onRenameCategory,
  isServiceVpnLocked,
}: UseWidgetRegistryProps) {
  const [clientPing, setClientPing] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkPing = async () => {
      const t0 = performance.now();
      try {
        await fetch('/api/ping', { cache: 'no-store' });
        const rtt = Math.round(performance.now() - t0);
        if (isMounted) setClientPing(rtt);
      } catch {
        // ignore
      }
    };
    checkPing();
    const id = setInterval(checkPing, 10000);
    return () => {
      isMounted = false;
      clearInterval(id);
    };
  }, []);

  const rawWidgets = useMemo(() => {
    const list: RawWidgetDefinition[] = [];

    // 1. Individual Cluster Node Cards
    if (prefs.widgetVisible?.nodes !== false && nodes.length > 0) {
      nodes.forEach((n, idx) => {
        const defaultCol = (idx * 2) % GRID_CONSTANTS.FLAT_COLS;
        const defaultRow = Math.floor((idx * 2) / GRID_CONSTANTS.FLAT_COLS);

        list.push({
          id: `node-${n.id}`,
          title: n.name,
          visible: true,
          defaultColSpan: 2,
          defaultRowSpan: 1,
          defaultStartCol: defaultCol,
          defaultStartRow: defaultRow,
          render: (colSpan, rowSpan) => (
            <ServerNodeWidget
              node={n}
              serverGauges={serverGauges[n.id] || {}}
              clientPing={clientPing}
              onOpenPironman={onOpenPironman}
              colSpan={colSpan}
              rowSpan={rowSpan}
            />
          ),
        });
      });
    }

    const rowOffset =
      prefs.widgetVisible?.nodes !== false && nodes.length > 0
        ? Math.ceil((nodes.length * 2) / GRID_CONSTANTS.FLAT_COLS)
        : 0;

    // 2. qBittorrent Widget
    list.push({
      id: 'qbittorrent',
      title: 'qBittorrent',
      visible: prefs.widgetVisible?.qbittorrent !== false,
      defaultColSpan: 2,
      defaultRowSpan: 1,
      defaultStartCol: 0,
      defaultStartRow: rowOffset,
      render: (colSpan, rowSpan) => (
        <QbittorrentWidget
          data={qbitStats || null}
          onOpenInspector={() => onOpenInspector?.('qbittorrent')}
          colSpan={colSpan}
          rowSpan={rowSpan}
        />
      ),
    });

    // 3. Speedtest Widget
    list.push({
      id: 'speedtest',
      title: 'Internet Speed',
      visible: prefs.widgetVisible?.speedtest !== false,
      defaultColSpan: 2,
      defaultRowSpan: 1,
      defaultStartCol: 2,
      defaultStartRow: rowOffset,
      render: (colSpan, rowSpan) => (
        <SpeedtestWidget
          speedtest={speedtest}
          onRunSpeedtest={onRunSpeedtest}
          isRunningSpeedtest={isRunningSpeedtest}
          colSpan={colSpan}
          rowSpan={rowSpan}
        />
      ),
    });

    // 4. Time Widget
    list.push({
      id: 'clock',
      title: 'Local Time',
      visible: prefs.widgetVisible?.clock !== false,
      defaultColSpan: 2,
      defaultRowSpan: 1,
      defaultStartCol: 4,
      defaultStartRow: rowOffset,
      render: (colSpan, rowSpan) => (
        <TimeWidget uptime={uptime} colSpan={colSpan} rowSpan={rowSpan} />
      ),
    });

    // 5. Notes Widget
    list.push({
      id: 'notes',
      title: 'Quick Notes',
      visible: prefs.widgetVisible?.notes !== false,
      defaultColSpan: 2,
      defaultRowSpan: 1,
      defaultStartCol: 6,
      defaultStartRow: rowOffset,
      render: (colSpan, rowSpan) => (
        <NotesWidget colSpan={colSpan} rowSpan={rowSpan} />
      ),
    });

    // 6. Pi-hole DNS Widget
    list.push({
      id: 'pihole',
      title: 'Pi-hole DNS',
      visible: prefs.widgetVisible?.pihole !== false,
      defaultColSpan: 2,
      defaultRowSpan: 1,
      defaultStartCol: 0,
      defaultStartRow: rowOffset + 1,
      render: (colSpan, rowSpan) => (
        <PiholeWidget
          data={piholeStats || null}
          onOpenInspector={() => onOpenInspector?.('pihole')}
          colSpan={colSpan}
          rowSpan={rowSpan}
        />
      ),
    });

    // 7. WireGuard VPN Widget
    list.push({
      id: 'wireguard',
      title: 'WireGuard VPN',
      visible: prefs.widgetVisible?.wireguard !== false,
      defaultColSpan: 2,
      defaultRowSpan: 1,
      defaultStartCol: 2,
      defaultStartRow: rowOffset + 1,
      render: (colSpan, rowSpan) => (
        <WireguardWidget
          data={wgStats || null}
          onOpenInspector={() => onOpenInspector?.('wireguard')}
          colSpan={colSpan}
          rowSpan={rowSpan}
        />
      ),
    });

    // 8. Jellyfin Media Widget
    list.push({
      id: 'jellyfin',
      title: 'Jellyfin Media',
      visible: prefs.widgetVisible?.jellyfin !== false,
      defaultColSpan: 2,
      defaultRowSpan: 1,
      defaultStartCol: 4,
      defaultStartRow: rowOffset + 1,
      render: (colSpan, rowSpan) => (
        <JellyfinWidget
          data={jellyfinStats || null}
          onOpenInspector={() => onOpenInspector?.('jellyfin')}
          colSpan={colSpan}
          rowSpan={rowSpan}
        />
      ),
    });

    // 9. Jellyseerr Requests Widget
    list.push({
      id: 'jellyseerr',
      title: 'Jellyseerr Requests',
      visible: prefs.widgetVisible?.jellyseerr !== false,
      defaultColSpan: 2,
      defaultRowSpan: 1,
      defaultStartCol: 6,
      defaultStartRow: rowOffset + 1,
      render: (colSpan, rowSpan) => (
        <JellyseerrWidget
          data={jellyseerrStats || null}
          onOpenInspector={() => onOpenInspector?.('jellyseerr')}
          colSpan={colSpan}
          rowSpan={rowSpan}
        />
      ),
    });

    // 10A. Service Cards in Flat Grid Mode (Every service is an individual card)
    if (flatMode && services && services.length > 0) {
      services.forEach((s) => {
        list.push({
          id: `svc-${s.id}`,
          title: s.title,
          visible: true,
          defaultColSpan: s.col_span || 2,
          defaultRowSpan: s.row_span || 1,
          defaultStartCol: s.start_col ?? 0,
          defaultStartRow: s.start_row ?? (rowOffset + 2),
          render: (colSpan, rowSpan) => (
            <ServiceCardItem
              service={s}
              colSpan={colSpan}
              rowSpan={rowSpan}
              isOwner={isAdmin}
              onCardClick={onCardClick}
              onEdit={onEditService}
              onDelete={onDeleteService}
              onInspect={onOpenInspector}
              locked={isServiceVpnLocked ? isServiceVpnLocked(s) : false}
              jellyfinStats={jellyfinStats}
              noFrame={true}
            />
          ),
        });
      });
    }

    const q = searchQuery?.trim().toLowerCase();
    return list.filter((w) => {
      if (!w.visible) return false;
      if (!q) return true;
      const title = w.title.toLowerCase();
      const id = w.id.toLowerCase();
      if (title.includes(q) || id.includes(q)) return true;

      if (id.startsWith('node-')) {
        const node = nodes.find((n) => `node-${n.id}` === id);
        if (
          node &&
          (node.name.toLowerCase().includes(q) ||
            node.ip.toLowerCase().includes(q) ||
            node.role?.toLowerCase().includes(q))
        ) {
          return true;
        }
      }
      if (id.startsWith('svc-')) {
        const sId = parseInt(id.replace('svc-', ''), 10);
        const svc = services.find((s) => s.id === sId);
        if (svc) {
          if (svc.title.toLowerCase().includes(q)) return true;
          if (svc.url.toLowerCase().includes(q)) return true;
          if (svc.category?.toLowerCase().includes(q)) return true;
          if (svc.description && svc.description.toLowerCase().includes(q)) return true;
        }
      }
      if (id.startsWith('cat-')) {
        const catName = id.replace('cat-', '');
        if (catName.toLowerCase().includes(q)) return true;
        const hasMatchingSvc = services.some(
          (s) =>
            (s.category?.trim() || 'Services').toLowerCase() === catName.toLowerCase() &&
            (s.title.toLowerCase().includes(q) ||
              s.url?.toLowerCase().includes(q) ||
              s.description?.toLowerCase().includes(q))
        );
        if (hasMatchingSvc) return true;
      }
      if ((q.includes('vpn') || q.includes('wg')) && id === 'wireguard') return true;
      if ((q.includes('dns') || q.includes('adblock') || q.includes('block')) && id === 'pihole') return true;
      if ((q.includes('torrent') || q.includes('download')) && id === 'qbittorrent') return true;
      if ((q.includes('media') || q.includes('movie') || q.includes('stream')) && (id === 'jellyfin' || id === 'jellyseerr')) return true;
      if ((q.includes('speed') || q.includes('ping') || q.includes('isp')) && id === 'speedtest') return true;
      if ((q.includes('clock') || q.includes('time') || q.includes('uptime')) && id === 'clock') return true;
      if ((q.includes('note') || q.includes('scratch')) && id === 'notes') return true;
      return false;
    });
  }, [
    isAdmin,
    prefs.widgetVisible,
    prefs.hiddenCategories,
    prefs.categoryWidths,
    nodes,
    clientPing,
    speedtest,
    serverGauges,
    onRunSpeedtest,
    isRunningSpeedtest,
    qbitStats,
    piholeStats,
    wgStats,
    jellyfinStats,
    jellyseerrStats,
    onOpenInspector,
    onOpenPironman,
    uptime,
    searchQuery,
    flatMode,
    categories,
    services,
    onCardClick,
    onEditService,
    onDeleteService,
    onAddService,
    onRenameCategory,
    isServiceVpnLocked,
  ]);

  const placedWidgets: PlacedWidget[] = useMemo(() => {
    return computePlacedWidgets(rawWidgets, prefs.widgetLayouts);
  }, [rawWidgets, prefs.widgetLayouts]);

  return {
    placedWidgets,
    clientPing,
  };
}
