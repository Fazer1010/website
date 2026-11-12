/* Babil International - site behaviour
   Mobile menu, scroll reveals, mailto forms, footer year.
   The Annnimate components in assets/anm initialise themselves. */
(function () {
  'use strict';

  var hasGsap = typeof gsap !== 'undefined';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.getElementById('site-menu');
  if (toggle && menu) {
    var label = toggle.querySelector('[data-menu-label]');
    var items = menu.querySelectorAll('.site-menu-eyebrow, .site-menu-link, .site-menu-sub, .site-menu-meta');
    var isOpen = false;

    var setOpen = function (open) {
      isOpen = open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.classList.toggle('is-open', open);
      document.documentElement.classList.toggle('menu-open', open);
      if (label) label.textContent = open ? 'Close' : 'Menu';

      if (open) {
        menu.hidden = false;
        if (hasGsap && !reduced) {
          gsap.killTweensOf([menu, items]);
          gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.6, ease: 'expo.out' });
          gsap.fromTo(items, { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.55, stagger: 0.045, delay: 0.12, ease: 'expo.out' });
        }
        var first = menu.querySelector('a');
        if (first) first.focus({ preventScroll: true });
      } else if (hasGsap && !reduced) {
        gsap.killTweensOf([menu, items]);
        gsap.to(items, { autoAlpha: 0, duration: 0.2 });
        gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: 0.42, ease: 'expo.in', onComplete: function () { menu.hidden = true; } });
        toggle.focus({ preventScroll: true });
      } else {
        menu.hidden = true;
      }
    };

    toggle.addEventListener('click', function () { setOpen(!isOpen); });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { if (isOpen) setOpen(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) setOpen(false);
    });
    window.addEventListener('resize', function () {
      if (isOpen && window.innerWidth >= 992) setOpen(false);
    });
  }

  /* ---------- Scroll reveals ---------- */
  var reveals = document.querySelectorAll('[data-reveal]');
  if (reveals.length) {
    if (hasGsap && typeof ScrollTrigger !== 'undefined' && !reduced) {
      gsap.registerPlugin(ScrollTrigger);
      reveals.forEach(function (el) {
        var delay = parseFloat(el.getAttribute('data-reveal-delay') || '0');
        // Already on screen (page opened mid-scroll or at an anchor): show it without the entrance.
        if (el.getBoundingClientRect().top < window.innerHeight * 0.88) {
          gsap.set(el, { autoAlpha: 1, y: 0 });
          return;
        }
        gsap.fromTo(el,
          { y: 28, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.9, delay: delay, ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      });
    } else {
      reveals.forEach(function (el) { el.style.visibility = 'visible'; el.style.opacity = '1'; });
    }
  }

  /* ---------- "What we move" wheel: prev / next arrows ----------
     The rotating-words component builds one dot button per word and marks the
     centre word's dot with aria-current; the arrows step to its neighbour. */
  var wheel = document.querySelector('[data-anm-rotating-words]');
  document.querySelectorAll('[data-words-prev], [data-words-next]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!wheel) return;
      var dots = wheel.querySelectorAll('.rw_dot');
      if (!dots.length) return;
      var current = -1;
      dots.forEach(function (d, i) { if (d.hasAttribute('aria-current')) current = i; });
      if (current < 0) current = dots.length - 1;
      var dir = btn.hasAttribute('data-words-next') ? 1 : -1;
      dots[(current + dir + dots.length) % dots.length].click();
    });
  });

  /* ---------- Trade routes diagram (about) ---------- */
  var routes = document.querySelector('[data-routes]');
  if (routes) {
    var HUB = { x: 500, y: 330 };
    var NODES = [
      { name: 'United Kingdom', region: 'europe', x: 140, y: 110 },
      { name: 'Germany', region: 'europe', x: 305, y: 62 },
      { name: 'Italy', region: 'europe', x: 475, y: 46 },
      { name: 'Greece', region: 'europe', x: 645, y: 62 },
      { name: 'Cyprus', region: 'europe', x: 805, y: 110 },
      { name: 'Turkey', region: 'europe', x: 915, y: 200 },
      { name: 'China', region: 'asia', x: 940, y: 335 },
      { name: 'India', region: 'asia', x: 895, y: 465 },
      { name: 'Singapore', region: 'asia', x: 770, y: 565 },
      { name: 'Malaysia', region: 'asia', x: 600, y: 600 },
      { name: 'Indonesia', region: 'asia', x: 410, y: 600 },
      { name: 'Brazil', region: 'americas', x: 180, y: 540 },
      { name: 'GCC countries', region: 'gcc', x: 115, y: 345 }
    ];
    var svgNS = 'http://www.w3.org/2000/svg';
    var make = function (tag, attrs, parent) {
      var el = document.createElementNS(svgNS, tag);
      Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
      if (parent) parent.appendChild(el);
      return el;
    };
    var svg = make('svg', { viewBox: '0 0 1000 650', class: 'routes-svg', role: 'img', 'aria-label': 'Diagram of import routes into Oman' }, routes);
    var gPaths = make('g', { class: 'route-paths' }, svg);
    var gDots = make('g', { class: 'route-dots' }, svg);
    var gNodes = make('g', { class: 'route-nodes' }, svg);
    var pathEls = [], dotEls = [], nodeEls = [];
    NODES.forEach(function (n) {
      var mx = (n.x + HUB.x) / 2, my = (n.y + HUB.y) / 2;
      var cx = mx + (n.y - HUB.y) * 0.22, cy = my - (n.x - HUB.x) * 0.22;
      pathEls.push(make('path', { class: 'route-path route-' + n.region, d: 'M' + n.x + ' ' + n.y + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + HUB.x + ' ' + HUB.y }, gPaths));
      dotEls.push(make('circle', { class: 'route-cargo', r: 4.5, cx: n.x, cy: n.y }, gDots));
      var w = n.name.length * 10.5 + 34;
      var g = make('g', { class: 'route-node route-' + n.region, transform: 'translate(' + n.x + ' ' + n.y + ')', tabindex: '0' }, gNodes);
      make('rect', { x: -w / 2, y: -19, width: w, height: 38, rx: 19 }, g);
      var t = make('text', { 'text-anchor': 'middle', dy: '0.36em' }, g);
      t.textContent = n.name;
      nodeEls.push(g);
    });
    var hub = make('g', { class: 'route-hub', transform: 'translate(' + HUB.x + ' ' + HUB.y + ')' }, svg);
    make('circle', { r: 64, class: 'route-hub-ring' }, hub);
    make('circle', { r: 50, class: 'route-hub-fill' }, hub);
    make('image', { href: 'assets/img/logo-mark.png', x: -32, y: -32, width: 64, height: 64 }, hub);
    var hubLabel = make('text', { 'text-anchor': 'middle', y: 94, class: 'route-hub-label' }, hub);
    hubLabel.textContent = 'Al Khoudh, Oman';

    nodeEls.forEach(function (node, i) {
      var on = function () { routes.classList.add('is-focus'); node.classList.add('is-on'); pathEls[i].classList.add('is-on'); dotEls[i].classList.add('is-on'); };
      var off = function () { routes.classList.remove('is-focus'); node.classList.remove('is-on'); pathEls[i].classList.remove('is-on'); dotEls[i].classList.remove('is-on'); };
      node.addEventListener('mouseenter', on); node.addEventListener('mouseleave', off);
      node.addEventListener('focus', on); node.addEventListener('blur', off);
    });

    if (hasGsap && typeof ScrollTrigger !== 'undefined' && !reduced) {
      var canDraw = typeof DrawSVGPlugin !== 'undefined';
      var canPath = typeof MotionPathPlugin !== 'undefined';
      if (canDraw) gsap.registerPlugin(DrawSVGPlugin);
      if (canPath) gsap.registerPlugin(MotionPathPlugin);
      gsap.set(dotEls, { opacity: 0 });
      var rtl = gsap.timeline({ scrollTrigger: { trigger: routes, start: 'top 75%', once: true } });
      rtl.from(hub, { scale: 0, transformOrigin: '50% 50%', duration: 0.7, ease: 'back.out(1.7)' });
      if (canDraw) rtl.from(pathEls, { drawSVG: '100% 100%', duration: 1.1, ease: 'power2.inOut', stagger: 0.05 }, 0.25);
      else rtl.from(pathEls, { opacity: 0, duration: 0.8, stagger: 0.05 }, 0.25);
      rtl.from(nodeEls, { opacity: 0, scale: 0.7, transformOrigin: '50% 50%', duration: 0.55, ease: 'back.out(1.7)', stagger: 0.05, clearProps: 'opacity,transform' }, 0.75);
      rtl.to(dotEls, { opacity: 1, duration: 0.4 }, 1.6);
      if (canPath) {
        dotEls.forEach(function (dot, i) {
          gsap.to(dot, { motionPath: { path: pathEls[i], align: pathEls[i], alignOrigin: [0.5, 0.5] },
            duration: 5 + (i % 5) * 0.8, repeat: -1, ease: 'none', delay: 1.6 + i * 0.35 });
        });
      }
    } else {
      gsap && gsap.set(dotEls, { opacity: 0 });
    }
  }

  /* ---------- Hero tagline rotation (home) ---------- */
  var heroTag = document.querySelector('[data-hero-taglines]');
  if (heroTag && hasGsap && !reduced) {
    var lines = heroTag.getAttribute('data-hero-taglines').split('|');
    var i = 0;
    setInterval(function () {
      i = (i + 1) % lines.length;
      gsap.to(heroTag, { y: -8, autoAlpha: 0, duration: 0.3, ease: 'power2.in', onComplete: function () {
        heroTag.textContent = lines[i];
        gsap.fromTo(heroTag, { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'expo.out' });
      } });
    }, 6000);
  }

  /* ---------- Forms: open the visitor's email app with the message filled in ---------- */
  document.querySelectorAll('form[data-mailto]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var subject = data.get('subject') || form.getAttribute('data-subject') || 'Enquiry from babiloman.com';
      var lines = [];
      data.forEach(function (value, key) {
        if (key === 'subject') return;
        var v = String(value).trim();
        if (v) lines.push(key.replace(/_/g, ' ').replace(/^\w/, function (c) { return c.toUpperCase(); }) + ': ' + v);
      });
      var to = form.getAttribute('data-mailto');
      window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      var note = form.querySelector('.form-note');
      if (note) {
        note.textContent = 'Your email app should now open with the message ready to send. If it did not, write to ' + to + '.';
        note.classList.add('is-visible');
      }
    });
  });

  /* ---------- Safety net for text-reveal headlines ----------
     A headline that is already inside the viewport when the page settles has a
     clamped ScrollTrigger start of 0; at scroll position 0 the trigger never
     counts as entered until the first scroll. Play it directly in that case. */
  function kickTextReveals() {
    if (typeof ScrollTrigger === 'undefined') return;
    document.querySelectorAll('[data-anm-scroll-text-reveal]').forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.82) return;
      ScrollTrigger.getAll().forEach(function (st) {
        if (st.trigger === el && st.animation && !st.isActive && st.animation.progress() === 0) {
          st.animation.play();
        }
      });
    });
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { setTimeout(kickTextReveals, 400); });
  }
  window.addEventListener('load', function () { setTimeout(kickTextReveals, 1200); });
  setTimeout(function () {
    document.querySelectorAll('[data-anm-scroll-text-reveal]').forEach(function (el) {
      if (getComputedStyle(el).visibility === 'hidden') el.style.visibility = 'visible';
    });
  }, 4000);

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Keep scroll-driven components in sync once images and fonts are in ---------- */
  if (typeof ScrollTrigger !== 'undefined') {
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) {
      // Web fonts change line wrapping; the text-reveal components split their text
      // only after fonts settle, so measure everything once more after that.
      document.fonts.ready.then(function () {
        setTimeout(function () { ScrollTrigger.refresh(); }, 150);
      });
    }
  }
})();
