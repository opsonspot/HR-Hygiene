/* H R Hygiene Products Ltd. — "Partner" design: motion layer (GSAP + ScrollTrigger + Lenis).
   Everything here is optional: without GSAP, or with reduced motion, content is already fully visible. */
(function () {
  'use strict';
  var html = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap = window.gsap, ST = window.ScrollTrigger;
  if (!gsap || !ST || reduce) { html.classList.remove('intro'); return; }

  var plugins = [ST];
  if (window.DrawSVGPlugin) plugins.push(window.DrawSVGPlugin);
  if (window.SplitText) plugins.push(window.SplitText);
  if (window.Flip) plugins.push(window.Flip);
  gsap.registerPlugin.apply(gsap, plugins);
  gsap.config({ nullTargetWarn: false });
  var hasDraw = !!window.DrawSVGPlugin;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var mm = gsap.matchMedia();
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- smooth scroll ---------- */
  if (window.Lenis) {
    try {
      var lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
      lenis.on('scroll', ST.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      window.__lenis = lenis;
    } catch (e) { /* native scroll */ }
  }

  /* ---------- counters ---------- */
  function fmt(v, dec) { return v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function countUp(el, dur, delay) {
    var raw = el.dataset.count, end = parseFloat(raw), dec = (raw.split('.')[1] || '').length, o = { v: 0 };
    el.textContent = fmt(0, dec);
    return gsap.to(o, { v: end, duration: dur || 1.6, delay: delay || 0, ease: 'power3.out', onUpdate: function () { el.textContent = fmt(o.v, dec); }, onComplete: function () { el.textContent = fmt(end, dec); } });
  }

  /* ---------- hero intro ---------- */
  var hero = $('.hero');
  var svg = $('.net__svg');
  var tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
  gsap.set('.hero .kicker, .hero__sub, .hero__cta', { y: 24, opacity: 0 });
  gsap.set('.hero__h .line > span', { yPercent: 110 });
  gsap.set('.hero__h .line', { opacity: 1 });
  gsap.set('.pack--a', { y: 80, opacity: 0, rotation: -14 });
  gsap.set('.pack--b', { y: 60, opacity: 0, rotation: 18 });
  html.classList.remove('intro');

  tl.to('.hero .kicker', { y: 0, opacity: 1, duration: .8 }, .1)
    .to('.hero__h .line > span', { yPercent: 0, duration: 1.1, stagger: .12 }, .18)
    .to('.hero__sub', { y: 0, opacity: 1, duration: .9 }, .55)
    .to('.hero__cta', { y: 0, opacity: 1, duration: .9 }, .68);

  if (svg) {
    var trunks = $$('.net__trunks path', svg), links = $$('.net__links line', svg), dots = $$('.net__dots circle', svg), csa = $$('.net__csa > g', svg);
    gsap.set($$('.net__hub', svg), { scale: 0, transformOrigin: '50% 50%' });
    gsap.set(csa, { scale: 0, transformOrigin: '50% 50%' });
    gsap.set(dots, { scale: 0, transformOrigin: '50% 50%' });
    gsap.set('.net__label, .net__orbits, .net__legend', { opacity: 0 });
    if (hasDraw) { gsap.set(trunks, { drawSVG: '0%' }); gsap.set(links, { drawSVG: '0%' }); }
    else gsap.set([trunks, links], { opacity: 0 });
    tl.to('.net__hub', { scale: 1, duration: .9, ease: 'back.out(2)' }, .2)
      .to('.net__orbits', { opacity: 1, duration: 1.2 }, .3)
      .to('.net__label', { opacity: 1, duration: .6 }, .6)
      .to(trunks, hasDraw ? { drawSVG: '100%', duration: .9, stagger: .05, ease: 'power2.inOut' } : { opacity: 1, duration: .6, stagger: .05 }, .45)
      .to(csa, { scale: 1, duration: .6, stagger: .05, ease: 'back.out(2.5)' }, .95)
      .to(links, hasDraw ? { drawSVG: '100%', duration: .5, stagger: { amount: 1.1 }, ease: 'power1.out' } : { opacity: 1, duration: .4, stagger: { amount: 1.1 } }, 1.2)
      .to(dots, { scale: 1, duration: .45, stagger: { amount: 1.2 }, ease: 'back.out(3)' }, 1.35)
      .to('.net__legend', { opacity: 1, duration: .6 }, 2.2)
      .add(startPackets, 2.4);
  }
  tl.to('.pack--a', { y: 0, opacity: 1, rotation: -7, duration: 1.4, ease: 'expo.out' }, .9)
    .to('.pack--b', { y: 0, opacity: 1, rotation: 9, duration: 1.4, ease: 'expo.out' }, 1.05);

  // ticker counters + rotating highlight
  var tCounts = $$('.ticker [data-count]');
  tCounts.forEach(function (el, i) { tl.add(countUp(el, 1.8), .6 + i * .08); });
  var cells = $$('.ticker .cell'), hot = 0, hotTimer = null, heroVisible = true;
  function cycle() { cells.forEach(function (c, i) { c.classList.toggle('is-hot', i === hot); }); hot = (hot + 1) % cells.length; }
  tl.add(function () { hotTimer = setInterval(function () { if (heroVisible) cycle(); }, 2200); }, 2.6);

  // network packets travelling out from Rajkot
  var packetTl = null;
  function startPackets() {
    if (!svg) return;
    var trunks = $$('.net__trunks path', svg), g = $('.net__packets', svg), csaG = $$('.net__csa > g', svg), NS = 'http://www.w3.org/2000/svg';
    packetTl = gsap.timeline({ repeat: -1 });
    for (var k = 0; k < 9; k++) (function (k) {
      var c = document.createElementNS(NS, 'circle'); c.setAttribute('r', '3.2'); c.setAttribute('opacity', '0'); g.appendChild(c);
      var idx = (k * 4) % trunks.length, path = trunks[idx], len = path.getTotalLength(), o = { p: 0 };
      packetTl.to(o, {
        p: 1, duration: 1.6, ease: 'power1.inOut',
        onStart: function () { c.setAttribute('opacity', '1'); },
        onUpdate: function () { var pt = path.getPointAtLength(o.p * len); c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); },
        onComplete: function () { c.setAttribute('opacity', '0'); o.p = 0; gsap.fromTo($('.halo', csaG[idx]), { scale: 1, transformOrigin: '50% 50%' }, { scale: 2.2, duration: .5, yoyo: true, repeat: 1, ease: 'power2.out' }); }
      }, k * .55);
    })(k);
    ST.create({ trigger: hero, start: 'top bottom', end: 'bottom top', onToggle: function (s) { heroVisible = s.isActive; s.isActive ? packetTl.play() : packetTl.pause(); } });
  }

  // hero scroll parallax + idle float
  if (hero) mm.add('(min-width: 700px)', function () {
    gsap.to('.net', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__copy', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  });
  gsap.to('.pack--a img', { y: -12, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.to('.pack--b img', { y: 10, duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: .6 });

  /* ---------- generic: split headings ---------- */
  if (window.SplitText) {
    $$('[data-split]').forEach(function (h) {
      window.SplitText.create(h, {
        type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
        onSplit: function (self) {
          return gsap.from(self.lines, { yPercent: 105, duration: 1, stagger: .09, ease: 'power4.out', scrollTrigger: { trigger: h, start: 'top 85%', once: true } });
        }
      });
    });
  }

  /* ---------- generic: rise-in batches ---------- */
  function rise(sel, opts) {
    var els = $$(sel); if (!els.length) return;
    opts = opts || {};
    gsap.set(els, { y: opts.y || 50, opacity: 0 });
    ST.batch(els, { start: 'top 90%', once: true, onEnter: function (b) { gsap.to(b, { y: 0, opacity: 1, duration: .9, stagger: .09, ease: 'power3.out', clearProps: 'transform,opacity' }); } });
  }
  rise('[data-rise]');
  rise('.cat .pc', { y: 40 });
  rise('.person', { y: 40 });
  rise('.st', { y: 30 });
  rise('.row', { y: 24 });
  rise('.info li', { y: 20 });
  rise('.segnotes p, .cover__foot > *, .note, .band, .form, .map, .channels', { y: 40 });

  // press clippings drop in, keep their resting tilt
  $$('.clip').forEach(function (c, i) {
    gsap.from(c, { y: 90, opacity: 0, duration: 1, delay: (i % 4) * .08, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 92%', once: true }, clearProps: 'transform,opacity' });
  });

  /* ---------- counters elsewhere ---------- */
  $$('[data-count]').forEach(function (el) {
    if (el.closest('.ticker') || el.closest('.growth')) return;
    var raw = el.dataset.count, dec = (raw.split('.')[1] || '').length;
    el.textContent = fmt(0, dec);
    ST.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { countUp(el, 2); } });
  });

  /* ---------- why: growth chart ---------- */
  var growth = $('.growth');
  if (growth) {
    var fills = $$('.growth__fill', growth), vals = $$('.growth__v', growth), arrow = $$('.growth__arrow path', growth);
    gsap.set(fills, { scaleY: 0 });
    gsap.set(vals, { opacity: 0, y: 14 });
    if (hasDraw) gsap.set(arrow, { drawSVG: '0%' });
    $$('[data-count]', growth).forEach(function (el) { el.textContent = '0.00'; });
    ST.create({ trigger: growth, start: 'top 80%', once: true, onEnter: function () {
      var g = gsap.timeline();
      g.to(fills, { scaleY: 1, duration: 1.2, stagger: .25, ease: 'expo.out' })
       .to(vals, { opacity: 1, y: 0, duration: .6, stagger: .25 }, .2);
      $$('[data-count]', growth).forEach(function (el, i) { g.add(countUp(el, 1.4), .2 + i * .25); });
      if (hasDraw) g.to(arrow, { drawSVG: '100%', duration: .8, stagger: .3, ease: 'power2.inOut' }, .7);
    } });
  }

  /* ---------- coverage: tiles ripple out from Gujarat ---------- */
  var tilesWrap = $('[data-tiles]');
  if (tilesWrap) {
    var tiles = $$('.t', tilesWrap), origin = $('[data-origin]', tilesWrap);
    var heads = $$('.region h3', tilesWrap);
    gsap.set(tiles, { opacity: 0, scale: .7, y: 18 });
    gsap.set(heads, { opacity: 0 });
    ST.create({ trigger: tilesWrap, start: 'top 75%', once: true, onEnter: function () {
      var o = origin.getBoundingClientRect(), ox = o.left + o.width / 2, oy = o.top + o.height / 2;
      tiles.forEach(function (t) {
        var r = t.getBoundingClientRect(), d = Math.hypot(r.left + r.width / 2 - ox, r.top + r.height / 2 - oy);
        gsap.to(t, { opacity: 1, scale: 1, y: 0, duration: .7, delay: d * .0011, ease: 'back.out(1.6)', clearProps: 'transform' });
      });
      gsap.to(heads, { opacity: 1, duration: .8, stagger: .08, delay: .2 });
    } });
  }

  /* ---------- stepper progress rail ---------- */
  var stepper = $('[data-stepper]');
  if (stepper) {
    var rail = $('.stepper__rail span', stepper), nums = $$('.st__n', stepper);
    mm.add({ wide: '(min-width: 900px)', narrow: '(max-width: 899px)' }, function (ctx) {
      var wide = ctx.conditions.wide;
      gsap.set(rail, wide ? { scaleX: 0, scaleY: 1 } : { scaleY: 0, scaleX: 1 });
      gsap.to(rail, { scaleX: 1, scaleY: 1, ease: 'none', scrollTrigger: { trigger: stepper, start: 'top 75%', end: wide ? 'top 30%' : 'bottom 60%', scrub: .6 } });
      nums.forEach(function (n, i) {
        gsap.from(n, { scale: 0.4, rotation: -30, duration: .8, ease: 'back.out(2.4)', scrollTrigger: { trigger: wide ? stepper : n, start: wide ? 'top ' + (78 - i * 12) + '%' : 'top 82%', toggleActions: 'play none none reverse' } });
      });
    });
  }

  /* ---------- infrastructure parallax + process line ---------- */
  mm.add('(min-width: 700px)', function () {
    $$('[data-par]').forEach(function (el) {
      gsap.fromTo(el, { y: -parseFloat(el.dataset.par) }, { y: parseFloat(el.dataset.par), ease: 'none', scrollTrigger: { trigger: el.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });
  var flow = $('.flow');
  if (flow) {
    var fl = $('.flow__line path', flow), sts = $$('.flow__st', flow);
    gsap.set(sts, { opacity: 0, y: 16 });
    if (hasDraw) gsap.set(fl, { drawSVG: '0%' });
    var ft = gsap.timeline({ scrollTrigger: { trigger: flow, start: 'top 85%', once: true } });
    if (hasDraw) ft.to(fl, { drawSVG: '100%', duration: 1.4, ease: 'power2.inOut' }, 0);
    ft.to(sts, { opacity: 1, y: 0, duration: .6, stagger: .4 }, .1);
  }

  /* ---------- contact band line art ---------- */
  var band = $$('.band__art path');
  if (band.length && hasDraw) gsap.from(band, { drawSVG: '0%', duration: 1.6, stagger: .2, ease: 'power2.inOut', scrollTrigger: { trigger: '.band', start: 'top 80%', once: true } });

  /* ---------- footer headline ---------- */
  var big = $('.ftr__big');
  if (big) gsap.from(big, { yPercent: 40, opacity: 0, duration: 1.1, ease: 'power4.out', scrollTrigger: { trigger: big, start: 'top 92%', once: true } });

  /* ---------- magnetic CTAs ---------- */
  if (fine) {
    $$('[data-magnet]').forEach(function (b) {
      var xTo = gsap.quickTo(b, 'x', { duration: .5, ease: 'power3' }), yTo = gsap.quickTo(b, 'y', { duration: .5, ease: 'power3' });
      b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .25); yTo((e.clientY - r.top - r.height / 2) * .35); });
      b.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
    });
  }

  /* ---------- investors page ---------- */
  var ih = $('.ihero h1');
  if (ih) {
    gsap.from('.ihero .crumbs, .ihero h1, .ihero__sub, .ihero__stats', { y: 40, opacity: 0, duration: 1, stagger: .1, ease: 'power4.out' });
  }

  // keep trigger positions honest when fonts / lazy images change the page height
  window.addEventListener('load', function () { ST.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
  if ('ResizeObserver' in window) {
    var lastH = 0, rt = null;
    new ResizeObserver(function () {
      var h = document.body.scrollHeight;
      if (Math.abs(h - lastH) < 4) return;
      lastH = h; clearTimeout(rt); rt = setTimeout(function () { ST.refresh(); }, 200);
    }).observe(document.body);
  }
})();
