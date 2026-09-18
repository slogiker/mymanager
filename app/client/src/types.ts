export interface User {
  id: number;
  username: string;
  name: string;
  email: string | null;
  role: 'owner' | 'user';
  must_change_password: number | boolean;
  created_at: string;
}

export interface Profile {
  id: number;
  name: string;
  title: string | null;
  bio: string | null;
  avatar_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  email: string | null;
  location: string | null;
  resume_path: string | null;
}

export interface Project {
  id: number;
  title: string;
  description: string | null;
  url: string | null;
  demo_url: string | null;
  github_url: string | null;
  thumbnail_url: string | null;
  tech_stack: string[];
  tags: string[];
  featured: boolean;
  created_at: string;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
  proficiency: number;
  color: string;
  display_order: number;
}

export interface Service {
  id: number;
  title: string;
  url: string;
  description: string | null;
  icon: string;
  category: string;
  is_private: boolean;
  requires_vpn: boolean;
  status: 'online' | 'offline' | 'timeout' | 'unknown';
  display_order: number;
  liveStat?: string;
  telemetryType?: 'wireguard' | 'pihole' | 'qbittorrent' | 'jellyfin' | 'jellyseerr';
  enabled?: boolean;
  start_col?: number | null;
  start_row?: number | null;
  col_span?: number;
  row_span?: number;
}

export interface WireguardPeer {
  publicKey: string;
  endpoint: string | null;
  allowedIps: string;
  latestHandshake: number;
  transferRx: number;
  transferTx: number;
  connected: boolean;
}

export interface WireguardStatus {
  online: boolean;
  interface?: {
    publicKey: string;
    listenPort: string;
  };
  totalPeers: number;
  connectedPeers: number;
  peers: WireguardPeer[];
  error?: string;
}

export interface PiholeStats {
  online: boolean;
  version?: string;
  queriesToday: number;
  blockedToday: number;
  percentBlocked: number;
  domainsBlocked: number;
  uniqueClients: number;
  status: string;
  error?: string;
}

export interface QbittorrentTorrent {
  name: string;
  size: number;
  progress: number;
  eta: number;
  downloadSpeed: number;
  uploadSpeed: number;
  state: string;
  numSeeds: number;
}

export interface QbittorrentStats {
  online: boolean;
  downloadSpeed: number;
  uploadSpeed: number;
  downloadTotal: number;
  uploadTotal: number;
  connectionStatus: string;
  activeCount: number;
  torrents: QbittorrentTorrent[];
  message?: string;
}

export interface JellyfinStats {
  online: boolean;
  activeStreamCount: number;
  activeSessionCount: number;
  ownerStats?: {
    activeUsers: Array<{
      userName: string;
      client: string;
      deviceName: string;
      item: string;
      playMethod: string;
    }>;
    playbackReporting?: any[];
  };
  message?: string;
}

export interface JellyseerrStats {
  online: boolean;
  pendingCount: number;
  totalCount: number;
  movieCount?: number;
  tvCount?: number;
  ownerStats?: {
    userCounts: Array<{ username: string; count: number }>;
    recentRequests: Array<{
      id: number;
      status: number;
      type: string;
      title: string;
      requestedBy: string;
      createdAt: string;
    }>;
    error?: string;
  };
  message?: string;
}

export interface SpeedtestResult {
  timestamp: string;
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  server?: string;
  status: string;
  isRunning?: boolean;
}

export interface Message {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  content: string;
  ip_address: string | null;
  read_at: string | null;
  archived: boolean;
  created_at: string;
}

export interface ClipboardItem {
  id: number;
  type: 'text' | 'code' | 'link' | 'image' | 'file';
  title: string | null;
  content: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  is_pinned: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface FileItem {
  id: number;
  filename: string;
  original_name: string;
  size: number;
  mime_type: string;
  path: string;
  created_at: string;
}

export interface SystemStats {
  cpu: { load: string; model: string };
  memory: { used: string; total: string; percent: number };
  disk: { used: string; total: string; percent: number };
  temperature: string;
  uptime: string;
}

export interface ServerNode {
  id: string;
  name: string;
  ip: string;
  role: string;
  status: 'online' | 'offline' | 'timeout';
  latency: string;
  cpu?: { model?: string; cores?: number; load: string; speedMain?: string; speedMax?: string };
  memory?: { total: string; used: string; free?: string; percent: number };
  disk?: { total: string; used: string; free?: string; percent: number };
  temperature?: string;
  uptime?: string;
  fanSpeed?: string;
  ports?: string[];
}

export interface AnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  topPages: Array<{ path: string; views: number }>;
  byDevice: Array<{ device_type: string; count: number }>;
  byCountry: Array<{ country: string; country_code: string; count: number }>;
  byBrowser: Array<{ browser: string; count: number }>;
  byOs: Array<{ os: string; count: number }>;
  byDay: Array<{ date: string; views: number; visitors: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
}

export interface AnalyticsVisit {
  id: number;
  path: string;
  country: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  created_at: string;
}
