import {
  escapeHtml,
  formatNumber,
  imageAttrs,
  localized,
  projectAsset,
  projectHref
} from '../lib/html.js';

const projectTitle = (project, lang) => localized(project.title, lang, project.slug);
const projectCategory = (project, lang) => localized(project.category, lang, 'Categoría a confirmar');
const projectLocation = (project, lang) => localized(project.location, lang, 'Ubicación a confirmar');
const projectStatus = (project, lang) => localized(project.status, lang, 'Estado a confirmar');
const projectScope = (project, lang) => localized(project.scope, lang, 'Alcance a confirmar');
const ARROW_NE = '↗︎';
const ARROW_SE = '↘︎';
const ARROW_LEFT = '←';
const ARROW_RIGHT = '→';
const ARROW_UP = '↑';
let optimizedImages = {};
const setOptimizedImages = content => {
  optimizedImages = content?.optimized || {};
};
const mediaPath = (project, file) => {
  if (!file) return 'assets/project-placeholder.svg';
  if (/^(assets|img|projects)\//.test(file)) return file;
  return project ? projectAsset(project, file) : file;
};
const isVideo = file => /\.(mp4|mov|webm)$/i.test(file || '');
const optimizedSrcset = src => {
  const optimized = optimizedImages[src];
  return optimized?.variants?.length
    ? optimized.variants.map(variant => `${escapeHtml(variant.src)} ${variant.w}w`).join(', ')
    : '';
};
const optimizedFallback = src => {
  const optimized = optimizedImages[src];
  return optimized?.variants?.length
    ? optimized.variants[optimized.variants.length - 1].src
    : src;
};
const Media = ({
  alt = '',
  className = '',
  file,
  fetchPriority,
  loading = 'lazy',
  project,
  sizes,
  video = false
}) => {
  const src = mediaPath(project, file);
  const cls = className ? ` class="${escapeHtml(className)}"` : '';
  if (video || isVideo(file)) {
    return `<video${cls} autoplay muted loop playsinline preload="metadata" aria-label="${escapeHtml(alt)}"><source src="${escapeHtml(src)}" type="video/${src.endsWith('.webm') ? 'webm' : 'mp4'}" /></video>`;
  }
  const optimized = optimizedImages[src];
  if (!optimized?.variants?.length) {
    return `<img${cls} ${imageAttrs({ src, alt, fetchPriority, loading, sizes })} />`;
  }
  const srcset = optimizedSrcset(src);
  return `
    <picture${cls}>
      <source type="image/webp" srcset="${srcset}" sizes="${escapeHtml(sizes || '(max-width: 680px) 92vw, 50vw')}" />
      <img ${imageAttrs({ src: optimizedFallback(src), alt, fetchPriority, loading, sizes })} width="${optimized.width}" height="${optimized.height}" />
    </picture>
  `;
};

export const BaseChrome = (content, page, children) => `
  <div class="loader" aria-hidden="true">
    <img src="assets/brand/logo-nudo-white.png" alt="" class="loader__logo" />
    <span class="loader__line"></span>
  </div>
  <div class="page-transition" aria-hidden="true">
    <img src="assets/brand/logo-nudo-white.png" alt="" />
  </div>
  <div class="scroll-progress" aria-hidden="true"><span></span></div>
  ${Header(page)}
  <main>${children}</main>
  ${Footer(page)}
`;

export const Header = page => `
  <header class="site-header ${page !== 'project' ? 'site-header--solid' : ''}" data-header>
    <a class="brand" href="index.html" aria-label="NUDO Arquitectura — página principal" data-transition>
      <img src="assets/brand/logo-nudo-white.png" alt="NUDO Arquitectura" />
    </a>
    <button class="menu-button" type="button" aria-expanded="false" aria-controls="main-nav">
      <span></span><span></span>
      <span class="sr-only">Abrir menú</span>
    </button>
    <nav class="site-nav" id="main-nav" aria-label="Navegación principal">
      <a href="${page === 'home' ? '#proyectos' : 'proyectos.html'}" ${page === 'projects' ? 'aria-current="page"' : ''} ${page === 'home' ? '' : 'data-transition'}><span>01</span> PROYECTOS</a>
      <a href="${page === 'home' ? '#estudio' : 'index.html#estudio'}" ${page === 'home' ? '' : 'data-transition'}><span>02</span> ESTUDIO</a>
      <a href="${page === 'home' ? '#contacto' : 'index.html#contacto'}" ${page === 'home' ? '' : 'data-transition'}><span>03</span> CONTACTO</a>
    </nav>
  </header>
`;

export const Footer = page => `
  <footer class="site-footer ${page === 'projects' ? 'site-footer--compact' : ''}">
    <img src="assets/brand/logo-nudo-white.png" alt="NUDO Arquitectura" />
    <span>© <span data-year></span> NUDO ARQUITECTURA</span>
    ${page === 'projects' ? '' : `<a href="${page === 'home' ? '#inicio' : 'index.html#contacto'}" ${page === 'home' ? '' : 'data-transition'}>${page === 'home' ? `VOLVER ARRIBA ${ARROW_UP}` : `CONTACTO ${ARROW_NE}`}</a>`}
  </footer>
`;

export const HomePage = content => {
  setOptimizedImages(content);
  const { assets, site, projects, featuredProjects, lang } = content;
  const featured = featuredProjects.length ? featuredProjects : projects.slice(0, 4);
  const heroImages = assets?.heroDesktop?.length
    ? assets.heroDesktop.map((desktop, index) => ({ desktop, mobile: assets.heroMobile?.[index] }))
    : assets?.hero?.length ? assets.hero : featured[0]
    ? [featured[0].cover, ...(featured[0].gallery || []).slice(0, 2).map(item => item.file)]
    : [];
  return BaseChrome(content, 'home', `
    ${HeroVideo(featured[0], heroImages, assets?.heroVideo)}
    ${IntroSection()}
    ${Metrics(site)}
    ${FeaturedProjectsRail(featured, lang)}
    ${Manifesto()}
    ${StudioSection(site, lang)}
    ${ProcessSection(site, featured[0], lang, assets?.process || [])}
    ${TeamSection(assets?.directors || [])}
    ${ContactSection(site)}
  `);
};

export const HeroVideo = (project, heroImages = [], heroVideo = '') => {
  const slides = heroImages.length ? heroImages : ['assets/project-placeholder.svg'];
  const slideDesktop = slide => typeof slide === 'string' ? slide : slide.desktop;
  const slideMobile = slide => typeof slide === 'string' ? null : slide.mobile;
  const poster = optimizedFallback(mediaPath(project, slideDesktop(slides[0])));
  const videoType = heroVideo.endsWith('.webm') ? 'webm' : 'mp4';
  return `
    <section class="hero" id="inicio" aria-label="Portada">
      <div class="hero__fallback" aria-hidden="true">
        ${slides.map((slide, index) => {
          const desktopSrc = mediaPath(project, slideDesktop(slide));
          const mobileSrc = slideMobile(slide) ? mediaPath(project, slideMobile(slide)) : '';
          const desktopWebp = optimizedSrcset(desktopSrc);
          const mobileWebp = mobileSrc ? optimizedSrcset(mobileSrc) : '';
          const imageLoading = index === 0 ? 'eager' : 'lazy';
          const fetchPriority = index === 0 ? 'high' : 'low';
          return `
          <figure class="hero-slide ${index === 0 ? 'is-active' : ''}">
            ${slideMobile(slide) ? `
              <picture>
                ${mobileWebp ? `<source media="(max-width: 680px)" type="image/webp" srcset="${mobileWebp}" sizes="100vw" />` : ''}
                <source media="(max-width: 680px)" srcset="${escapeHtml(optimizedFallback(mobileSrc))}" />
                ${desktopWebp ? `<source type="image/webp" srcset="${desktopWebp}" sizes="100vw" />` : ''}
                <img ${imageAttrs({ src: optimizedFallback(desktopSrc), alt: '', fetchPriority, loading: imageLoading, sizes: '100vw' })} />
              </picture>
            ` : desktopWebp ? `
              <picture>
                <source type="image/webp" srcset="${desktopWebp}" sizes="100vw" />
                <img ${imageAttrs({ src: optimizedFallback(desktopSrc), alt: '', fetchPriority, loading: imageLoading, sizes: '100vw' })} />
              </picture>
            ` : `<img ${imageAttrs({ src: desktopSrc, alt: '', fetchPriority, loading: imageLoading, sizes: '100vw' })} />`}
          </figure>
        `;}).join('')}
      </div>
      ${heroVideo ? `
        <video class="hero__video" autoplay muted loop playsinline preload="metadata" poster="${escapeHtml(poster)}">
          <source src="${escapeHtml(heroVideo)}" type="video/${videoType}" />
        </video>
      ` : ''}
      <div class="hero__veil"></div>
      <div class="hero__grain"></div>
      <div class="hero__meta hero__meta--lines" aria-hidden="true"></div>
      <a class="scroll-cue" href="#presentacion" aria-label="Continuar"><i><b></b></i></a>
    </section>
  `;
};

export const IntroSection = () => `
  <section class="intro section-light" id="presentacion">
    <div class="section-shell intro__grid">
      <p class="section-index reveal">00 / NUDO</p>
      <div class="intro__content">
        <p class="intro__kicker reveal">Estudio de arquitectura fundado en 2022.</p>
        <h1 class="intro__title reveal">Diseñamos, documentamos y dirigimos cada proyecto como un proceso único.</h1>
        <div class="intro__aside reveal">
          <p>Participamos directamente desde los primeros trazos hasta la ejecución, integrando decisiones arquitectónicas, técnicas y constructivas.</p>
          <a class="arrow-link" href="#estudio">CONOCER EL ESTUDIO <span>${ARROW_SE}</span></a>
        </div>
      </div>
    </div>
  </section>
`;

export const Metrics = site => `
  <section class="metrics section-dark" id="cifras" aria-label="NUDO en números">
    <div class="section-shell metrics__grid">
      <article class="metric reveal">
        <span class="metric__number"><strong data-counter="${Number(site.metrics?.projects || 0)}">0</strong></span>
        <div><b>PROYECTOS</b><small>desarrollados desde ${site.founded || 2022}</small></div>
      </article>
      <article class="metric reveal">
        <span class="metric__number"><strong data-counter="${Number(site.metrics?.projected_m2 || 0)}">0</strong><em>m²</em></span>
        <div><b>PROYECTADOS</b><small>en proyectos de distintas escalas</small></div>
      </article>
      <article class="metric reveal">
        <span class="metric__number"><em>+</em><strong data-counter="${Number(site.metrics?.years_creating || 0)}">0</strong></span>
        <div><b>AÑOS</b><small>creando</small></div>
      </article>
    </div>
  </section>
`;

export const FeaturedProjectsRail = (projects, lang) => `
  <section class="projects-section section-dark" id="proyectos">
    <div class="section-shell">
      <div class="section-heading section-heading--light reveal">
        <p class="section-index">01 / PROYECTOS</p>
        <h2>Conocé nuestros trabajos.</h2>
        <a href="proyectos.html" class="arrow-link arrow-link--light" data-transition>VER PROYECTOS <span>${ARROW_NE}</span></a>
      </div>
      </div>
      <div class="project-rail-wrap reveal">
      <div class="project-rail" data-project-rail tabindex="0" aria-label="Proyectos destacados">
        ${projects.map((project, index) => ProjectRailCard(project, index, lang)).join('')}
      </div>
    </div>
  </section>
`;

export const ProjectRailCard = (project, index, lang) => `
  <a class="project-card ${index === 0 ? 'project-card--feature' : ''}" href="${projectHref(project)}">
    <figure>
      ${Media({
        project,
        file: project.cover,
        alt: projectTitle(project, lang),
        loading: index === 0 ? 'eager' : 'lazy',
        sizes: '(max-width: 680px) 88vw, 76vw'
      })}
      <div class="project-card__shade"></div>
      <div class="project-card__number">${String(index + 1).padStart(2, '0')}</div>
      <figcaption>
        <div><span>${escapeHtml(projectTitle(project, lang))}</span><small>${escapeHtml(projectCategory(project, lang))}</small></div>
        <div><small>${escapeHtml(projectLocation(project, lang))}</small></div>
      </figcaption>
      <i class="project-card__open">${ARROW_NE}</i>
    </figure>
  </a>
`;

export const Manifesto = () => `
  <section class="manifesto section-light" aria-label="Declaración del estudio">
    <div class="manifesto__track" aria-hidden="true">
      <div class="manifesto__sequence"><span>ANTEPROYECTO</span><i>/</i><span>PROYECTO EJECUTIVO</span><i>/</i><span>DIRECCIÓN DE OBRA</span><i>/</i><span>GESTIÓN DE PROYECTO</span><i>/</i></div>
      <div class="manifesto__sequence"><span>ANTEPROYECTO</span><i>/</i><span>PROYECTO EJECUTIVO</span><i>/</i><span>DIRECCIÓN DE OBRA</span><i>/</i><span>GESTIÓN DE PROYECTO</span><i>/</i></div>
    </div>
    <div class="section-shell manifesto__content">
      <p class="section-index reveal">FORMA DE TRABAJO</p>
      <blockquote class="reveal">La obra no es una etapa posterior al proyecto. Es parte del proyecto desde el primer día.</blockquote>
    </div>
  </section>
`;

export const StudioSection = (site, lang) => `
  <section class="studio section-light" id="estudio">
    <div class="section-shell">
      <div class="section-heading reveal">
        <p class="section-index">02 / ESTUDIO</p>
        <h2>Una mirada contemporánea con soluciones concretas.</h2>
        <span class="section-note">${escapeHtml(localized(site.operational_base, lang))}</span>
      </div>
      <div class="studio__story">
        <div class="studio__lead reveal"><p>${localized(site.about?.[lang]?.lead_html, lang, '<strong>NUDO</strong> es un estudio de arquitectura.')}</p></div>
        <div class="studio__copy reveal">
          ${(site.about?.[lang]?.body || []).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
        </div>
      </div>
      <div class="services-stack">
        <article class="service-row reveal">
          <h3>Proyecto arquitectónico</h3>
          <p>Anteproyecto, diseño, documentación ejecutiva, coordinación técnica y modelado.</p>
        </article>
        <article class="service-row service-row--accent reveal">
          <h3>Dirección y gestión de obra</h3>
          <p>Planificación, seguimiento, coordinación de proveedores, control de ejecución y resolución técnica.</p>
        </article>
      </div>
    </div>
  </section>
`;

export const ProcessSection = (site, project, lang, processAssets = []) => {
  const gallery = project?.gallery?.length ? project.gallery : [];
  const images = processAssets.length ? processAssets : [project?.cover, ...gallery.map(item => item.file)].filter(Boolean).slice(0, 4);
  const fallback = images.length ? images : ['assets/project-placeholder.svg'];
  return `
    <section class="process section-dark" aria-label="Proceso de trabajo">
      <div class="section-shell process__grid">
        <div class="process__visual reveal">
          <div class="process__images" data-process-images>
            ${fallback.map((file, index) => `
              ${Media({
                className: index === 0 ? 'is-active' : '',
                project,
                file,
                alt: index === 0 ? 'Proyecto construido' : 'Proceso de trabajo'
              })}
            `).join('')}
          </div>
          <span>DEL PROYECTO A LA OBRA</span>
        </div>
        <div class="process__content">
          <p class="section-index reveal">PROCESO</p>
          <div class="process-list" data-process-list>
            ${(site.process || []).map((item, index) => `
              <button class="process-item ${index === 0 ? 'is-active' : ''} reveal" type="button" data-process="${index}" aria-pressed="${index === 0 ? 'true' : 'false'}">
                <span>${String(item.order || index + 1).padStart(2, '0')}</span>
                <b>${escapeHtml(item.title)}</b>
                <small>${escapeHtml(item.description)}</small>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
};

const normalizeAssetName = value => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const directorPhoto = (assets, patterns, fallbackIndex) => {
  const byName = assets.find(asset => {
    const normalized = normalizeAssetName(asset);
    return patterns.some(pattern => normalized.includes(normalizeAssetName(pattern)));
  });
  return byName || assets[fallbackIndex];
};

const PersonPhoto = ({ asset, initials, alt, modifier }) => {
  const optimized = optimizedImages[asset];
  const dimensions = optimized ? ` width="${optimized.width}" height="${optimized.height}"` : '';
  return `
    <div class="person__photo ${modifier}">
      ${asset ? `<img class="person__image" src="${escapeHtml(optimizedFallback(asset))}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"${dimensions} />` : `<span>${initials}</span><small>FOTOGRAFÍA PENDIENTE</small>`}
    </div>
  `;
};

export const TeamSection = (directorAssets = []) => {
  const juanPhoto = directorPhoto(directorAssets, ['juan', 'pablo', 'puletto'], 0);
  const joaquinPhoto = directorPhoto(directorAssets, ['joaquin', 'joaquín', 'rivera'], 1);
  return `
    <section class="team section-light">
    <div class="section-shell">
      <div class="team__heading reveal">
        <p class="section-index">EQUIPO</p>
      </div>
      <div class="team-grid">
        <article class="person reveal">
          ${PersonPhoto({ asset: juanPhoto, initials: 'JP', alt: 'Juan Pablo Puletto', modifier: 'person__photo--one' })}
          <div class="person__meta"><h3>Juan Pablo Puletto</h3><p>Arquitecto · Director</p></div>
        </article>
        <article class="person reveal">
          ${PersonPhoto({ asset: joaquinPhoto, initials: 'JR', alt: 'Joaquín Rivera', modifier: 'person__photo--two' })}
          <div class="person__meta"><h3>Joaquín Rivera</h3><p>Arquitecto · Director</p></div>
        </article>
      </div>
    </div>
  </section>
  `;
};

export const ContactSection = site => `
  <section class="contact section-dark" id="contacto">
    <div class="contact__grid-bg" aria-hidden="true"></div>
    <div class="section-shell contact__inner reveal">
      <p class="section-index">03 / CONTACTO</p>
      <h2>Hablemos de tu próximo proyecto.</h2>
      <div class="contact__actions">
        <div class="contact-card contact-card--phones">
          <span>
            <small>CONTACTANOS</small>
            <strong>
              ${(site.contact?.phones || []).map(phone => `
                <a href="tel:${escapeHtml(phone.href)}" aria-label="Llamar a ${escapeHtml(phone.name)} al ${escapeHtml(phone.display)}">
                  <span>${escapeHtml(phone.display)}</span>
                  <em>${escapeHtml(phone.name)}</em>
                </a>
              `).join('')}
            </strong>
          </span>
          <i>${ARROW_NE}</i>
        </div>
        <a class="contact-card" href="mailto:${escapeHtml(site.contact?.email || '')}">
          <span><small>ESCRIBINOS UN CORREO</small><strong>${escapeHtml(site.contact?.email || '')}</strong></span><i>${ARROW_NE}</i>
        </a>
      </div>
      <div class="contact__meta"><span>MONTEVIDEO · MALDONADO · URUGUAY</span></div>
    </div>
  </section>
`;

export const ProjectsPage = content => {
  setOptimizedImages(content);
  return BaseChrome(content, 'projects', `
  <section class="archive-hero section-light">
    <div class="section-shell archive-hero__grid">
      <p class="section-index reveal">01 / ARCHIVO</p>
      <div>
        <h1 class="reveal">Proyectos</h1>
        <p class="archive-hero__lead reveal">Trabajos construidos, en ejecución y en desarrollo.</p>
      </div>
    </div>
  </section>
  <section class="archive section-light">
    <div class="section-shell archive__toolbar reveal">
      <p>TODOS LOS PROYECTOS</p>
      <p>${String(content.projects.length).padStart(2, '0')} PUBLICADOS</p>
    </div>
    <div class="section-shell archive-grid" data-project-grid>
      ${content.projects.map((project, index) => ArchiveCard(project, index, content.lang)).join('')}
    </div>
  </section>
  <section class="archive-cta section-dark">
    <div class="section-shell reveal"><a href="index.html#contacto" data-transition>Ponete en contacto con nosotros <span>${ARROW_NE}</span></a></div>
  </section>
  `);
};

export const ArchiveCard = (project, index, lang) => `
  <a class="archive-card reveal" href="${projectHref(project)}" data-transition>
    <figure>
      ${Media({
        project,
        file: project.cover,
        alt: projectTitle(project, lang),
        sizes: '(max-width: 680px) 92vw, (max-width: 980px) 45vw, 30vw'
      })}
      <div class="archive-card__overlay"></div>
      <span class="archive-card__id">${String(index + 1).padStart(2, '0')}</span>
      <figcaption><h2>${escapeHtml(projectTitle(project, lang))}</h2><p>${escapeHtml(projectCategory(project, lang))}</p></figcaption>
    </figure>
  </a>
`;

export const ProjectPage = (content, slug) => {
  setOptimizedImages(content);
  const { projects, lang } = content;
  const project = projects.find(item => item.slug === slug) || projects[0];
  if (!project) {
    return BaseChrome(content, 'project', `<section class="archive-hero section-light"><div class="section-shell"><h1>Proyecto no encontrado</h1></div></section>`);
  }
  const currentIndex = projects.findIndex(item => item.slug === project.slug);
  const previous = projects[currentIndex - 1];
  const next = projects[currentIndex + 1];
  return BaseChrome(content, 'project', `
    ${ProjectHero(project, lang)}
    ${ProjectSummary(project, lang)}
    ${ProjectGallery(project, lang)}
    ${ProjectNavigation(previous, next)}
    ${Lightbox()}
  `);
};

export const ProjectHero = (project, lang) => `
  <section class="project-hero">
    ${Media({
      project,
      file: project.cover,
      alt: `Vista exterior del proyecto ${projectTitle(project, lang)}`,
      fetchPriority: 'high',
      loading: 'eager',
      sizes: '100vw'
    })}
    <div class="project-hero__veil"></div>
    <div class="project-hero__meta"><span>${escapeHtml(projectCategory(project, lang))}</span><span>${escapeHtml(project.year || 'AÑO A CONFIRMAR')}</span></div>
    <div class="project-hero__title reveal"><p>${String(project.order || 1).padStart(2, '0')} / PROYECTO</p><h1>${escapeHtml(projectTitle(project, lang)).replace(/\s+/g, '<br>')}</h1></div>
    <a class="project-hero__back" href="proyectos.html" data-transition>${ARROW_LEFT} ARCHIVO</a>
  </section>
`;

export const ProjectSummary = (project, lang) => `
  <section class="project-summary section-light">
    <div class="section-shell project-summary__grid">
      <aside class="project-facts reveal">
        <p class="section-index">DATOS</p>
        <dl>
          <div><dt>UBICACIÓN</dt><dd>${escapeHtml(projectLocation(project, lang))}</dd></div>
          ${project.client ? `<div><dt>CLIENTE</dt><dd>${escapeHtml(localized(project.client, lang))}</dd></div>` : ''}
          <div><dt>AÑO</dt><dd>${escapeHtml(project.year || 'A confirmar')}</dd></div>
          <div><dt>ESTADO</dt><dd>${escapeHtml(projectStatus(project, lang))}</dd></div>
          <div><dt>ALCANCE</dt><dd>${escapeHtml(projectScope(project, lang))}</dd></div>
          <div><dt>SUPERFICIE</dt><dd>${project.surface_m2 ? `${formatNumber(project.surface_m2)} m²` : 'A confirmar'}</dd></div>
        </dl>
      </aside>
      <div class="project-description reveal">
        <p class="project-description__lead">${escapeHtml(localized(project.summary, lang, 'Memoria de proyecto'))}</p>
        <p>${escapeHtml(localized(project.description, lang, 'Memoria del proyecto en desarrollo.'))}</p>
        ${project.surface_m2 ? '' : '<p class="project-description__note">Memoria en desarrollo. Este texto se actualizará con la información definitiva del proyecto.</p>'}
      </div>
    </div>
  </section>
`;

export const ProjectGallery = (project, lang) => `
  <section class="project-gallery-detail section-light">
    <div class="section-shell project-gallery-detail__grid">
      ${(project.gallery || []).map((image, index) => `
        <figure class="detail-image ${index % 3 === 0 ? 'detail-image--wide' : 'detail-image--portrait'} reveal" ${isVideo(image.file) ? '' : 'data-lightbox'}>
          ${Media({
            project,
            file: image.file,
            alt: localized(image.alt_es ? { es: image.alt_es, en: image.alt_en } : image.alt, lang, `${projectTitle(project, lang)} ${index + 1}`),
            sizes: index % 3 === 0 ? '92vw' : '(max-width: 680px) 92vw, 46vw'
          })}
          <figcaption>${String(index + 1).padStart(2, '0')} / ${escapeHtml(localized(image.caption_es ? { es: image.caption_es, en: image.caption_en } : image.caption, lang, 'Imagen'))}</figcaption>
        </figure>
      `).join('')}
    </div>
  </section>
`;

export const ProjectNavigation = (previous, next) => `
  <nav class="project-navigation section-light" aria-label="Navegación entre proyectos">
    <div class="section-shell">
      <a href="${previous ? projectHref(previous) : 'proyectos.html'}" data-transition><span>${ARROW_LEFT}</span><small>${previous ? 'ANTERIOR' : 'VOLVER A'}</small><b>${previous ? escapeHtml(projectTitle(previous, 'es')) : 'TODOS LOS PROYECTOS'}</b></a>
      <a href="${next ? projectHref(next) : 'proyectos.html'}" data-transition><small>${next ? 'SIGUIENTE' : 'VER'}</small><b>${next ? escapeHtml(projectTitle(next, 'es')) : 'ARCHIVO COMPLETO'}</b><span>${ARROW_RIGHT}</span></a>
    </div>
  </nav>
`;

export const Lightbox = () => `
  <div class="lightbox" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Vista ampliada">
    <button class="lightbox__close" type="button" aria-label="Cerrar">×</button>
    <img src="" alt="" />
    <p></p>
  </div>
`;
