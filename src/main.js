import { HomePage, ProjectPage, ProjectsPage } from './components/site.js?v=20260816-lightbox-fullres-60';
import { loadContent } from './lib/content.js?v=20260816-lightbox-fullres-60';

const body = document.body;
const page = body.dataset.page || pageFromPath(window.location.pathname);
const mount = document.querySelector('#app');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

window.addEventListener('pageshow', event => {
  if (event.persisted) window.location.reload();
});

const renderPage = async () => {
  if (page === 'project' && !window.location.hash) window.scrollTo(0, 0);
  const content = await loadContent();
  const slug = body.dataset.projectSlug || projectSlugFromPath(window.location.pathname);
  const html = page === 'projects'
    ? ProjectsPage(content)
    : page === 'project'
      ? ProjectPage(content, slug)
      : HomePage(content);

  mount.innerHTML = html;
  document.title = getPageTitle(content, page, slug);
  initInteractions();
  scrollToHashTarget();
};

function pageFromPath(pathname) {
  const file = pathname.split('/').pop() || 'index.html';
  if (file === 'proyectos.html') return 'projects';
  if (/^proyecto-[a-z0-9-]+\.html$/i.test(file)) return 'project';
  return 'home';
}

function projectSlugFromPath(pathname) {
  const file = pathname.split('/').pop() || '';
  return file.match(/^proyecto-([a-z0-9-]+)\.html$/i)?.[1] || '';
}

const getPageTitle = (content, currentPage, slug) => {
  if (currentPage === 'projects') return 'Proyectos — NUDO Arquitectura';
  if (currentPage === 'project') {
    const project = content.projects.find(item => item.slug === slug);
    const title = project?.title?.es || project?.title || 'Proyecto';
    return `${title} — NUDO Arquitectura`;
  }
  return 'NUDO Arquitectura';
};

const scrollToHashTarget = () => {
  if (page !== 'home' || !window.location.hash) return;
  const targetId = decodeURIComponent(window.location.hash.slice(1));
  const scroll = () => {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
  };
  requestAnimationFrame(scroll);
  window.setTimeout(scroll, 120);
  window.setTimeout(scroll, 650);
};

const initInteractions = () => {
  const loader = document.querySelector('.loader');
  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('.menu-button');
  const nav = document.querySelector('.site-nav');
  const progress = document.querySelector('.scroll-progress span');
  const transitionLayer = document.querySelector('.page-transition');

  const hideLoader = () => {
    window.setTimeout(() => loader?.classList.add('is-hidden'), reducedMotion ? 0 : 180);
  };
  if (document.readyState === 'complete') hideLoader();
  window.addEventListener('load', hideLoader, { once: true });
  window.addEventListener('pageshow', () => {
    transitionLayer?.classList.remove('is-active');
    hideLoader();
  });
  window.setTimeout(hideLoader, 650);

  const updateScrollUI = () => {
    const projectHero = page === 'project' ? document.querySelector('.project-hero') : null;
    const solidThreshold = projectHero
      ? Math.max(90, projectHero.offsetHeight - (header?.offsetHeight || 0) - 8)
      : 28;
    header?.classList.toggle('is-scrolled', window.scrollY > solidThreshold);
    if (progress) {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const amount = height > 0 ? window.scrollY / height : 0;
      progress.style.transform = `scaleX(${Math.min(Math.max(amount, 0), 1)})`;
    }
  };
  if (page === 'project' && !window.location.hash) {
    window.scrollTo(0, 0);
    header?.classList.remove('is-scrolled');
  }
  updateScrollUI();
  if (page === 'project' && !window.location.hash) {
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      header?.classList.remove('is-scrolled');
      updateScrollUI();
    });
  }
  window.addEventListener('scroll', updateScrollUI, { passive: true });
  if (page === 'home') window.addEventListener('hashchange', scrollToHashTarget);

  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    nav?.classList.toggle('is-open', !open);
    body.classList.toggle('menu-open', !open);
  });

  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    nav?.classList.remove('is-open');
    body.classList.remove('menu-open');
  }));

  document.querySelectorAll('a[data-transition]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || link.target === '_blank') return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      event.preventDefault();
      transitionLayer?.classList.add('is-active');
      window.setTimeout(() => {
        window.location.href = href;
      }, reducedMotion ? 0 : 180);
    });
  });

  initHero();
  initReveals();
  initCounters();
  initProjectRail();
  initProcess();
  initBeforeAfter();
  initLightbox();
  initTeamPhotoTouch();
  initMediaProtection();

  document.querySelectorAll('[data-year]').forEach(node => {
    node.textContent = new Date().getFullYear();
  });
};

