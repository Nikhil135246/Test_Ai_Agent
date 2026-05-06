/* ─── Into the Wild — script.js ─────────────────────────────── */

(function () {
  'use strict';

  /* ── Helpers ───────────────────────────────────────────────── */
  const qs  = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ── Throttle (rAF-based) ──────────────────────────────────── */
  function rafThrottle(fn) {
    let pending = false;
    return (...args) => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { fn(...args); pending = false; });
    };
  }

  /* ══════════════════════════════════════════════════════════════
     1. NAVBAR — add .scrolled class on scroll
     ══════════════════════════════════════════════════════════════ */
  const navbar = qs('#navbar');

  function updateNavbar() {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }

  window.addEventListener('scroll', rafThrottle(updateNavbar), { passive: true });
  updateNavbar();

  /* ── Mobile toggle ─────────────────────────────────────────── */
  const navToggle = qs('.nav-toggle');
  const navLinks  = qs('.nav-links');

  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    navToggle.textContent = navLinks.classList.contains('open') ? '✕' : '☰';
  });

  // Close menu on link click
  qsa('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.textContent = '☰';
    });
  });

  /* ══════════════════════════════════════════════════════════════
     2. PARALLAX — multi-layer depth effect
     ══════════════════════════════════════════════════════════════ */

  /**
   * Each entry: { el, speed }
   * speed > 0  → element moves slower than scroll (recedes / background)
   * speed < 0  → element moves faster (foreground)
   * speed = 0  → no movement
   *
   * Transform formula:
   *   translateY = (scrollY - sectionTop) * speed
   */
  const parallaxLayers = [
    /* HERO */
    { el: qs('#hero-bg'),      speed: 0.55  },
    { el: qs('#hero-mid'),     speed: 0.35  },
    { el: qs('#hero-fg'),      speed: 0.15  },

    /* MOUNTAIN */
    { el: qs('#mountain-bg'),  speed: 0.5   },
    { el: qs('#mountain-mid'), speed: 0.28  },

    /* OCEAN */
    { el: qs('#ocean-bg'),     speed: 0.45  },

    /* FOREST card-bg */
    { el: qs('.parallax-card-bg'), speed: 0.25 },
  ].filter(item => item.el); // guard against missing nodes

  function updateParallax() {
    const scrollY = window.scrollY;

    parallaxLayers.forEach(({ el, speed }) => {
      const section = el.closest('section') || el.parentElement;
      const sectionTop = section ? section.offsetTop : 0;
      const offset = (scrollY - sectionTop) * speed;
      el.style.transform = `translate3d(0, ${offset}px, 0)`;
    });

    /* Wave layers extra sway */
    const wave1 = qs('#wave1');
    const wave2 = qs('#wave2');
    if (wave1 && wave2) {
      const oceanSection = qs('#ocean');
      if (oceanSection) {
        const oTop  = oceanSection.offsetTop;
        const delta = (scrollY - oTop) * 0.12;
        wave1.style.transform = `translate3d(${delta}px, 0, 0)`;
        wave2.style.transform = `translate3d(${-delta * 0.7}px, 0, 0)`;
      }
    }
  }

  window.addEventListener('scroll', rafThrottle(updateParallax), { passive: true });
  updateParallax();

  /* ══════════════════════════════════════════════════════════════
     3. INTERSECTION OBSERVER — fade-in on scroll
     ══════════════════════════════════════════════════════════════ */
  const fadeEls = qsa('.fade-in');

  const fadeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          fadeObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  fadeEls.forEach(el => fadeObserver.observe(el));

  /* ══════════════════════════════════════════════════════════════
     4. COUNTER ANIMATION — stat numbers count up
     ══════════════════════════════════════════════════════════════ */
  function animateCounter(el) {
    const target   = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const step     = 16;
    const steps    = duration / step;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = Math.round(current);
    }, step);
  }

  const counterEls = qsa('.stat-num');

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counterEls.forEach(el => counterObserver.observe(el));

  /* ══════════════════════════════════════════════════════════════
     5. CARD TILT — subtle 3-D tilt on hover
     ══════════════════════════════════════════════════════════════ */
  qsa('.card[data-tilt]').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (e.clientX - cx) / (rect.width  / 2);
      const dy   = (e.clientY - cy) / (rect.height / 2);

      card.style.transform = `
        perspective(600px)
        rotateX(${-dy * 7}deg)
        rotateY(${dx  * 7}deg)
        translateY(-8px)
      `;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  /* ══════════════════════════════════════════════════════════════
     6. CONTACT FORM — basic submission handler
     ══════════════════════════════════════════════════════════════ */
  const form        = qs('#contactForm');
  const formSuccess = qs('#formSuccess');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      form.style.opacity = '0.4';
      form.style.pointerEvents = 'none';

      setTimeout(() => {
        form.style.display = 'none';
        formSuccess.style.display = 'block';
        formSuccess.style.animation = 'fadeUp 0.6s both';
      }, 600);
    });
  }

  /* ══════════════════════════════════════════════════════════════
     7. SMOOTH ANCHOR SCROLL (polyfill for older browsers)
     ══════════════════════════════════════════════════════════════ */
  qsa('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = qs(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ══════════════════════════════════════════════════════════════
     8. CURSOR GLOW (subtle ambient cursor trail)
     ══════════════════════════════════════════════════════════════ */
  const glow = document.createElement('div');
  Object.assign(glow.style, {
    position:      'fixed',
    width:         '280px',
    height:        '280px',
    borderRadius:  '50%',
    background:    'radial-gradient(circle, rgba(74,222,128,0.06) 0%, transparent 70%)',
    pointerEvents: 'none',
    zIndex:        '9999',
    transform:     'translate(-50%, -50%)',
    transition:    'left 0.12s, top 0.12s',
    left:          '-300px',
    top:           '-300px',
  });
  document.body.appendChild(glow);

  document.addEventListener('mousemove', rafThrottle((e) => {
    glow.style.left = e.clientX + 'px';
    glow.style.top  = e.clientY + 'px';
  }));

})();
