import React from 'react';
import {
  Clock,
  Gauge,
  FileText,
  Radio,
  ShieldCheck,
  Shield,
  Film,
  Bookmark,
  Server,
} from 'lucide-react';
import {
  ServerNode,
  SpeedtestResult,
  JellyfinStats,
  JellyseerrStats,
  QbittorrentStats,
  WireguardStats,
  PiholeStats,
} from '../../../types';
import {
  TimeWidget,
  NotesWidget,
  SpeedtestWidget,
  PiholeWidget,
  WireguardWidget,
  JellyfinWidget,
  JellyseerrWidget,
  QbittorrentWidget,
  ServerNodeWidget,
} from '../widgets';

export interface BoardWidgetRendererProps {
  widgetKey: string;
  wColSpan: 1 | 2 | 3;
  wRowSpan?: 1 | 2 | 3;
  nodes: ServerNode[];
  loadingNodes: boolean;
  serverGauges?: Record<string, any>;
  onOpenPironman?: () => void;
  uptime?: string;
  speedtest?: SpeedtestResult | null;
  onRunSpeedtest?: () => void;
  isRunningSpeedtest?: boolean;
  userId?: number;
  piholeStats?: PiholeStats | null;
  wgStats?: WireguardStats | null;
  jellyfinStats?: JellyfinStats | null;
  jellyseerrStats?: JellyseerrStats | null;
  qbitStats?: QbittorrentStats | null;
  onOpenInspector?: (type: 'wireguard' | 'pihole' | 'qbittorrent' | 'jellyfin' | 'jellyseerr') => void;
}

export interface RenderedWidgetMeta {
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export function renderBoardWidget({
  widgetKey: wKey,
  wColSpan,
  wRowSpan = 1,
  nodes,
  loadingNodes,
  serverGauges,
  onOpenPironman,
  uptime,
  speedtest,
  onRunSpeedtest,
  isRunningSpeedtest,
  userId,
  piholeStats,
  wgStats,
  jellyfinStats,
  jellyseerrStats,
  qbitStats,
  onOpenInspector,
}: BoardWidgetRendererProps): RenderedWidgetMeta | null {
  if (wKey.startsWith('node-')) {
    const nodeId = wKey.slice('node-'.length);
    const n = nodes.find((node) => String(node.id) === nodeId);
    if (!n) return null;
    return {
      title: n.name,
      icon: <Server className="w-3.5 h-3.5 text-red-400" />,
      content: (
        <ServerNodeWidget
          node={n}
          serverGauges={serverGauges}
          colSpan={wColSpan}
          rowSpan={wRowSpan}
          onOpenPironman={onOpenPironman}
        />
      ),
    };
  }

  if (wKey === 'clock') {
    return {
      title: 'Time & Uptime',
      icon: <Clock className="w-3.5 h-3.5 text-blue-400" />,
      content: <TimeWidget uptime={uptime} colSpan={wColSpan} rowSpan={wRowSpan} />,
    };
  }

  if (wKey === 'speedtest') {
    return {
      title: 'Network Speedtest',
      icon: <Gauge className="w-3.5 h-3.5 text-emerald-400" />,
      content: (
        <SpeedtestWidget
          speedtest={speedtest}
          colSpan={wColSpan}
          rowSpan={wRowSpan}
          onRunSpeedtest={onRunSpeedtest}
          isRunningSpeedtest={isRunningSpeedtest}
        />
      ),
    };
  }

  if (wKey === 'notes') {
    return {
      title: 'Quick Notes',
      icon: <FileText className="w-3.5 h-3.5 text-amber-400" />,
      content: <NotesWidget colSpan={wColSpan} rowSpan={wRowSpan} />,
    };
  }

  if (wKey === 'pihole') {
    return {
      title: 'Pi-hole DNS',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />,
      content: (
        <PiholeWidget
          data={piholeStats || null}
          colSpan={wColSpan}
          rowSpan={wRowSpan}
          onOpenInspector={() => onOpenInspector?.('pihole')}
        />
      ),
    };
  }

  if (wKey === 'wireguard') {
    return {
      title: 'WireGuard VPN',
      icon: <Shield className="w-3.5 h-3.5 text-purple-400" />,
      content: (
        <WireguardWidget
          data={wgStats || null}
          colSpan={wColSpan}
          rowSpan={wRowSpan}
          onOpenInspector={() => onOpenInspector?.('wireguard')}
        />
      ),
    };
  }

  if (wKey === 'jellyfin') {
    return {
      title: 'Jellyfin Media',
      icon: <Film className="w-3.5 h-3.5 text-violet-400" />,
      content: (
        <JellyfinWidget
          data={jellyfinStats || null}
          colSpan={wColSpan}
          rowSpan={wRowSpan}
          onOpenInspector={() => onOpenInspector?.('jellyfin')}
        />
      ),
    };
  }

  if (wKey === 'jellyseerr') {
    return {
      title: 'Jellyseerr Requests',
      icon: <Bookmark className="w-3.5 h-3.5 text-indigo-400" />,
      content: (
        <JellyseerrWidget
          data={jellyseerrStats || null}
          colSpan={wColSpan}
          rowSpan={wRowSpan}
          onOpenInspector={() => onOpenInspector?.('jellyseerr')}
        />
      ),
    };
  }

  if (wKey === 'qbittorrent') {
    return {
      title: 'qBittorrent',
      icon: <Radio className="w-3.5 h-3.5 text-sky-400" />,
      content: (
        <QbittorrentWidget
          data={qbitStats || null}
          colSpan={wColSpan}
          rowSpan={wRowSpan}
          onOpenInspector={() => onOpenInspector?.('qbittorrent')}
        />
      ),
    };
  }

  return null;
}
