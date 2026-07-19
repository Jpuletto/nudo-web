import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  copyIfExists,
  faviconAsset,
  copyRecursive,
  localized,
  readJson,
  rootDir,
  shell,
  writeOptimizedImages,
  writeGeneratedAssets,
  writeGeneratedProjects
} from './site-tools.mjs';

const distDir = path.join(rootDir, 'dist');
const videoExtensions = new Set(['.mp4', '.mov', '.webm']);
const exists = async file => {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
};

const removeGeneratedProjectPages = async targetDir => {
  const entries = await fs.readdir(targetDir).catch(() => []);
  await Promise.all(entries
    .filter(entry => /^proyecto-[a-z0-9-]+\.html$/.test(entry))
    .map(entry => fs.unlink(path.join(targetDir, entry))));
};

const writeStaticShells = async (targetDir, site, publishedProjects) => {
  await removeGeneratedProjectPages(targetDir);

  await fs.writeFile(path.join(targetDir, 'index.html'), shell({
    page: 'home',
    title: 'NUDO Arquitectura',
    description: 'NUDO Arquitectura — proyecto arquitectónico, dirección y gestión de obra en Montevideo y Maldonado.'
  }));

  await fs.writeFile(path.join(targetDir, 'proyectos.html'), shell({
    page: 'projects',
    title: 'Proyectos — NUDO Arquitectura',
    description: 'Archivo de proyectos de NUDO Arquitectura: trabajos construidos, en ejecución y en desarrollo.'
  }));

  await fs.writeFile(path.join(targetDir, '404.html'), shell({
    page: '',
    title: 'NUDO Arquitectura',
    description: 'NUDO Arquitectura — proyecto arquitectónico, dirección y gestión de obra en Montevideo y Maldonado.'
  }));

  await Promise.all(publishedProjects.map(project => fs.writeFile(
    path.join(targetDir, `proyecto-${project.slug}.html`),
    shell({
      page: 'project',
      slug: project.slug,
      title: `${localized(project.title, site.default_language || 'es', 'Proyecto')} — NUDO Arquitectura`,
      description: localized(project.summary, site.default_language || 'es', 'Proyecto de NUDO Arquitectura.')
    })
  )));
};

const writeApacheCacheConfig = async () => {
  await fs.writeFile(path.join(distDir, '.htaccess'), `
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/avif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType video/mp4 "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType application/json "access plus 10 minutes"
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\\.(webp|avif|png|jpe?g|svg|mp4)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.(css|js)$">
    Header set Cache-Control "public, max-age=2592000"
  </FilesMatch>
  <FilesMatch "\\.(html|json)$">
    Header set Cache-Control "public, max-age=600"
  </FilesMatch>
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>
`.trimStart());
};

const copyRequiredFile = async relativePath => copyIfExists(
  path.join(rootDir, relativePath),
  path.join(distDir, relativePath)
);

const copyVisibleFiles = async relativeDir => {
  const absoluteDir = path.join(rootDir, relativeDir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true }).catch(() => []);
  await Promise.all(entries
    .filter(entry => entry.isFile() && !entry.name.startsWith('.'))
    .map(entry => copyRequiredFile(path.join(relativeDir, entry.name))));
};

const copyFavicon = async () => {
  const faviconSource = path.join(rootDir, 'img', 'favicon.png');
  await copyRequiredFile('img/favicon.png');
  await copyIfExists(
    faviconSource,
    path.join(distDir, faviconAsset)
  );
  await copyIfExists(
    faviconSource,
    path.join(distDir, 'favicon.png')
  );
  if (await exists(faviconSource)) {
    const png = await fs.readFile(faviconSource);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    const header = Buffer.alloc(22);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(1, 4);
    header.writeUInt8(width >= 256 ? 0 : width, 6);
    header.writeUInt8(height >= 256 ? 0 : height, 7);
    header.writeUInt8(0, 8);
    header.writeUInt8(0, 9);
    header.writeUInt16LE(1, 10);
    header.writeUInt16LE(32, 12);
    header.writeUInt32LE(png.length, 14);
    header.writeUInt32LE(22, 18);
    await fs.writeFile(path.join(distDir, 'favicon.ico'), Buffer.concat([header, png]));
  }
};

