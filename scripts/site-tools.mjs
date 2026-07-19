import { promises as fs } from 'node:fs';
import path from 'node:path';

export const rootDir = process.cwd();
const imageExtensions = new Set(['.avif', '.jpeg', '.jpg', '.png', '.webp']);

export const shell = ({ page, slug, title, description }) => `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${escapeAttribute(description)}" />
  <meta name="theme-color" content="#000000" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="styles.css" />
  <script type="module" src="src/main.js"></script>
</head>
<body data-page="${page}"${slug ? ` data-project-slug="${escapeAttribute(slug)}"` : ''}>
  <div id="app"></div>
</body>
</html>
`;

export const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export const escapeAttribute = escapeHtml;

export const localized = (value, lang = 'es', fallback = '') => {
  if (value == null) return fallback;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return value[lang] || value.es || value.en || fallback;
};

export const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));

export const pathExists = async file => {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
};

export const readProjects = async () => {
  const projectsDir = path.join(rootDir, 'projects');
  const entries = await fs.readdir(projectsDir, { withFileTypes: true });
  const projects = [];
  const warnings = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const projectDir = path.join(projectsDir, entry.name);
    const projectPath = path.join(projectsDir, entry.name, 'project.json');
    const txtPath = await findProjectTxt(projectDir);
    const imageFiles = await listProjectImages(projectDir);

    try {
      const project = await readProjectData({
        folderName: entry.name,
        imageFiles,
        projectPath,
        txtPath
      });
      const normalized = { ...project, slug: project.slug || entry.name };
      warnings.push(...validateProject(normalized, projectPath));
      projects.push(normalized);
    } catch (error) {
      warnings.push(`${entry.name}: no se pudo leer el proyecto (${error.message})`);
    }
  }

  projects.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  return { projects, warnings };
};

const readProjectData = async ({ folderName, imageFiles, projectPath, txtPath }) => {
  const jsonData = await pathExists(projectPath) ? await readJson(projectPath) : {};
  const txtData = txtPath ? parseProjectTxt(await fs.readFile(txtPath, 'utf8')) : {};
  const inferredCover = imageFiles.find(file => /^images\/0?1[\s._-]/i.test(file) || /^0?1[\s._-]/i.test(file)) || imageFiles[0];
  const gallery = Array.isArray(jsonData.gallery) && jsonData.gallery.length
    ? jsonData.gallery
    : imageFiles.map((file, index) => ({
      file,
      caption_es: txtData.galleryCaptions?.[index] || `Imagen ${String(index + 1).padStart(2, '0')}`,
      alt_es: `${txtData.title?.es || jsonData.title?.es || folderName} ${String(index + 1).padStart(2, '0')}`
    }));

  return {
    slug: folderName,
    order: 999,
    published: true,
    featured: false,
    ...txtData,
    ...jsonData,
    cover: jsonData.cover || txtData.cover || inferredCover,
    gallery
  };
};

const parseProjectTxt = text => {
  const fields = {};
  const lines = text.replace(/\r/g, '').split('\n');
  let currentField = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(/^([^:=-]{2,48})\s*[:=-]\s*(.*)$/);
    if (match) {
      const field = txtFieldName(match[1]);
      if (field) {
        currentField = field;
        assignTxtField(fields, field, match[2].trim());
        continue;
      }
    }

    if (line && currentField && ['summary', 'description'].includes(currentField)) {
      assignTxtField(fields, currentField, line, true);
    }
  }

  return fields;
};

const txtFieldName = label => {
  const key = normalizeLabel(label);
  const fields = {
    alcance: 'scope',
    anio: 'year',
    ano: 'year',
    categoria: 'category',
    category: 'category',
    descripcion: 'description',
    destacado: 'featured',
    estado: 'status',
    featured: 'featured',
    location: 'location',
    memoria: 'description',
    nombre: 'title',
    order: 'order',
    orden: 'order',
    portada: 'cover',
    publicado: 'published',
    published: 'published',
    resumen: 'summary',
    scope: 'scope',
    status: 'status',
    superficie: 'surface_m2',
    surface: 'surface_m2',
    titulo: 'title',
    title: 'title',
    ubicacion: 'location',
    year: 'year'
  };
  return fields[key];
};

