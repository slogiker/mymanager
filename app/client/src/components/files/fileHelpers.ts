import { FileItem } from './FileCard';
import { FolderItem } from './FolderSidebar';

export interface BreadcrumbEntry {
  id: string;
  name: string;
}

export const TYPE_FILTERS = [
  { label: 'All', value: null },
  { label: 'Images', value: 'image' },
  { label: 'Video', value: 'video' },
  { label: 'Audio', value: 'audio' },
  { label: 'Docs', value: 'doc' },
  { label: '3D/CAD', value: 'cad' },
  { label: 'Code', value: 'code' },
  { label: 'Archives', value: 'archive' },
];

export function matchesType(f: FileItem, type: string): boolean {
  const m = f.mime_type ?? '';
  const ext = (f.original_name.split('.').pop() || '').toLowerCase();
  switch (type) {
    case 'image':
      return m.startsWith('image/');
    case 'video':
      return m.startsWith('video/') || ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'].includes(ext);
    case 'audio':
      return m.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext);
    case 'archive':
      return ['zip', 'tar', 'gzip', 'rar', '7z', 'gz'].some((t) => m.includes(t) || ext === t);
    case 'cad':
      return ['stl', 'obj', 'gltf', 'glb', 'step', 'stp', 'f3d', 'ipt', 'iam', 'ply'].includes(ext);
    case 'code':
      return (
        ['javascript', 'typescript', 'json', 'html', 'css', 'xml', 'python', 'x-sh'].some((t) =>
          m.includes(t)
        ) || ['js', 'ts', 'py', 'sh', 'c', 'cpp', 'rs', 'go'].includes(ext)
      );
    case 'doc':
      return (
        m.startsWith('text/') ||
        m.includes('pdf') ||
        m.includes('word') ||
        m.includes('sheet') ||
        ['doc', 'docx', 'xls', 'xlsx', 'ods', 'odt', 'csv'].includes(ext)
      );
    default:
      return true;
  }
}

export function applySearch(
  files: FileItem[],
  query: string,
  typeFilter: string | null
): FileItem[] {
  let result = typeFilter ? files.filter((f) => matchesType(f, typeFilter)) : files;
  if (!query.trim()) return result;
  try {
    const regexMatch = query.match(/^\/(.+)\/([gimsuy]*)$/);
    const re = regexMatch ? new RegExp(regexMatch[1], regexMatch[2]) : null;
    return result.filter((f) =>
      re
        ? re.test(f.original_name)
        : f.original_name.toLowerCase().includes(query.toLowerCase())
    );
  } catch {
    return result.filter((f) =>
      f.original_name.toLowerCase().includes(query.toLowerCase())
    );
  }
}

export function sortFiles(
  files: FileItem[],
  by: 'name' | 'date' | 'size',
  dir: 'asc' | 'desc'
): FileItem[] {
  return [...files].sort((a, b) => {
    let cmp = 0;
    if (by === 'name') cmp = a.original_name.localeCompare(b.original_name);
    else if (by === 'date')
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    else cmp = a.size - b.size;
    return dir === 'asc' ? cmp : -cmp;
  });
}

export function sortFolders(
  folders: FolderItem[],
  by: 'name' | 'date' | 'size',
  dir: 'asc' | 'desc'
): FolderItem[] {
  return [...folders].sort((a, b) => {
    if (by === 'size') return 0;
    const cmp =
      by === 'name'
        ? a.name.localeCompare(b.name)
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return dir === 'asc' ? cmp : -cmp;
  });
}
