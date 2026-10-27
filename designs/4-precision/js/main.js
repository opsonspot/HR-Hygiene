/* H R Hygiene — "Precision" behaviour. Progressive enhancement: every feature checks for its library. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var html = document.documentElement;
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G = window.gsap, ST = window.ScrollTrigger;
  var hasG = !!G;
  if (hasG) {
    var plugins = [ST, window.DrawSVGPlugin, window.MorphSVGPlugin, window.MotionPathPlugin, window.Flip].filter(Boolean);
    G.registerPlugin.apply(G, plugins);
  }
  if (!RM) html.classList.add('anim');
  var HH = 68;

  $$('.year').forEach(function (y) { y.textContent = new Date().getFullYear(); });

  /* ---------- smooth scroll (Lenis) ---------- */
  var lenis = null;
  if (!RM && window.Lenis) {
    try {
      lenis = new window.Lenis({ lerp: 0.11, wheelMultiplier: 1, smoothWheel: true });
      if (hasG && ST) {
        lenis.on('scroll', ST.update);
        G.ticker.add(function (t) { lenis.raf(t * 1000); });
        G.ticker.lagSmoothing(0);
      } else {
        var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
    } catch (e) { lenis = null; }
  }
  function scrollToEl(el) {
    var tools = document.querySelector('.tools');
    var off = HH + 8 + (tools && el.closest('.room__main') && el !== tools.parentElement ? tools.offsetHeight : 0);
    if (lenis) lenis.scrollTo(el, { offset: -off, duration: 1.2 });
    else if (off > HH + 8) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off, behavior: RM ? 'auto' : 'smooth' });
    else el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------- header: progress + mobile menu ---------- */
  var bar = $('.header__progress i');
  function onScroll() {
    if (!bar) return;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  var burger = $('.burger'), nav = $('#nav');
  function setNav(open, refocus) {
    if (!nav || !burger) return;
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) { var f = $('a', nav); if (f) setTimeout(function () { f.focus(); }, 60); }
    else if (refocus) burger.focus();
  }
  if (burger) burger.addEventListener('click', function () { setNav(!nav.classList.contains('is-open')); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav && nav.classList.contains('is-open')) setNav(false, true);
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 1100 && nav && nav.classList.contains('is-open')) setNav(false); });

  /* in-page anchors */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a) return;
    if (nav && nav.contains(a) && nav.classList.contains('is-open')) setNav(false);
    var href = a.getAttribute('href');
    if (href.charAt(0) !== '#' || href.length < 2) return;
    var t = document.getElementById(href.slice(1));
    if (!t) return;
    e.preventDefault();
    scrollToEl(t);
    if (history.replaceState) history.replaceState(null, '', href);
  });

  /* ---------- reveal on scroll ---------- */
  var rvs = $$('.rv');
  if (!RM && 'IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('is-in'); rio.unobserve(x.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    rvs.forEach(function (el) { rio.observe(el); });
  } else rvs.forEach(function (el) { el.classList.add('is-in'); });

  /* ---------- counters ---------- */
  function fmt(v, dec) { return v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function countUp(el, delay) {
    if (!el.dataset.count) return;
    var end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
    var t0 = performance.now() + (delay || 0), dur = 1500;
    el.textContent = fmt(0, dec);
    (function tick(t) {
      var p = Math.max(0, Math.min((t - t0) / dur, 1));
      el.textContent = fmt(end * (1 - Math.pow(1 - p, 4)), dec);
      if (p < 1) requestAnimationFrame(tick); else el.textContent = fmt(end, dec);
    })(performance.now());
  }
  if (!RM && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { cio.unobserve(x.target); countUp(x.target, x.target.closest('.readout') ? 900 : 150); } });
    }, { threshold: 0.4 });
    $$('[data-count]').forEach(function (el) { cio.observe(el); });
  }

  /* ---------- scrollspy ---------- */
  var spyLinks = $$('.nav a[href^="#"]:not(.btn), .room__nav a[href^="#"]');
  var spyT = spyLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  if (spyT.length && 'IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (!x.isIntersecting) return;
        spyLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + x.target.id); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    spyT.forEach(function (t) { sio.observe(t); });
  }

  /* ---------- magnetic buttons ---------- */
  if (!RM && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.magnetic').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) / r.width, y = (e.clientY - r.top - r.height / 2) / r.height;
        b.style.transform = 'translate(' + (x * 8).toFixed(1) + 'px,' + (y * 6).toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
      b.style.transition = 'transform .35s cubic-bezier(.2,.8,.2,1), background .25s, color .25s, border-color .25s';
    });
  }

  /* =========================================================
     HERO — drafting board
     ========================================================= */
  var board = $('#board');
  if (board) (function () {
    var svg = $('.draft', board), canvas = $('.board__canvas', board);
    var shots = $$('.shot', board), shotsEl = $('#shots'), scanEl = $('.scanline', board);
    var outline = $('#padOutline'), padD = outline.getAttribute('d');
    var tbNo = $('[data-tb="no"]', board), tbItem = $('[data-tb="item"]', board), tbCount = $('[data-tb="count"]', board), tbFeat = $('[data-tb="feat"]', board), tbC = $('.tblock__count b', board);
    var idx = 0, busy = false, compact = null;

    function fitBoard() {
      var c = window.matchMedia('(max-width: 860px)').matches;
      if (c === compact) return; compact = c;
      if (c) {
        svg.setAttribute('viewBox', '120 20 800 560');
        canvas.style.aspectRatio = '800 / 560';
        shotsEl.style.setProperty('--l', '2.5%'); shotsEl.style.setProperty('--w', '95%'); shotsEl.style.setProperty('--t', '44.6%');
        board.classList.add('is-compact');
      } else {
        svg.setAttribute('viewBox', '70 28 1010 472');
        canvas.style.aspectRatio = '';
        ['--l', '--w', '--t'].forEach(function (p) { shotsEl.style.removeProperty(p); });
        board.classList.remove('is-compact');
      }
    }
    fitBoard();
    window.addEventListener('resize', fitBoard);

    function rectPath(ratio) {
      var w = 760, h = w / ratio, x = 220, y = 280 - h / 2, r = 14;
      return 'M' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h - r) +
        'Q' + (x + w) + ',' + (y + h) + ' ' + (x + w - r) + ',' + (y + h) + 'H' + (x + r) + 'Q' + x + ',' + (y + h) + ' ' + x + ',' + (y + h - r) +
        'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'Z';
    }
    var GLYPHS = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ';
    function scramble(el, text) {
      if (!el) return;
      if (RM) { el.textContent = text; return; }
      var n = 0, steps = 10;
      var iv = setInterval(function () {
        n++;
        var out = '';
        for (var i = 0; i < text.length; i++) out += (i < text.length * n / steps || text[i] === ' ') ? text[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        el.textContent = out;
        if (n >= steps) { clearInterval(iv); el.textContent = text; }
      }, 34);
    }
    function setTB(i) {
      var s = shots[i];
      scramble(tbNo, ('0' + (i + 1)).slice(-2));
      scramble(tbItem, s.dataset.item);
      scramble(tbCount, s.dataset.cnt);
      scramble(tbFeat, s.dataset.feat);
      tbC.textContent = ('0' + (i + 1)).slice(-2);
    }
    function show(i, animate) {
      i = (i + shots.length) % shots.length;
      if (i === idx && animate !== 'first') return;
      var prev = shots[idx], next = shots[i];
      idx = i; setTB(i);
      if (!hasG || RM || !animate) {
        shots.forEach(function (s, k) { s.classList.toggle('is-on', k === i); if (hasG) G.set(s, { clearProps: 'opacity,clipPath' }); });
        return;
      }
      busy = true;
      var x0 = next.offsetLeft, w = next.offsetWidth;
      var tl = G.timeline({ onComplete: function () { busy = false; } });
      next.classList.add('is-on');
      tl.set(next, { opacity: 1, clipPath: 'inset(0% 100% 0% 0%)', zIndex: 2 })
        .set(scanEl, { x: x0, opacity: 1 });
      if (window.MorphSVGPlugin) tl.to(outline, { morphSVG: rectPath(parseFloat(next.dataset.ratio)), duration: 0.6, ease: 'power3.inOut' }, 0);
      tl.to(next, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power2.inOut' }, 0.1)
        .to(scanEl, { x: x0 + w, duration: 0.9, ease: 'power2.inOut' }, 0.1)
        .to(scanEl, { opacity: 0, duration: 0.2 }, 1)
        .set(next, { zIndex: '' });
      if (prev !== next) tl.to(prev, { opacity: 0, duration: 0.4, onComplete: function () { prev.classList.remove('is-on'); } }, 0.55);
    }

    var timer = null, hovering = false, visible = true;
    function schedule() {
      if (RM || !hasG) return;
      clearTimeout(timer);
      timer = setTimeout(function () { if (!hovering && visible && !busy && !document.hidden) show(idx + 1, true); schedule(); }, 5200);
    }
    $$('[data-shot]', board).forEach(function (b) {
      b.addEventListener('click', function () { if (busy) return; show(idx + parseInt(b.dataset.shot, 10), true); schedule(); });
    });
    board.addEventListener('pointerenter', function () { hovering = true; });
    board.addEventListener('pointerleave', function () { hovering = false; });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(board);

    /* crosshair cursor with live mm readout */
    if (!RM && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var cur = $('.cursor', board), cx = $('.cursor__x', cur), cy = $('.cursor__y', cur), cr = $('.cursor__read', cur);
      var pt = svg.createSVGPoint();
      canvas.addEventListener('pointermove', function (e) {
        var r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        cur.classList.add('is-live');
        cx.style.transform = 'translateY(' + y + 'px)';
        cy.style.transform = 'translateX(' + x + 'px)';
        pt.x = e.clientX; pt.y = e.clientY;
        var m = svg.getScreenCTM(); if (!m) return;
        var p = pt.matrixTransform(m.inverse());
        var mx = (p.x - 140) / 760 * 290, my = (270 - p.y) / 760 * 290;
        cr.textContent = 'x ' + mx.toFixed(1) + ' · y ' + my.toFixed(1) + ' mm';
        var flip = x > r.width - 190;
        cr.style.transform = 'translate(' + (flip ? x - 12 - cr.offsetWidth : x + 12) + 'px,' + (y + 12) + 'px)';
      });
    }

    /* intro: draft → fill → morph → reveal */
    if (hasG && !RM && window.DrawSVGPlugin) {
      var drawn = $$('.d-c, .d-out, .d-in, .d-ch, .d-wing, .d-ext, .d-dl, .d-leader', svg);
      var dashed = $$('.d-c, .d-ch, .d-wing', svg);
      var lenEl = $('.d-len', svg);
      G.set(drawn, { drawSVG: '0%' });
      G.set('.d-dl', { opacity: 0 });
      G.set('.d-fill, .d-dots, .d-lab, .d-lab-bg, .d-note, .d-node', { opacity: 0 });
      G.set('.d-node', { scale: 0, transformOrigin: '50% 50%' });
      G.set(shots, { opacity: 0 });
      G.set('.hero__title .ln > span', { yPercent: 110 });
      G.set('.hero__kicker, .hero__sub, .hero__cta, .tblock, .readout', { opacity: 0, y: 16 });
      G.set(board, { opacity: 0 });
      var n = { v: 0 };
      var tl = G.timeline({ delay: 0.15, defaults: { ease: 'power3.out' } });
      tl.to('.hero__kicker', { opacity: 1, y: 0, duration: 0.6 })
        .to('.hero__title .ln > span', { yPercent: 0, duration: 1, stagger: 0.12, ease: 'expo.out' }, 0.05)
        .to('.hero__sub, .hero__cta', { opacity: 1, y: 0, duration: 0.7, stagger: 0.08 }, 0.35)
        .to(board, { opacity: 1, duration: 0.5 }, 0.3)
        .to('.d-c', { drawSVG: '100%', duration: 0.9, ease: 'power2.inOut', stagger: 0.1 }, 0.45)
        .to('.d-out', { drawSVG: '100%', duration: 1.5, ease: 'power2.inOut' }, 0.7)
        .to('.d-in, .d-ch, .d-wing', { drawSVG: '100%', duration: 1.1, ease: 'power2.inOut', stagger: 0.12 }, 1.25)
        .to('.d-ext', { drawSVG: '100%', duration: 0.5, stagger: 0.06, ease: 'power2.out' }, 1.5)
        .to('.d-dl', { opacity: 1, drawSVG: '100%', duration: 0.7, stagger: 0.1, ease: 'power2.inOut' }, 1.75)
        .to('.d-lab-bg, .d-lab', { opacity: 1, duration: 0.3 }, 2.05)
        .to(n, { v: 290, duration: 0.9, ease: 'power2.out', onUpdate: function () { lenEl.textContent = Math.round(n.v); } }, 2.05)
        .to('.d-leader', { drawSVG: '100%', duration: 0.6, stagger: 0.12, ease: 'power2.inOut' }, 2.2)
        .to('.d-node', { opacity: 1, scale: 1, duration: 0.4, stagger: 0.12, ease: 'back.out(3)' }, 2.2)
        .to('.d-note', { opacity: 1, duration: 0.4, stagger: 0.12 }, 2.5)
        .to('.d-fill', { opacity: 0.9, duration: 0.8, ease: 'power1.inOut' }, 2.6)
        .to('.d-dots', { opacity: 0.9, duration: 0.8 }, 2.8)
        .to('.tblock', { opacity: 1, y: 0, duration: 0.6 }, 2.4)
        .to('.readout', { opacity: 1, y: 0, duration: 0.6 }, 2.6)
        .add(function () { dashed.forEach(function (d) { G.set(d, { clearProps: 'strokeDasharray,strokeDashoffset' }); }); }, 3.1)
        .to('.d-fill, .d-dots, .d-in, .d-ch, .d-wing', { opacity: 0.12, duration: 0.6 }, 3.6)
        .add(function () { show(0, 'first'); }, 3.55)
        .to('.d-call', { opacity: 0.55, duration: 0.6 }, 4.4)
        .add(schedule, 4.6);
    } else {
      schedule();
    }
  })();

  /* =========================================================
     PRODUCTION LINE
     ========================================================= */
  var line = $('#line');
  if (line) (function () {
    var sts = $$('.st', line), steps = $$('.step', line), now = $('.line__now', line), meter = $('.line__meter i', line);
    var names = steps.map(function (s) { return [$('.step__no', s).textContent, $('h4', s).textContent]; });
    var cur = -1;
    function setActive(i) {
      if (i === cur) return; cur = i;
      sts.forEach(function (s, k) { s.classList.toggle('is-active', k === i); s.classList.toggle('is-done', k < i); });
      steps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); s.classList.toggle('is-done', k < i); });
      if (now) now.innerHTML = '<b class="mono">' + names[i][0] + '</b> <span>' + names[i][1] + '</span>';
    }
    // mobile / fallback: step list mini animations when in view
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (x) { x.target.classList.toggle('is-on', x.isIntersecting); });
      }, { rootMargin: '0px 0px -15% 0px' });
      steps.forEach(function (s) { io.observe(s); });
    } else steps.forEach(function (s) { s.classList.add('is-on'); });

    var canPin = hasG && ST && window.MotionPathPlugin && !RM;
    if (!canPin) {
      sts.forEach(function (s) { s.classList.add('is-done'); });
      if (now) now.innerHTML = '<b class="mono">ST-01&ndash;06</b> <span>Fully automated line</span>';
      if (meter) meter.style.transform = 'scaleX(1)';
      return;
    }

    var mm = G.matchMedia();
    mm.add('(min-width: 1024px)', function () {
      var pads = $$('.p-pad', line);
      var tws = pads.map(function (p) {
        return G.to(p, { motionPath: { path: '#padPath', align: '#padPath', alignOrigin: [0.5, 0.5], autoRotate: true }, duration: 1, ease: 'none', paused: true });
      });
      var roll = $('.p-roll', line), drum = $('.p-drum', line), r1 = $('.p-r1', line), cut = $('.p-cut', line);
      var dash = $('.p-webdash', line), formed = $('.p-formed', line), scan = $('.p-scan', line), stack = $('.p-stack', line);
      function render(p) {
        G.set(roll, { rotation: p * 1440, scale: 1 - 0.3 * p, svgOrigin: '150 250' });
        G.set(drum, { rotation: p * 900, svgOrigin: '400 290' });
        G.set(r1, { rotation: -p * 1440, svgOrigin: '650 332' });
        G.set(cut, { rotation: p * 2160, svgOrigin: '900 322' });
        dash.style.strokeDashoffset = (-p * 2400).toFixed(1);
        G.set(formed, { x: (p * 2000) % 50 });
        G.set(scan, { y: -Math.abs(Math.sin(p * 50)) * 34 });
        G.set(stack, { y: 40 - Math.min(1, p * 1.2) * 40 });
        tws.forEach(function (t, i) {
          var q = (p * 6 + i / tws.length) % 1;
          t.progress(q);
          pads[i].style.opacity = q > 0.94 ? (1 - q) / 0.06 : (q < 0.03 ? q / 0.03 : 1);
        });
        if (meter) meter.style.transform = 'scaleX(' + p.toFixed(3) + ')';
        setActive(Math.min(5, Math.floor(p * 6)));
      }
      line.classList.add('is-live');
      render(0);
      var st = ST.create({
        trigger: line, start: 'top ' + HH + 'px', end: '+=2600', pin: true, scrub: 0.6, anticipatePin: 1,
        onUpdate: function (self) { render(self.progress); }
      });
      return function () { line.classList.remove('is-live'); st.kill(); tws.forEach(function (t) { t.kill(); }); };
    });
  })();

  /* =========================================================
     PRODUCTS — Flip filter
     ========================================================= */
  var fbtns = $$('.fbtn');
  if (fbtns.length) {
    var specs = $$('.spec'), catN = $('#cat-n');
    fbtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.dataset.f;
        fbtns.forEach(function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
        var state = (hasG && window.Flip && !RM) ? window.Flip.getState(specs) : null;
        var n = 0;
        specs.forEach(function (s) { var on = f === 'all' || s.dataset.b === f; s.hidden = !on; if (on) { n++; s.classList.add('is-in'); } });
        if (catN) catN.textContent = ('0' + n).slice(-2);
        if (state) window.Flip.from(state, {
          duration: 0.6, ease: 'power3.inOut', absolute: true, scale: false,
          onEnter: function (els) { return G.fromTo(els, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.45, delay: 0.15 }); },
          onLeave: function (els) { return G.to(els, { opacity: 0, scale: 0.94, duration: 0.3 }); }
        });
      });
    });
  }

  /* =========================================================
     FIGURES — chart, matrix, seals, ledger
     ========================================================= */
  var chart = $('.chart');
  if (chart) {
    var tip = $('.chart__tip', chart), plot = $('.chart__plot', chart);
    $$('.chart__bar', chart).forEach(function (g) {
      function on() {
        var r = $('.chart__col', g).getBoundingClientRect(), pr = plot.getBoundingClientRect();
        tip.textContent = g.dataset.tip;
        tip.style.left = (r.left - pr.left + r.width / 2) + 'px';
        tip.style.top = (r.top - pr.top - 40) + 'px';
        tip.classList.add('is-on');
      }
      function off() { tip.classList.remove('is-on'); }
      g.addEventListener('pointerenter', on); g.addEventListener('focus', on);
      g.addEventListener('pointerleave', off); g.addEventListener('blur', off);
    });
  }
  if (hasG && ST && !RM) {
    if (chart) {
      var ctl = G.timeline({ scrollTrigger: { trigger: chart, start: 'top 78%', once: true } });
      ctl.from('.chart__col', { scaleY: 0, transformOrigin: '50% 100%', duration: 1.1, ease: 'expo.out', stagger: 0.18 })
        .from('.chart__val', { opacity: 0, y: 10, duration: 0.5, stagger: 0.18 }, 0.4);
      if (window.DrawSVGPlugin) ctl.from('.chart__trend', { drawSVG: '0%', duration: 0.8, ease: 'power2.inOut' }, 0.7)
        .add(function () { G.set('.chart__trend', { clearProps: 'strokeDasharray,strokeDashoffset' }); });
      ctl.from('.chart__pt', { scale: 0, transformOrigin: '50% 50%', duration: 0.4, stagger: 0.2, ease: 'back.out(3)' }, 0.8);
      $$('.chart__val b[data-count]').forEach(function (b) { b.removeAttribute('data-count'); });
    }
    if ($('.matrix__dots')) G.from('.matrix__dots i', { scale: 0, opacity: 0, duration: 0.35, ease: 'back.out(2)', stagger: { each: 0.03, grid: [4, 9], from: 'start' }, scrollTrigger: { trigger: '.matrix__dots', start: 'top 82%', once: true } });
    if ($('.seals')) G.from('.seal', { scale: 1.6, rotation: -14, opacity: 0, duration: 0.5, ease: 'back.out(1.7)', stagger: 0.14, scrollTrigger: { trigger: '.seals', start: 'top 80%', once: true } });
    if ($('.ledger')) G.from('.ledger .row', { opacity: 0, x: -16, duration: 0.6, ease: 'power3.out', stagger: 0.07, scrollTrigger: { trigger: '.ledger', start: 'top 80%', once: true } });
    if ($('.kpi__g')) G.from('.kpi__g', { opacity: 0, scale: 0.6, duration: 0.6, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: '.kpis', start: 'top 80%', once: true } });
    // subtle parallax on infrastructure photos
    if ($('.infra__f2')) G.to('.infra__f2', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: '.infra__media', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* =========================================================
     MANAGEMENT — tabs + profile dialog
     ========================================================= */
  var tabs = $$('.tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.toggle('is-on', t === tab); t.setAttribute('aria-pressed', String(t === tab)); });
      $$('.org__group').forEach(function (g) {
        g.hidden = tab.dataset.group !== 'all' && g.dataset.group !== tab.dataset.group;
        if (!g.hidden) $$('.rv', g).forEach(function (r) { r.classList.add('is-in'); });
      });
      if (ST) ST.refresh();
    });
  });
  function modalOpen(d) { if (typeof d.showModal === 'function') { d.showModal(); if (lenis) lenis.stop(); return true; } return false; }
  $$('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
    d.addEventListener('close', function () { if (lenis) lenis.start(); if (d._ret) { d._ret.focus(); d._ret = null; } });
  });
  var bio = $('#bio');
  if (bio && typeof bio.showModal === 'function') {
    var people = $$('.person'), pi = 0;
    function fill(i) {
      var vis = people.filter(function (p) { return !p.closest('.org__group').hidden; });
      pi = (i + vis.length) % vis.length;
      var p = vis[pi];
      var ph = $('.dlg__photo', bio); ph.innerHTML = '';
      var img = $('.person__photo img', p);
      if (img) { var c = img.cloneNode(); c.loading = 'eager'; c.alt = ''; ph.appendChild(c); }
      else { var m = $('.person__photo--mono', p).cloneNode(true); m.classList.remove('xh'); ph.appendChild(m); }
      $('.dlg__grp', bio).textContent = $('.org__name', p.closest('.org__group')).textContent + ' · ' + $('.person__id', p).textContent;
      $('.dlg__id', bio).textContent = 'PROFILE ' + ('0' + (pi + 1)).slice(-2) + ' / ' + ('0' + vis.length).slice(-2);
      $('#bio-name').textContent = $('h3', p).textContent;
      $('.dlg__role', bio).textContent = $('.person__role', p).textContent;
      $('.dlg__text', bio).textContent = $('.person__bio', p).textContent;
      return vis;
    }
    people.forEach(function (p) {
      var sum = $('summary', p);
      sum.addEventListener('click', function (e) {
        e.preventDefault();
        var vis = people.filter(function (x) { return !x.closest('.org__group').hidden; });
        fill(vis.indexOf(p));
        bio._ret = sum;
        modalOpen(bio);
      });
    });
    $$('[data-step]', bio).forEach(function (b) { b.addEventListener('click', function () { fill(pi + parseInt(b.dataset.step, 10)); }); });
    bio.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') fill(pi + 1); if (e.key === 'ArrowLeft') fill(pi - 1); });
  }

  /* ---------- press lightbox ---------- */
  var lb = $('#lightbox');
  if (lb && typeof lb.showModal === 'function') {
    var clips = $$('.clip'), li = 0, lbImg = $('.lb__stage img', lb), lbN = $('.lb__n', lb);
    function lbShow(i) {
      li = (i + clips.length) % clips.length;
      var src = $('img', clips[li]);
      lbImg.src = src.currentSrc || src.src; lbImg.alt = src.alt;
      lbImg.width = src.getAttribute('width'); lbImg.height = src.getAttribute('height');
      lbN.textContent = 'EXHIBIT ' + ('0' + (li + 1)).slice(-2) + ' / ' + ('0' + clips.length).slice(-2);
    }
    clips.forEach(function (c, i) { c.addEventListener('click', function () { lbShow(i); lb._ret = c; modalOpen(lb); }); });
    $('.lb__prev', lb).addEventListener('click', function () { lbShow(li - 1); });
    $('.lb__next', lb).addEventListener('click', function () { lbShow(li + 1); });
    lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') lbShow(li + 1); if (e.key === 'ArrowLeft') lbShow(li - 1); });
  }

  /* ---------- enquiry form → mailto ---------- */
  var form = $('#enquiry');
  if (form) {
    var note = $('.form__note', form);
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    function check(el) {
      var f = el.closest('.field'), err = $('.field__err', f), msg = '';
      var v = el.value.trim();
      if (el.required && !v) msg = 'This field is required.';
      else if (el.type === 'email' && v && !emailRe.test(v)) msg = 'Please enter a valid email address.';
      else if (el.type === 'tel' && v && v.replace(/\D/g, '').length < 8) msg = 'Please enter a valid mobile number.';
      f.classList.toggle('is-invalid', !!msg);
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) { err.textContent = msg; if (!err.id) err.id = el.id + '-err'; el.setAttribute('aria-describedby', err.id); }
      return !msg;
    }
    $$('input[required], textarea[required]', form).forEach(function (el) {
      el.addEventListener('blur', function () { if (el.value) check(el); });
      el.addEventListener('input', function () { if (el.closest('.field').classList.contains('is-invalid')) check(el); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = $$('input[required], textarea[required]', form).filter(function (el) { return !check(el); });
      if (bad.length) { bad[0].focus(); note.textContent = 'Please complete the highlighted fields.'; return; }
      var fd = new FormData(form), lines = [];
      $$('[name]', form).forEach(function (el) {
        var label = $('label[for="' + el.id + '"]', form).textContent.replace('*', '').trim();
        var v = String(fd.get(el.name) || '').trim();
        if (v) lines.push(label + ': ' + v);
      });
      var subject = 'Website enquiry (' + fd.get('type') + ') - ' + String(fd.get('name')).trim();
      var url = 'mailto:' + form.dataset.to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      form.setAttribute('data-mailto', url);
      note.textContent = 'Your email app should now open with the message ready to send. If it does not, please write to ' + form.dataset.to + '.';
      window.location.href = url;
    });
  }

  /* =========================================================
     INVESTORS — data room search & filters
     ========================================================= */
  var room = $('.room');
  if (room) (function () {
    var input = $('#doc-q'), cats = $$('.cat'), countEl = $('#doc-count'), empty = $('.empty'), groups = $$('.grp');
    var items = $$('.docs li, .offer a');
    items.forEach(function (it) {
      var a = it.tagName === 'A' ? it : $('a', it);
      it._a = a; it._label = a.textContent; it._key = (it.tagName === 'A' ? $('b', it).textContent + ' ' + $('span', it).textContent : a.textContent).toLowerCase();
      it._grp = it.closest('.grp').id;
    });
    var cat = 'all';
    function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function apply() {
      var q = (input.value || '').trim().toLowerCase(), n = 0, per = {};
      items.forEach(function (it) {
        var hit = !q || it._key.indexOf(q) > -1;
        if (hit) per[it._grp] = (per[it._grp] || 0) + 1;
        var on = hit && (cat === 'all' || it._grp === cat);
        it.hidden = !on; if (on) n++;
        if (it.tagName === 'LI') {
          if (q && hit) {
            var i = it._key.indexOf(q), L = it._label;
            it._a.innerHTML = esc(L.slice(0, i)) + '<mark>' + esc(L.slice(i, i + q.length)) + '</mark>' + esc(L.slice(i + q.length));
          } else if (it._a.firstElementChild) it._a.textContent = it._label;
        }
      });
      $$('.sub').forEach(function (s) { s.hidden = !$$('li', s).some(function (l) { return !l.hidden; }); });
      groups.forEach(function (g) {
        var vis = $$('.docs li, .offer a', g).filter(function (x) { return !x.hidden; }).length;
        g.hidden = vis === 0;
        var c = $('.grp__n', g); if (c) c.textContent = (q || cat !== 'all') ? vis + ' shown' : $$('.docs li, .offer a', g).length + ' documents';
      });
      var total = 0;
      cats.forEach(function (c) {
        var k = c.dataset.cat, v = k === 'all' ? Object.keys(per).reduce(function (s, x) { return s + per[x]; }, 0) : (per[k] || 0);
        if (k === 'all') total = v;
        $('.mono', c).textContent = ('0' + v).slice(-2);
        c.disabled = v === 0 && k !== 'all';
      });
      countEl.innerHTML = '<b>' + n + '</b> of 95 documents';
      empty.classList.toggle('is-on', n === 0);
      if (ST) ST.refresh();
    }
    if (input) {
      input.addEventListener('input', apply);
      input.addEventListener('keydown', function (e) { if (e.key === 'Escape') { input.value = ''; apply(); } });
      document.addEventListener('keydown', function (e) {
        if (e.key === '/' && document.activeElement !== input && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
      });
    }
    cats.forEach(function (c) {
      c.addEventListener('click', function () {
        cat = c.dataset.cat;
        cats.forEach(function (x) { x.classList.toggle('is-on', x === c); x.setAttribute('aria-pressed', String(x === c)); });
        apply();
        var top = $('.tools'); if (top && top.parentElement.getBoundingClientRect().top < HH) scrollToEl(top.parentElement);
      });
    });
    var reset = $('[data-reset]');
    if (reset) reset.addEventListener('click', function () { input.value = ''; cat = 'all'; cats.forEach(function (x, k) { x.classList.toggle('is-on', k === 0); x.setAttribute('aria-pressed', String(k === 0)); }); apply(); input.focus(); });
    // sidebar nav: clicking a section resets category filter so the target is visible
    $$('.room__nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        if (cat !== 'all' || (input && input.value)) { if (input) input.value = ''; cat = 'all'; cats.forEach(function (x, k) { x.classList.toggle('is-on', k === 0); x.setAttribute('aria-pressed', String(k === 0)); }); apply(); }
      }, true);
    });
    if (hasG && ST && !RM) {
      groups.forEach(function (g) {
        G.from($$('.docs li, .offer a', g), { opacity: 0, x: -10, duration: 0.45, ease: 'power3.out', stagger: 0.025, scrollTrigger: { trigger: g, start: 'top 85%', once: true } });
      });
    }
  })();

  if (hasG && ST) window.addEventListener('load', function () { ST.refresh(); });
})();
