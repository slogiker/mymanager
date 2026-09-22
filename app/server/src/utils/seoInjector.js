const DEFAULT = {
  title: 'Daniel - Full Stack Developer',
  description: 'I build useful things for fun.',
  url: 'https://slogiker.si',
};

function escapeHtml(str = '') {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function injectMetaTags(html, { title, description, image, url, noindex = false } = {}) {
  const t = escapeHtml(title || DEFAULT.title);
  const d = escapeHtml(description || DEFAULT.description);
  const u = escapeHtml(url || DEFAULT.url);
  const img = escapeHtml(image || '');

  const tags = `
    <title>${t}</title>
    <meta name="description" content="${d}">
    <meta property="og:title" content="${t}">
    <meta property="og:description" content="${d}">
    <meta property="og:url" content="${u}">
    <meta property="og:type" content="website">${img ? `\n    <meta property="og:image" content="${img}">` : ''}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${t}">
    <meta name="twitter:description" content="${d}">${img ? `\n    <meta name="twitter:image" content="${img}">` : ''}${noindex ? `\n    <meta name="robots" content="noindex, nofollow">` : ''}`;

  return html.replace('<!-- SEO_META_PLACEHOLDER -->', tags);
}

module.exports = { injectMetaTags };
