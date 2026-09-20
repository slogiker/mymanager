import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  BookOpen,
  Image,
  FileImage,
  FileVideo,
  FileAudio,
  Box,
  FileArchive,
  Disc,
  Database,
  FileJson,
  FileCog,
  Terminal,
  FileCode,
  FileKey,
  Binary,
  FileType,
  File,
} from 'lucide-react';

export interface FileFormatMeta {
  category: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bg: string;
  accent: string;
}

export function getFileFormatInfo(fileName: string = '', mimeType: string = ''): FileFormatMeta {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  const mime = mimeType.toLowerCase();

  // 1. PDF
  if (ext === 'pdf' || mime === 'application/pdf') {
    return {
      category: 'pdf',
      label: 'PDF Document',
      icon: FileText,
      color: 'text-red-400',
      bg: 'from-red-500/15 to-rose-500/5',
      accent: 'text-red-400 border-red-500/30',
    };
  }

  // 2. Spreadsheets & Tables
  if (
    ['xlsx', 'xls', 'xlsm', 'xlsb', 'ods', 'csv', 'tsv', 'dif', 'numbers'].includes(ext) ||
    mime.includes('spreadsheet') ||
    mime.includes('csv') ||
    mime.includes('excel')
  ) {
    return {
      category: 'spreadsheet',
      label: 'Spreadsheet',
      icon: FileSpreadsheet,
      color: 'text-emerald-400',
      bg: 'from-emerald-500/15 to-emerald-500/5',
      accent: 'text-emerald-400 border-emerald-500/30',
    };
  }

  // 3. Presentations & Slides
  if (
    ['pptx', 'ppt', 'odp', 'key', 'pps', 'ppsx'].includes(ext) ||
    mime.includes('presentation') ||
    mime.includes('powerpoint')
  ) {
    return {
      category: 'presentation',
      label: 'Presentation',
      icon: Presentation,
      color: 'text-amber-400',
      bg: 'from-amber-500/15 to-orange-500/5',
      accent: 'text-amber-400 border-amber-500/30',
    };
  }

  // 4. Word Documents & Rich Text
  if (
    ['docx', 'doc', 'docm', 'dot', 'dotx', 'odt', 'rtf', 'pages', 'wps'].includes(ext) ||
    mime.includes('wordprocessing') ||
    mime.includes('msword') ||
    mime.includes('rtf')
  ) {
    return {
      category: 'word',
      label: 'Word Document',
      icon: FileText,
      color: 'text-blue-400',
      bg: 'from-blue-500/15 to-sky-500/5',
      accent: 'text-blue-400 border-blue-500/30',
    };
  }

  // 5. E-Books
  if (['epub', 'mobi', 'azw', 'azw3', 'fb2', 'cbr', 'cbz', 'djvu'].includes(ext) || mime.includes('epub')) {
    return {
      category: 'ebook',
      label: 'E-Book',
      icon: BookOpen,
      color: 'text-indigo-400',
      bg: 'from-indigo-500/15 to-purple-500/5',
      accent: 'text-indigo-400 border-indigo-500/30',
    };
  }

  // 6. Vector Graphics & UI Design
  if (['svg', 'ai', 'eps', 'psd', 'xcf', 'sketch', 'fig'].includes(ext) || mime === 'image/svg+xml') {
    return {
      category: 'vector',
      label: 'Vector Graphic',
      icon: FileImage,
      color: 'text-fuchsia-400',
      bg: 'from-fuchsia-500/15 to-pink-500/5',
      accent: 'text-fuchsia-400 border-fuchsia-500/30',
    };
  }

  // 7. Raster Images
  if (
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'tiff', 'tif', 'ico', 'heic', 'heif', 'raw', 'cr2', 'nef'].includes(ext)
  ) {
    return {
      category: 'image',
      label: 'Image',
      icon: Image,
      color: 'text-rose-400',
      bg: 'from-rose-500/15 to-red-500/5',
      accent: 'text-rose-400 border-rose-500/30',
    };
  }

  // 8. Videos & Movies
  if (
    mime.startsWith('video/') ||
    ['mp4', 'mkv', 'webm', 'mov', 'avi', 'flv', 'wmv', 'm4v', 'ts', '3gp', 'ogv'].includes(ext)
  ) {
    return {
      category: 'video',
      label: 'Video',
      icon: FileVideo,
      color: 'text-purple-400',
      bg: 'from-purple-500/15 to-violet-500/5',
      accent: 'text-purple-400 border-purple-500/30',
    };
  }

  // 9. Audio & Music
  if (
    mime.startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma', 'opus', 'alac', 'aiff', 'mid', 'midi'].includes(ext)
  ) {
    return {
      category: 'audio',
      label: 'Audio Track',
      icon: FileAudio,
      color: 'text-pink-400',
      bg: 'from-pink-500/15 to-rose-500/5',
      accent: 'text-pink-400 border-pink-500/30',
    };
  }

  // 10. 3D Models & CAD
  if (['stl', 'obj', 'gltf', 'glb', 'step', 'stp', 'f3d', 'ipt', 'iam', '3mf', 'blend', 'fbx', 'dae', 'ply', 'iges', 'igs', 'scad', 'dxf', 'dwg'].includes(ext) || mime.startsWith('model/')) {
    return {
      category: '3d',
      label: '3D CAD Model',
      icon: Box,
      color: 'text-cyan-400',
      bg: 'from-cyan-500/15 to-blue-500/5',
      accent: 'text-cyan-400 border-cyan-500/30',
    };
  }

  // 11. Disk Images & Optical Media
  if (['iso', 'img', 'vmdk', 'qcow2', 'vdi', 'dmg', 'toast'].includes(ext)) {
    return {
      category: 'disk',
      label: 'Disk Image',
      icon: Disc,
      color: 'text-amber-500',
      bg: 'from-amber-600/15 to-yellow-600/5',
      accent: 'text-amber-500 border-amber-500/30',
    };
  }

  // 12. Archives & Compressed Packages
  if (
    ['zip', 'tar', 'gz', 'tgz', 'bz2', 'tbz2', 'xz', 'txz', '7z', 'rar', 'z', 'lz', 'lzma', 'zst', 'cab', 'arj'].includes(ext) ||
    mime.includes('zip') ||
    mime.includes('tar') ||
    mime.includes('gzip') ||
    mime.includes('compressed') ||
    mime.includes('archive')
  ) {
    return {
      category: 'archive',
      label: 'Compressed Archive',
      icon: FileArchive,
      color: 'text-yellow-400',
      bg: 'from-yellow-500/15 to-amber-500/5',
      accent: 'text-yellow-400 border-yellow-500/30',
    };
  }

  // 13. Databases & SQL
  if (['sql', 'sqlite', 'sqlite3', 'db', 'db3', 'mdb', 'accdb', 'pgsql'].includes(ext)) {
    return {
      category: 'database',
      label: 'Database',
      icon: Database,
      color: 'text-sky-400',
      bg: 'from-sky-500/15 to-blue-500/5',
      accent: 'text-sky-400 border-sky-500/30',
    };
  }

  // 14. JSON & Data Formats
  if (['json', 'json5', 'jsonc', 'ndjson', 'geojson', 'proto'].includes(ext) || mime.includes('json')) {
    return {
      category: 'json',
      label: 'JSON Document',
      icon: FileJson,
      color: 'text-amber-400',
      bg: 'from-amber-500/15 to-yellow-500/5',
      accent: 'text-amber-400 border-amber-500/30',
    };
  }

  // 15. Configuration & System Files
  if (
    ['yaml', 'yml', 'toml', 'xml', 'ini', 'conf', 'config', 'env', 'properties', 'editorconfig', 'gitignore', 'dockerignore'].includes(ext) ||
    fileName.startsWith('.env') ||
    mime.includes('xml')
  ) {
    return {
      category: 'config',
      label: 'Configuration',
      icon: FileCog,
      color: 'text-zinc-400',
      bg: 'from-zinc-500/15 to-slate-500/5',
      accent: 'text-zinc-400 border-zinc-500/30',
    };
  }

  // 16. Terminal & Shell Scripts
  if (['sh', 'bash', 'zsh', 'fish', 'bat', 'cmd', 'ps1', 'psm1', 'vbs'].includes(ext)) {
    return {
      category: 'script',
      label: 'Shell Script',
      icon: Terminal,
      color: 'text-lime-400',
      bg: 'from-lime-500/15 to-emerald-500/5',
      accent: 'text-lime-400 border-lime-500/30',
    };
  }

  // 17. Source Code
  if (
    [
      'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'php', 'c', 'cpp', 'cc', 'h', 'hpp',
      'cs', 'java', 'go', 'rs', 'swift', 'kt', 'scala', 'lua', 'dart', 'html',
      'css', 'scss', 'sass', 'less', 'vue', 'svelte', 'asm', 'r'
    ].includes(ext) ||
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    mime.includes('html') ||
    mime.includes('css')
  ) {
    return {
      category: 'code',
      label: 'Source Code',
      icon: FileCode,
      color: 'text-teal-400',
      bg: 'from-teal-500/15 to-emerald-500/5',
      accent: 'text-teal-400 border-teal-500/30',
    };
  }

  // 18. Security, Keys & Certificates
  if (['pem', 'crt', 'cer', 'key', 'pub', 'pfx', 'p12', 'asc', 'gpg', 'sig', 'keystore', 'der'].includes(ext)) {
    return {
      category: 'security',
      label: 'Key / Certificate',
      icon: FileKey,
      color: 'text-emerald-300',
      bg: 'from-emerald-600/15 to-teal-500/5',
      accent: 'text-emerald-300 border-emerald-400/30',
    };
  }

  // 19. Executables & Binary Binaries
  if (['exe', 'dll', 'so', 'dylib', 'bin', 'elf', 'app', 'apk', 'deb', 'rpm', 'msi', 'jar', 'war'].includes(ext)) {
    return {
      category: 'binary',
      label: 'Executable / Binary',
      icon: Binary,
      color: 'text-red-300',
      bg: 'from-red-900/20 to-slate-800/10',
      accent: 'text-red-300 border-red-400/30',
    };
  }

  // 20. Fonts & Typography
  if (['ttf', 'otf', 'woff', 'woff2', 'eot'].includes(ext) || mime.includes('font')) {
    return {
      category: 'font',
      label: 'Typography Font',
      icon: FileType,
      color: 'text-violet-400',
      bg: 'from-violet-500/15 to-purple-500/5',
      accent: 'text-violet-400 border-violet-500/30',
    };
  }

  // 21. Plain Text & Markdown
  if (['txt', 'md', 'mdx', 'log', 'rst', 'tex', 'text', 'readme', 'license', 'changelog'].includes(ext) || mime.startsWith('text/')) {
    return {
      category: 'text',
      label: 'Text Document',
      icon: FileText,
      color: 'text-slate-400',
      bg: 'from-slate-500/15 to-slate-500/5',
      accent: 'text-slate-400 border-slate-500/30',
    };
  }

  // 22. Generic Fallback
  return {
    category: 'generic',
    label: 'File',
    icon: File,
    color: 'text-slate-500',
    bg: 'from-slate-500/10 to-slate-500/5',
    accent: 'text-slate-500 border-slate-600/30',
  };
}

export function getFileTypeStyle(mime: string, name: string, iconSize = 26) {
  const meta = getFileFormatInfo(name, mime);
  const IconComponent = meta.icon;
  return {
    icon: <IconComponent size={iconSize} />,
    bg: meta.bg,
    accent: meta.accent,
    color: meta.color,
    label: meta.label,
  };
}

interface FileIconProps {
  fileName?: string;
  mimeType?: string;
  size?: number;
  className?: string;
  useColor?: boolean;
}

export const FileIcon: React.FC<FileIconProps> = ({
  fileName = '',
  mimeType = '',
  size = 16,
  className = '',
  useColor = true,
}) => {
  const meta = getFileFormatInfo(fileName, mimeType);
  const IconComponent = meta.icon;
  const colorClass = useColor ? meta.color : '';

  return <IconComponent size={size} className={`${colorClass} ${className}`.trim()} />;
};
