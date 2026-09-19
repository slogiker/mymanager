import { useState } from 'react';
import {
  Terminal as TermIcon,
  Server,
  Activity,
  Folder,
  Layers,
  Shield,
  Globe,
  Clipboard,
} from 'lucide-react';

export interface ServiceIconProps {
  icon?: string;
  title: string;
}

export function ServiceIcon({ icon, title }: ServiceIconProps) {
  const [imgError, setImgError] = useState(false);

  // If icon is an image URL or starts with http or /
  if (icon && (icon.startsWith('http') || icon.startsWith('/') || icon.includes('.')) && !imgError) {
    return (
      <img
        src={icon}
        alt={title}
        onError={() => setImgError(true)}
        className="w-9 h-9 rounded-xl object-contain bg-slate-900/60 border border-slate-800 p-1.5 flex-shrink-0"
      />
    );
  }

  // Common keywords map to Lucide icons with stylish background badges
  const t = (title + ' ' + (icon || '')).toLowerCase();

  if (t.includes('term') || t.includes('ssh') || t.includes('bash') || t.includes('shell') || t.includes('console')) {
    return (
      <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0 shadow-sm">
        <TermIcon className="w-4 h-4" />
      </div>
    );
  }
  if (t.includes('plex') || t.includes('jellyfin') || t.includes('media') || t.includes('video') || t.includes('stream') || t.includes('tv')) {
    return (
      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-sm">
        <Server className="w-4 h-4" />
      </div>
    );
  }
  if (t.includes('audio') || t.includes('music') || t.includes('podcast') || t.includes('book')) {
    return (
      <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-sm">
        <Activity className="w-4 h-4" />
      </div>
    );
  }
  if (t.includes('nextcloud') || t.includes('cloud') || t.includes('drive') || t.includes('file') || t.includes('storage') || t.includes('nas')) {
    return (
      <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0 shadow-sm">
        <Folder className="w-4 h-4" />
      </div>
    );
  }
  if (t.includes('docker') || t.includes('portainer') || t.includes('container')) {
    return (
      <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0 shadow-sm">
        <Layers className="w-4 h-4" />
      </div>
    );
  }
  if (t.includes('vpn') || t.includes('wireguard') || t.includes('tailscale') || t.includes('guard') || t.includes('shield')) {
    return (
      <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0 shadow-sm">
        <Shield className="w-4 h-4" />
      </div>
    );
  }
  if (t.includes('web') || t.includes('apache') || t.includes('nginx') || t.includes('site') || t.includes('http')) {
    return (
      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-sm">
        <Globe className="w-4 h-4" />
      </div>
    );
  }
  if (t.includes('clip') || t.includes('note') || t.includes('paste')) {
    return (
      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-sm">
        <Clipboard className="w-4 h-4" />
      </div>
    );
  }

  // Graceful fallback: 2-letter uppercase monogram in a sleek dark gradient badge
  return (
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/60 flex items-center justify-center text-xs font-mono font-extrabold text-slate-200 flex-shrink-0 shadow-sm">
      {title.slice(0, 2).toUpperCase()}
    </div>
  );
}
