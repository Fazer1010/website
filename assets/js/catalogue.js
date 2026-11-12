/* Product catalogue - renders the product range as a filterable grid.
   Category buttons and the search box narrow the grid; GSAP Flip animates
   the cards into their new places. */
(function () {
  'use strict';

  var root = document.querySelector('[data-catalogue]');
  if (!root) return;

  var CATS = {
    food: { label: 'Foodstuff', anchor: '#foodstuff' },
    home: { label: 'Non-food & household', anchor: '#household' },
    defence: { label: 'Defence & institutional', anchor: '#defence' }
  };

  var ICONS = {
    food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16l-1.5 9h-13z"/><path d="M8 10l3-6M16 10l-3-6M9 14v2M12 14v2M15 14v2"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/></svg>',
    defence: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 7.6-8 9-4.6-1.4-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>'
  };

  var W = 'Wholesale', R = 'Retail', S = 'Special Projects';
  var DATA = [
    { n: 'Fresh fruits & vegetables', c: 'food', d: [R, W] },
    { n: 'Grocery', c: 'food', d: [R, W] },
    { n: 'Processed food', c: 'food', d: [R, W] },
    { n: 'Bakery', c: 'food', d: [R] },
    { n: 'Dairy', c: 'food', d: [R, W] },
    { n: 'Beverages', c: 'food', d: [R, W] },
    { n: 'Frozen food', c: 'food', d: [R, W] },
    { n: 'Cleaning aids', c: 'home', d: [R, W] },
    { n: 'General merchandise', c: 'home', d: [R, W] },
    { n: 'Household items', c: 'home', d: [R, W] },
    { n: 'School bags', c: 'home', d: [W] },
    { n: 'School shoes', c: 'home', d: [W] },
    { n: 'Travelling bags', c: 'home', d: [W] },
    { n: 'Trolley bags', c: 'home', d: [W] },
    { n: 'Undergarments', c: 'home', d: [W] },
    { n: 'Sandals & shoes', c: 'home', d: [W] },
    { n: 'Clothing items', c: 'defence', d: [S] },
    { n: 'Uniforms', c: 'defence', d: [S] },
    { n: 'Ceremonial dress', c: 'defence', d: [S] },
    { n: 'Socks', c: 'defence', d: [S] },
    { n: 'Berets & caps', c: 'defence', d: [S] },
    { n: 'Belts', c: 'defence', d: [S] },
    { n: 'Badges & medals', c: 'defence', d: [S] },
    { n: 'Desert boots', c: 'defence', d: [S] },
    { n: "Officers' shoes", c: 'defence', d: [S] },
    { n: 'Safety boots', c: 'defence', d: [S] },
    { n: 'Safety products', c: 'defence', d: [S] },
    { n: 'Helmets', c: 'defence', d: [S] },
    { n: 'Webbing bags', c: 'defence', d: [S] },
    { n: 'Holsters', c: 'defence', d: [S] },
    { n: 'Knives', c: 'defence', d: [S] },
    { n: 'Tents', c: 'defence', d: [S] },
    { n: 'Camouflage nets', c: 'defence', d: [S] },
    { n: 'Blankets', c: 'defence', d: [S] },
    { n: 'Camelbacks', c: 'defence', d: [S] },
    { n: 'Furniture', c: 'defence', d: [S] }
  ];

  var grid = root.querySelector('[data-catalogue-grid]');
  var countEl = root.querySelector('[data-catalogue-count]');
  var search = root.querySelector('[data-catalogue-search]');
  var filters = Array.prototype.slice.call(root.querySelectorAll('[data-catalogue-filter]'));
  var empty = root.querySelector('[data-catalogue-empty]');
  if (!grid) return;

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  grid.innerHTML = DATA.map(function (p) {
    return '<article class="cat-card" data-cat="' + p.c + '" data-name="' + esc(p.n.toLowerCase()) + '">' +
      '<span class="cat-icon" aria-hidden="true">' + ICONS[p.c] + '</span>' +
      '<h3 class="cat-name">' + esc(p.n) + '</h3>' +
      '<a class="cat-tag cat-tag-' + p.c + '" href="' + CATS[p.c].anchor + '">' + esc(CATS[p.c].label) + '</a>' +
      '<p class="cat-div">Supplied by <b>' + p.d.join('</b> &amp; <b>') + '</b></p>' +
      '</article>';
  }).join('');

  var cards = Array.prototype.slice.call(grid.children);
  var state = { cat: 'all', q: '' };
  var hasFlip = typeof gsap !== 'undefined' && typeof Flip !== 'undefined';
  if (hasFlip) gsap.registerPlugin(Flip);

  filters.forEach(function (btn) {
    var c = btn.getAttribute('data-catalogue-filter');
    var n = c === 'all' ? DATA.length : DATA.filter(function (p) { return p.c === c; }).length;
    var slot = btn.querySelector('[data-count]');
    if (slot) slot.textContent = n;
  });

  function updateCount(shown) {
    if (countEl) countEl.textContent = 'Showing ' + shown + ' of ' + cards.length + ' products';
    if (empty) empty.hidden = shown !== 0;
  }

  function apply() {
    var flipState = hasFlip ? Flip.getState(cards) : null;
    var shown = 0;
    cards.forEach(function (card) {
      var ok = (state.cat === 'all' || card.getAttribute('data-cat') === state.cat) &&
               (!state.q || card.getAttribute('data-name').indexOf(state.q) > -1);
      card.style.display = ok ? '' : 'none';
      if (ok) shown++;
    });
    updateCount(shown);
    if (hasFlip) {
      Flip.from(flipState, {
        duration: 0.55,
        ease: 'power2.inOut',
        stagger: 0.012,
        absolute: true,
        onEnter: function (els) { return gsap.fromTo(els, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'power2.out' }); },
        onLeave: function (els) { return gsap.to(els, { opacity: 0, scale: 0.9, duration: 0.3, ease: 'power2.in' }); }
      });
    }
  }

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filters.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      state.cat = btn.getAttribute('data-catalogue-filter');
      apply();
    });
  });

  if (search) {
    search.addEventListener('input', function () {
      state.q = search.value.trim().toLowerCase();
      apply();
    });
  }

  updateCount(cards.length);

  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.from(cards, { opacity: 0, y: 22, duration: 0.6, stagger: 0.025, ease: 'expo.out', clearProps: 'opacity,transform',
      scrollTrigger: { trigger: grid, start: 'top 85%', once: true } });
  }
})();
