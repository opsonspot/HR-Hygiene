/* Day & Night — the sky engine, hero sunrise, clock dial and scene reveals.
   Scroll position is mapped to an hour of the day (05:30 → 24:00). */
(function () {
  'use strict';
  var html = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G = window.gsap, ST = window.ScrollTrigger, SPLIT = window.SplitText;
  var hasG = !!(G && ST);
  if (hasG) G.registerPlugin(ST); if (hasG && SPLIT) G.registerPlugin(SPLIT);

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, v)); };
  var sstep = function (t) { return t * t * (3 - 2 * t); };

  var sky = $('.sky');
  if (!sky) { html.classList.add('ready'); return; }
  var layers = $$('.sky__l', sky), KH = layers.map(function (l) { return +l.dataset.h; });
  var KT = layers.map(function (l) { return l.style.getPropertyValue('--t').trim(); });
  var sun = $('.sun', sky), warm = $('.sun__warm', sky), moon = $('.moon', sky);
  var canvas = $('.stars', sky), consts = $('.consts', sky), cpaths = $$('path', consts), clouds = $('.clouds', sky);
  var hdr = $('.hdr'), clockT = $('.clock__t'), clockL = $('.clock__lbl'), meta = $('meta[name="theme-color"]');
  var anchors = $$('[data-hour]');
  var A = [], W = 0, H = 0, mobile = false, P;
  var rise = (reduce || !hasG) ? 0 : 1;           // hero sunrise intro (1 = below horizon)
  var cur = 5.5, target = 5.5, lastK = -1, lastTone = '', lastClock = '';
  var lenis = null;

  /* ---------- Smooth scroll ---------- */
  if (!reduce && window.Lenis) {
    try {
      lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
      window.__lenis = lenis;
      if (hasG) { lenis.on('scroll', ST.update); G.ticker.add(function (t) { lenis.raf(t * 1000); }); G.ticker.lagSmoothing(0); }
      else { (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now()); }
    } catch (e) { lenis = null; }
  }
  function focusTarget(el) {
    if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    var id = a.getAttribute('href'); if (id.length < 2) return;
    var el = document.getElementById(id.slice(1)); if (!el) return;
    if (!lenis) return; // native anchor jump
    e.preventDefault();
    var top = a.hasAttribute('data-top');
    lenis.scrollTo(top ? 0 : el, { offset: top ? 0 : -84, duration: top ? 3.2 : 1.6, onComplete: function () { focusTarget(el); } });
    if (history.replaceState) history.replaceState(null, '', top ? location.pathname : id);
  });

  /* ---------- Measuring ---------- */
  function measure() {
    W = window.innerWidth; H = window.innerHeight; mobile = W < 761;
    var y = window.scrollY || window.pageYOffset;
    A = anchors.map(function (el) {
      var r = el.getBoundingClientRect();
      return { top: r.top + y, bot: r.bottom + y, mid: r.top + y + r.height / 2, h: +el.dataset.hour, tone: el.dataset.tone };
    });
    // sun path: centre x, horizontal radius, horizon y, vertical radius (fractions of viewport)
    P = mobile ? { cx: 0.5, rx: 0.3, y0: 0.8, ry: 0.62 } : (W < 961 ? { cx: 0.5, rx: 0.3, y0: 0.78, ry: 0.6 } : { cx: 0.5, rx: 0.27, y0: 0.6, ry: 0.48 });
  }
  function hourAt(y) {
    if (!A.length) return 5.5;
    if (y <= A[0].mid) return A[0].h;
    for (var i = 0; i < A.length - 1; i++) {
      if (y < A[i + 1].mid) return A[i].h + (A[i + 1].h - A[i].h) * clamp((y - A[i].mid) / Math.max(1, A[i + 1].mid - A[i].mid));
    }
    return A[A.length - 1].h;
  }
  function toneAt(y) {
    for (var i = 0; i < A.length; i++) if (y >= A[i].top && y < A[i].bot) return A[i].tone;
    return y < (A[0] ? A[0].top : 0) ? 'day' : 'night';
  }

  /* ---------- Stars (canvas) ---------- */
  var ctx = canvas.getContext && canvas.getContext('2d'), S = [], shoot = null, starOp = 0;
  function buildStars() {
    if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = mobile ? 70 : Math.min(260, Math.round(W * H / 6200));
    var cols = ['255,255,255', '255,236,190', '200,225,255', '255,214,230'];
    S = [];
    for (var i = 0; i < n; i++) S.push({ x: Math.random() * W, y: Math.random() * H * 0.92, r: 0.4 + Math.pow(Math.random(), 3) * 1.6, a: 0.35 + Math.random() * 0.65, s: 0.4 + Math.random() * 1.8, p: Math.random() * 6.28, c: cols[(Math.random() * cols.length) | 0] });
    if (reduce) drawStars(0);
  }
  function drawStars(t) {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < S.length; i++) {
      var s = S[i], al = reduce ? s.a : s.a * (0.55 + 0.45 * Math.sin(t * 0.001 * s.s + s.p));
      ctx.fillStyle = 'rgba(' + s.c + ',' + al.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
      if (s.r > 1.5) { ctx.fillStyle = 'rgba(' + s.c + ',' + (al * 0.15).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3.2, 0, 6.2832); ctx.fill(); }
    }
    if (reduce) return;
    if (!shoot && Math.random() < 0.004) shoot = { x: W * (0.2 + Math.random() * 0.6), y: H * Math.random() * 0.35, l: 0 };
    if (shoot) {
      shoot.l += 0.022;
      var k = shoot.l, x = shoot.x + k * 340, y = shoot.y + k * 150, g = ctx.createLinearGradient(x - 90, y - 40, x, y);
      g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(1, 'rgba(255,240,200,' + (1 - k).toFixed(2) + ')');
      ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 90, y - 40); ctx.lineTo(x, y); ctx.stroke();
      if (k >= 1) shoot = null;
    }
  }

  /* ---------- Paint the sky for an hour ---------- */
  var setOp = function (el, v) { v = Math.round(v * 1000) / 1000; if (el.__o !== v) { el.__o = v; el.style.opacity = v; } };
  function paint(h) {
    var k = 0; while (k < KH.length - 1 && h >= KH[k + 1]) k++;
    var t = k < KH.length - 1 ? sstep(clamp((h - KH[k]) / (KH[k + 1] - KH[k]))) : 0;
    for (var j = 0; j < layers.length; j++) setOp(layers[j], j === k ? 1 : (j === k + 1 ? t : 0));
    if (k !== lastK && meta) { meta.setAttribute('content', KT[k]); lastK = k; }

    // sun arcs from the hero (05:30) across the sky and sets around 18:30
    var th = clamp((h - 5.5) / 12.5) * Math.PI, sn = Math.sin(th);
    if (reduce) {
      sun.style.transform = 'translate3d(' + (W * (mobile ? 0.82 : 0.8)) + 'px,' + (H * (mobile ? 0.2 : 0.3)) + 'px,0)';
    } else {
      var sx = W * (P.cx + P.rx * Math.cos(th));
      var sy = H * (P.y0 - P.ry * sn) + Math.max(0, h - 18) * 1.1 * H + rise * 0.55 * H;
      sun.style.transform = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0) scale(' + (1 + 0.45 * (1 - sn)).toFixed(3) + ')';
    }
    setOp(warm, Math.pow(1 - sn, 1.4));
    setOp(sun, 1 - clamp((h - 18.1) / 0.5));

    // moon rises after sunset
    var m = clamp((h - 18.6) / 1.9); m = 1 - (1 - m) * (1 - m);
    if (reduce) moon.style.transform = 'translate3d(' + (W * (mobile ? 0.84 : 0.92)) + 'px,' + (H * 0.16) + 'px,0)';
    else moon.style.transform = 'translate3d(' + (W * (mobile ? 0.86 : 0.955 - 0.015 * m)).toFixed(1) + 'px,' + (H * (mobile ? 0.12 + 0.08 * (1 - m) : 1.15 - m)).toFixed(1) + 'px,0) rotate(' + (-30 + 30 * m).toFixed(1) + 'deg)';
    setOp(moon, clamp((h - 18.7) / 0.9));

    starOp = clamp((h - 18.5) / 1.8); setOp(canvas, starOp);
    var cl = h < 6.2 ? 0.55 + 0.45 * clamp((h - 5.5) / 0.7) : 1 - clamp((h - 16.6) / 1.6);
    setOp(clouds, cl); sky.classList.toggle('no-clouds', cl < 0.02);

    var c = clamp((h - 20.3) / 2.4); setOp(consts, clamp((h - 20) / 0.6) * 0.95);
    for (var i = 0; i < cpaths.length; i++) { var ci = clamp(c * 1.6 - i * 0.2); cpaths[i].style.strokeDashoffset = (1 - ci).toFixed(3); }

    // header clock
    var mins = Math.round(h * 60) % 1440, hh = Math.floor(mins / 60), mm = mins % 60;
    var txt = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
    if (txt !== lastClock && clockT) {
      lastClock = txt; clockT.textContent = txt;
      if (clockL) clockL.textContent = h < 6.6 ? 'Dawn' : h < 11.2 ? 'Morning' : h < 13.4 ? 'Noon' : h < 16.6 ? 'Afternoon' : h < 18.6 ? 'Golden hour' : h < 20.2 ? 'Evening' : 'Night';
    }
  }
  cpaths.forEach(function (p) { p.style.strokeDasharray = '1'; p.style.strokeDashoffset = '1'; });

  function tone() {
    var y = (window.scrollY || window.pageYOffset) + 44, t = toneAt(y);
    if (t !== lastTone) { lastTone = t; hdr.classList.toggle('is-night', t === 'night'); sky.classList.toggle('is-night', t === 'night'); }
  }

  /* ---------- Main loop ---------- */
  var lastRise = -1;
  function frame(time) {
    var y = (window.scrollY || window.pageYOffset) + H * 0.58;
    target = hourAt(y);
    var d = target - cur;
    var moved = Math.abs(d) > 0.0005 || rise !== lastRise;
    if (moved) { cur += reduce ? d : d * 0.14; if (Math.abs(target - cur) < 0.0005) cur = target; lastRise = rise; paint(cur); tone(); }
    if (ctx && !reduce && starOp > 0.01) drawStars(time);
    requestAnimationFrame(frame);
  }

  var rto;
  function onResize() { clearTimeout(rto); rto = setTimeout(function () { var wasMobile = mobile, oldW = W; measure(); if (Math.abs(oldW - W) > 40 || wasMobile !== mobile || !S.length) buildStars(); lastRise = -1; if (hasG) ST.refresh(); }, 160); }
  measure(); buildStars();
  cur = target = hourAt((window.scrollY || 0) + H * 0.58); paint(cur); tone();
  requestAnimationFrame(frame);
  window.addEventListener('resize', onResize);
  window.addEventListener('load', function () { measure(); if (hasG) ST.refresh(); });
  if ('ResizeObserver' in window) { var ro = new ResizeObserver(function () { measure(); }); ro.observe(document.body); }

  /* ---------- Dial: the hand sweeps through the figures ---------- */
  var dialbox = $('#dialbox'), hand = $('#dialHand');
  var figs = dialbox ? $$('.fig', dialbox) : [];
  function lightFig(f) { if (f.classList.contains('is-lit')) return; f.classList.add('is-lit'); $$('[data-count]', f).forEach(function (el) { if (window.__countUp) window.__countUp(el); }); }
  if (dialbox && hasG && !reduce) {
    dialbox.classList.add('is-armed');
    figs.forEach(function (f) { $$('[data-count]', f).forEach(function (el) { var dec = (el.dataset.count.split('.')[1] || '').length; el.textContent = (0).toFixed(dec); }); });
    ST.create({
      trigger: dialbox, start: 'top 78%', end: 'bottom 40%', scrub: 0.6,
      onUpdate: function (self) {
        var p = self.progress, ang = 270 + 360 * p;
        hand.setAttribute('transform', 'rotate(' + ang.toFixed(2) + ')');
        figs.forEach(function (f) { var a = +f.dataset.a, need = ((a - 270 + 360) % 360) / 360; if (p >= need - 0.001) lightFig(f); });
      }
    });
  }

  /* ---------- Hero sunrise + entrances ---------- */
  function heroIntro() {
    if (!hasG || reduce) { html.classList.add('ready'); rise = 0; return; }
    var tl = G.timeline({ defaults: { ease: 'power3.out' } });
    var chars = null;
    if (SPLIT) {
      try { var sp = SPLIT.create('.hero h1 .ln', { type: 'words,chars', wordsClass: 'wd', charsClass: 'ch' }); chars = sp.chars; } catch (e) { chars = null; }
    }
    html.classList.add('ready');
    var o = { r: 1 };
    tl.to(o, { r: 0, duration: 2.6, ease: 'power2.out', onUpdate: function () { rise = o.r; } }, 0);
    if (chars) tl.from(chars, { yPercent: 115, rotate: 8, opacity: 0, duration: 1.15, stagger: 0.03, ease: 'power4.out' }, 0.35);
    else tl.from('.hero h1', { y: 40, opacity: 0, duration: 1 }, 0.35);
    tl.from('.hero__kicker', { y: 18, opacity: 0, duration: .9 }, 0.2)
      .from('.hero__sub', { y: 24, opacity: 0, duration: 1 }, 0.9)
      .from('.hero__cta > *', { y: 22, opacity: 0, duration: .9, stagger: .1 }, 1.05)
      .from('.hero__tag', { opacity: 0, duration: .9 }, 1.3)
      .from('.pack', { y: 90, opacity: 0, scale: .9, duration: 1.5, stagger: .12, ease: 'expo.out' }, 0.5)
      .from('.bank path', { yPercent: 40, opacity: 0, duration: 1.8, stagger: .15 }, 0.2)
      .from('.scrollcue', { opacity: 0, y: 10, duration: .8 }, 1.6);

    // scroll: hero drifts while the day begins
    G.to('.stage', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    G.to('.bank svg', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // pointer parallax on the floating packs
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var imgs = $$('.pack img').map(function (img, i) { return { x: G.quickTo(img, 'x', { duration: 1.2, ease: 'power3' }), y: G.quickTo(img, 'y', { duration: 1.2, ease: 'power3' }), d: [18, 10, 26, 34][i] || 16 }; });
      $('.hero').addEventListener('pointermove', function (e) {
        var nx = e.clientX / W - 0.5, ny = e.clientY / H - 0.5;
        imgs.forEach(function (q) { q.x(-nx * q.d); q.y(-ny * q.d); });
      });
    }
  }

  /* ---------- Scene art reveals ---------- */
  function scenes() {
    if (!hasG || reduce) return;
    $$('.scene__art').forEach(function (art) {
      G.from(art, { y: 70, opacity: 0, scale: .94, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: art, start: 'top 88%', once: true } });
    });
    $$('.title').forEach(function (t) {
      if (t.closest('.hero')) return;
      G.from(t, { yPercent: 30, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: t, start: 'top 90%', once: true } });
    });
  }

  heroIntro(); scenes();
  if (hasG) setTimeout(function () { ST.refresh(); measure(); }, 400);
})();
