/* Stack slider - a photo stack that advances on its own every few seconds.
   The next card slides up over the current one, which sinks back, shrinks and
   tilts beneath it. Prev/next arrows (and keyboard/swipe) step through the
   cards and switch the autoplay off for good. */
(function () {
  'use strict';

  function pad(n) { return String(n).padStart(2, '0'); }

  function init(root) {
    var cards = Array.prototype.slice.call(root.querySelectorAll('[data-stack-card]'));
    if (cards.length < 2 || typeof gsap === 'undefined') return;

    var prevBtn = root.querySelector('[data-stack-prev]');
    var nextBtn = root.querySelector('[data-stack-next]');
    var currentEl = root.querySelector('[data-stack-current]');
    var totalEl = root.querySelector('[data-stack-total]');
    var bar = root.querySelector('[data-stack-progress]');
    var live = root.querySelector('[data-stack-live]');
    var frame = root.querySelector('[data-stack-frame]') || root;

    var interval = parseFloat(root.getAttribute('data-stack-interval') || '5000') / 1000;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var DUR = reduced ? 0 : 1.05;
    var EASE = (typeof CustomEase !== 'undefined' && CustomEase.get('annnimate')) ? 'annnimate' : 'expo.out';
    var SINK = { yPercent: -6, scale: 0.9, rotate: -2 };
    var SHADE = 0.55;

    var index = 0;
    var busy = false;
    var auto = !reduced;
    var timer = null;
    var z = 2;

    if (totalEl) totalEl.textContent = '/ ' + pad(cards.length);

    cards.forEach(function (card, i) {
      gsap.set(card, { yPercent: i === 0 ? 0 : 100, scale: 1, rotate: 0, zIndex: i === 0 ? 2 : 1, visibility: i === 0 ? 'visible' : 'hidden' });
      var shade = card.querySelector('[data-stack-shade]');
      if (shade) gsap.set(shade, { opacity: 0 });
      card.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
    });

    function announce(i) {
      if (!live) return;
      var label = cards[i].querySelector('[data-stack-label]');
      live.textContent = 'Photo ' + (i + 1) + ' of ' + cards.length + (label ? ': ' + label.textContent.trim() : '');
    }

    function setCount(i) {
      if (!currentEl) return;
      if (reduced) { currentEl.textContent = pad(i + 1); return; }
      gsap.to(currentEl, { yPercent: -100, opacity: 0, duration: 0.22, ease: 'power2.in', onComplete: function () {
        currentEl.textContent = pad(i + 1);
        gsap.fromTo(currentEl, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, ease: 'expo.out' });
      } });
    }

    function labelIn(card) {
      var label = card.querySelector('[data-stack-label]');
      if (!label || reduced) return;
      gsap.fromTo(label, { yPercent: 120 }, { yPercent: 0, duration: DUR * 0.8, ease: EASE, delay: DUR * 0.3 });
    }

    function go(dir) {
      if (busy) return;
      busy = true;
      var from = cards[index];
      var to = (index + dir + cards.length) % cards.length;
      var next = cards[to];
      var shadeFrom = from.querySelector('[data-stack-shade]');
      var shadeTo = next.querySelector('[data-stack-shade]');

      var tl = gsap.timeline({ onComplete: function () {
        gsap.set(from, { yPercent: 100, scale: 1, rotate: 0, visibility: 'hidden' });
        if (shadeFrom) gsap.set(shadeFrom, { opacity: 0 });
        from.setAttribute('aria-hidden', 'true');
        next.setAttribute('aria-hidden', 'false');
        index = to;
        busy = false;
        if (auto) schedule();
      } });

      if (dir > 0) {
        // the next card rises through the frame and covers the current one
        z += 1;
        gsap.set(next, { yPercent: 100, scale: 1, rotate: 0, zIndex: z, visibility: 'visible' });
        if (shadeTo) gsap.set(shadeTo, { opacity: 0 });
        tl.to(next, { yPercent: 0, duration: DUR, ease: EASE }, 0)
          .to(from, { yPercent: SINK.yPercent, scale: SINK.scale, rotate: SINK.rotate, duration: DUR, ease: EASE }, 0);
        if (shadeFrom) tl.to(shadeFrom, { opacity: SHADE, duration: DUR * 0.8, ease: 'power1.out' }, 0);
      } else {
        // the current card drops out of the frame and the previous one grows back
        gsap.set(next, { yPercent: SINK.yPercent, scale: SINK.scale, rotate: SINK.rotate, zIndex: 1, visibility: 'visible' });
        if (shadeTo) gsap.set(shadeTo, { opacity: SHADE });
        gsap.set(from, { zIndex: 2 });
        tl.to(from, { yPercent: 100, duration: DUR, ease: 'expo.inOut' }, 0)
          .to(next, { yPercent: 0, scale: 1, rotate: 0, duration: DUR, ease: EASE }, DUR * 0.05);
        if (shadeTo) tl.to(shadeTo, { opacity: 0, duration: DUR * 0.8 }, DUR * 0.05);
      }

      labelIn(next);
      setCount(to);
      announce(to);
    }

    function schedule() {
      if (timer) timer.kill();
      if (bar && !reduced) {
        timer = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: interval, ease: 'none', onComplete: function () { go(1); } });
      } else {
        timer = gsap.delayedCall(interval, function () { go(1); });
      }
    }

    function stopAuto() {
      if (!auto) return;
      auto = false;
      if (timer) timer.kill();
      if (bar) gsap.to(bar, { scaleX: 0, duration: 0.3 });
      root.classList.add('is-manual');
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { stopAuto(); go(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { stopAuto(); go(1); });

    frame.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); stopAuto(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stopAuto(); go(-1); }
    });

    var startX = null;
    frame.addEventListener('pointerdown', function (e) { startX = e.clientX; });
    frame.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) { stopAuto(); go(dx < 0 ? 1 : -1); }
    });
    frame.addEventListener('pointercancel', function () { startX = null; });

    document.addEventListener('visibilitychange', function () {
      if (!timer || !auto) return;
      if (document.hidden) timer.pause(); else timer.resume();
    });

    announce(0);

    if (auto) {
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.create({ trigger: root, start: 'top 85%', once: true, onEnter: schedule });
      } else {
        schedule();
      }
    }
  }

  function boot() {
    document.querySelectorAll('[data-stack-slider]').forEach(init);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
