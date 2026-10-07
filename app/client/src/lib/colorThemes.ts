export type ColorThemeKey = 'red' | 'green' | 'yellow' | 'blue' | 'pink' | 'purple' | 'orange' | 'cyan';

export interface ColorThemeDefinition {
  id: ColorThemeKey;
  name: string;
  hex: string;
  accentBg: string;
  accentHoverBg: string;
  text: string;
  textHover: string;
  border: string;
  borderHover: string;
  borderFocus: string;
  bgLight: string;
  badge: string;
  shadow: string;
  dropBorder: string;
  dropBg: string;
  ring: string;
  dotBg: string;
}

export const COLOR_THEMES: Record<ColorThemeKey, ColorThemeDefinition> = {
  red: {
    id: 'red',
    name: 'Crimson Red',
    hex: '#ef4444',
    accentBg: 'bg-red-600',
    accentHoverBg: 'hover:bg-red-500',
    text: 'text-red-400',
    textHover: 'hover:text-red-400',
    border: 'border-red-500/40',
    borderHover: 'hover:border-red-500/70',
    borderFocus: 'border-red-500',
    bgLight: 'bg-red-500/10',
    badge: 'bg-red-500/10 text-red-400 border-red-500/30',
    shadow: 'shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)]',
    dropBorder: 'border-red-500',
    dropBg: 'bg-red-500/20',
    ring: 'ring-red-500',
    dotBg: 'bg-red-400',
  },
  green: {
    id: 'green',
    name: 'Emerald Green',
    hex: '#10b981',
    accentBg: 'bg-emerald-600',
    accentHoverBg: 'hover:bg-emerald-500',
    text: 'text-emerald-400',
    textHover: 'hover:text-emerald-400',
    border: 'border-emerald-500/40',
    borderHover: 'hover:border-emerald-500/70',
    borderFocus: 'border-emerald-500',
    bgLight: 'bg-emerald-500/10',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    shadow: 'shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]',
    dropBorder: 'border-emerald-500',
    dropBg: 'bg-emerald-500/20',
    ring: 'ring-emerald-500',
    dotBg: 'bg-emerald-400',
  },
  yellow: {
    id: 'yellow',
    name: 'Amber Yellow',
    hex: '#eab308',
    accentBg: 'bg-amber-500 text-slate-950 font-bold',
    accentHoverBg: 'hover:bg-amber-400',
    text: 'text-amber-400',
    textHover: 'hover:text-amber-400',
    border: 'border-amber-500/40',
    borderHover: 'hover:border-amber-500/70',
    borderFocus: 'border-amber-500',
    bgLight: 'bg-amber-500/10',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    shadow: 'shadow-[0_0_20px_-5px_rgba(234,179,8,0.4)]',
    dropBorder: 'border-amber-500',
    dropBg: 'bg-amber-500/20',
    ring: 'ring-amber-500',
    dotBg: 'bg-amber-400',
  },
  blue: {
    id: 'blue',
    name: 'Sky Blue',
    hex: '#3b82f6',
    accentBg: 'bg-blue-600',
    accentHoverBg: 'hover:bg-blue-500',
    text: 'text-blue-400',
    textHover: 'hover:text-blue-400',
    border: 'border-blue-500/40',
    borderHover: 'hover:border-blue-500/70',
    borderFocus: 'border-blue-500',
    bgLight: 'bg-blue-500/10',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    shadow: 'shadow-[0_0_20px_-5px_rgba(59,130,246,0.4)]',
    dropBorder: 'border-blue-500',
    dropBg: 'bg-blue-500/20',
    ring: 'ring-blue-500',
    dotBg: 'bg-blue-400',
  },
  pink: {
    id: 'pink',
    name: 'Neon Pink',
    hex: '#ec4899',
    accentBg: 'bg-pink-600',
    accentHoverBg: 'hover:bg-pink-500',
    text: 'text-pink-400',
    textHover: 'hover:text-pink-400',
    border: 'border-pink-500/40',
    borderHover: 'hover:border-pink-500/70',
    borderFocus: 'border-pink-500',
    bgLight: 'bg-pink-500/10',
    badge: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
    shadow: 'shadow-[0_0_20px_-5px_rgba(236,72,153,0.4)]',
    dropBorder: 'border-pink-500',
    dropBg: 'bg-pink-500/20',
    ring: 'ring-pink-500',
    dotBg: 'bg-pink-400',
  },
  purple: {
    id: 'purple',
    name: 'Electric Purple',
    hex: '#a855f7',
    accentBg: 'bg-purple-600',
    accentHoverBg: 'hover:bg-purple-500',
    text: 'text-purple-400',
    textHover: 'hover:text-purple-400',
    border: 'border-purple-500/40',
    borderHover: 'hover:border-purple-500/70',
    borderFocus: 'border-purple-500',
    bgLight: 'bg-purple-500/10',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    shadow: 'shadow-[0_0_20px_-5px_rgba(168,85,247,0.4)]',
    dropBorder: 'border-purple-500',
    dropBg: 'bg-purple-500/20',
    ring: 'ring-purple-500',
    dotBg: 'bg-purple-400',
  },
  orange: {
    id: 'orange',
    name: 'Sunset Orange',
    hex: '#f97316',
    accentBg: 'bg-orange-600',
    accentHoverBg: 'hover:bg-orange-500',
    text: 'text-orange-400',
    textHover: 'hover:text-orange-400',
    border: 'border-orange-500/40',
    borderHover: 'hover:border-orange-500/70',
    borderFocus: 'border-orange-500',
    bgLight: 'bg-orange-500/10',
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    shadow: 'shadow-[0_0_20px_-5px_rgba(249,115,22,0.4)]',
    dropBorder: 'border-orange-500',
    dropBg: 'bg-orange-500/20',
    ring: 'ring-orange-500',
    dotBg: 'bg-orange-400',
  },
  cyan: {
    id: 'cyan',
    name: 'Teal Cyan',
    hex: '#06b6d4',
    accentBg: 'bg-cyan-600',
    accentHoverBg: 'hover:bg-cyan-500',
    text: 'text-cyan-400',
    textHover: 'hover:text-cyan-400',
    border: 'border-cyan-500/40',
    borderHover: 'hover:border-cyan-500/70',
    borderFocus: 'border-cyan-500',
    bgLight: 'bg-cyan-500/10',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    shadow: 'shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)]',
    dropBorder: 'border-cyan-500',
    dropBg: 'bg-cyan-500/20',
    ring: 'ring-cyan-500',
    dotBg: 'bg-cyan-400',
  },
};

