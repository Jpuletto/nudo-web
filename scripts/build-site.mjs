import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  copyIfExists,
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

const run = async () => {
  const site = await readJson(path.join(rootDir, 'site.json'));
  const generated = await writeGeneratedProjects();
  await writeGeneratedAssets();
  await writeOptimizedImages();

  const publishedProjects = generated.projects.filter(project => project.published);
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  await Promise.all([
    copyRecursive(path.join(rootDir, 'assets'), path.join(distDir, 'assets')),
    copyRecursive(path.join(rootDir, 'projects'), path.join(distDir, 'projects')),
    copyRecursive(path.join(rootDir, 'src'), path.join(distDir, 'src')),
    copyRecursive(path.join(rootDir, 'styles.css'), path.join(distDir, 'styles.css')),
    copyRecursive(path.join(rootDir, 'site.json'), path.join(distDir, 'site.json')),
    copyRecursive(path.join(rootDir, 'projects.generated.json'), path.join(distDir, 'projects.generated.json')),
    copyRecursive(path.join(rootDir, 'assets.generated.json'), path.join(distDir, 'assets.generated.json')),
    copyRecursive(path.join(rootDir, 'optimized.generated.json'), path.join(distDir, 'optimized.generated.json')),
    copyIfExists(path.join(rootDir, 'optimized'), path.join(distDir, 'optimized')),
    copyIfExists(path.join(rootDir, 'IMG'), path.join(distDir, 'IMG')),
    copyIfExists(path.join(rootDir, 'img'), path.join(distDir, 'img'))
  ]);

  await fs.writeFile(path.join(distDir, 'index.html'), shell({
    page: 'home',
    title: 'NUDO Arquitectura',
    description: 'NUDO Arquitectura — proyecto arquitectónico, dirección y gestión de obra en Montevideo y Maldonado.'
  }));

  await fs.writeFile(path.join(distDir, 'proyectos.html'), shell({
    page: 'projects',
    title: 'Proyectos — NUDO Arquitectura',
    description: 'Archivo de proyectos de NUDO Arquitectura: trabajos construidos, en ejecución y en desarrollo.'
  }));

  await Promise.all(publishedProjects.map(project => fs.writeFile(
    path.join(distDir, `proyecto-${project.slug}.html`),
    shell({
      page: 'project',
      slug: project.slug,
      title: `${localized(project.title, site.default_language || 'es', 'Proyecto')} — NUDO Arquitectura`,
      description: localized(project.summary, site.default_language || 'es', 'Proyecto de NUDO Arquitectura.')
    })
  )));

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
