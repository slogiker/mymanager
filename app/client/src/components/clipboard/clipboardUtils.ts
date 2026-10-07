export function detectType(value: string): 'link' | 'code' | 'text' {
  const trimmed = value.trim();
  if (!trimmed) return 'text';

  const urlPattern = /^(https?:\/\/|ftp:\/\/|mailto:)\S+$/i;
  const wwwPattern = /^www\.[a-z0-9-]+\.[a-z0-9]+(\/\S*)?$/i;
  if (urlPattern.test(trimmed) || wwwPattern.test(trimmed)) {
    return 'link';
  }

  const codePatterns = [
    /^\s*(import\s|export\s|function\s|const\s|let\s|var\s|class\s|interface\s|type\s)/m,
    /^\s*(def\s|from\s\w+\simport|public\s|private\s|protected\s|return\s)/m,
    /^\s*(if\s*\(|for\s*\(|while\s*\(|switch\s*\(|catch\s*\()/m,
    /^\s*<\/?([a-z][a-z0-9]*|!DOCTYPE)[^>]*>/i,
    /^#!\/(bin|usr)/m,
    /^\s*[{\[][\s\S]*[}\]]\s*$/,
    /^\s*(SELECT\s|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)/i,
    /^\s*(docker|docker-compose|kubectl|git|npm|npx|pnpm|yarn|curl|wget|ssh|scp|systemctl|journalctl|sudo|apt|apt-get|brew|pip|cat|grep|sed|awk|chmod|chown)\s+/m,
    /=>/,
  ];

  if (codePatterns.some(pattern => pattern.test(trimmed))) {
    return 'code';
  }

  const lines = trimmed.split('\n');
  if (lines.length >= 3) {
    const indented = lines.filter(l => /^\s{2,}/.test(l) || /^\t/.test(l));
    const syntaxChars = lines.filter(l => /[;{}()\[\]=]/.test(l));
    if (indented.length >= 2 || syntaxChars.length >= lines.length * 0.5) {
      return 'code';
    }
  }

  return 'text';
}

export function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 45) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function extractHostname(url: string): string {
  try {
    const full = url.startsWith('http') ? url : `https://${url}`;
    return new URL(full).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
