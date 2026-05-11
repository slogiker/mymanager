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
