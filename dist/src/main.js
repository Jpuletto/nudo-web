import { HomePage, ProjectPage, ProjectsPage } from './components/site.js';
import { loadContent } from './lib/content.js';

const body = document.body;
const page = body.dataset.page || 'home';
const mount = document.querySelector('#app');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderPage = async () => {
  const content = await loadContent();
  const slug = body.dataset.projectSlug;
  const html = page === 'projects'
    ? ProjectsPage(content)
    : page === 'project'
      ? ProjectPage(content, slug)
      : HomePage(content);

  mount.innerHTML = html;
  document.title = getPageTitle(content, page, slug);
  initInteractions();
};

const getPageTitle = (content, currentPage, slug) => {
  if (currentPage === 'projects') return 'Proyectos — NUDO Arquitectura';
  if (currentPage === 'project') {
    const project = content.projects.find(item => item.slug === slug);
    const title = project?.title?.es || project?.title || 'Proyecto';
    return `${title} — NUDO Arquitectura`;
  }
  return 'NUDO Arquitectura';
};

const initInteractions = () => {
  const loader = document.querySelector('.loader');
  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('.menu-button');
  const nav = document.querySelector('.site-nav');
  const progress = document.querySelector('.scroll-progress span');
  const transitionLayer = document.querySelector('.page-transition');

  const hideLoader = () => {
    window.setTimeout(() => loader?.classList.add('is-hidden'), reducedMotion ? 0 : 450);
  };
  if (document.readyState === 'complete') hideLoader();
  window.addEventListener('load', hideLoader, { once: true });
  window.setTimeout(hideLoader, 1400);

  const updateScrollUI = () => {
    header?.classList.toggle('is-scrolled', window.scrollY > 28);
    if (progress) {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const amount = height > 0 ? window.scrollY / height : 0;
      progress.style.transform = `scaleX(${Math.min(Math.max(amount, 0), 1)})`;
    }
  };
  updateScrollUI();
  window.addEventListener('scroll', updateScrollUI, { passive: true });

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
      }, reducedMotion ? 0 : 420);
    });
  });

  initHero();
  initReveals();
  initCounters();
  initProjectRail();
  initProcess();
  initLightbox();

  document.querySelectorAll('[data-year]').forEach(node => {
    node.textContent = new Date().getFullYear();
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

  rail.addEventListener('wheel', event => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || rail.scrollWidth <= rail.clientWidth) return;
    event.preventDefault();
    rail.scrollLeft += event.deltaY;
  }, { passive: false });

  if (!window.matchMedia('(pointer:fine)').matches) return;

  let dragging = false;
  let startX = 0;
  let startScroll = 0;

  rail.addEventListener('pointerdown', event => {
    dragging = true;
    startX = event.clientX;
    startScroll = rail.scrollLeft;
    rail.classList.add('is-dragging');
    rail.setPointerCapture(event.pointerId);
  });

  rail.addEventListener('pointermove', event => {
    if (!dragging) return;
    rail.scrollLeft = startScroll - (event.clientX - startX) * 1.2;
  });

  const endDrag = () => {
    dragging = false;
    rail.classList.remove('is-dragging');
  };
  rail.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', endDrag);
};

const initProcess = () => {
  const processItems = [...document.querySelectorAll('[data-process]')];
  const processImages = [...document.querySelectorAll('[data-process-images] img')];
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

const initLightbox = () => {
  const lightbox = document.querySelector('.lightbox');
  const lightboxImage = lightbox?.querySelector('img');
  const lightboxCaption = lightbox?.querySelector('p');
  const closeButton = lightbox?.querySelector('.lightbox__close');
  let lastFocusedElement = null;

  const closeLightbox = () => {
    lightbox?.classList.remove('is-open');
    lightbox?.setAttribute('aria-hidden', 'true');
    body.classList.remove('lightbox-open');
    lastFocusedElement?.focus();
  };

  document.querySelectorAll('[data-lightbox]').forEach(figure => {
    figure.tabIndex = 0;
    figure.setAttribute('role', 'button');
    figure.setAttribute('aria-label', 'Ampliar imagen');

    const open = () => {
      const image = figure.querySelector('img');
      const caption = figure.querySelector('figcaption');
      if (!image || !lightbox || !lightboxImage) return;
      lastFocusedElement = document.activeElement;
      lightboxImage.src = image.src;
      lightboxImage.alt = image.alt;
      if (lightboxCaption) lightboxCaption.textContent = caption?.textContent || '';
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      body.classList.add('lightbox-open');
      closeButton?.focus();
    };

    figure.addEventListener('click', open);
    figure.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  });

  closeButton?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', event => {
    if (event.target === lightbox) closeLightbox();
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeLightbox();
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
