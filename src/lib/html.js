export const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export const localized = (value, lang = 'es', fallback = '') => {
  if (value == null) return fallback;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return value[lang] || value.es || value.en || fallback;
};

export const formatNumber = value => new Intl.NumberFormat('es-UY').format(Number(value || 0));

export const projectHref = project => `proyecto-${project.slug}.html`;

export const projectAsset = (project, file) => `projects/${project.folder || project.slug}/${file || project.cover || ''}`;

export const imageAttrs = ({
  src,
  alt,
  loading = 'lazy',
  sizes = '(max-width: 680px) 92vw, 50vw',
  position
}) => {
  const style = position ? ` style="object-position: ${escapeHtml(position)}"` : '';
  return `src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="${loading}" decoding="async" sizes="${escapeHtml(sizes)}"${style}`;
};