const normalizeLabel = value => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const assignTxtField = (fields, field, value, append = false) => {
  if (!value) return;
  if (['title', 'category', 'location', 'status', 'scope', 'summary', 'description'].includes(field)) {
    const previous = fields[field]?.es || '';
    fields[field] = { es: append && previous ? `${previous}\n${value}` : value };
    return;
  }
  if (['published', 'featured'].includes(field)) {
    fields[field] = /^(si|sí|true|1|yes|destacado|publicado)$/i.test(value);
    return;
  }
  if (field === 'surface_m2') {
    const numeric = Number(value.replace(/[^\d.,]/g, '').replace(',', '.'));
    fields[field] = Number.isFinite(numeric) ? numeric : null;
    return;
  }
  if (field === 'year' || field === 'order') {
    const numeric = Number.parseInt(value, 10);
    fields[field] = Number.isFinite(numeric) ? numeric : value;
    return;
  }
  fields[field] = value;
};

const findProjectTxt = async projectDir => {
  const entries = await fs.readdir(projectDir, { withFileTypes: true });
  const txt = entries
    .filter(entry => entry.isFile() && path.extname(entry.name).toLowerCase() === '.txt')
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b, 'es'));
  return txt[0] ? path.join(projectDir, txt[0]) : null;
};

const listProjectImages = async projectDir => {
  const roots = [projectDir, path.join(projectDir, 'images')];
  const files = [];
  for (const dir of roots) {
    if (!await pathExists(dir)) continue;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    entries.forEach(entry => {
      if (!entry.isFile() || !imageExtensions.has(path.extname(entry.name).toLowerCase())) return;
      const absolute = path.join(dir, entry.name);
      files.push(path.relative(projectDir, absolute).split(path.sep).join('/'));
    });
  }
  return [...new Set(files)].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
};

export const validateProject = (project, projectPath) => {
  const warnings = [];
  const label = project.slug || projectPath;
  ['slug', 'order', 'title', 'category', 'cover'].forEach(field => {
    if (project[field] == null || project[field] === '') warnings.push(`${label}: falta ${field}`);
  });
  if (!Array.isArray(project.gallery)) warnings.push(`${label}: gallery debe ser un array`);
  return warnings;
};

export const readGeneralAssets = async () => {
  const folders = await findImageRootFolders();
  return {
    hero: await listFirstMatchingFolderImages(folders, ['portada', 'portada-principal', 'hero', 'home']),
    process: await listFirstMatchingFolderImages(folders, ['proceso', 'process']),
    directors: await listFirstMatchingFolderImages(folders, ['directores', 'directors', 'equipo', 'team'])
  };
};

const findImageRootFolders = async () => {
  const candidates = ['IMG', 'img'].map(folder => path.join(rootDir, folder));
  const existing = [];
  for (const folder of candidates) {
    if (await pathExists(folder)) existing.push(folder);
  }
  return existing;
};

const listFirstMatchingFolderImages = async (rootFolders, names) => {
  for (const root of rootFolders) {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const folder = entries.find(entry => entry.isDirectory() && names.includes(normalizeLabel(entry.name)));
    if (!folder) continue;
    const absoluteFolder = path.join(root, folder.name);
    const files = await listImagesRecursive(absoluteFolder);
    return files.map(file => path.relative(rootDir, file).split(path.sep).join('/'));
  }
  return [];
};

const listImagesRecursive = async dir => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listImagesRecursive(absolute));
    if (entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase())) files.push(absolute);
  }
  return files.sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
};

export const writeGeneratedProjects = async () => {
  const { projects, warnings } = await readProjects();
  await fs.writeFile(
    path.join(rootDir, 'projects.generated.json'),
    `${JSON.stringify(projects, null, 2)}\n`
  );
  return { projects, warnings };
};

export const writeGeneratedAssets = async () => {
  const assets = await readGeneralAssets();
  await fs.writeFile(
    path.join(rootDir, 'assets.generated.json'),
    `${JSON.stringify(assets, null, 2)}\n`
  );
  return assets;
};

export const copyRecursive = async (from, to) => {
  const stat = await fs.stat(from);
  if (stat.isDirectory()) {
    await fs.mkdir(to, { recursive: true });
    const entries = await fs.readdir(from);
    await Promise.all(entries.map(entry => copyRecursive(path.join(from, entry), path.join(to, entry))));
    return;
  }
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to);
};

export const copyIfExists = async (from, to) => {
  if (await pathExists(from)) await copyRecursive(from, to);
};
