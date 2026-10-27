/* H R Hygiene — "Cloud" design behaviour */
(function () {
  'use strict';
  window.__cloud = true;
  var doc = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G = window.gsap, ST = window.ScrollTrigger;
  var hasG = !!(G && ST);
  var lenis = null;

  /* ---------- year ---------- */
  $$('.year').forEach(function (y) { y.textContent = new Date().getFullYear(); });

  /* ---------- header state ---------- */
  var hdr = $('#hdr');
  function onScroll() { if (hdr) hdr.classList.toggle('is-scrolled', window.scrollY > 30); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- smooth scroll (Lenis) ---------- */
  if (!reduce && window.Lenis) {
    try {
      lenis = new window.Lenis({ duration: 1.25, easing: function (t) { return 1 - Math.pow(1 - t, 4); }, smoothWheel: true });
      if (hasG) {
        lenis.on('scroll', ST.update);
        G.ticker.add(function (t) { lenis.raf(t * 1000); });
        G.ticker.lagSmoothing(0);
      } else {
        var lr = function (t) { lenis.raf(t); requestAnimationFrame(lr); };
        requestAnimationFrame(lr);
      }
    } catch (e) { lenis = null; }
  }
  function scrollToEl(el) {
    if (lenis) lenis.scrollTo(el, { offset: -90, duration: 1.6 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var t = document.getElementById(id.slice(1));
    if (!t) return;
    e.preventDefault();
    var go = function () {
      scrollToEl(t);
      if (history.replaceState) history.replaceState(null, '', id);
      if (!/^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(t.tagName)) { t.setAttribute('tabindex', '-1'); }
      setTimeout(function () { try { t.focus({ preventScroll: true }); } catch (err) { /* noop */ } }, lenis ? 900 : 300);
    };
    if (menuOpen) { closeMenu(false); setTimeout(go, 60); } else go();
  });

  /* ---------- mobile menu ---------- */
  var burger = $('.burger'), menu = $('#menu'), menuOpen = false;
  function openMenu() {
    if (!menu) return;
    menuOpen = true;
    menu.hidden = false;
    requestAnimationFrame(function () { menu.classList.add('is-open'); });
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Close menu');
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
    setTimeout(function () { var f = $('a', menu); if (f) f.focus(); }, 80);
  }
  function closeMenu(returnFocus) {
    if (!menu || !menuOpen) return;
    menuOpen = false;
    menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
    if (lenis) lenis.start();
    setTimeout(function () { if (!menuOpen) menu.hidden = true; }, 450);
    if (returnFocus) burger.focus();
  }
  if (burger) burger.addEventListener('click', function () { menuOpen ? closeMenu(true) : openMenu(); });
  if (menu) menu.addEventListener('click', function (e) { if (e.target.closest('a') && !e.target.closest('a[href^="#"]')) closeMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuOpen) closeMenu(true);
    if (e.key === 'Tab' && menuOpen) {
      var items = [burger].concat($$('a', menu));
      var i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 1140 && menuOpen) closeMenu(false); });

  /* ---------- reveal ---------- */
  var rvs = $$('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    rvs.forEach(function (el) { io.observe(el); });
  } else rvs.forEach(function (el) { el.classList.add('is-in'); });

  /* ---------- active nav ---------- */
  var navLinks = $$('.hdr__nav a[href^="#"], .inv-nav a[href^="#"]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) { var t = document.getElementById(a.getAttribute('href').slice(1)); if (t) spy.observe(t); });
  }

  /* ---------- hero clouds ---------- */
  var hero = $('.hero');
  var skyHost = hero || $('.ihero');
  if (skyHost && window.CloudField) {
    var sky = window.CloudField($('.hero__sky'), { mode: 'sky' });
    var bank = window.CloudField($('.hero__bank'), { mode: 'bank' });
    if (reduce) { sky.still(); bank.still(); }
    else {
      var vis = true;
      var run = function () { if (vis && !document.hidden) { sky.start(); bank.start(); } else { sky.stop(); bank.stop(); } };
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; run(); }).observe(skyHost);
      document.addEventListener('visibilitychange', run);
      run();
      skyHost.addEventListener('pointermove', function (e) {
        var r1 = $('.hero__sky').getBoundingClientRect(), r2 = $('.hero__bank').getBoundingClientRect();
        sky.pointer(e.clientX - r1.left, e.clientY - r1.top); sky.parallax(e.clientX - r1.left, e.clientY - r1.top);
        bank.pointer(e.clientX - r2.left, e.clientY - r2.top); bank.parallax(e.clientX - r2.left, e.clientY - r2.top);
      });
      skyHost.addEventListener('pointerleave', function () { sky.leave(); bank.leave(); });
      window.addEventListener('scroll', function () { var y = window.scrollY; if (y < window.innerHeight * 1.2) { sky.scroll(y); bank.scroll(y); } }, { passive: true });
    }
  }

  /* ---------- investors: document finder ---------- */
  var find = $('#find');
  if (find) {
    var vaults = $$('.vault'), empty = $('.inv__empty'), status = $('#find-status');
    var norm = function (s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); };
    var filter = function () {
      var q = norm(find.value), shown = 0, stem = q.length > 3 ? q.replace(/(ies|y|s)$/, '') : q;
      vaults.forEach(function (v) {
        var head = norm($('h2', v).textContent), vis = 0;
        $$('.docs li, .offer__card', v).forEach(function (li) {
          var sub = li.closest('ul') && li.closest('ul').previousElementSibling;
          var ctx = head + ' ' + (sub && sub.tagName === 'H3' ? norm(sub.textContent) : '');
          var hay = norm(li.textContent) + ' ' + ctx, ok = !q || hay.indexOf(q) > -1 || hay.indexOf(stem) > -1;
          li.hidden = !ok; if (ok) vis++;
        });
        $$('.vault__sub', v).forEach(function (h) { var ul = h.nextElementSibling; h.hidden = !!ul && !$$('li', ul).some(function (l) { return !l.hidden; }); });
        $$('.docs', v).forEach(function (ul) { ul.hidden = !$$('li', ul).some(function (l) { return !l.hidden; }); });
        v.hidden = !vis; shown += vis;
        var nl = $('.inv-nav a[href="#' + v.id + '"]');
        if (nl) { nl.classList.toggle('is-dim', !vis); $('b', nl).textContent = vis; }
      });
      empty.hidden = shown > 0;
      status.textContent = q ? shown + (shown === 1 ? ' document matches' : ' documents match') : '';
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    };
    find.addEventListener('input', filter);
  }

  /* ---------- counters ---------- */
  function fmt(v, dec) { return v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  var counters = $$('[data-count]');
  if (!reduce && 'IntersectionObserver' in window) {
    counters.forEach(function (el) {
      var end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
      new IntersectionObserver(function (es, o) {
        if (!es[0].isIntersecting) return;
        o.disconnect();
        var t0 = performance.now();
        el.textContent = fmt(0, dec);
        (function tick(t) {
          var p = Math.min((t - t0) / 1900, 1);
          el.textContent = fmt(end * (1 - Math.pow(1 - p, 4)), dec);
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      }, { rootMargin: '0px 0px -10% 0px' }).observe(el);
    });
  }

  /* ---------- management profile sheet ---------- */
  var sheet = $('#bio');
  if (sheet && sheet.showModal) {
    $$('.person .bio summary').forEach(function (sum) {
      sum.setAttribute('role', 'button');
      sum.setAttribute('aria-haspopup', 'dialog');
      sum.addEventListener('click', function (e) {
        e.preventDefault();
        var card = sum.closest('.person');
        var grp = card.closest('.group');
        $('.sheet__group', sheet).textContent = grp ? $('.group__title span', grp).textContent : '';
        $('#bio-name', sheet).textContent = $('.person__name', card).textContent;
        $('.sheet__role', sheet).textContent = $('.person__role', card).textContent;
        $('.sheet__bio', sheet).textContent = $('.bio p', card).textContent;
        var pic = $('.sheet__pic', sheet);
        pic.innerHTML = '';
        var clone = $('.person__pic', card).cloneNode(true);
        $$('img', clone).forEach(function (i) { i.alt = ''; i.removeAttribute('loading'); });
        pic.appendChild(clone);
        sheet._from = sum;
        sheet.showModal();
        if (lenis) lenis.stop();
      });
    });
  }
  /* ---------- press lightbox ---------- */
  var box = $('#lightbox');
  if (box && box.showModal) {
    $$('.clip').forEach(function (clip) {
      clip.addEventListener('click', function () {
        var img = $('img', clip), big = $('img', box);
        big.src = img.currentSrc || img.src; big.alt = img.alt;
        box._from = clip;
        box.showModal();
        if (lenis) lenis.stop();
      });
    });
  }
  $$('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
    d.addEventListener('close', function () { if (lenis) lenis.start(); if (d._from) d._from.focus(); });
  });

  /* ---------- enquiry form → mailto ---------- */
  var form = $('#enquiry');
  if (form) {
    var check = function (el) {
      var f = el.closest('.field'), err = f && $('.field__err', f), msg = '';
      if (el.required && !el.value.trim()) msg = 'This field is required.';
      else if (el.type === 'email' && el.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) msg = 'Please enter a valid email address.';
      else if (el.type === 'tel' && el.value && el.value.replace(/\D/g, '').length < 10) msg = 'Please enter a valid mobile number.';
      if (f) f.classList.toggle('is-bad', !!msg);
      if (err) err.textContent = msg;
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      return !msg;
    };
    $$('input[required], textarea[required]', form).forEach(function (el) {
      el.addEventListener('blur', function () { if (el.value) check(el); });
      el.addEventListener('input', function () { if (el.closest('.field').classList.contains('is-bad')) check(el); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = $$('input[required], textarea[required]', form).filter(function (el) { return !check(el); });
      if (bad.length) { bad[0].focus(); return; }
      var fd = new FormData(form), lines = [];
      $$('[name]', form).forEach(function (el) {
        var label = $('label[for="' + el.id + '"]', form).textContent.replace('*', '').trim();
        if (fd.get(el.name)) lines.push(label + ': ' + fd.get(el.name));
      });
      var subject = 'Website enquiry (' + fd.get('type') + ') - ' + fd.get('name');
      var href = 'mailto:' + form.dataset.to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      window.__lastMailto = href;
      var note = $('.form__note', form);
      note.textContent = 'Your email app should now open with the message ready to send. If it does not, please write to ' + form.dataset.to + '.';
      note.classList.add('is-sent');
      window.location.href = href;
    });
  }

  /* ======================================================
     GSAP motion layer (skipped under reduced motion / no GSAP)
     ====================================================== */
  if (!hasG || reduce) return;
  var plugins = [ST];
  ['SplitText', 'DrawSVGPlugin', 'MotionPathPlugin', 'CustomEase'].forEach(function (n) { if (window[n]) plugins.push(window[n]); });
  G.registerPlugin.apply(G, plugins);
  var CE = window.CustomEase;
  var SOFT = CE ? CE.create('soft', 'M0,0 C0.2,0.7 0.32,1 1,1') : 'power3.out';
  var FEATHER = CE ? CE.create('feather', 'M0,0 C0.12,0.5 0.26,0.9 0.42,1.015 0.56,1.04 0.74,0.995 1,1') : 'power2.out';
  var R = G.utils.random;

  /* hero: feather-settle headline */
  var words = $$('.hero__title .w');
  if (words.length) {
    words.forEach(function (w, i) {
      var s = R(-46, 46), d = 0.25 + i * 0.16;
      G.fromTo(w, { y: R(-150, -100), rotation: R(-18, 18), opacity: 0 }, { y: 0, rotation: 0, opacity: 1, duration: 2.6, ease: FEATHER, delay: d });
      G.fromTo(w, { x: s }, { keyframes: { x: [s, -s * 0.55, s * 0.2, 0] }, duration: 2.6, ease: 'sine.inOut', delay: d });
    });
    G.from(['.hero__kicker', '.hero__sub', '.hero__cta'], { y: 26, opacity: 0, duration: 1.6, ease: SOFT, stagger: 0.14, delay: 1.1 });
    G.from('.hero__tag, .hero__scroll', { opacity: 0, duration: 1.4, delay: 2 });
  }
  /* hero: products rise onto the clouds, then bob */
  var floats = $$('.float');
  floats.forEach(function (f, i) {
    var img = $('img', f);
    G.from(f, { y: 160, opacity: 0, duration: 2.2, ease: SOFT, delay: 0.7 + i * 0.15 });
    G.to(img, { y: i % 2 ? -14 : 12, rotation: i % 2 ? 1.6 : -1.4, duration: 3.4 + i * 0.5, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.4 });
  });
  if (hero && floats.length && window.matchMedia('(pointer: fine)').matches) {
    var qs = floats.map(function (f, i) { return { x: G.quickTo(f, 'x', { duration: 1.6, ease: 'power3.out' }), d: [18, 30, 22, 12][i] || 16 }; });
    hero.addEventListener('pointermove', function (e) {
      var nx = e.clientX / window.innerWidth - 0.5;
      qs.forEach(function (q) { q.x(-nx * q.d); });
    });
  }
  if (hero) {
    G.to('.hero__inner', { yPercent: -16, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    G.to('.hero__stage', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  }

  if ($('.promise__art')) {
    G.to('.promise__art svg', { y: -10, duration: 3.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    G.to('.promise__art img', { y: -22, rotation: -4, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }

  /* pillows: squishy spring */
  $$('.pillow').forEach(function (p) {
    var enter = function () {
      G.timeline({ overwrite: true })
        .to(p, { scaleX: 1.05, scaleY: 0.94, duration: 0.18, ease: 'power2.out' })
        .to(p, { scaleX: 1, scaleY: 1, y: -10, duration: 1.3, ease: 'elastic.out(1, 0.32)' });
    };
    p.addEventListener('pointerenter', enter);
    p.addEventListener('pointermove', function (e) {
      var r = p.getBoundingClientRect(), rx = (e.clientX - r.left) / r.width - 0.5;
      G.to(p, { skewX: rx * -3.2, rotation: rx * 1.4, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
    });
    p.addEventListener('pointerleave', function () {
      G.to(p, { y: 0, skewX: 0, rotation: 0, scaleX: 1, scaleY: 1, duration: 1.5, ease: 'elastic.out(1, 0.3)', overwrite: true });
    });
  });

  /* bubbles: inflate, then breathe */
  var bubbles = $$('.bubble');
  if (bubbles.length) {
    G.set(bubbles, { scale: 0.35, opacity: 0 });
    ST.create({
      trigger: '.bubbles', start: 'top 82%', once: true,
      onEnter: function () {
        bubbles.forEach(function (b, i) {
          G.to(b, { scale: 1, opacity: 1, duration: 2, ease: 'elastic.out(1, 0.45)', delay: i * 0.12, onComplete: function () {
            G.to(b, { scale: 1.03, y: i % 2 ? 8 : -8, duration: 3.2 + i * 0.35, ease: 'sine.inOut', yoyo: true, repeat: -1 });
          } });
        });
      }
    });
  }

  /* soft frames: gentle parallax */
  $$('[data-par]').forEach(function (fr) {
    var v = parseFloat(fr.dataset.par), img = $('img', fr);
    G.fromTo(img, { yPercent: -v / 2 }, { yPercent: v / 2, ease: 'none', scrollTrigger: { trigger: fr, start: 'top bottom', end: 'bottom top', scrub: true } });
    G.fromTo(fr, { y: v * 3 }, { y: -v * 3, ease: 'none', scrollTrigger: { trigger: fr, start: 'top bottom', end: 'bottom top', scrub: 1.2 } });
  });

  /* production columns rise */
  var bars = $$('.col__bar');
  if (bars.length) {
    G.set(bars, { scaleY: 0.04 });
    ST.create({ trigger: '.growth', start: 'top 75%', once: true, onEnter: function () {
      G.to(bars, { scaleY: 1, duration: 2.4, ease: 'elastic.out(1, 0.55)', stagger: 0.35 });
      G.from('.col__val', { y: 30, opacity: 0, duration: 1.4, ease: SOFT, stagger: 0.35, delay: 0.4 });
    } });
  }

  /* awards thread draws itself */
  if (window.DrawSVGPlugin && $('.awards__thread path')) {
    G.fromTo('.awards__thread path', { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', scrollTrigger: { trigger: '.awards__list', start: 'top 70%', end: 'bottom 70%', scrub: 1 } });
  }

  /* feathers drift along motion paths */
  if (window.MotionPathPlugin) {
    $$('.feather').forEach(function (f, i) {
      var pts = (f.getAttribute('data-path') || '0,0').split(' ').map(function (p) { var a = p.split(','); return { x: +a[0], y: +a[1] }; });
      if (window.innerWidth < 700) pts = pts.map(function (p) { return { x: p.x * 0.4, y: p.y * 0.6 }; });
      G.to(f, {
        motionPath: { path: pts, curviness: 1.4 }, rotation: i % 2 ? 70 : -60, ease: 'none',
        scrollTrigger: { trigger: f.parentElement, start: 'top bottom', end: 'bottom top', scrub: 2.2 }
      });
    });
  }

  /* ======================================================
     ANATOMY OF COMFORT — exploded view
     ====================================================== */
  var anat = $('.anat'), svg = $('.pad');
  if (anat && svg) {
    var lyrs = $$('.lyr', svg);
    var byI = []; lyrs.forEach(function (l) { byI[+l.dataset.i] = l; });
    var stackY = function (l) { return -(+l.dataset.i - 2) * 95; };
    var steps = $$('.anat__list li');
    var setStep = function (n) { steps.forEach(function (s, k) { s.classList.toggle('is-on', k === n); }); };
    var mm = G.matchMedia();

    mm.add('(min-width: 1024px)', function () {
      lyrs.forEach(function (l) { G.set(l, { y: stackY(l) }); });
      G.set($$('.lbl', svg), { opacity: 0 });
      if (window.DrawSVGPlugin) G.set($$('.ld', svg), { drawSVG: '0%' });
      G.set('.drop', { y: -60, opacity: 0, scale: 1, transformOrigin: '50% 80%' });
      G.set('.glow', { scale: 0, transformOrigin: '50% 50%' });
      G.set('.ripple', { scale: 0.2, opacity: 0, transformOrigin: '50% 50%' });
      G.set('.pad__shadow', { scale: 0.7, transformOrigin: '50% 50%' });

      var tl = G.timeline({ defaults: { ease: 'none' } });
      tl.to(lyrs, { y: 0, duration: 3, ease: SOFT, stagger: { each: 0.15, from: 'end' } }, 0)
        .to('.pad__shadow', { scale: 1, duration: 3, ease: SOFT }, 0);
      var marks = [];
      for (var i = 0; i < 5; i++) {
        var at = 1.4 + i * 0.55;
        marks.push(at);
        var lb = $('.lbl', byI[i]);
        tl.to(lb, { opacity: 1, duration: 0.5 }, at);
        if (window.DrawSVGPlugin) tl.to($('.ld', byI[i]), { drawSVG: '100%', duration: 0.6 }, at);
      }
      tl.to('.drop', { opacity: 1, duration: 0.3 }, 4.4)
        .to('.drop', { y: 200, duration: 1.3, ease: 'power2.in' }, 4.4)
        .to('.drop', { scale: 0, duration: 0.6, ease: 'power2.out' }, 5.7)
        .to('.ripple', { scale: 2.6, opacity: 0.9, duration: 0.2, stagger: 0.3 }, 5.7)
        .to('.ripple', { opacity: 0, duration: 0.9, stagger: 0.3 }, 5.95)
        .to('.glow', { scale: 1, duration: 1.4, ease: SOFT }, 5.9)
        .to({}, { duration: 1.2 });
      var endHold = tl.duration();
      tl.to($$('.lbl', svg), { opacity: 0, duration: 0.6, stagger: 0.08 }, endHold)
        .to(lyrs, { y: function (k, l) { return stackY(l); }, duration: 2.4, ease: 'power2.inOut', stagger: { each: 0.1, from: 'start' } }, endHold + 0.3)
        .to('.glow', { scale: 0.55, duration: 2 }, endHold + 0.3)
        .to('.pad__shadow', { scale: 0.7, duration: 2.4 }, endHold + 0.3);
      var total = tl.duration();

      var stt = ST.create({
        trigger: anat, start: 'top top', end: '+=230%', pin: true, scrub: 1.1, animation: tl,
        onUpdate: function (self) {
          var t = self.progress * total, n = -1;
          if (t < endHold) for (var k = 0; k < marks.length; k++) if (t >= marks[k]) n = k;
          setStep(n);
        }
      });
      return function () { stt.kill(); tl.kill(); setStep(-1); G.set(lyrs.concat($$('.lbl', svg)), { clearProps: 'all' }); };
    });

    mm.add('(max-width: 1023px)', function () {
      svg.setAttribute('viewBox', window.innerWidth < 641 ? '120 110 620 640' : '0 0 1000 760');
      G.set('.drop', { y: -60, opacity: 0, transformOrigin: '50% 80%' });
      G.set('.glow', { scale: 0, transformOrigin: '50% 50%' });
      G.set('.ripple', { scale: 0.2, opacity: 0, transformOrigin: '50% 50%' });
      var tl = G.timeline({ paused: true, delay: 0.3 });
      lyrs.forEach(function (l) { G.set(l, { y: stackY(l) * 0.6 }); });
      tl.to(lyrs, { y: 0, duration: 1.8, ease: SOFT, stagger: { each: 0.1, from: 'end' } })
        .to('.drop', { opacity: 1, duration: 0.2 }, 1.2)
        .to('.drop', { y: 200, duration: 1, ease: 'power2.in' }, 1.2)
        .to('.drop', { scale: 0, duration: 0.5 }, 2.2)
        .to('.ripple', { scale: 2.6, opacity: 0.9, duration: 0.2, stagger: 0.25 }, 2.2)
        .to('.ripple', { opacity: 0, duration: 0.8, stagger: 0.25 }, 2.4)
        .to('.glow', { scale: 1, duration: 1.2, ease: SOFT }, 2.4);
      var stt = ST.create({ trigger: svg, start: 'top 75%', once: true, onEnter: function () { tl.play(); } });
      return function () { stt.kill(); tl.kill(); svg.setAttribute('viewBox', '0 0 1000 760'); };
    });
  }

  window.addEventListener('load', function () { ST.refresh(); });
})();
