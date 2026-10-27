/* H R Hygiene Products Ltd. — "Bloom" interactions
   Progressive enhancement: everything works without GSAP/Lenis; motion only when available
   and when the visitor has not asked for reduced motion. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var mq = function (q) { return window.matchMedia(q).matches; };
  var reduced = mq('(prefers-reduced-motion: reduce)');
  var fine = mq('(hover: hover) and (pointer: fine)');
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var anim = hasGsap && !reduced;
  var introDone = false;
  function endIntro() { if (!introDone) { introDone = true; root.classList.remove('intro'); } }
  if (!anim) endIntro();
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  if (anim && window.SplitText) gsap.registerPlugin(SplitText);

  /* ---------- year ---------- */
  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- smooth scroll (Lenis) ---------- */
  var lenis = null;
  if (anim && window.Lenis) {
    try {
      lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } catch (e) { lenis = null; }
  }

  /* ---------- header ---------- */
  var header = $('.header'), lastY = window.scrollY, menuOpen = false;
  function onScroll() {
    var sy = window.scrollY;
    header.classList.toggle('is-solid', sy > 30);
    if (!menuOpen && !d.body.classList.contains('page-inv')) header.classList.toggle('is-hidden', sy > 600 && sy > lastY + 2);
    if (sy < lastY - 2) header.classList.remove('is-hidden');
    lastY = sy;
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- mobile menu ---------- */
  var burger = $('.burger'), nav = $('#nav');
  function setMenu(open, restoreFocus) {
    menuOpen = open;
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    root.style.overflow = open ? 'hidden' : '';
    if (lenis) { open ? lenis.stop() : lenis.start(); }
    if (open) { header.classList.remove('is-hidden'); setTimeout(function () { var a = $('a', nav); if (a) a.focus(); }, 60); }
    else if (restoreFocus) burger.focus();
  }
  if (burger && nav) {
    burger.addEventListener('click', function () { setMenu(!menuOpen, false); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a') && menuOpen) setMenu(false, false); });
    d.addEventListener('keydown', function (e) {
      if (!menuOpen) return;
      if (e.key === 'Escape') { setMenu(false, true); return; }
      if (e.key === 'Tab') {
        var f = [burger].concat($$('a', nav));
        var i = f.indexOf(d.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    window.addEventListener('resize', function () { if (menuOpen && window.innerWidth > 1080) setMenu(false, false); });
  }

  /* ---------- in-page anchors ---------- */
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href*="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    var url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    var t = d.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!t) return;
    e.preventDefault();
    if (menuOpen) setMenu(false, false);
    var off = -(header.offsetHeight + 10);
    if (lenis) lenis.scrollTo(t, { offset: off, duration: 1.5, easing: function (x) { return x === 1 ? 1 : 1 - Math.pow(2, -10 * x); } });
    else window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY + off, behavior: reduced ? 'auto' : 'smooth' });
    if (history.pushState) history.pushState(null, '', url.hash);
    if (!t.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA|FORM)$/.test(t.tagName)) t.setAttribute('tabindex', '-1');
    try { t.focus({ preventScroll: true }); } catch (err) { /* noop */ }
  });

  /* ---------- active nav link ---------- */
  var navLinks = $$('.nav__list a[href^="#"]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (l) { var t = $(l.getAttribute('href')); if (t) spy.observe(t); });
  }

  /* ---------- management: full profile in a dialog (details fallback without JS) ---------- */
  var bio = $('#bio');
  if (bio && typeof bio.showModal === 'function') {
    $$('.person__more summary').forEach(function (sum) {
      sum.setAttribute('aria-haspopup', 'dialog');
      sum.addEventListener('click', function (e) {
        e.preventDefault();
        var card = sum.closest('.person');
        var media = $('.dlg__media', bio);
        media.innerHTML = '';
        var src = $('.person__media', card).cloneNode(true);
        var img = $('img', src);
        if (img) { img.removeAttribute('loading'); media.appendChild(img); }
        else { media.appendChild(src); }
        var g = card.closest('.group');
        $('.dlg__group', bio).textContent = g ? $('.group__title', g).firstChild.textContent.trim() : '';
        $('#bio-name').textContent = $('.person__name', card).textContent;
        $('.dlg__role', bio).textContent = $('.person__role', card).textContent;
        $('.dlg__text', bio).textContent = $('.person__bio', card).textContent;
        bio.showModal();
        bio.scrollTop = 0;
        if (lenis) lenis.stop();
      });
    });
  }

  /* ---------- press lightbox ---------- */
  var box = $('#lightbox'), clips = $$('.clip'), cur = 0;
  function showClip(i) {
    cur = (i + clips.length) % clips.length;
    var src = $('img', clips[cur]), im = $('img', box);
    im.src = src.currentSrc || src.src; im.alt = src.alt;
    im.width = src.naturalWidth || src.width; im.height = src.naturalHeight || src.height;
    im.style.animation = 'none'; void im.offsetWidth; im.style.animation = '';
  }
  if (box && clips.length && typeof box.showModal === 'function') {
    clips.forEach(function (c, i) {
      c.addEventListener('click', function () { showClip(i); box.showModal(); if (lenis) lenis.stop(); });
    });
    $('.lb__prev', box).addEventListener('click', function () { showClip(cur - 1); });
    $('.lb__next', box).addEventListener('click', function () { showClip(cur + 1); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') showClip(cur - 1);
      if (e.key === 'ArrowRight') showClip(cur + 1);
    });
  }
  $$('dialog').forEach(function (dl) {
    dl.addEventListener('click', function (e) { if (e.target === dl || e.target.closest('[data-close]')) dl.close(); });
    dl.addEventListener('close', function () { if (lenis && !menuOpen) lenis.start(); });
  });

  /* ---------- enquiry form → mailto ---------- */
  var form = $('#enquiry');
  if (form) {
    var labelOf = function (el) { var l = $('label[for="' + el.id + '"]', form); return l ? l.textContent.replace('*', '').trim() : el.name; };
    var setErr = function (el, msg) {
      var field = el.closest('.field'), err = $('.field__err', field);
      field.classList.toggle('is-invalid', !!msg);
      if (msg) {
        if (!err) { err = d.createElement('span'); err.className = 'field__err'; err.id = el.id + '-err'; field.appendChild(err); }
        err.textContent = msg;
        el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', err.id);
      } else {
        if (err) err.remove();
        el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby');
      }
    };
    var check = function (el) {
      var v = (el.value || '').trim();
      if (el.required && !v) { setErr(el, 'Please fill in ' + labelOf(el).toLowerCase() + '.'); return false; }
      if (el.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { setErr(el, 'Please enter a valid email address.'); return false; }
      if (el.type === 'tel' && v && v.replace(/\D/g, '').length < 10) { setErr(el, 'Please enter a valid mobile number.'); return false; }
      setErr(el, ''); return true;
    };
    $$('input, select, textarea', form).forEach(function (el) {
      el.addEventListener('blur', function () { if (el.closest('.field').classList.contains('is-invalid')) check(el); });
      el.addEventListener('input', function () { if (el.closest('.field').classList.contains('is-invalid')) check(el); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = $$('[name]', form).filter(function (el) { return !check(el); });
      var note = $('.form__note', form);
      if (bad.length) { bad[0].focus(); note.textContent = 'Please complete the highlighted fields.'; return; }
      var f = new FormData(form), lines = [];
      $$('[name]', form).forEach(function (el) { if (f.get(el.name)) lines.push(labelOf(el) + ': ' + f.get(el.name)); });
      var subject = 'Website enquiry (' + f.get('type') + ') - ' + f.get('name');
      var href = 'mailto:' + form.dataset.to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      form.setAttribute('data-mailto', href);
      window.location.href = href;
      note.textContent = 'Your email app should now open with the message ready to send. If it does not, please write to ' + form.dataset.to + '.';
    });
  }

  /* ---------- investors: filter + section spy ---------- */
  var find = $('#docfind');
  if (find) {
    var groups = $$('.inv__group'), empty = $('.inv__empty'), msg = $('.inv__findmsg');
    find.addEventListener('input', function () {
      var q = find.value.trim().toLowerCase(), shown = 0;
      groups.forEach(function (g) {
        var items = $$('.docs li, .offer__card', g), vis = 0;
        items.forEach(function (it) {
          var ok = !q || it.textContent.toLowerCase().indexOf(q) > -1 || $('h2', g).textContent.toLowerCase().indexOf(q) > -1;
          it.classList.toggle('is-filtered-out', !ok); if (ok) vis++;
        });
        $$('.inv__sub', g).forEach(function (h) {
          var ul = h.nextElementSibling;
          h.classList.toggle('is-filtered-out', !!ul && !$$('li:not(.is-filtered-out)', ul).length);
        });
        var cb = $('.inv__count b', g); if (cb) { if (!cb.dataset.n) cb.dataset.n = cb.textContent; cb.textContent = q ? vis + ' of ' + cb.dataset.n : cb.dataset.n; }
        g.classList.toggle('is-filtered-out', !vis); shown += vis;
      });
      if (empty) empty.hidden = shown > 0;
      if (msg) msg.textContent = q ? shown + (shown === 1 ? ' document matches' : ' documents match') : '';
      if (hasGsap) ScrollTrigger.refresh();
    });
    var invLinks = $$('.inv__nav a');
    if ('IntersectionObserver' in window) {
      var io2 = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!en.isIntersecting) return;
          invLinks.forEach(function (l) {
            var on = l.getAttribute('href') === '#' + en.target.id;
            l.classList.toggle('is-active', on);
            if (on) {
              var ul = l.closest('ul');
              if (ul && ul.scrollWidth > ul.clientWidth) ul.scrollTo({ left: l.parentNode.offsetLeft - 16, behavior: reduced ? 'auto' : 'smooth' });
            }
          });
        });
      }, { rootMargin: '-30% 0px -60% 0px' });
      groups.forEach(function (g) { io2.observe(g); });
    }
  }

  /* ---------- re-measure when content height changes ---------- */
  $$('details').forEach(function (dt) { dt.addEventListener('toggle', function () { if (hasGsap) ScrollTrigger.refresh(); }); });

  if (!anim) { return; }

  /* =========================================================
     MOTION (GSAP) — only past this point
     ========================================================= */
  var ease = 'expo.out';

  /* ---------- hero intro ---------- */
  function heroIntro() {
    var hero = $('.hero') || $('.ihero');
    if (!hero) { endIntro(); return; }
    var title = $('.hero__title', hero), lines = null;
    if (window.SplitText && title) {
      try { lines = SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'line' }).lines; } catch (e) { lines = null; }
    }
    var copy = $$('.hero__copy > *:not(.hero__title), .ihero__copy > *:not(.hero__title)', hero);
    var tl = gsap.timeline({ defaults: { ease: ease } });
    var bl = $('.bloom', hero);
    if (bl) {
      tl.from($('.bloom__glow', bl), { scale: 0.4, opacity: 0, svgOrigin: '0 0', duration: 2.4 }, 0)
        .from($$('.ring--line .pt', bl), { opacity: 0, scale: 0.6, svgOrigin: '0 0', duration: 2, stagger: 0.02 }, 0.1)
        .from($$('.ring--o .pt', bl), { scale: 0, rotation: '-=50', svgOrigin: '0 0', duration: 2.2, stagger: 0.035 }, 0.1)
        .from($('.ring--v', bl), { opacity: 0, duration: 1.4 }, 1.1)
        .from($$('.ring--m .pt', bl), { scale: 0, rotation: '+=40', svgOrigin: '0 0', duration: 2, stagger: 0.04 }, 0.35)
        .from($$('.ring--i .pt', bl), { scale: 0, rotation: '-=30', svgOrigin: '0 0', duration: 1.8, stagger: 0.05 }, 0.6)
        .from($('.bloom__core', bl), { scale: 0, svgOrigin: '0 0', duration: 1.6, ease: 'back.out(1.6)' }, 0.75);
    }
    if (lines) tl.from(lines, { yPercent: 115, duration: 1.5, stagger: 0.12 }, 0.25);
    else if (title) tl.from(title, { y: 40, opacity: 0, duration: 1.4 }, 0.25);
    tl.from(copy, { y: 26, opacity: 0, duration: 1.3, stagger: 0.09 }, 0.55);
    var prods = $$('.prod', hero);
    if (prods.length) tl.from(prods, { y: 90, opacity: 0, scale: 0.9, duration: 1.8, stagger: 0.14 }, 0.8);
    var tag = $('.stage__tag', hero);
    if (tag) tl.from(tag, { scale: 0.6, opacity: 0, duration: 1.2, ease: 'back.out(1.8)' }, 1.5);
    endIntro();
    tl.eventCallback('onComplete', parallax);
  }
  function parallax() {
    var stage = $('.stage');
    if (!stage || !fine) return;
    var layers = $$('[data-depth]', stage).map(function (el) {
      return { d: parseFloat(el.dataset.depth), x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3.out' }), y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3.out' }) };
    });
    var bx = gsap.quickTo('.stage__bloom', 'x', { duration: 1.8, ease: 'power3.out' }), by = gsap.quickTo('.stage__bloom', 'y', { duration: 1.8, ease: 'power3.out' });
    $('.hero').addEventListener('pointermove', function (e) {
      var nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
      layers.forEach(function (l) { l.x(nx * 34 * l.d); l.y(ny * 26 * l.d); });
      bx(nx * -14); by(ny * -10);
    });
  }
  var fontsReady = (d.fonts && d.fonts.ready) ? d.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 1200); })]).then(heroIntro);

  /* hero scroll-away: bloom turns and lifts gently */
  if ($('.hero')) {
    gsap.to('.stage__bloom', { rotation: 35, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
    gsap.to('.hero__copy', { yPercent: -14, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'center 40%', end: 'bottom top', scrub: 1 } });
  }
  if ($('.ihero__bloom')) {
    gsap.to('.ihero__bloom', { rotation: 40, ease: 'none', scrollTrigger: { trigger: '.ihero', start: 'top top', end: 'bottom top', scrub: 1 } });
  }

  /* ---------- drifting petals ---------- */
  $$('.drift__p').forEach(function (p, i) {
    var h = window.innerHeight;
    gsap.to(p, {
      y: -h * (1.3 + (i % 3) * 0.35), x: (i % 2 ? 1 : -1) * (30 + i * 12), rotation: '+=' + (120 + i * 40), ease: 'none',
      scrollTrigger: { trigger: d.body, start: 'top top', end: 'bottom bottom', scrub: 1.5 }
    });
  });

  /* ---------- generic reveals ---------- */
  var rv = $$('[data-rv]');
  gsap.set(rv, { opacity: 0, y: 44 });
  ScrollTrigger.batch(rv, {
    start: 'top 90%', once: true,
    onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: 1.3, ease: ease, stagger: 0.1, overwrite: true, clearProps: 'transform' }); }
  });

  /* section titles: masked line reveal */
  if (window.SplitText) {
    $$('.section .title, .cta__title').forEach(function (t) {
      try {
        var s = SplitText.create(t, { type: 'lines', mask: 'lines', linesClass: 'line' });
        gsap.from(s.lines, { yPercent: 110, duration: 1.4, ease: ease, stagger: 0.1, scrollTrigger: { trigger: t, start: 'top 88%', once: true } });
      } catch (e) { /* keep plain title */ }
    });
  }

  /* ---------- brands bloom open ---------- */
  var brands = $$('.brand');
  if (brands.length) {
    if (fine) {
      ScrollTrigger.create({
        trigger: '.brands__grid', start: 'top 70%', once: true,
        onEnter: function () {
          brands.forEach(function (b, i) {
            setTimeout(function () { b.classList.add('is-open'); }, 300 + i * 260);
            setTimeout(function () { if (!b.matches(':hover')) b.classList.remove('is-open'); }, 1700 + i * 260);
          });
        }
      });
    } else {
      brands.forEach(function (b) { ScrollTrigger.create({ trigger: b, start: 'top 72%', end: 'bottom 28%', toggleClass: 'is-open' }); });
    }
  }

  /* ---------- number rings ---------- */
  var fmt = function (v, dec) { return v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
  $$('.num').forEach(function (n, i) {
    var arc = $('.num__arc', n), ticks = $$('.num__tick', n), counts = $$('[data-count]', n);
    gsap.set(arc, { strokeDashoffset: 1 });
    gsap.set(ticks, { opacity: 0 });
    counts.forEach(function (c) { c.textContent = fmt(0, (c.dataset.count.split('.')[1] || '').length); });
    ScrollTrigger.create({
      trigger: n, start: 'top 88%', once: true,
      onEnter: function () {
        var dl = (i % 6) * 0.08;
        gsap.to(arc, { strokeDashoffset: 0, duration: 2.2, ease: 'expo.inOut', delay: dl });
        gsap.to(ticks, { opacity: 1, duration: 0.6, stagger: 0.08, delay: dl + 0.6 });
        counts.forEach(function (c) {
          var end = parseFloat(c.dataset.count), dec = (c.dataset.count.split('.')[1] || '').length, o = { v: 0 };
          gsap.to(o, { v: end, duration: 2.2, ease: 'expo.out', delay: dl + 0.2, onUpdate: function () { c.textContent = fmt(o.v, dec); }, onComplete: function () { c.textContent = fmt(end, dec); } });
        });
      }
    });
  });

  /* ---------- why icons draw ---------- */
  $$('.draw').forEach(function (svg) {
    var ps = $$('path', svg);
    gsap.fromTo(ps, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2, ease: 'expo.inOut', stagger: 0.2, scrollTrigger: { trigger: svg, start: 'top 88%', once: true } });
  });

  /* ---------- product tilt ---------- */
  if (fine) {
    $$('.pcard').forEach(function (c) {
      var st = $('.pcard__stage', c);
      var rx = gsap.quickTo(st, 'rotationX', { duration: 0.9, ease: 'power3.out' }), ry = gsap.quickTo(st, 'rotationY', { duration: 0.9, ease: 'power3.out' });
      c.addEventListener('pointermove', function (e) {
        var r = st.getBoundingClientRect();
        rx(-((e.clientY - r.top) / r.height - 0.5) * 14); ry(((e.clientX - r.left) / r.width - 0.5) * 16);
      });
      c.addEventListener('pointerleave', function () { rx(0); ry(0); });
    });
    /* magnetic buttons */
    $$('.magnetic').forEach(function (b) {
      var mx = gsap.quickTo(b, 'x', { duration: 0.6, ease: 'power3.out' }), my = gsap.quickTo(b, 'y', { duration: 0.6, ease: 'power3.out' });
      b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * 0.22); my((e.clientY - r.top - r.height / 2) * 0.3); });
      b.addEventListener('pointerleave', function () { mx(0); my(0); });
    });
  }

  /* ---------- infrastructure: organic blob mask grows ---------- */
  var blob = $('.blobpath');
  if (blob) {
    var st = { s: 0.42, r: -24 };
    var apply = function () { blob.setAttribute('transform', 'translate(.5 .5) rotate(' + st.r.toFixed(2) + ') scale(' + st.s.toFixed(3) + ') translate(-.5 -.5)'); };
    apply();
    gsap.to(st, { s: 1.06, r: 0, ease: 'none', onUpdate: apply, scrollTrigger: { trigger: '.infra__media', start: 'top 90%', end: 'center 45%', scrub: 1 } });
    gsap.fromTo('.infra__img img', { scale: 1.3 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.infra__media', start: 'top bottom', end: 'bottom top', scrub: 1 } });
  }
  var bars = $$('.growth__bar');
  if (bars.length) {
    gsap.set(bars, { scaleX: 0 });
    gsap.set($$('.growth__bar span'), { opacity: 0 });
    ScrollTrigger.create({
      trigger: '.growth', start: 'top 85%', once: true,
      onEnter: function () {
        gsap.to(bars, { scaleX: 1, duration: 1.8, ease: 'expo.inOut', stagger: 0.25 });
        gsap.to($$('.growth__bar span'), { opacity: 1, duration: 0.8, stagger: 0.25, delay: 1.2 });
      }
    });
  }

  /* ---------- awards vine ---------- */
  var vine = $('.vine');
  if (vine) {
    gsap.fromTo('.vine__grow', { scaleY: 0 }, { scaleY: 1, transformOrigin: '50% 0%', ease: 'none', scrollTrigger: { trigger: vine, start: 'top 72%', end: 'bottom 72%', scrub: 0.8 } });
    $$('.aw', vine).forEach(function (li) {
      var leaf = $('.aw__leaf svg', li);
      var tl = gsap.timeline({ paused: true, defaults: { ease: ease } })
        .fromTo(leaf, { scale: 0, rotation: -120 }, { scale: 1, rotation: 0, duration: 1.2, ease: 'back.out(1.7)' }, 0)
        .fromTo($$('.aw__year, .aw__card', li), { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 1.1, stagger: 0.08, clearProps: 'transform' }, 0.05);
      ScrollTrigger.create({ trigger: li, start: 'top 80%', once: true, onEnter: function () { tl.play(); } });
    });
  }

  /* ---------- re-measure once everything has loaded ---------- */
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
