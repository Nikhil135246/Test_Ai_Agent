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
     2. PARALLAX — multi-layer depth effect (unified across all sections)
     ══════════════════════════════════════════════════════════════ */

  /**
   * Each entry: { el, speed, type }
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

    /* FOREST */
    { el: qs('#forest-bg'),    speed: 0.50  },
    { el: qs('#forest-mid'),   speed: 0.30  },
    { el: qs('#forest-fg'),    speed: 0.12  },

    /* MOUNTAIN */
    { el: qs('#mountain-bg'),  speed: 0.50  },
    { el: qs('#mountain-mid'), speed: 0.28  },

    /* OCEAN */
    { el: qs('#ocean-bg'),     speed: 0.45  },
    { el: qs('#ocean-mid'),    speed: 0.25  },
    { el: qs('#ocean-fg'),     speed: 0.10  },

    /* SPACE */
    { el: qs('#space-bg'),     speed: 0.50  },
    { el: qs('#space-nebula'), speed: 0.30  },
    { el: qs('#space-planet'), speed: 0.20  },
    { el: qs('#space-ring'),   speed: 0.15  },
    { el: qs('#space-fg'),     speed: 0.10  },

    /* CARDS background */
    { el: qs('#cards-bg'),     speed: 0.15  },

    /* QUOTE background */
    { el: qs('#quote-bg'),     speed: 0.12  },

    /* CONTACT background */
    { el: qs('#contact-bg'),   speed: 0.10  },
  ].filter(item => item.el); // guard against missing nodes

  // Smooth parallax using interpolation (lerp) so transforms don't jump.
  // Each layer gets a target and current value; scroll updates target, rAF loop eases current -> target.
  parallaxLayers.forEach(layer => {
    layer._target = 0;
    layer._current = 0;
  });

  function setParallaxTargets() {
    const scrollY = window.scrollY;
    parallaxLayers.forEach(layer => {
      const { el, speed } = layer;
      const section = el.closest('section') || el.parentElement;
      const sectionTop = section ? section.offsetTop : 0;
      layer._target = (scrollY - sectionTop) * speed;
    });

    // update raw wave targets as well
    const oceanSection = qs('#ocean');
    if (oceanSection) {
      const oTop = oceanSection.offsetTop;
      const delta = (scrollY - oTop) * 0.12;
      const wave1 = qs('#wave1');
      const wave2 = qs('#wave2');
      if (wave1) wave1._target = delta;
      if (wave2) wave2._target = -delta * 0.7;
    }
  }

  // Throttle target updates to rAF-friendly ticks
  window.addEventListener('scroll', rafThrottle(setParallaxTargets), { passive: true });
  setParallaxTargets();

  function animateParallax() {
    // ease factor (0..1) - adjust for more/less smoothing
    const ease = 0.12;
    parallaxLayers.forEach(layer => {
      layer._current += (layer._target - layer._current) * ease;
      layer.el.style.transform = `translate3d(0, ${layer._current}px, 0)`;
    });

    // Wave smoothing
    const wave1 = qs('#wave1');
    const wave2 = qs('#wave2');
    if (wave1) {
      wave1._current = wave1._current || 0;
      wave1._target = wave1._target || 0;
      wave1._current += (wave1._target - wave1._current) * ease;
      wave1.style.transform = `translate3d(${wave1._current}px, 0, 0)`;
    }
    if (wave2) {
      wave2._current = wave2._current || 0;
      wave2._target = wave2._target || 0;
      wave2._current += (wave2._target - wave2._current) * ease;
      wave2.style.transform = `translate3d(${wave2._current}px, 0, 0)`;
    }

    requestAnimationFrame(animateParallax);
  }

  requestAnimationFrame(animateParallax);

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

  /* ══════════════════════════════════════════════════════════════
     9. INTERACTIVE CONSTELLATIONS
     ══════════════════════════════════════════════════════════════ */
  class Constellation {
    constructor(canvas, numStars = 100, color = 'rgba(255, 255, 255, 0.8)') {
      this.canvas = canvas;
      this.ctx = this.canvas.getContext('2d');
      this.numStars = numStars;
      this.color = color;
      this.stars = [];
      this.mouse = { x: undefined, y: undefined, radius: 120 };
      this.resizeObserver = new ResizeObserver(() => this.init());
      this.resizeObserver.observe(this.canvas.parentElement);
      this.init();
      this.animate();
    }

    init() {
      this.canvas.width = this.canvas.parentElement.clientWidth;
      this.canvas.height = this.canvas.parentElement.clientHeight;
      this.stars = [];
      for (let i = 0; i < this.numStars; i++) {
        this.stars.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          radius: Math.random() * 1.5 + 0.5,
        });
      }
    }

    draw() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = this.color;
      this.stars.forEach(star => {
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        this.ctx.fill();
      });
      this.drawLines();
    }

    drawLines() {
      this.ctx.strokeStyle = this.color;
      this.ctx.lineWidth = 0.2;
      for (let i = 0; i < this.stars.length; i++) {
        for (let j = i + 1; j < this.stars.length; j++) {
          const dist = Math.hypot(this.stars[i].x - this.stars[j].x, this.stars[i].y - this.stars[j].y);
          if (dist < 100) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.stars[i].x, this.stars[i].y);
            this.ctx.lineTo(this.stars[j].x, this.stars[j].y);
            this.ctx.stroke();
          }
        }
      }
    }

    update() {
      this.stars.forEach(star => {
        star.x += star.vx;
        star.y += star.vy;

        if (star.x < 0 || star.x > this.canvas.width) star.vx *= -1;
        if (star.y < 0 || star.y > this.canvas.height) star.vy *= -1;

        // Mouse interaction
        if (this.mouse.x !== undefined) {
          const dist = Math.hypot(star.x - this.mouse.x, star.y - this.mouse.y);
          if (dist < this.mouse.radius) {
            const force = (this.mouse.radius - dist) / this.mouse.radius;
            star.x -= (this.mouse.x - star.x) * force * 0.05;
            star.y -= (this.mouse.y - star.y) * force * 0.05;
          }
        }
      });
    }

    animate() {
      this.draw();
      this.update();
      requestAnimationFrame(() => this.animate());
    }

    handleMouseMove(e) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    }

    handleMouseLeave() {
        this.mouse.x = undefined;
        this.mouse.y = undefined;
    }
  }

  const heroCanvas = qs('#constellation-canvas-hero');
  if (heroCanvas) {
    const constellationHero = new Constellation(heroCanvas, 120, 'rgba(173, 216, 230, 0.7)');
    heroCanvas.parentElement.addEventListener('mousemove', (e) => constellationHero.handleMouseMove(e));
    heroCanvas.parentElement.addEventListener('mouseleave', () => constellationHero.handleMouseLeave());
  }

  const spaceCanvas = qs('#constellation-canvas-space');
  if (spaceCanvas) {
    const constellationSpace = new Constellation(spaceCanvas, 150, 'rgba(255, 220, 185, 0.7)');
    spaceCanvas.parentElement.addEventListener('mousemove', (e) => constellationSpace.handleMouseMove(e));
    spaceCanvas.parentElement.addEventListener('mouseleave', () => constellationSpace.handleMouseLeave());
  }
})();
