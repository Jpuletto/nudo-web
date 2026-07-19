import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

export const rootDir = process.cwd();
const imageExtensions = new Set(['.avif', '.jpeg', '.jpg', '.png', '.webp']);
const videoExtensions = new Set(['.mp4', '.mov', '.webm']);
const mediaExtensions = new Set([...imageExtensions, ...videoExtensions]);
export const assetVersion = '20260719-classic-404-9';
export const faviconAsset = `img/favicon-nudo-${assetVersion}.png`;

export const shell = ({ page, slug, title, description }) => `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${escapeAttribute(description)}" />
  <meta name="theme-color" content="#000000" />
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="${faviconAsset}" type="image/png" />
  <link rel="icon" href="favicon.ico?v=${assetVersion}" sizes="any" />
  <link rel="shortcut icon" href="${faviconAsset}" type="image/png" />
  <link rel="apple-touch-icon" href="${faviconAsset}" />
  <link rel="stylesheet" href="styles.css?v=${assetVersion}" />
  <script type="module" src="src/main.js?v=${assetVersion}"></script>
</head>
<body${page ? ` data-page="${page}"` : ''}${slug ? ` data-project-slug="${escapeAttribute(slug)}"` : ''}>
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

  let fallbackOrder = 1;
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const projectDir = path.join(projectsDir, entry.name);
    const projectPath = path.join(projectsDir, entry.name, 'project.json');
    const txtPath = await findProjectTxt(projectDir);
    const mediaFiles = await listProjectMedia(projectDir);

    if (!txtPath && !await pathExists(projectPath) && !mediaFiles.length) continue;

    try {
      const project = await readProjectData({
        fallbackOrder,
        folderName: entry.name,
        mediaFiles,
        projectPath,
        txtPath
      });
      const normalized = { ...project, slug: project.slug || entry.name };
      warnings.push(...validateProject(normalized, projectPath));
      projects.push(normalized);
      fallbackOrder += 1;
    } catch (error) {
      warnings.push(`${entry.name}: no se pudo leer el proyecto (${error.message})`);
    }
  }

  projects.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  return { projects, warnings };
};

const readProjectData = async ({ fallbackOrder, folderName, mediaFiles, projectPath, txtPath }) => {
  const jsonData = await pathExists(projectPath) ? await readJson(projectPath) : {};
  const txtData = txtPath ? parseProjectTxt(await fs.readFile(txtPath, 'utf8')) : {};
  const data = { ...jsonData, ...txtData };
  const fallbackTitle = titleFromFolder(folderName);
  const title = data.title || { es: fallbackTitle };
  const slug = slugify(data.slug || localized(title, 'es', fallbackTitle));
  const inferredCover = mediaFiles.find(file => /^images\/0?1[\s._-]/i.test(file) || /^0?1[\s._-]/i.test(file)) || mediaFiles[0];
  const listingCover = data.listingCover || data.listing_cover || data.previewCover || data.preview_cover
    || (videoExtensions.has(path.extname(inferredCover || '').toLowerCase())
      ? mediaFiles.find(file => imageExtensions.has(path.extname(file).toLowerCase()))
      : inferredCover);
  const gallery = Array.isArray(jsonData.gallery) && jsonData.gallery.length
    && !mediaFiles.length
    ? jsonData.gallery
    : mediaFiles.map((file, index) => ({
      file,
      caption_es: txtData.galleryCaptions?.[index] || `Imagen ${String(index + 1).padStart(2, '0')}`,
      alt_es: `${localized(title, 'es', fallbackTitle)} ${String(index + 1).padStart(2, '0')}`
    }));

  return {
    slug,
    folder: folderName,
    order: fallbackOrder,
    published: true,
    featured: true,
    title,
    ...jsonData,
    ...txtData,
    slug,
    order: txtData.order ?? fallbackOrder,
    cover: txtData.cover || inferredCover || jsonData.cover,
    listingCover,
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
    cliente: 'client',
    client: 'client',
    comentarios: 'comments',
    comments: 'comments',
    location: 'location',
    memoria: 'description',
    metraje: 'surface_m2',
    nombre: 'title',
    order: 'order',
    orden: 'order',
    portada: 'cover',
    programa: 'category',
    publicado: 'published',
    published: 'published',
    resumen: 'summary',
    scope: 'scope',
    slug: 'slug',
    status: 'status',
    superficie: 'surface_m2',
    surface: 'surface_m2',
    tareas: 'scope',
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
  if (['title', 'category', 'location', 'status', 'scope', 'summary', 'description', 'client', 'comments'].includes(field)) {
    const previous = fields[field]?.es || '';
    fields[field] = { es: append && previous ? `${previous}\n${value}` : value };
    return;
  }
  if (['published', 'featured'].includes(field)) {
    fields[field] = /^(si|sí|true|1|yes|destacado|publicado)$/i.test(value);
    return;
  }
  if (field === 'surface_m2') {
    const numeric = Number(value.match(/\d+(?:[.,]\d+)?/)?.[0].replace(',', '.'));
    fields[field] = Number.isFinite(numeric) ? numeric : value;
    return;
  }
  if (field === 'order') {
    const numeric = Number.parseInt(value, 10);
    fields[field] = Number.isFinite(numeric) ? numeric : value;
    return;
  }
  if (field === 'year') {
    fields[field] = value;
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

const listProjectMedia = async projectDir => {
  const roots = [projectDir, path.join(projectDir, 'images')];
  const files = [];
  for (const dir of roots) {
    if (!await pathExists(dir)) continue;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    entries.forEach(entry => {
      if (!entry.isFile() || !mediaExtensions.has(path.extname(entry.name).toLowerCase())) return;
      const absolute = path.join(dir, entry.name);
      files.push(path.relative(projectDir, absolute).split(path.sep).join('/'));
    });
  }
  return [...new Set(files)].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
};

const readableFolderName = folderName => folderName
  .replace(/[_-]+/g, ' ')
  .replace(/^(ingreso|reforma|punta|delta)(?=[a-z])/i, '$1 ');

const titleFromFolder = folderName => readableFolderName(folderName)
  .toLowerCase()
  .split(/[\s_-]+/)
  .filter(Boolean)
  .map(word => word.length <= 3 ? word.toUpperCase() : `${word[0].toUpperCase()}${word.slice(1)}`)
  .join(' ');

const slugify = value => normalizeLabel(value)
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

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
    hero: await listFirstMatchingFolderImages(folders, ['portada', 'portadas', 'portada-principal', 'hero', 'home']),
    heroDesktop: await listNestedFolderImages(folders, ['portada', 'portadas'], ['pc', 'desktop', 'escritorio']),
    heroMobile: await listNestedFolderImages(folders, ['portada', 'portadas'], ['mobile', 'movil', 'móvil']),
    heroVideo: await findHeroVideo(),
    process: await listProcessAssets(folders),
    directors: await listFirstMatchingFolderImages(folders, ['directores', 'directors', 'equipo', 'team'])
  };
};

const findImageRootFolders = async () => {
  const candidates = ['img'].map(folder => path.join(rootDir, folder));
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

const listNestedFolderImages = async (rootFolders, parentNames, childNames) => {
  for (const root of rootFolders) {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const parent = entries.find(entry => entry.isDirectory() && parentNames.includes(normalizeLabel(entry.name)));
    if (!parent) continue;
    const parentFolder = path.join(root, parent.name);
    const children = await fs.readdir(parentFolder, { withFileTypes: true });
    const child = children.find(entry => entry.isDirectory() && childNames.includes(normalizeLabel(entry.name)));
    if (!child) continue;
    const files = await listImagesRecursive(path.join(parentFolder, child.name));
    return files.map(file => path.relative(rootDir, file).split(path.sep).join('/'));
  }
  return [];
};

const listProcessAssets = async rootFolders => {
  const files = await listFirstMatchingFolderImages(rootFolders, ['proceso', 'procesos', 'process']);
  const order = ['evaluar', 'proyectar', 'documentar', 'construir'];
  return [...files].sort((a, b) => {
    const aName = normalizeLabel(path.basename(a, path.extname(a)));
    const bName = normalizeLabel(path.basename(b, path.extname(b)));
    const aIndex = order.findIndex(key => aName.includes(key));
    const bIndex = order.findIndex(key => bName.includes(key));
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex) || a.localeCompare(b, 'es', { numeric: true });
  });
};

const findHeroVideo = async () => {
  const videoDir = path.join(rootDir, 'assets', 'video');
  if (!await pathExists(videoDir)) return '';
  const files = await listFilesRecursive(videoDir, videoExtensions);
  const preferred = files.find(file => normalizeLabel(path.basename(file, path.extname(file))).includes('resumen-nudo')) || files[0];
  return preferred ? path.relative(rootDir, preferred).split(path.sep).join('/') : '';
};

const listImagesRecursive = async dir => {
  return listFilesRecursive(dir, imageExtensions);
};

const listFilesRecursive = async (dir, extensions) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFilesRecursive(absolute, extensions));
    if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) files.push(absolute);
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

export const writeOptimizedImages = async () => {
  const python = await findPython();
  if (!python) {
    await fs.writeFile(path.join(rootDir, 'optimized.generated.json'), '{}\n');
    return { ok: false, message: 'No se encontró Python para optimizar imágenes.' };
  }

  await runCommand(python, [path.join(rootDir, 'scripts', 'optimize-images.py')]);
  return { ok: true };
};

const findPython = async () => {
  const candidates = [
    process.env.PYTHON,
    '/Users/jpuletto/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3',
    'python3'
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.includes(path.sep)) {
      if (await pathExists(candidate)) return candidate;
      continue;
    }
    return candidate;
  }
  return null;
};

const runCommand = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd: rootDir, stdio: 'inherit' });
  child.on('error', reject);
  child.on('exit', code => {
    if (code === 0) resolve();
    else reject(new Error(`${command} terminó con código ${code}`));
  });
});

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
  if (!await pathExists(from)) return false;
  await copyRecursive(from, to);
  return true;
};
