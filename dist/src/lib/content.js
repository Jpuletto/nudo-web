import { localized } from './html.js';

const DEV = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

const fetchJson = async path => {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
  return response.json();
};

const validateProject = project => {
  const warnings = [];
  const required = ['slug', 'order', 'title', 'category', 'cover'];
  required.forEach(field => {
    if (project[field] == null || project[field] === '') warnings.push(`${project.slug || 'proyecto'}: falta ${field}`);
  });
  if (!Array.isArray(project.gallery)) warnings.push(`${project.slug}: gallery debe ser un array`);
  if (DEV && warnings.length) console.warn('[NUDO contenido]', ...warnings);
  return { ...project, warnings };
};

export const loadContent = async () => {
  const [site, projects, assets, optimized] = await Promise.all([
    fetchJson('site.json'),
    fetchJson('projects.generated.json'),
    fetchJson('assets.generated.json').catch(() => ({ hero: [], process: [], directors: [] })),
    fetchJson('optimized.generated.json').catch(() => ({}))
  ]);

  const normalizedProjects = projects
    .map(validateProject)
    .filter(project => project.published)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  return {
    lang: site.default_language || 'es',
    assets,
    optimized,
    site,
    projects: normalizedProjects,
    featuredProjects: normalizedProjects.filter(project => project.featured)
  };
};

export const contentFallback = (value, label, lang = 'es') => localized(value, lang, `${label} a confirmar`);
