/* H R Hygiene — "Flow" behaviour. Works without GSAP/Lenis (progressive enhancement). */
(function () {
  'use strict';
  window.__flow = true;
  var d = document, root = d.documentElement;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G = window.gsap, ST = window.ScrollTrigger;
  var MOTION = !RM && !!G && !!ST;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!MOTION) root.classList.remove('anim');
  if (MOTION) {
    G.registerPlugin(ST);
    if (window.DrawSVGPlugin) G.registerPlugin(window.DrawSVGPlugin);
    if (window.SplitText) G.registerPlugin(window.SplitText);
  }
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---------------- Lenis smooth scroll ---------------- */
  var lenis = null;
  if (MOTION && window.Lenis) {
    try {
      lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
      lenis.on('scroll', ST.update);
      G.ticker.add(function (t) { lenis.raf(t * 1000); });
      G.ticker.lagSmoothing(0);
    } catch (e) { lenis = null; }
  }
  function scrollToEl(el) {
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -80, duration: 1.4 });
    else el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
  }
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var t = d.getElementById(id.slice(1));
    if (!t) return;
    e.preventDefault();
    scrollToEl(t);
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* ---------------- Header ---------------- */
  var hdr = $('.hdr');
  if (hdr) {
    var fixedSolid = hdr.classList.contains('is-solid');
    var onScroll = function () { if (!fixedSolid) hdr.classList.toggle('is-solid', window.scrollY > 40); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------- Mobile menu ---------------- */
  var burger = $('.burger'), nav = $('#nav');
  if (burger && nav) {
    var setNav = function (open, refocus) {
      nav.classList.toggle('is-open', open);
      hdr.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (lenis) { open ? lenis.stop() : lenis.start(); }
      d.body.style.overflow = open ? 'hidden' : '';
      if (open) { var f = $('a', nav); if (f) setTimeout(function () { f.focus(); }, 60); }
      else if (refocus) burger.focus();
    };
    burger.addEventListener('click', function () { setNav(!nav.classList.contains('is-open'), true); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a') && nav.classList.contains('is-open')) setNav(false, false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) setNav(false, true); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1100 && nav.classList.contains('is-open')) setNav(false, false); });
  }

  /* ---------------- Ripple on press ---------------- */
  d.addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('.btn, .orb__btn, .tab, .person__more, .totop');
    if (!b || RM) return;
    var r = b.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    var s = Math.max(r.width, r.height) / 10 + 4;
    ['ripple ripple--fill', 'ripple', 'ripple ripple--2'].forEach(function (c) {
      var sp = d.createElement('span');
      sp.className = c; sp.style.left = x + 'px'; sp.style.top = y + 'px'; sp.style.setProperty('--s', s);
      sp.setAttribute('aria-hidden', 'true');
      b.appendChild(sp);
      sp.addEventListener('animationend', function () { sp.remove(); });
    });
  });

  /* ---------------- Liquid metaballs (canvas) ---------------- */
  function Goo(canvas, opt) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    var W = 0, H = 0, s = 1, img = null, cw = 0, ch = 0, running = false, raf = 0, t0 = performance.now();
    var mouse = { x: -1, y: -1, tx: -1, ty: -1, on: false }, pulse = 0;
    // cyclic iridescent palette LUT
    var stops = [[52, 224, 216], [76, 201, 255], [122, 92, 255], [224, 64, 159], [122, 92, 255], [52, 224, 216]];
    var LUT = new Uint8Array(256 * 3);
    for (var i = 0; i < 256; i++) {
      var p = i / 255 * (stops.length - 1), k = Math.floor(p), f = p - k, a = stops[k], b = stops[Math.min(k + 1, stops.length - 1)];
      f = f * f * (3 - 2 * f);
      LUT[i * 3] = a[0] + (b[0] - a[0]) * f; LUT[i * 3 + 1] = a[1] + (b[1] - a[1]) * f; LUT[i * 3 + 2] = a[2] + (b[2] - a[2]) * f;
    }
    var L = [-0.45, -0.6, 0.66], ln = Math.hypot(L[0], L[1], L[2]); L = [L[0] / ln, L[1] / ln, L[2] / ln];
    var Hh = [L[0], L[1], L[2] + 1], hn = Math.hypot(Hh[0], Hh[1], Hh[2]); Hh = [Hh[0] / hn, Hh[1] / hn, Hh[2] / hn];

    function resize() {
      cw = canvas.clientWidth; ch = canvas.clientHeight;
      if (!cw || !ch) return;
      var maxPx = opt.maxPx || (cw < 700 ? 42000 : 105000);
      s = Math.min(0.5, Math.sqrt(maxPx / (cw * ch)));
      W = Math.max(40, Math.round(cw * s)); H = Math.max(40, Math.round(ch * s));
      canvas.width = W; canvas.height = H;
      img = ctx.createImageData(W, H);
    }
    function balls(t) {
      var a = opt.anchor(cw, ch); // {x,y,r} in css px
      var R = a.r, out = [];
      out.push({ x: a.x + Math.sin(t * .4) * R * .05, y: a.y + Math.cos(t * .33) * R * .05, r: R * (0.78 + pulse * .12 + Math.sin(t * .7) * .02) });
      var orbit = opt.orbits || [[1.02, .33, .46, 0], [1.18, -.24, .36, 2.1], [.95, .19, .3, 4.2], [1.35, -.15, .24, 1.1], [1.1, .28, .2, 5.3]];
      for (var j = 0; j < orbit.length; j++) {
        var o = orbit[j], ang = t * o[1] + o[3], dist = R * (o[0] + Math.sin(t * .5 + j) * .14);
        out.push({ x: a.x + Math.cos(ang) * dist * 1.08, y: a.y + Math.sin(ang) * dist * .92, r: R * o[2] * (1 + Math.sin(t * .9 + j * 2) * .08) });
      }
      if (opt.cursor && mouse.on) {
        mouse.x += (mouse.tx - mouse.x) * .07; mouse.y += (mouse.ty - mouse.y) * .07;
        out.push({ x: mouse.x, y: mouse.y, r: R * .2 });
      }
      if (opt.extra) opt.extra(out, t, cw, ch, R);
      return out;
    }
    function draw(now) {
      if (!img) return;
      var t = (now - t0) / 1000;
      pulse *= 0.96;
      var B = balls(t), n = B.length, bx = new Float32Array(n), by = new Float32Array(n), br = new Float32Array(n), Ravg = 0;
      for (var j = 0; j < n; j++) { bx[j] = B[j].x * s; by[j] = B[j].y * s; br[j] = (B[j].r * s) * (B[j].r * s); Ravg += B[j].r * s; }
      Ravg /= n;
      var data = img.data, idx = 0, sc = Ravg * 1.1, drift = t * 0.04;
      for (var y = 0; y < H; y++) {
        for (var x = 0; x < W; x++, idx += 4) {
          var fsum = 0, gx = 0, gy = 0;
          for (var q = 0; q < n; q++) {
            var dx = x - bx[q], dy = y - by[q], d2 = dx * dx + dy * dy + 1, v = br[q] / d2;
            fsum += v; v /= d2; gx += v * dx; gy += v * dy;
          }
          if (fsum < 0.82) { data[idx + 3] = 0; continue; }
          var al = clamp((fsum - 0.82) / 0.22, 0, 1); al = al * al * (3 - 2 * al);
          var nx = gx * sc / fsum, ny = gy * sc / fsum, nz = 1, nl = Math.sqrt(nx * nx + ny * ny + 1);
          nx /= nl; ny /= nl; nz /= nl;
          var diff = nx * L[0] + ny * L[1] + nz * L[2]; if (diff < 0) diff = 0;
          var sp = nx * Hh[0] + ny * Hh[1] + nz * Hh[2]; sp = sp > 0 ? Math.pow(sp, 38) : 0;
          var ci = (x / W * .55 + y / H * .3 + nx * .22 + ny * .14 + drift) % 1; if (ci < 0) ci += 1;
          var li = (ci * 255) | 0, rim = (1 - nz); rim *= rim;
          var sh = 0.42 + diff * 0.7;
          data[idx] = clamp(LUT[li * 3] * sh + sp * 255 + rim * 40, 0, 255);
          data[idx + 1] = clamp(LUT[li * 3 + 1] * sh + sp * 255 + rim * 70, 0, 255);
          data[idx + 2] = clamp(LUT[li * 3 + 2] * sh + sp * 255 + rim * 90, 0, 255);
          data[idx + 3] = al * (opt.alpha || 235);
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    function loop(now) { if (!running) return; draw(now); raf = requestAnimationFrame(loop); }
    function start() { if (running || RM) return; running = true; raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    resize();
    draw(t0 + 2600);
    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { resize(); if (!running) draw(performance.now()); }) : null;
    if (ro) ro.observe(canvas);
    if (!RM) {
      var visible = true;
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; visible && !d.hidden ? start() : stop(); }).observe(canvas);
      d.addEventListener('visibilitychange', function () { d.hidden ? stop() : visible && start(); });
      if (opt.cursor && FINE) {
        var host = opt.host || canvas.parentElement;
        host.addEventListener('pointermove', function (e) {
          var r = canvas.getBoundingClientRect();
          mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top;
          if (!mouse.on) { mouse.x = mouse.tx; mouse.y = mouse.ty; mouse.on = true; }
        });
        host.addEventListener('pointerleave', function () { mouse.on = false; });
      }
    }
    return { pulse: function () { pulse = 1; }, start: start, stop: stop };
  }

  var goo = null, heroCanvas = $('.hero .hero__goo');
  if (heroCanvas) {
    var orbEl = $('.orb');
    goo = Goo(heroCanvas, {
      cursor: true, host: $('.hero'),
      anchor: function (cw, ch) {
        var cr = heroCanvas.getBoundingClientRect(), r = orbEl.getBoundingClientRect();
        return { x: r.left - cr.left + r.width / 2, y: r.top - cr.top + r.height / 2, r: r.width / 2 };
      },
      extra: function (out, t, cw, ch, R) {
        out.push({ x: cw * .46 + Math.sin(t * .2) * 40, y: ch * 1.02 + Math.cos(t * .3) * 16, r: R * .3 });
      }
    });
  }
  var ihero = $('.ihero .hero__goo');
  if (ihero) {
    Goo(ihero, {
      cursor: true, host: $('.ihero'), alpha: 220, maxPx: 60000,
      anchor: function (cw, ch) { return cw < 700 ? { x: cw * .92, y: ch * .2, r: cw * .3 } : { x: cw * .8, y: ch * .48, r: Math.min(ch * .32, cw * .16) }; },
      orbits: [[1.1, .3, .42, 0], [1.3, -.22, .3, 2], [.9, .18, .26, 4], [1.5, -.12, .2, 1]]
    });
  }

  /* ---------------- Hero intro + headline ripple ---------------- */
  var title = $('.hero__title');
  if (title && MOTION) {
    var chars = [];
    if (window.SplitText) {
      try {
        var split = new window.SplitText(title, { type: 'words,chars', charsClass: 'ch' });
        chars = split.chars;
        $$('.iri', title).forEach(function (w) {
          var cs = $$('.ch', w), n = cs.length;
          w.style.background = 'none';
          cs.forEach(function (c, i) {
            c.style.backgroundImage = 'linear-gradient(100deg,#34e0d8 0%,#4cc9ff 30%,#7a5cff 64%,#e0409f 100%)';
            c.style.backgroundSize = (n * 100) + '% 100%';
            c.style.backgroundPosition = (n > 1 ? i / (n - 1) * 100 : 0) + '% 0';
            c.style.webkitBackgroundClip = 'text'; c.style.backgroundClip = 'text'; c.style.color = 'transparent';
          });
        });
      } catch (e) { chars = []; }
    }
    var tl = G.timeline({ delay: .15, defaults: { ease: 'sine.out' } });
    var copy = $$('.hero__copy > *');
    G.set(copy, { opacity: 1 });
    tl.from('.kicker', { y: 20, opacity: 0, duration: .8 });
    if (chars.length) {
      tl.from(chars, {
        yPercent: function (i) { return 90 + Math.sin(i * .55) * 40; },
        opacity: 0, rotate: function (i) { return Math.sin(i * .9) * 10; },
        duration: 1.4, ease: 'elastic.out(1, 0.7)', stagger: { each: .028 }
      }, .1);
    } else tl.from(title, { y: 40, opacity: 0, duration: 1 }, .1);
    tl.from('.hero__sub', { y: 24, opacity: 0, duration: 1 }, .7)
      .from('.hero__cta > *', { y: 24, opacity: 0, duration: .9, stagger: .1 }, .85)
      .fromTo('.orb-wrap', { opacity: 0, scale: .82, y: 40 }, { opacity: 1, scale: 1, y: 0, duration: 1.8, ease: 'elastic.out(1, 0.75)' }, .3);
    // ripple chars near pointer
    if (FINE && chars.length) {
      var qs = chars.map(function (c) { return G.quickTo(c, 'y', { duration: .7, ease: 'sine.out' }); });
      var rects = [];
      var measure = function () { rects = chars.map(function (c) { var r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); };
      title.addEventListener('pointerenter', measure);
      title.addEventListener('pointermove', function (e) {
        if (tl.isActive()) return;
        for (var i = 0; i < chars.length; i++) {
          var dx = e.clientX - rects[i][0], dy = e.clientY - rects[i][1], dist = Math.sqrt(dx * dx + dy * dy);
          qs[i](dist < 160 ? -Math.cos(dist / 160 * Math.PI / 2) * 12 : 0);
        }
      });
      title.addEventListener('pointerleave', function () { qs.forEach(function (q) { q(0); }); });
    }
  } else { $$('.hero__copy > *, .orb-wrap').forEach(function (el) { el.style.opacity = 1; }); }

  /* ---------------- Orb product carousel ---------------- */
  var slides = $$('.orb .slide');
  if (slides.length) {
    var cur = 0, timer = null, count = $('.orb__count b'), busy = false;
    var show = function (n) {
      if (busy) return;
      var next = (n + slides.length) % slides.length;
      if (next === cur) return;
      var out = slides[cur], inn = slides[next];
      cur = next;
      count.textContent = ('0' + (cur + 1)).slice(-2);
      if (goo) goo.pulse();
      if (!MOTION) { out.classList.remove('is-on'); inn.classList.add('is-on'); return; }
      busy = true;
      var oi = $('img', out), ii = $('img', inn), oc = $('figcaption', out), ic = $('figcaption', inn);
      G.to(oc, { opacity: 0, y: 10, duration: .35 });
      G.to(oi, { scale: .55, opacity: 0, y: 60, rotate: 8, duration: .55, ease: 'sine.in', onComplete: function () {
        out.classList.remove('is-on'); G.set([oi, oc], { clearProps: 'all' });
        inn.classList.add('is-on');
        G.fromTo(ii, { scale: .4, opacity: 0, yPercent: -50, xPercent: -50, y: -80, rotate: -10 }, { scale: 1, opacity: 1, y: 0, rotate: 0, duration: 1.4, ease: 'elastic.out(1, 0.6)', onComplete: function () { busy = false; } });
        G.fromTo(ic, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .6, delay: .3 });
      } });
    };
    var play = function () { clearInterval(timer); if (!RM) timer = setInterval(function () { show(cur + 1); }, 5200); };
    $('[data-prev]').addEventListener('click', function () { show(cur - 1); play(); });
    $('[data-next]').addEventListener('click', function () { show(cur + 1); play(); });
    var orb = $('.orb');
    orb.addEventListener('mouseenter', function () { clearInterval(timer); });
    orb.addEventListener('mouseleave', play);
    orb.addEventListener('focusin', function () { clearInterval(timer); });
    play();
  }

  /* ---------------- Scroll-driven motion ---------------- */
  if (MOTION) {
    // droplet falling from hero into brands
    var drop = $('.drop');
    if (drop) {
      var dtl = G.timeline({ scrollTrigger: { trigger: '.brands', start: 'top 95%', end: 'top 25%', scrub: 1 } });
      dtl.fromTo('.drop__d', { y: -240, opacity: 0, scaleY: 1.2 }, { y: -10, opacity: 1, scaleY: 1, duration: .5, ease: 'sine.in' })
        .to('.drop__d', { y: 14, scaleY: .3, scaleX: 1.6, opacity: 0, duration: .1 })
        .fromTo('.drop__rings ellipse', { scale: .2, opacity: .9, transformOrigin: '50% 50%' }, { scale: function (i) { return 2.2 + i * 1.2; }, opacity: 0, duration: .5, stagger: .08, ease: 'sine.out' }, '<');
    }

    // wave text flowing along path
    var tp = $('.ribbon-text__tp');
    if (tp) {
      var txt = tp.parentNode, len = 0;
      try { len = txt.getComputedTextLength(); } catch (e) {}
      if (len > 0) {
        var obj = { o: 0 }, loopLen = len / 2;
        var tw = G.to(obj, { o: -loopLen, duration: 60, ease: 'none', repeat: -1, onUpdate: function () { tp.setAttribute('startOffset', obj.o); } });
        ST.create({ trigger: '.ribbon-text', start: 'top bottom', end: 'bottom top', onToggle: function (st) { st.isActive ? tw.play() : tw.pause(); },
          onUpdate: function (st) { var v = Math.abs(st.getVelocity()) / 400; G.to(tw, { timeScale: 1 + Math.min(v, 6), duration: .3, overwrite: true }); } });
      }
    }

    // generic reveals
    var rv = $$('.rv');
    G.set(rv, { opacity: 0, y: 40 });
    var reveal = function (batch) { G.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'sine.out', stagger: .08, overwrite: true }); };
    ST.batch(rv, { start: 'top 90%', once: true, onEnter: reveal, onLeave: reveal, onEnterBack: reveal });

    // wave-shaped clip-path wipes
    $$('.rv-wave').forEach(function (el, n) {
      var im = $('img', el), st = { p: 0 }, A = 7, N = 28;
      var apply = function () {
        var pts = [], ph = st.p * 6 + n;
        for (var i = 0; i <= N; i++) {
          var x = i / N * 100, y = (1 - st.p) * (100 + 2 * A) - A + A * Math.sin(i / N * Math.PI * 3 + ph) * (1 - st.p * .6);
          pts.push(x.toFixed(2) + '% ' + y.toFixed(2) + '%');
        }
        pts.push('100% 100%', '0% 100%');
        el.style.clipPath = 'polygon(' + pts.join(',') + ')';
      };
      apply();
      ST.create({ trigger: el, start: 'top 85%', once: true, onEnter: function () {
        G.to(st, { p: 1, duration: 1.8, ease: 'sine.inOut', onUpdate: apply, onComplete: function () { el.style.clipPath = ''; } });
        if (im) G.fromTo(im, { scale: 1.25 }, { scale: 1, duration: 2.2, ease: 'sine.out' });
      } });
    });

    // liquid stat orbs
    $$('.dstat').forEach(function (s) {
      var g = $('.dstat__liq', s), lv = parseFloat(getComputedStyle(s).getPropertyValue('--lv')) || .7;
      G.fromTo(g, { y: 125 }, { y: (1 - lv) * 120, duration: 2.4, ease: 'elastic.out(1, 0.5)', scrollTrigger: { trigger: s, start: 'top 88%', once: true } });
    });

    // tubes proportional fill
    $$('.tube').forEach(function (t) {
      var liq = $('.tube__liq', t), lv = parseFloat(getComputedStyle(t).getPropertyValue('--lv')) || 1;
      G.fromTo(liq, { yPercent: 100 }, { yPercent: (1 - lv) * 100, duration: 2.6, ease: 'sine.inOut', scrollTrigger: { trigger: '.tubes', start: 'top 75%', once: true } });
    });

    // why-us ribbon draw
    if (window.DrawSVGPlugin) {
      $$('.why__ribbon path').forEach(function (p) {
        G.fromTo(p, { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', scrollTrigger: { trigger: '.why__flow', start: 'top 80%', end: 'bottom 70%', scrub: 1 } });
      });
    }
    // parallax on media
    $$('.about__swirl').forEach(function (el) { G.to(el, { rotate: 60, ease: 'none', scrollTrigger: { trigger: el, scrub: 1 } }); });
  }

  /* header over dark sections */
  if (MOTION && hdr) {
    $$('.hero, .sec--deep, .tubes, .cta, .ftr, .ihero').forEach(function (sec) {
      ST.create({ trigger: sec, start: 'top 50px', end: 'bottom 50px', onToggle: function (st) { hdr.classList.toggle('on-dark', st.isActive); } });
    });
  }

  /* ---------------- Counters ---------------- */
  if (MOTION) {
    $$('[data-count]').forEach(function (el) {
      var end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
      var fmt = function (v) { return v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
      var o = { v: 0 };
      if (el.getBoundingClientRect().top > window.innerHeight) el.textContent = fmt(0);
      ST.create({ trigger: el, start: 'top 92%', once: true, onEnter: function () {
        G.to(o, { v: end, duration: 2.2, ease: 'sine.inOut', onUpdate: function () { el.textContent = fmt(o.v); } });
      } });
    });
  }

  /* ---------------- Brand cards on touch: fill when centred ---------------- */
  if (!FINE && 'IntersectionObserver' in window) {
    var bio2 = new IntersectionObserver(function (en) { en.forEach(function (x) { x.target.classList.toggle('is-full', x.isIntersecting); }); }, { rootMargin: '-38% 0px -38% 0px' });
    $$('.bcard').forEach(function (c) { bio2.observe(c); });
  }

  /* ---------------- Product flow: drag, buttons, progress, liquid highlight ---------------- */
  var track = $('.flow__track');
  if (track) {
    var prog = $('.flow__prog span'), cards = $$('.pcard', track);
    var upd = function () { var m = track.scrollWidth - track.clientWidth; prog.style.transform = 'scaleX(' + (m > 0 ? Math.max(.08, track.scrollLeft / m) : 1) + ')'; };
    track.addEventListener('scroll', upd, { passive: true }); upd();
    var skew = MOTION ? G.quickTo(cards, 'skewX', { duration: .6, ease: 'sine.out' }) : null;
    var down = false, sx = 0, sl = 0, moved = 0, lastX = 0, vel = 0, inertia = 0;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = 0; sx = lastX = e.clientX; sl = track.scrollLeft; vel = 0; cancelAnimationFrame(inertia);
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
      if (moved > 5) track.classList.add('is-drag');
      vel = e.clientX - lastX; lastX = e.clientX;
      track.scrollLeft = sl - dx;
      if (skew) skew(clamp(-vel * .25, -6, 6));
    });
    window.addEventListener('pointerup', function () {
      if (!down) return; down = false;
      track.classList.remove('is-drag');
      if (skew) skew(0);
      if (RM) return;
      var v = -vel;
      (function glide() { if (Math.abs(v) < .4) return; track.scrollLeft += v; v *= .94; inertia = requestAnimationFrame(glide); })();
    });
    track.addEventListener('click', function (e) { if (moved > 5) { e.preventDefault(); e.stopPropagation(); } }, true);
    $$('[data-flow]').forEach(function (b) {
      b.addEventListener('click', function () {
        var w = cards[0].getBoundingClientRect().width + 24;
        track.scrollBy({ left: parseInt(b.dataset.flow, 10) * w * (window.innerWidth < 700 ? 1 : 2), behavior: RM ? 'auto' : 'smooth' });
      });
    });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') track.scrollBy({ left: 300, behavior: RM ? 'auto' : 'smooth' });
      if (e.key === 'ArrowLeft') track.scrollBy({ left: -300, behavior: RM ? 'auto' : 'smooth' });
    });
    if (FINE) cards.forEach(function (c) {
      c.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
    });
    $$('img', track).forEach(function (i) { i.draggable = false; });
  }

  /* ---------------- Bubbles ---------------- */
  $$('canvas.bubbles').forEach(function (cv) {
    var ctx = cv.getContext('2d'); if (!ctx) return;
    var bs = [], w = 0, h = 0, dpr = Math.min(2, window.devicePixelRatio || 1), run = false, raf = 0;
    var size = function () {
      w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = w < 700 ? 6 : 14; bs = [];
      for (var i = 0; i < n; i++) bs.push({ x: Math.random() * w, y: Math.random() * h, r: 2 + Math.random() * 6, v: .2 + Math.random() * .45, ph: Math.random() * 6.28, a: .12 + Math.random() * .22 });
    };
    var frame = function (t) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < bs.length; i++) {
        var b = bs[i];
        if (run) { b.y -= b.v; if (b.y < -20) { b.y = h + 20; b.x = Math.random() * w; } }
        var x = b.x + Math.sin(t / 1400 + b.ph) * 10;
        ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, 6.283);
        ctx.strokeStyle = 'rgba(160,240,255,' + b.a + ')'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.beginPath(); ctx.arc(x - b.r * .35, b.y - b.r * .35, b.r * .28, 0, 6.283);
        ctx.fillStyle = 'rgba(255,255,255,' + (b.a + .1) + ')'; ctx.fill();
      }
      if (run) raf = requestAnimationFrame(frame);
    };
    size(); frame(0);
    window.addEventListener('resize', function () { size(); if (!run) frame(0); });
    if (!RM && 'IntersectionObserver' in window) new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && !run) { run = true; raf = requestAnimationFrame(frame); }
      else if (!en[0].isIntersecting) { run = false; cancelAnimationFrame(raf); }
    }).observe(cv);
  });

  /* ---------------- Awards S-curve stream ---------------- */
  var stream = $('.stream');
  if (stream) {
    var svg = $('.stream__path', stream), pg = $('.stream__glow', stream), pl = $('.stream__line', stream), items = $$('.aw', stream), drawTween = null;
    var build = function () {
      var sr = stream.getBoundingClientRect();
      svg.setAttribute('width', sr.width); svg.setAttribute('height', sr.height);
      svg.setAttribute('viewBox', '0 0 ' + sr.width + ' ' + sr.height);
      var pts = items.map(function (li) { var r = $('.aw__node', li).getBoundingClientRect(); return [r.left - sr.left + r.width / 2, r.top - sr.top + r.height / 2]; });
      if (!pts.length) return;
      var dpath = 'M' + pts[0][0] + ' 0 L' + pts[0][0] + ' ' + pts[0][1];
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], my = (b[1] - a[1]) / 2;
        dpath += ' C' + a[0] + ' ' + (a[1] + my) + ' ' + b[0] + ' ' + (b[1] - my) + ' ' + b[0] + ' ' + b[1];
      }
      dpath += ' L' + pts[pts.length - 1][0] + ' ' + sr.height;
      pg.setAttribute('d', dpath); pl.setAttribute('d', dpath);
    };
    build();
    window.addEventListener('resize', build);
    window.addEventListener('load', build);
    if (MOTION && window.DrawSVGPlugin) {
      ST.addEventListener('refreshInit', build);
      G.fromTo([pg, pl], { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', scrollTrigger: { trigger: stream, start: 'top 70%', end: 'bottom 65%', scrub: 1 } });
      items.forEach(function (li) { ST.create({ trigger: li, start: 'top 68%', onEnter: function () { li.classList.add('is-on'); }, onLeaveBack: function () { li.classList.remove('is-on'); } }); });
      G.from(items, { opacity: 0, x: 40, duration: 1, ease: 'sine.out', stagger: .05, scrollTrigger: { trigger: stream, start: 'top 80%', once: true } });
    } else items.forEach(function (li) { li.classList.add('is-on'); });
  }

  /* ---------------- Management tabs ---------------- */
  var tabs = $$('.tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { var on = t === tab; t.classList.toggle('is-active', on); t.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      var g = tab.dataset.group;
      $$('.mgroup').forEach(function (m) {
        var show = g === 'all' || m.dataset.group === g;
        m.hidden = !show;
        if (show && MOTION) G.fromTo($$('.person', m), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .8, stagger: .06, ease: 'sine.out', overwrite: true });
      });
      if (ST) ST.refresh();
    });
  });

  /* ---------------- Bio dialog ---------------- */
  var bio = $('#bio'), lastFocus = null;
  if (bio && bio.showModal) {
    $$('.person [data-bio]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.person'), ph = $('.person__ph', card), dph = $('.dlg__ph', bio);
        $('#bio-name').textContent = $('.person__name', card).textContent;
        $('.dlg__role', bio).textContent = $('.person__role', card).textContent;
        $('.dlg__text', bio).textContent = $('.person__bio', card).textContent;
        $('.dlg__grp', bio).textContent = $('.mgroup__title span', card.closest('.mgroup')).textContent;
        dph.className = 'dlg__ph' + (ph.classList.contains('person__ph--mono') ? ' person__ph--mono' : '');
        dph.setAttribute('style', ph.getAttribute('style') || '');
        dph.innerHTML = '';
        var im = $('img', ph);
        if (im) { var c = d.createElement('img'); c.src = im.src; c.alt = ''; c.width = 1000; c.height = 1000; dph.appendChild(c); }
        else { var sp = d.createElement('span'); sp.textContent = $('span', ph).textContent; dph.appendChild(sp); }
        lastFocus = btn;
        bio.showModal();
        $('.x', bio).focus();
        if (lenis) lenis.stop();
      });
    });
  }
  $$('dialog').forEach(function (dl) {
    dl.addEventListener('click', function (e) { if (e.target === dl || e.target.closest('[data-close]')) dl.close(); });
    dl.addEventListener('close', function () { if (lenis) lenis.start(); if (lastFocus) { lastFocus.focus(); lastFocus = null; } });
  });

  /* ---------------- Press lightbox ---------------- */
  var box = $('#lightbox'), clips = $$('.clip');
  if (box && box.showModal && clips.length) {
    var li = 0, bimg = $('img', box), cnt = $('.lb__count', box);
    var set = function (n) {
      li = (n + clips.length) % clips.length;
      var src = $('img', clips[li]);
      bimg.src = src.currentSrc || src.src; bimg.alt = src.alt;
      cnt.textContent = (li + 1) + ' / ' + clips.length;
    };
    clips.forEach(function (c, i) { c.addEventListener('click', function () { set(i); lastFocus = c; box.showModal(); if (lenis) lenis.stop(); $('.x', box).focus(); }); });
    $('.lb__prev', box).addEventListener('click', function () { set(li - 1); });
    $('.lb__next', box).addEventListener('click', function () { set(li + 1); });
    box.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') set(li - 1); if (e.key === 'ArrowRight') set(li + 1); });
  }

  /* ---------------- Enquiry form → mailto ---------------- */
  var form = $('#enquiry');
  if (form) {
    var note = $('.form__note', form);
    var check = function (el) {
      var f = el.closest('.field'), err = $('.field__err', f), v = el.value.trim(), msg = '';
      if (el.required && !v) msg = 'Please fill in this field.';
      else if (el.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = 'Please enter a valid email address.';
      else if (el.type === 'tel' && v && !/^[+\d][\d\s-]{6,}$/.test(v)) msg = 'Please enter a valid mobile number.';
      f.classList.toggle('is-invalid', !!msg);
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) { err.textContent = msg; if (!err.id) err.id = el.id + '-err'; el.setAttribute('aria-describedby', err.id); }
      return !msg;
    };
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
        if (fd.get(el.name)) lines.push(label + ': ' + fd.get(el.name));
      });
      var subject = 'Website enquiry (' + fd.get('type') + ') - ' + fd.get('name');
      var url = 'mailto:' + form.dataset.to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      form.setAttribute('data-mailto', url);
      note.textContent = 'Your email app should now open with the message ready to send. If it does not, please write to ' + form.dataset.to + '.';
      window.location.href = url;
    });
  }

  /* ---------------- Investors: filter + scrollspy ---------------- */
  var q = $('#doc-filter');
  if (q) {
    var groups = $$('.igrp'), res = $('.search__res'), empty = $('.empty');
    q.addEventListener('input', function () {
      var term = q.value.trim().toLowerCase(), total = 0;
      groups.forEach(function (g) {
        var gc = 0;
        $$('.docs li, .offer a', g).forEach(function (li) { var hit = !term || li.textContent.toLowerCase().indexOf(term) > -1; li.classList.toggle('is-hidden', !hit); if (hit) gc++; });
        $$('.year', g).forEach(function (y) { y.classList.toggle('is-hidden', !$$('li:not(.is-hidden)', y).length); });
        $$('h3', g).forEach(function (h) { var ul = h.nextElementSibling; if (ul && ul.classList.contains('docs')) h.classList.toggle('is-hidden', !$$('li:not(.is-hidden)', ul).length); });
        g.classList.toggle('is-hidden', !gc);
        total += gc;
      });
      res.textContent = term ? total + (total === 1 ? ' document matches' : ' documents match') : '';
      empty.classList.toggle('is-on', !total);
      if (ST) ST.refresh();
    });
  }
  var spyLinks = $$('.inv__nav a, .nav__list a[href^="#"]');
  if (spyLinks.length && 'IntersectionObserver' in window) {
    var targets = spyLinks.map(function (a) { return d.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
    var spy = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (!x.isIntersecting) return;
        spyLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + x.target.id); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    targets.forEach(function (t) { spy.observe(t); });
  }
  if (MOTION && window.DrawSVGPlugin) {
    $$('.igrp__wave path').forEach(function (p) { G.fromTo(p, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.6, ease: 'sine.inOut', scrollTrigger: { trigger: p, start: 'top 90%', once: true } }); });
  }

  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  if (MOTION) window.addEventListener('load', function () { ST.refresh(); });
})();
