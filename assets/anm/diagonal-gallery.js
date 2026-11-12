(function () {
  'use strict';

  function initDiagonalGallery(container) {
    // --- 1. Selectors ---
    const photos = Array.from(container.querySelectorAll('[data-anm-dia-photo]'));

    if (photos.length < 2) return null;

    const titleLine = container.querySelector('[data-anm-dia-title]');
    const textLine = container.querySelector('[data-anm-dia-text]');
    const numberEl = container.querySelector('[data-anm-dia-number]');
    const totalEl = container.querySelector('[data-anm-dia-total]');

    // --- 2. Config ---
    const step = Math.min(200, Math.max(40, parseFloat(container.dataset.anmStep || '110')));
    const duration = Math.min(1.4, Math.max(0.4, parseFloat(container.dataset.anmDuration || '0.9')));
    const thumb = Math.min(34, Math.max(12, parseFloat(container.dataset.anmThumb || '22'))) / 100;

    // --- 3. Constants ---
    // The gap between the large photo and its neighbours, as a share of the large photo's width.
    const GAP = 0.06;
    // A photo leaving the queue drifts half a thumbnail further up and left as it shrinks away.
    const LEAVE_DRIFT = 0.5;
    const COPY_OUT = 0.25;
    const COPY_IN = 0.6;
    const COPY_STAGGER = 0.06;
    const LINE_PARK = 110;
    const RESIZE_DEBOUNCE = 150;

    // --- 4. State ---
    const count = photos.length;
    let index = 0;
    let w = 0;
    let h = 0;
    let moving = null;
    let copyTl = null;
    let digits = [];
    let trigger = null;
    let reduced = false;
    let resizeTimer = null;

    // --- 5. Helpers ---
    function measure() {
      w = photos[0].offsetWidth;
      h = photos[0].offsetHeight;
    }

    // Where a photo sits relative to the current one: 0 large in the middle, 1 waiting small at the
    // bottom right, -1 small at the top left, further out shrunk to nothing beyond those spots.
    function pose(rel) {
      const sw = w * thumb;
      const sh = h * thumb;
      const nx = w / 2 + w * GAP + sw / 2;
      const ny = h / 2 - sh / 2;
      if (rel === 0) return { x: 0, y: 0, scale: 1, zIndex: 3 };
      if (rel === 1) return { x: nx, y: ny, scale: thumb, zIndex: 2 };
      if (rel === -1) return { x: -nx, y: -ny, scale: thumb, zIndex: 1 };
      if (rel > 1) return { x: nx, y: ny, scale: 0, zIndex: 0 };
      const drift = (sw + w * GAP) * LEAVE_DRIFT;
      return { x: -nx - drift, y: -ny - drift, scale: 0, zIndex: 0 };
    }

    function buildDigits() {
      if (!numberEl) return;
      const places = String(count).length < 2 ? 2 : String(count).length;
      numberEl.textContent = '';
      digits = Array.from({ length: places }, () => {
        const wrap = document.createElement('span');
        wrap.className = 'dia_digit';
        const col = document.createElement('span');
        col.className = 'dia_digit_col';
        for (let d = 0; d <= 9; d++) {
          const n = document.createElement('span');
          n.textContent = String(d);
          col.appendChild(n);
        }
        wrap.appendChild(col);
        numberEl.appendChild(wrap);
        return col;
      });
      if (totalEl) totalEl.textContent = '/ ' + String(count).padStart(places, '0');
    }

    // --- 6. Animation routines ---
    function place(k, animate) {
      const retarget = !!(moving && moving.some((tw) => tw.isActive()));
      moving = photos.map((photo, i) => {
        const p = pose(i - k);
        gsap.set(photo, { zIndex: p.zIndex });
        if (!animate) return gsap.set(photo, { x: p.x, y: p.y, scale: p.scale, force3D: true });
        // A step that lands while the queue is still moving carries on from where it is, without a slow start.
        return gsap.to(photo, { x: p.x, y: p.y, scale: p.scale, duration, ease: retarget ? 'annnimate' : 'annnimateInOut', overwrite: true, force3D: true });
      });
    }

    function rollNumber(k, animate) {
      const places = digits.length;
      const value = String(k + 1).padStart(places, '0');
      digits.forEach((col, p) => {
        const d = Number(value[p]);
        if (animate) gsap.to(col, { yPercent: -d * 10, duration, ease: 'annnimateInOut', overwrite: true });
        else gsap.set(col, { yPercent: -d * 10 });
      });
    }

    function swapCopy(k) {
      const lines = [titleLine, textLine].filter(Boolean);
      if (!lines.length) return;
      if (copyTl) copyTl.kill();
      const photo = photos[k];
      copyTl = gsap.timeline()
        .to(lines, { yPercent: -LINE_PARK, duration: COPY_OUT, ease: 'annnimateInOut', overwrite: true })
        .call(() => {
          if (titleLine) titleLine.textContent = photo.getAttribute('data-title') || '';
          if (textLine) textLine.innerHTML = photo.getAttribute('data-text') || '';
        })
        // immediateRender off: parked at build time, the incoming lines jumped out of view before the exit ran.
        .fromTo(lines, { yPercent: LINE_PARK }, { yPercent: 0, duration: COPY_IN, ease: 'annnimate', stagger: COPY_STAGGER, immediateRender: false });
    }

    function goTo(k) {
      if (k === index) return;
      index = k;
      place(k, !reduced);
      rollNumber(k, !reduced);
      if (reduced) {
        if (titleLine) titleLine.textContent = photos[k].getAttribute('data-title') || '';
        if (textLine) textLine.innerHTML = photos[k].getAttribute('data-text') || '';
      } else {
        swapCopy(k);
      }
    }

    // The steps play on their own clock; the scrubbed proxy only gives the Timeline inspector one row per step.
    function buildScroll() {
      if (trigger) trigger.kill();
      const proxy = {};
      const tl = gsap.timeline({ paused: true });
      photos.slice(1).forEach((photo, i) => {
        tl.to(proxy, { duration: 1, data: { label: (photo.getAttribute('data-title') || 'Photo ' + (i + 2)) + ' takes the centre' } });
      });
      tl.to(proxy, { duration: 1 });
      trigger = ScrollTrigger.create({
        trigger: container,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5,
        animation: tl,
        onUpdate: (self) => goTo(Math.min(count - 1, Math.floor(self.progress * count))),
      });
    }

    // --- 7. Event listeners ---
    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        measure();
        place(index, false);
        ScrollTrigger.refresh();
      }, RESIZE_DEBOUNCE);
    }

    function handleVisibility() {
      if (document.hidden) gsap.globalTimeline.pause();
      else gsap.globalTimeline.resume();
    }

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);

    // --- 8. Initial DOM state ---
    container.style.setProperty('--dia-length', count * step + 'vh');
    measure();
    buildDigits();
    place(0, false);
    rollNumber(0, false);

    // --- 9. Reduced motion ---
    // Reduced motion keeps the steps but swaps them in place instead of moving the photos.
    const mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' }, (ctx) => {
      reduced = !!ctx.conditions.reduce;
      buildScroll();
      return () => {
        if (trigger) trigger.kill();
        trigger = null;
      };
    });

    // --- 10. Public API ---
    function refresh() {
      measure();
      place(index, false);
      ScrollTrigger.refresh();
    }

    function kill() {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearTimeout(resizeTimer);
      mm.revert();
      if (copyTl) copyTl.kill();
      gsap.killTweensOf(photos.concat(digits));
      gsap.set(photos.concat(digits), { clearProps: 'all' });
      container.style.removeProperty('--dia-length');
    }

    return { refresh, kill };
  }

  function waitForGSAP(cb, attempts) {
    attempts = attempts || 0;
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && typeof CustomEase !== 'undefined') { cb(); return; }
    if (attempts < 100) setTimeout(() => waitForGSAP(cb, attempts + 1), 50);
    else console.error('[Annnimate] gsap/ScrollTrigger/CustomEase failed to load');
  }

  waitForGSAP(() => {
    gsap.registerPlugin(ScrollTrigger, CustomEase);
    CustomEase.create('annnimate', 'M0,0 C0.3,0.9 0.1,1 1,1');
    CustomEase.create('annnimateInOut', 'M0,0 C0.7,0 0.16,1 1,1');

    const instances = [];
    document.querySelectorAll('[data-anm-diagonal-gallery]').forEach((el) => {
      const api = initDiagonalGallery(el);
      if (api) instances.push(api);
    });
    window.Anm = window.Anm || {};
    window.Anm.DiagonalGallery = {
      refresh: () => instances.forEach((i) => i.refresh()),
      kill: () => instances.forEach((i) => i.kill()),
    };
  });

})();