const validatePublicationInputs = async assets => {
  const missing = [];
  if (!await exists(path.join(rootDir, 'img', 'favicon.png'))) missing.push('img/favicon.png');
  if (!(assets.heroDesktop?.length || assets.hero?.length)) missing.push('img/portadas');
  if ((assets.process || []).length < 4) missing.push('img/procesos');
  if ((assets.directors || []).length < 2) missing.push('img/directores');

  if (missing.length) {
    throw new Error(`Faltan recursos generales para publicar: ${missing.join(', ')}`);
  }
};

const copyPublicationAssets = async assets => {
  await Promise.all([
    copyVisibleFiles('assets/brand'),
    copyRequiredFile('assets/project-placeholder.svg'),
    assets.heroVideo ? copyRequiredFile(assets.heroVideo) : Promise.resolve(),
    copyFavicon()
  ]);
};

const copyProjectVideos = async projects => {
  const videos = new Set();
  projects.forEach(project => {
    [project.cover, project.listingCover, ...(project.gallery || []).map(item => item.file)].forEach(file => {
      if (!file || !videoExtensions.has(path.extname(file).toLowerCase())) return;
      videos.add(path.join('projects', project.folder || project.slug, file));
    });
  });

  await Promise.all([...videos].map(copyRequiredFile));
};

const assertOptimizedImagesCoverContent = async (projects, assets) => {
  const optimized = await readJson(path.join(rootDir, 'optimized.generated.json'));
  const missing = [];
  const expectOptimized = file => {
    if (!file || videoExtensions.has(path.extname(file).toLowerCase())) return;
    if (!optimized[file]?.variants?.length) missing.push(file);
  };

  projects.forEach(project => {
    [project.cover, project.listingCover].forEach(file => {
      if (!file || videoExtensions.has(path.extname(file).toLowerCase())) return;
      expectOptimized(path.join('projects', project.folder || project.slug, file).split(path.sep).join('/'));
    });
    (project.gallery || []).forEach(item => {
      expectOptimized(path.join('projects', project.folder || project.slug, item.file).split(path.sep).join('/'));
    });
  });
  [...(assets.hero || []), ...(assets.heroDesktop || []), ...(assets.heroMobile || []), ...(assets.process || []), ...(assets.directors || [])]
    .forEach(expectOptimized);

  if (missing.length) {
    throw new Error(`Faltan imágenes optimizadas para publicar: ${missing.slice(0, 8).join(', ')}`);
  }
};

const run = async () => {
  const site = await readJson(path.join(rootDir, 'site.json'));
  const generated = await writeGeneratedProjects();
  const generatedAssets = await writeGeneratedAssets();
  await validatePublicationInputs(generatedAssets);
  await writeOptimizedImages();

  const publishedProjects = generated.projects.filter(project => project.published);
  await assertOptimizedImagesCoverContent(publishedProjects, generatedAssets);

  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  await Promise.all([
    copyRecursive(path.join(rootDir, 'src'), path.join(distDir, 'src')),
    copyRecursive(path.join(rootDir, 'styles.css'), path.join(distDir, 'styles.css')),
    copyRecursive(path.join(rootDir, 'site.json'), path.join(distDir, 'site.json')),
    copyRecursive(path.join(rootDir, 'projects.generated.json'), path.join(distDir, 'projects.generated.json')),
    copyRecursive(path.join(rootDir, 'assets.generated.json'), path.join(distDir, 'assets.generated.json')),
    copyRecursive(path.join(rootDir, 'optimized.generated.json'), path.join(distDir, 'optimized.generated.json')),
    copyIfExists(path.join(rootDir, 'optimized'), path.join(distDir, 'optimized')),
    copyPublicationAssets(generatedAssets),
    copyProjectVideos(publishedProjects)
  ]);

  await writeStaticShells(distDir, site, publishedProjects);
  await writeApacheCacheConfig();

  if (generated.warnings.length) {
    console.warn('\nAdvertencias de contenido:');
    generated.warnings.forEach(warning => console.warn(`- ${warning}`));
  }
  console.log(`Build listo en dist/ con ${publishedProjects.length} proyecto(s) publicado(s).`);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
