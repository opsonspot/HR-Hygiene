/* H R Hygiene Products Ltd. — "Made in Rajkot" behaviour + motion */
(function () {
  'use strict';
  var doc = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasG = !reduce && typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var lenis = null;

  /* ---------------- header ---------------- */
  var header = $('.header');
  var alwaysSolid = header && header.classList.contains('is-solid');
  function onScroll() {
    if (header && !alwaysSolid) header.classList.toggle('is-solid', window.scrollY > 30);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------------- mobile nav ---------------- */
  var burger = $('.burger'), nav = $('#nav');
  function setNav(open, refocus) {
    if (!nav || !burger) return;
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (lenis) { open ? lenis.stop() : lenis.start(); }
    if (open) { var first = $('a', nav); if (first) setTimeout(function () { first.focus(); }, 60); }
    else if (refocus) burger.focus();
  }
  if (burger) {
    burger.addEventListener('click', function () { setNav(!nav.classList.contains('is-open'), true); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false, false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) setNav(false, true);
      if (e.key === 'Tab' && nav.classList.contains('is-open')) {
        var f = [burger].concat($$('a', nav)); var i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  /* ---------------- active section spy ---------------- */
  var links = $$('.nav__links a[href^="#"], .inv__nav a[href^="#"]');
  var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  if (targets.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + en.target.id;
          a.classList.toggle('is-active', on);
          if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    targets.forEach(function (t) { spy.observe(t); });
    window.addEventListener('scroll', function () {
      if (targets[0].getBoundingClientRect().top > window.innerHeight * .5) links.forEach(function (a) { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
    }, { passive: true });
  }

  /* ---------------- print rows: fill with individual stamps ---------------- */
  var printrows = $$('.printrow');
  function fillRow(row) {
    var id = row.getAttribute('data-stamp') || 'st-a';
    var n = Math.ceil(Math.max(row.clientWidth, window.screen ? screen.width : 0) / 46) + 1;
    var html = '';
    for (var i = 0; i < n; i++) {
      html += '<span class="stp"><svg viewBox="0 0 40 40" class="bleed"><use href="#' + id + '"/></svg><svg viewBox="0 0 40 40" class="main"><use href="#' + id + '"/></svg></span>';
    }
    row.innerHTML = html;
    row.classList.add('is-filled');
  }
  printrows.forEach(fillRow);

  /* ---------------- stitched outlines ---------------- */
  var sid = 0;
  $$('.stitch').forEach(function (el) {
    sid++;
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'stitch__svg'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    svg.innerHTML = '<defs><mask id="sm' + sid + '" maskUnits="userSpaceOnUse" x="-20" y="-20" width="4000" height="4000"><rect class="stitch__m" pathLength="1"/></mask></defs><rect class="stitch__r" mask="url(#sm' + sid + ')"/>';
    el.insertBefore(svg, el.firstChild);
  });

  /* ---------------- count-up ---------------- */
  function fmt(v, dec) { return v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function countUp(el) {
    var end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
    var t0 = performance.now(), dur = 1600;
    (function tick(t) {
      var p = Math.min((t - t0) / dur, 1);
      el.textContent = fmt(end * (1 - Math.pow(1 - p, 4)), dec);
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------------- dialogs ---------------- */
  var bio = $('#bio');
  if (bio) {
    $$('.person [data-bio]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.person');
        $('#bio-name').textContent = $('.person__name', card).textContent;
        $('.dlg__role', bio).textContent = $('.person__role', card).textContent;
        $('.dlg__text', bio).textContent = $('.person__bio', card).textContent;
        var media = $('.dlg__media', bio); media.innerHTML = '';
        var img = $('.person__frame img', card), mono = $('.mono', card);
        if (img) { var c = img.cloneNode(); c.alt = ''; c.removeAttribute('loading'); media.appendChild(c); }
        else if (mono) media.appendChild(mono.cloneNode(true));
        bio._opener = btn;
        bio.showModal();
        if (lenis) lenis.stop();
        if (hasG) gsap.fromTo($('.dlg__card', bio), { y: 40, opacity: 0, rotation: -1 }, { y: 0, opacity: 1, rotation: 0, duration: .5, ease: 'power3.out' });
      });
    });
  }
  var box = $('#lightbox'), clips = $$('.clip'), cur = 0;
  function showClip(n) {
    cur = (n + clips.length) % clips.length;
    var img = $('img', clips[cur]), big = $('img', box);
    big.src = img.currentSrc || img.src; big.alt = img.alt;
    $('.lb__count', box).textContent = (cur + 1) + ' / ' + clips.length;
    if (hasG) gsap.fromTo(big, { opacity: 0, scale: .96 }, { opacity: 1, scale: 1, duration: .4, ease: 'power2.out' });
  }
  if (box) {
    clips.forEach(function (clip, i) {
      clip.addEventListener('click', function () { box._opener = clip; showClip(i); box.showModal(); if (lenis) lenis.stop(); });
    });
    $('.lb__prev', box).addEventListener('click', function () { showClip(cur - 1); });
    $('.lb__next', box).addEventListener('click', function () { showClip(cur + 1); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') showClip(cur - 1);
      if (e.key === 'ArrowRight') showClip(cur + 1);
    });
  }
  $$('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.closest('[data-close]')) d.close();
    });
    d.addEventListener('close', function () {
      if (lenis) lenis.start();
      if (d._opener) d._opener.focus();
    });
  });

  /* ---------------- enquiry form ---------------- */
  var form = $('#enquiry');
  if (form) {
    var msgs = { name: 'Please enter your name.', email: 'Please enter a valid email address.', phone: 'Please enter your WhatsApp mobile number.', message: 'Please write a short message.' };
    function check(el) {
      var field = el.closest('.field'); if (!field) return true;
      var v = el.value.trim(), ok = true;
      if (el.required && !v) ok = false;
      if (ok && el.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) ok = false;
      if (ok && el.type === 'tel' && v && v.replace(/\D/g, '').length < 8) ok = false;
      field.classList.toggle('is-invalid', !ok);
      el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      var err = $('.field__err', field);
      if (err) err.textContent = ok ? '' : (msgs[el.name] || 'Please fill in this field.');
      return ok;
    }
    $$('input[required], textarea[required]', form).forEach(function (el) {
      el.addEventListener('blur', function () { if (el.value) check(el); });
      el.addEventListener('input', function () { if (el.closest('.field').classList.contains('is-invalid')) check(el); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = $$('input[required], textarea[required]', form).filter(function (el) { return !check(el); });
      if (bad.length) { bad[0].focus(); return; }
      var f = new FormData(form), lines = [];
      $$('[name]', form).forEach(function (el) {
        var label = $('label[for="' + el.id + '"]', form).textContent.replace('*', '').trim();
        if (f.get(el.name)) lines.push(label + ': ' + f.get(el.name));
      });
      var subject = 'Website enquiry (' + f.get('type') + ') - ' + f.get('name');
      var href = 'mailto:' + form.dataset.to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      form.setAttribute('data-mailto', href);
      $('.form__note', form).textContent = 'Your email app should now open with the message ready to send. If it does not, please write to ' + form.dataset.to + '.';
      window.location.href = href;
    });
  }

  /* ---------------- investors: filter ---------------- */
  var filter = $('#docfilter');
  if (filter) {
    filter.closest('.docfilter').hidden = false;
    var items = $$('.inv__group li, .offer a');
    var empty = $('.docfilter__empty');
    filter.addEventListener('input', function () {
      var q = filter.value.trim().toLowerCase(), shown = 0;
      items.forEach(function (it) { var on = !q || it.textContent.toLowerCase().indexOf(q) > -1; it.hidden = !on; if (on) shown++; });
      $$('.inv__group').forEach(function (g) { g.classList.toggle('is-empty', !!q && !$$('li:not([hidden]), .offer a:not([hidden])', g).length); });
      $$('.inv__sub').forEach(function (s) { s.classList.toggle('is-empty', !!q && !$$('li:not([hidden])', s).length); });
      if (empty) empty.hidden = shown > 0;
      $('.docfilter__count').textContent = q ? shown + ' of ' + items.length + ' documents' : items.length + ' documents';
    });
  }

  var y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  /* ======================================================================
     MOTION (GSAP + ScrollTrigger + Lenis). Skipped entirely under reduced motion.
     ====================================================================== */
  if (!hasG) { doc.classList.remove('preload'); return; }
  gsap.registerPlugin(ScrollTrigger);
  doc.classList.add('gsap-ok');

  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href'); if (id.length < 2) return;
        var t = document.getElementById(id.slice(1)); if (!t) return;
        e.preventDefault();
        lenis.start();
        lenis.scrollTo(t, { offset: -80, duration: 1.2, force: true });
        history.replaceState(null, '', id);
      });
    });
    if (location.hash && document.getElementById(location.hash.slice(1))) {
      setTimeout(function () { lenis.scrollTo(document.getElementById(location.hash.slice(1)), { offset: -80, immediate: true }); }, 80);
    }
  }

  var once = function (el, start) { return { trigger: el, start: start || 'top 85%', once: true }; };
  var mm = gsap.matchMedia();

  /* ---- hero intro: stamped headline + blooming mandala ---- */
  var heroWords = $$('.hero__title .w');
  var tl = gsap.timeline({ delay: .15 });
  gsap.set(heroWords, { opacity: 0, scale: 1.7, y: -14, rotation: function () { return gsap.utils.random(-7, 7); } });
  gsap.set(['.locbadge', '.hero__sub', '.hero__cta'], { opacity: 0, y: 24 });
  gsap.set('.mandala .ring', { scale: 0, opacity: 0, transformOrigin: '50% 50%' });
  gsap.set('.mandala__disc', { scale: .7, opacity: 0, transformOrigin: '50% 50%' });
  gsap.set('.pack', { opacity: 0, y: 70 });
  gsap.set('.roundel', { opacity: 0, scale: .5, rotation: -40 });
  doc.classList.remove('preload');
  tl.to('.locbadge', { opacity: 1, y: 0, duration: .6, ease: 'power3.out' })
    .to(heroWords, { opacity: 1, scale: 1, y: 0, rotation: 0, duration: .42, ease: 'back.out(2.2)', stagger: .09 }, '-=.3')
    .to('.mandala__disc', { opacity: 1, scale: 1, duration: 1.4, ease: 'expo.out' }, .25)
    .to('.mandala .ring', { opacity: 1, scale: 1, duration: 1.3, ease: 'expo.out', stagger: .07 }, .35)
    .to('.pack', { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: .12 }, .9)
    .to('.roundel', { opacity: 1, scale: 1, rotation: 0, duration: .9, ease: 'back.out(1.6)' }, 1.3)
    .to(['.hero__sub', '.hero__cta'], { opacity: 1, y: 0, duration: .7, ease: 'power3.out', stagger: .1 }, 1.0);

  /* hero parallax on scroll + pointer */
  mm.add('(min-width: 960px)', function () {
    gsap.to('.mandala', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.pack--a', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.pack--b', { yPercent: -40, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.pack--c', { yPercent: -28, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  });
  if (fine) {
    var art = $('.hero__art');
    if (art) {
      var qs = $$('.pack').map(function (p, i) { return { x: gsap.quickTo(p.querySelector('img'), 'x', { duration: .9, ease: 'power3' }), y: gsap.quickTo(p.querySelector('img'), 'y', { duration: .9, ease: 'power3' }), d: [14, 30, 24, 36][i] }; });
      $('.hero').addEventListener('pointermove', function (e) {
        var nx = e.clientX / window.innerWidth - .5, ny = e.clientY / window.innerHeight - .5;
        qs.forEach(function (q) { q.x(nx * q.d); q.y(ny * q.d); });
      });
    }
    /* magnetic buttons */
    $$('.magnet').forEach(function (b) {
      var xT = gsap.quickTo(b, 'x', { duration: .5, ease: 'power3' }), yT = gsap.quickTo(b, 'y', { duration: .5, ease: 'power3' });
      b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); xT((e.clientX - r.left - r.width / 2) * .25); yT((e.clientY - r.top - r.height / 2) * .35); });
      b.addEventListener('pointerleave', function () { xT(0); yT(0); });
    });
  }

  /* ---- block-print rows: stamps land one by one with ink spread ---- */
  printrows.forEach(function (row) {
    var mains = $$('.stp .main', row), bleeds = $$('.stp .bleed', row);
    gsap.set(mains, { opacity: 0, scale: 1.5, rotation: function () { return gsap.utils.random(-12, 12); }, transformOrigin: '50% 50%' });
    gsap.set(bleeds, { opacity: 0, scale: .8, transformOrigin: '50% 50%' });
    var t = gsap.timeline({ delay: row.closest('.hero') ? 1.4 : 0, scrollTrigger: once(row, row.closest('.hero') ? 'top bottom' : 'top 92%') });
    t.to(mains, { opacity: 1, scale: 1, rotation: 0, duration: .32, ease: 'power4.in', stagger: .045 })
     .to(bleeds, { keyframes: [{ opacity: .45, scale: 1.0, duration: .12 }, { opacity: .2, scale: 1.12, duration: .5, ease: 'power2.out' }], stagger: .045 }, .28);
  });

  /* ---- section headings + generic reveals ---- */
  $$('.sechead, .about__copy, .infra__copy, .contact__info, .thread__head').forEach(function (el) {
    gsap.from(el.children, { opacity: 0, y: 34, duration: .9, ease: 'power3.out', stagger: .08, scrollTrigger: once(el) });
  });

  /* ---- stitches draw around cards ---- */
  $$('.stitch').forEach(function (el, i) {
    var m = $('.stitch__m', el);
    gsap.fromTo(m, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', delay: (i % 4) * .12, scrollTrigger: once(el, 'top 88%') });
  });
  gsap.from('.brand', { opacity: 0, y: 50, duration: .9, ease: 'power3.out', stagger: .1, scrollTrigger: once('.brands__grid') });
  $$('.shelf').forEach(function (s) { gsap.from($$('.product', s), { opacity: 0, y: 50, duration: .8, ease: 'power3.out', stagger: { each: .07 }, scrollTrigger: once(s) }); });
  gsap.from('.seg', { opacity: 0, y: 30, duration: .8, ease: 'power3.out', stagger: .1, scrollTrigger: once('.segs') });
  gsap.from('.seg__stamp', { opacity: 0, scale: 1.8, rotation: -25, duration: .45, ease: 'power4.in', stagger: .12, scrollTrigger: once('.segs') });
  gsap.from('.note', { opacity: 0, y: 40, duration: .9, ease: 'power3.out', scrollTrigger: once('.note') });

  /* ---- about photo + thread + reach grid ---- */
  gsap.from('.about__photo', { opacity: 0, y: 60, rotation: 5, duration: 1.2, ease: 'power3.out', scrollTrigger: once('.about__photo') });
  gsap.from('.about__photo figcaption', { opacity: 0, scale: 1.4, rotation: -12, duration: .45, ease: 'power4.in', scrollTrigger: once('.about__photo', 'top 60%') });
  var tlist = $('.thread__list');
  if (tlist) {
    gsap.fromTo(tlist, { '--thread': 0 }, { '--thread': 1, ease: 'none', scrollTrigger: { trigger: tlist, start: 'top 75%', end: 'bottom 55%', scrub: .6 } });
    $$('li', tlist).forEach(function (li) {
      gsap.from($('.knot', li), { scale: 0, duration: .6, ease: 'back.out(3)', scrollTrigger: once(li, 'top 75%') });
      gsap.from($$('small, b, span:not(.knot)', li), { opacity: 0, x: 24, duration: .7, ease: 'power3.out', stagger: .06, scrollTrigger: once(li, 'top 75%') });
    });
  }
  gsap.from('.rk', { scale: 0, opacity: 0, duration: .7, ease: 'back.out(2.5)', stagger: { each: .035, grid: [6, 6], from: 'center' }, scrollTrigger: once('.reach', 'top 80%') });

  /* ---- swatches + counters ---- */
  gsap.from('.swatch', { opacity: 0, y: 70, rotation: function (i) { return i % 2 ? 4 : -4; }, duration: 1, ease: 'power3.out', stagger: .08, scrollTrigger: once('.swatches') });
  $$('[data-count]').forEach(function (el) {
    var dec = (el.dataset.count.split('.')[1] || '').length; el.textContent = fmt(0, dec);
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () { countUp(el); } });
  });

  /* ---- why stamps ---- */
  $$('.why__item').forEach(function (it, i) {
    var t = gsap.timeline({ scrollTrigger: once(it, 'top 82%') });
    t.from($('.why__stamp svg', it), { opacity: 0, scale: 2, rotation: -30, duration: .4, ease: 'power4.in', delay: i * .15 })
     .from($('.why__stamp span', it), { opacity: 0, x: -10, duration: .4 }, '-=.05')
     .from([$('h3', it), $('p', it)], { opacity: 0, y: 24, duration: .7, ease: 'power3.out', stagger: .08 }, '-=.3');
  });

  /* ---- infrastructure ---- */
  gsap.from('.printframe--a', { opacity: 0, y: 60, rotation: -6, duration: 1.1, ease: 'power3.out', scrollTrigger: once('.infra__media') });
  gsap.from('.printframe--b', { opacity: 0, y: 80, rotation: 8, duration: 1.1, ease: 'power3.out', delay: .15, scrollTrigger: once('.infra__media') });
  gsap.from('.infra__badge', { opacity: 0, scale: 2, duration: .45, ease: 'power4.in', delay: .6, scrollTrigger: once('.infra__media') });
  gsap.from('.certs li', { opacity: 0, scale: 1.5, rotation: function () { return gsap.utils.random(-10, 10); }, duration: .35, ease: 'power4.in', stagger: .12, scrollTrigger: once('.certs') });
  gsap.from('.woven__bar', { scaleX: 0, duration: 1.6, ease: 'power3.inOut', stagger: .25, scrollTrigger: once('.woven', 'top 85%') });

  /* ---- management: indigo dye seeps in, portraits revealed ---- */
  gsap.fromTo('.seep--top', { scaleY: 2.4 }, { scaleY: .5, ease: 'none', scrollTrigger: { trigger: '.mgmt', start: 'top bottom', end: 'top 30%', scrub: true } });
  gsap.fromTo('.seep--bottom', { scaleY: .5 }, { scaleY: 2, ease: 'none', scrollTrigger: { trigger: '.mgmt', start: 'bottom 90%', end: 'bottom top', scrub: true } });
  gsap.from('.mgmt__dots', { opacity: 0, scale: 1.1, duration: 1.6, ease: 'power2.out', scrollTrigger: once('.mgmt', 'top 60%') });
  $$('.mgmt .person').forEach(function (p, i) {
    var t = gsap.timeline({ scrollTrigger: once(p, 'top 88%') });
    t.from(p, { opacity: 0, y: 60, duration: .9, ease: 'power3.out' });
    var img = $('.person__frame img', p);
    if (img) t.from(img, { scale: 1.25, duration: 1.4, ease: 'power3.out' }, 0);
    var mono = $('.mono span', p);
    if (mono) t.from(mono, { scale: 1.6, rotation: -14, opacity: 0, duration: .4, ease: 'power4.in' }, .2);
  });
  gsap.from('.group__title', { opacity: 0, x: -30, duration: .8, ease: 'power3.out', stagger: .1, scrollTrigger: once('.mgmt .group') });

  /* ---- awards: certificates + wax-seal stamps ---- */
  $$('.cert').forEach(function (c, i) {
    var seal = $('.seal', c);
    var t = gsap.timeline({ scrollTrigger: once(c, 'top 88%'), delay: (i % 4) * .12 });
    t.from(c, { opacity: 0, y: 50, rotation: (i % 2 ? 1.5 : -1.5), duration: .8, ease: 'power3.out' })
     .from(seal, { opacity: 0, scale: 2.4, rotation: -60, duration: .38, ease: 'power4.in', onComplete: function () { seal.classList.add('is-stamped'); } }, '-=.35')
     .to(c, { keyframes: [{ y: 3, duration: .06 }, { y: 0, duration: .25, ease: 'power2.out' }] });
  });

  /* ---- news clips ---- */
  gsap.from('.clip', { opacity: 0, y: 80, rotation: function (i) { return [-8, 6, -5, 9][i] || 0; }, duration: 1, ease: 'power3.out', stagger: .1, scrollTrigger: once('.clips') });

  /* ---- contact: indigo seeps into the band ---- */
  var veil = $('.dye__veil');
  if (veil) gsap.fromTo(veil, { y: 0 }, { y: function () { return -(veil.offsetHeight - 110); }, ease: 'none', immediateRender: true, scrollTrigger: { trigger: '.dye', start: 'top 95%', end: 'top 20%', scrub: .4, invalidateOnRefresh: true } });
  gsap.from('.dye__title', { opacity: 0, y: 50, duration: 1.1, ease: 'power3.out', scrollTrigger: once('.dye', 'top 55%') });
  gsap.from('.dye .btn', { opacity: 0, scale: .8, duration: .7, ease: 'back.out(2)', scrollTrigger: once('.dye', 'top 45%') });
  gsap.from('.info li', { opacity: 0, x: -20, duration: .6, ease: 'power3.out', stagger: .07, scrollTrigger: once('.info') });
  gsap.from('.form', { opacity: 0, y: 60, duration: 1, ease: 'power3.out', scrollTrigger: once('.form') });
  gsap.from('.map', { opacity: 0, y: 60, duration: 1, ease: 'power3.out', scrollTrigger: once('.map') });

  /* ---- investors page ---- */
  if ($('.invhero')) {
    gsap.from('.invhero .crumbs, .invhero h1, .invhero p:not(.crumbs), .invhero__stats li', { opacity: 0, y: 30, duration: .8, ease: 'power3.out', stagger: .07, delay: .1 });
    gsap.from('.invhero .ring', { scale: 0, opacity: 0, transformOrigin: '50% 50%', duration: 1.2, ease: 'expo.out', stagger: .08, delay: .2 });
    $$('.inv__group').forEach(function (g) {
      gsap.from(g, { opacity: 0, y: 40, duration: .7, ease: 'power3.out', scrollTrigger: once(g, 'top 92%') });
    });
  }

  /* footer stamps */
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