export const COLOR_KEYS: ColorThemeKey[] = ['red', 'green', 'yellow', 'blue', 'pink', 'purple', 'orange', 'cyan'];

/**
 * Parses color prefixes like [green], [yellow], [blue], [pink], [red], or green:, blue: etc.
 * Returns the extracted color key and the cleaned title without the prefix.
 */
export function parseColorPrefix(rawText: string): { cleanText: string; prefixColor: ColorThemeKey | null } {
  if (!rawText) return { cleanText: '', prefixColor: null };

  const bracketMatch = rawText.match(/^\[(red|green|yellow|blue|pink|purple|orange|cyan)\]\s*(.*)$/i);
  if (bracketMatch) {
    const color = bracketMatch[1].toLowerCase() as ColorThemeKey;
    const cleanText = bracketMatch[2].trim() || rawText;
    return { cleanText, prefixColor: color };
  }

  const colonMatch = rawText.match(/^(red|green|yellow|blue|pink|purple|orange|cyan):\s*(.*)$/i);
  if (colonMatch) {
    const color = colonMatch[1].toLowerCase() as ColorThemeKey;
    const cleanText = colonMatch[2].trim() || rawText;
    return { cleanText, prefixColor: color };
  }

  return { cleanText: rawText, prefixColor: null };
}

/**
 * Resolves the effective color theme for a category.
 * Priority:
 * 1. Explicit categoryColor preference map (by raw name or clean name)
 * 2. Embedded color prefix in category name (e.g. "[pink] Media")
 * 3. User default dashboard accent color
 */
export function getCategoryTheme(
  rawCategory: string,
  categoryColors?: Record<string, ColorThemeKey>,
  fallbackTheme: ColorThemeKey = 'red'
): { theme: ColorThemeDefinition; cleanName: string; colorKey: ColorThemeKey } {
  const { cleanText, prefixColor } = parseColorPrefix(rawCategory);

  const key: ColorThemeKey =
    (categoryColors && categoryColors[rawCategory]) ||
    (categoryColors && categoryColors[cleanText]) ||
    prefixColor ||
    fallbackTheme;

  const theme = COLOR_THEMES[key] || COLOR_THEMES.red;
  return {
    theme,
    cleanName: cleanText,
    colorKey: key,
  };
}