const initMediaProtection = () => {
  document.querySelectorAll('img, video, picture').forEach(media => {
    media.setAttribute('draggable', 'false');
    media.addEventListener('dragstart', event => event.preventDefault());
    media.addEventListener('contextmenu', event => event.preventDefault());
  });
};

const initHero = () => {
  const hero = document.querySelector('.hero');
  const heroVideo = document.querySelector('.hero__video');
  const slides = [...document.querySelectorAll('.hero-slide')];

  if (heroVideo && hero) {
    heroVideo.addEventListener('canplay', () => hero.classList.add('has-video'), { once: true });
    heroVideo.addEventListener('error', () => hero.classList.remove('has-video'));
  }

  if (slides.length > 1 && !reducedMotion) {
    let currentSlide = 0;
    window.setInterval(() => {
      currentSlide = (currentSlide + 1) % slides.length;
      slides.forEach((slide, index) => slide.classList.toggle('is-active', index === currentSlide));
    }, 4200);
  }
};

const initReveals = () => {
  const revealItems = document.querySelectorAll('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(item => item.classList.add('is-visible'));
    return;
  }

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });

  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index % 4, 3) * 55}ms`;
    revealObserver.observe(item);
  });
};

const initCounters = () => {
  const counters = document.querySelectorAll('[data-counter]');
  const formatNumber = value => new Intl.NumberFormat('es-UY').format(value);
  const animateCounter = element => {
    const target = Number(element.dataset.counter || 0);
    const startTime = performance.now();
    const duration = 1550;
    const frame = now => {
      const progressValue = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progressValue, 4);
      element.textContent = formatNumber(Math.floor(target * eased));
      if (progressValue < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  if (!counters.length) return;
  if (reducedMotion || !('IntersectionObserver' in window)) {
    counters.forEach(counter => {
      counter.textContent = formatNumber(Number(counter.dataset.counter || 0));
    });
    return;
  }

  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.45 });
  counters.forEach(counter => counterObserver.observe(counter));
};

const initProjectRail = () => {
  const rail = document.querySelector('[data-project-rail]');
  if (!rail) return;
  const previousButton = document.querySelector('[data-project-rail-prev]');
  const nextButton = document.querySelector('[data-project-rail-next]');
  let movedDuringPointer = false;
  const scrollRail = direction => {
    const card = rail.querySelector('.project-card');
    const amount = card ? card.getBoundingClientRect().width + 32 : rail.clientWidth * 0.78;
    rail.scrollBy({
      left: direction * amount,
      behavior: reducedMotion ? 'auto' : 'smooth'
    });
  };

  previousButton?.addEventListener('click', () => scrollRail(-1));
  nextButton?.addEventListener('click', () => scrollRail(1));

  rail.addEventListener('wheel', event => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || rail.scrollWidth <= rail.clientWidth) return;
    const maxScroll = rail.scrollWidth - rail.clientWidth;
    const scrollingForward = event.deltaY > 0;
    const canScrollForward = scrollingForward && rail.scrollLeft < maxScroll - 2;
    const canScrollBackward = !scrollingForward && rail.scrollLeft > 2;
    if (!canScrollForward && !canScrollBackward) return;
    rail.scrollLeft += event.deltaY * 0.7;
  }, { passive: true });

  rail.addEventListener('click', event => {
    const card = event.target.closest('.project-card');
    if (!card) return;
    if (movedDuringPointer) {
      event.preventDefault();
      movedDuringPointer = false;
      return;
    }
    const href = card.getAttribute('href');
    if (!href) return;
    event.preventDefault();
    document.querySelector('.page-transition')?.classList.add('is-active');
    window.setTimeout(() => {
      window.location.href = href;
    }, reducedMotion ? 0 : 120);
  });

  if (!window.matchMedia('(pointer:fine)').matches) return;

  let pointerIsDown = false;
  let dragging = false;
  let startX = 0;
  let startScroll = 0;
  let activePointerId = null;

  rail.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    pointerIsDown = true;
    dragging = false;
    movedDuringPointer = false;
    activePointerId = event.pointerId;
    startX = event.clientX;
    startScroll = rail.scrollLeft;
  });

  rail.addEventListener('pointermove', event => {
    if (!pointerIsDown) return;
    const movement = event.clientX - startX;
    if (!dragging && Math.abs(movement) > 8) {
      dragging = true;
      movedDuringPointer = true;
      rail.classList.add('is-dragging');
      if (!rail.hasPointerCapture(event.pointerId)) rail.setPointerCapture(event.pointerId);
    }
    if (!dragging) return;
    event.preventDefault();
    rail.scrollLeft = startScroll - movement * 1.2;
  });

  const endDrag = () => {
    if (activePointerId != null && rail.hasPointerCapture(activePointerId)) {
      rail.releasePointerCapture(activePointerId);
    }
    pointerIsDown = false;
    dragging = false;
    activePointerId = null;
    rail.classList.remove('is-dragging');
  };
  rail.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', endDrag);
};

const initProcess = () => {
  const processItems = [...document.querySelectorAll('[data-process]')];
  const processImages = [...document.querySelectorAll('[data-process-images] > picture, [data-process-images] > img, [data-process-images] > video')];
  processItems.forEach(item => {
    const activate = () => {
      const index = Number(item.dataset.process || 0);
      processItems.forEach(node => {
        const selected = node === item;
        node.classList.toggle('is-active', selected);
        node.setAttribute('aria-pressed', String(selected));
      });
      processImages.forEach((image, imageIndex) => {
        image.classList.toggle('is-active', imageIndex === Math.min(index, processImages.length - 1));
      });
    };
    item.addEventListener('click', activate);
    item.addEventListener('mouseenter', activate);
    item.addEventListener('focus', activate);
  });
};

const initBeforeAfter = () => {
  document.querySelectorAll('[data-before-after]').forEach(stage => {
    const range = stage.querySelector('.before-after__range');
    if (!range) return;
    const update = () => {
      const value = Math.min(Math.max(Number(range.value || 50), 0), 100);
      stage.style.setProperty('--position', `${value}%`);
      stage.classList.toggle('is-before-only', value <= 4);
      stage.classList.toggle('is-after-only', value >= 96);
      range.setAttribute('aria-valuetext', `${value}% después`);
    };
    range.addEventListener('input', update);
    update();
  });
};

const initLightbox = () => {
  const lightbox = document.querySelector('.lightbox');
  const lightboxImage = lightbox?.querySelector('img');
  const lightboxCaption = lightbox?.querySelector('p');
  const closeButton = lightbox?.querySelector('.lightbox__close');
  const previousButton = lightbox?.querySelector('.lightbox__nav--prev');
  const nextButton = lightbox?.querySelector('.lightbox__nav--next');
  const figures = [...document.querySelectorAll('[data-lightbox]')];
  let lastFocusedElement = null;
  let currentIndex = 0;
  let lightboxStartX = 0;
  let lightboxStartY = 0;
  let lightboxPointerActive = false;
  let lightboxSwipeHandled = false;
  let suppressLightboxClick = false;
  const zoomPointers = new Map();
  let zoomScale = 1;
  let zoomStartScale = 1;
  let zoomStartDistance = 0;
  let zoomX = 0;
  let zoomY = 0;
  let zoomStartX = 0;
  let zoomStartY = 0;
  let panStartX = 0;
  let panStartY = 0;
  let mousePanActive = false;
  let mousePanPointerId = null;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const distanceBetween = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clampZoomPan = () => {
    const rect = lightboxImage?.getBoundingClientRect();
    if (!rect || zoomScale <= 1) {
      zoomX = 0;
      zoomY = 0;
      return;
    }
    const maxX = Math.max(0, (rect.width * (zoomScale - 1)) / 2);
    const maxY = Math.max(0, (rect.height * (zoomScale - 1)) / 2);
    zoomX = clamp(zoomX, -maxX, maxX);
    zoomY = clamp(zoomY, -maxY, maxY);
  };
  const applyZoom = () => {
    if (!lightboxImage) return;
    clampZoomPan();
    lightboxImage.style.transform = `translate3d(${zoomX}px, ${zoomY}px, 0) scale(${zoomScale})`;
    lightbox?.classList.toggle('is-zoomed', zoomScale > 1.01);
  };
  const setZoom = value => {
    zoomScale = clamp(value, 1, 3.2);
    if (zoomScale <= 1.01) {
      zoomScale = 1;
      zoomX = 0;
      zoomY = 0;
    }
    applyZoom();
  };
  const resetZoom = () => {
    zoomPointers.clear();
    mousePanActive = false;
    mousePanPointerId = null;
    zoomScale = 1;
    zoomStartScale = 1;
    zoomStartDistance = 0;
    zoomX = 0;
    zoomY = 0;
    applyZoom();
  };

  const closeLightbox = () => {
    resetZoom();
    lightbox?.classList.remove('is-open');
    lightbox?.setAttribute('aria-hidden', 'true');
    body.classList.remove('lightbox-open');
    lastFocusedElement?.focus();
  };

  const showImage = index => {
    const figure = figures[index];
    const image = figure?.querySelector('img');
    const caption = figure?.querySelector('figcaption');
    if (!image || !lightboxImage) return;
    currentIndex = index;
    resetZoom();
    lightboxImage.src = image.src || image.currentSrc;
    lightboxImage.alt = image.alt;
    if (lightboxCaption) lightboxCaption.innerHTML = caption?.querySelector('.detail-image__project')?.innerHTML || '';
    previousButton?.toggleAttribute('disabled', figures.length < 2);
    nextButton?.toggleAttribute('disabled', figures.length < 2);
  };

  const showRelativeImage = direction => {
    if (!figures.length) return;
    showImage((currentIndex + direction + figures.length) % figures.length);
  };

  figures.forEach((figure, index) => {
    figure.tabIndex = 0;
    figure.setAttribute('role', 'button');
    figure.setAttribute('aria-label', 'Ampliar imagen');
    let touchStartX = 0;
    let touchStartY = 0;
    let movedOnTouch = false;

    const open = () => {
      if (!lightbox || !lightboxImage) return;
      lastFocusedElement = document.activeElement;
      showImage(index);
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      body.classList.add('lightbox-open');
      closeButton?.focus();
    };

    figure.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse') return;
      touchStartX = event.clientX;
      touchStartY = event.clientY;
      movedOnTouch = false;
    }, { passive: true });
    figure.addEventListener('pointermove', event => {
      if (event.pointerType === 'mouse') return;
      const movementX = Math.abs(event.clientX - touchStartX);
      const movementY = Math.abs(event.clientY - touchStartY);
      if (movementX > 8 || movementY > 8) movedOnTouch = true;
    }, { passive: true });
    figure.addEventListener('click', event => {
      if (movedOnTouch) {
        event.preventDefault();
        movedOnTouch = false;
        return;
      }
      open();
    });
    figure.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  });

  closeButton?.addEventListener('click', closeLightbox);
  previousButton?.addEventListener('click', () => showRelativeImage(-1));
  nextButton?.addEventListener('click', () => showRelativeImage(1));
  lightboxImage?.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse') {
      if (zoomScale <= 1.01) return;
      mousePanActive = true;
      mousePanPointerId = event.pointerId;
      panStartX = event.clientX;
      panStartY = event.clientY;
      zoomStartX = zoomX;
      zoomStartY = zoomY;
      suppressLightboxClick = true;
      lightboxImage.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    zoomPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (zoomPointers.size === 1 && zoomScale > 1.01) {
      panStartX = event.clientX;
      panStartY = event.clientY;
      zoomStartX = zoomX;
      zoomStartY = zoomY;
      suppressLightboxClick = true;
    }
    if (zoomPointers.size === 2) {
      const [first, second] = [...zoomPointers.values()];
      zoomStartDistance = distanceBetween(first, second);
      zoomStartScale = zoomScale;
      zoomStartX = zoomX;
      zoomStartY = zoomY;
      lightboxPointerActive = false;
      suppressLightboxClick = true;
      event.preventDefault();
      event.stopPropagation();
    }
  }, { passive: false });
  lightboxImage?.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse') {
      if (!mousePanActive || mousePanPointerId !== event.pointerId) return;
      zoomX = zoomStartX + event.clientX - panStartX;
      zoomY = zoomStartY + event.clientY - panStartY;
      suppressLightboxClick = true;
      applyZoom();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!zoomPointers.has(event.pointerId)) return;
    zoomPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (zoomPointers.size >= 2) {
      const [first, second] = [...zoomPointers.values()];
      const nextScale = zoomStartDistance
        ? zoomStartScale * (distanceBetween(first, second) / zoomStartDistance)
        : zoomScale;
      zoomScale = clamp(nextScale, 1, 3.2);
      if (zoomScale <= 1.01) {
        zoomScale = 1;
        zoomX = 0;
        zoomY = 0;
      } else {
        zoomX = zoomStartX;
        zoomY = zoomStartY;
      }
      suppressLightboxClick = true;
      applyZoom();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (zoomScale > 1.01) {
      zoomX = zoomStartX + event.clientX - panStartX;
      zoomY = zoomStartY + event.clientY - panStartY;
      suppressLightboxClick = true;
      applyZoom();
      event.preventDefault();
      event.stopPropagation();
    }
  }, { passive: false });
  lightboxImage?.addEventListener('wheel', event => {
    if (!lightbox?.classList.contains('is-open')) return;
    event.preventDefault();
    event.stopPropagation();
    const factor = event.deltaY < 0 ? 1.14 : 0.88;
    setZoom(zoomScale * factor);
    suppressLightboxClick = true;
  }, { passive: false });
  lightboxImage?.addEventListener('dblclick', event => {
    event.preventDefault();
    event.stopPropagation();
    setZoom(zoomScale > 1.01 ? 1 : 2.1);
    suppressLightboxClick = true;
  });
  const endImageTouch = event => {
    if (event.pointerType === 'mouse') {
      if (mousePanPointerId === event.pointerId) {
        lightboxImage?.releasePointerCapture?.(event.pointerId);
        mousePanActive = false;
        mousePanPointerId = null;
      }
      return;
    }
    zoomPointers.delete(event.pointerId);
    if (zoomScale <= 1.01) {
      zoomScale = 1;
      zoomX = 0;
      zoomY = 0;
      applyZoom();
    }
    if (zoomPointers.size === 1) {
      const [remaining] = [...zoomPointers.values()];
      panStartX = remaining.x;
      panStartY = remaining.y;
      zoomStartX = zoomX;
      zoomStartY = zoomY;
    }
  };
  lightboxImage?.addEventListener('pointerup', endImageTouch, { passive: true });
  lightboxImage?.addEventListener('pointercancel', endImageTouch, { passive: true });
  lightbox?.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || event.target.closest('button')) return;
    lightboxStartX = event.clientX;
    lightboxStartY = event.clientY;
    lightboxPointerActive = true;
    lightboxSwipeHandled = false;
    suppressLightboxClick = false;
  }, { passive: true });
  lightbox?.addEventListener('pointermove', event => {
    if (!lightboxPointerActive || event.pointerType === 'mouse' || lightboxSwipeHandled || figures.length < 2) return;
    const deltaX = event.clientX - lightboxStartX;
    const deltaY = event.clientY - lightboxStartY;
    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
    lightboxSwipeHandled = true;
    suppressLightboxClick = true;
    showRelativeImage(deltaX < 0 ? 1 : -1);
  }, { passive: true });
  lightbox?.addEventListener('pointerup', () => {
    lightboxPointerActive = false;
    window.setTimeout(() => {
      lightboxSwipeHandled = false;
      suppressLightboxClick = false;
    }, 320);
  }, { passive: true });
  lightbox?.addEventListener('pointercancel', () => {
    lightboxPointerActive = false;
    lightboxSwipeHandled = false;
    suppressLightboxClick = false;
  }, { passive: true });
  lightbox?.addEventListener('click', event => {
    if (suppressLightboxClick) {
      event.preventDefault();
      suppressLightboxClick = false;
      return;
    }
    if (event.target === lightbox) closeLightbox();
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeLightbox();
    if (!lightbox?.classList.contains('is-open')) return;
    if (event.key === 'ArrowLeft') showRelativeImage(-1);
    if (event.key === 'ArrowRight') showRelativeImage(1);
  });
};

const initTeamPhotoTouch = () => {
  const photos = [...document.querySelectorAll('.person__photo--has-hover')];
  if (!photos.length) return;
  const clear = photo => photo.classList.remove('is-touch-active');

  photos.forEach(photo => {
    photo.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse') return;
      photo.classList.add('is-touch-active');
    }, { passive: true });
    photo.addEventListener('pointerup', () => clear(photo), { passive: true });
    photo.addEventListener('pointercancel', () => clear(photo), { passive: true });
    photo.addEventListener('pointerleave', () => clear(photo), { passive: true });
  });
};

renderPage().catch(error => {
  console.error(error);
  mount.innerHTML = `
    <main>
      <section class="archive-hero section-light">
        <div class="section-shell">
          <p class="section-index">ERROR DE CONTENIDO</p>
          <h1>No se pudo cargar la web.</h1>
          <p class="archive-hero__lead">Revisá que existan <code>site.json</code> y <code>projects.generated.json</code>.</p>
        </div>
      </section>
    </main>
  `;
});
