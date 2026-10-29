/* Calm · site behaviour + gentle motion (GSAP, ScrollTrigger, DrawSVG, Lenis — all optional) */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var motionOn = function () { return root.getAttribute('data-motion') !== 'reduce'; };
  var lenis = null;

  /* ---------------- Header ---------------- */
  var hd = $('.hd');
  var alwaysSolid = hd && hd.classList.contains('is-solid');
  function onScroll() { if (hd && !alwaysSolid) hd.classList.toggle('is-solid', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------------- Mobile nav ---------------- */
  var burger = $('.burger'), nav = $('#nav');
  function navIsDrawer() { return burger && getComputedStyle(burger).display !== 'none'; }
  function setNav(open, restore) {
    if (!nav || !burger) return;
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open) { var f = $('a', nav); if (f) setTimeout(function () { f.focus(); }, 60); }
    else if (restore) burger.focus();
  }
  if (burger) burger.addEventListener('click', function () { setNav(!nav.classList.contains('is-open')); });
  if (nav) nav.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav && nav.classList.contains('is-open')) setNav(false, true);
    // keep Tab inside the open drawer
    if (e.key === 'Tab' && nav && nav.classList.contains('is-open') && navIsDrawer()) {
      var items = $$('a', nav).concat([burger]);
      var i = items.indexOf(document.activeElement);
      if (e.shiftKey && (i === 0 || i === -1)) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    }
  });
  window.addEventListener('resize', function () { if (nav && nav.classList.contains('is-open') && !navIsDrawer()) setNav(false); });

  /* ---------------- In-page anchors (Lenis-aware, moves focus for keyboard users) ---------------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href*="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash || url.hash === '#') return;
    var t = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!t) return;
    e.preventDefault();
    var off = -(hd ? hd.offsetHeight : 0) - 16;
    if (lenis) lenis.scrollTo(t, { offset: off, duration: 1.1 });
    else window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY + off, behavior: motionOn() ? 'smooth' : 'auto' });
    history.pushState(null, '', url.hash);
    if (!t.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
  });

  /* ---------------- Dialog helpers ---------------- */
  var lastFocus = null;
  function openDlg(d) {
    lastFocus = document.activeElement;
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    if (lenis) lenis.stop();
  }
  $$('dialog.dlg').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
    d.addEventListener('close', function () { if (lenis) lenis.start(); if (lastFocus && lastFocus.focus) lastFocus.focus(); });
  });
  document.addEventListener('calm:dialog', function (e) { if (lenis) e.detail ? lenis.stop() : lenis.start(); });

  /* Management bios: <details> without JS, a dialog with JS */
  var bio = $('#bio');
  if (bio) {
    $$('.person__more summary').forEach(function (s) {
      s.setAttribute('aria-haspopup', 'dialog');
      s.addEventListener('click', function (e) {
        e.preventDefault();
        var card = s.closest('.person');
        $('.dlg__n', bio).textContent = $('.person__n', card).textContent;
        $('.dlg__r', bio).textContent = $('.person__r', card).textContent;
        $('.dlg__b', bio).textContent = $('.person__bio', card).textContent;
        var ph = $('.dlg__ph', bio), img = $('.person__ph img', card);
        ph.innerHTML = '';
        if (img) { var c = new Image(); c.src = img.currentSrc || img.src; c.alt = ''; ph.appendChild(c); }
        else { var sp = document.createElement('span'); sp.textContent = $('.person__mono span', card).textContent; ph.appendChild(sp); }
        openDlg(bio);
        $('[data-close]', bio).focus();
      });
    });
  }

  /* Press lightbox */
  var lb = $('#lightbox');
  if (lb) {
    $$('.clip').forEach(function (b) {
      b.addEventListener('click', function () {
        var img = $('img', b), big = $('img', lb);
        big.src = img.currentSrc || img.src; big.alt = img.alt;
        lb.setAttribute('aria-label', img.alt);
        openDlg(lb);
        $('[data-close]', lb).focus();
      });
    });
  }

  /* ---------------- Enquiry form → mailto ---------------- */
  var form = $('#enquiry');
  if (form) {
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    function check(el) {
      var msg = '';
      var v = (el.value || '').trim();
      if (el.required && !v) msg = 'Please fill in this field.';
      else if (el.type === 'email' && v && !emailRe.test(v)) msg = 'Please enter a valid email address.';
      else if (el.type === 'tel' && v && v.replace(/\D/g, '').length < 10) msg = 'Please enter a mobile number with at least 10 digits.';
      var err = el.getAttribute('aria-describedby') && document.getElementById(el.getAttribute('aria-describedby'));
      if (err) err.textContent = msg;
      if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
      return !msg;
    }
    $$('input[required], textarea[required]', form).forEach(function (el) {
      el.addEventListener('blur', function () { if (el.value) check(el); });
      el.addEventListener('input', function () { if (el.getAttribute('aria-invalid')) check(el); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = $$('input[required], textarea[required]', form).filter(function (el) { return !check(el); });
      var note = $('.form__note', form);
      if (bad.length) {
        note.textContent = 'Please check the ' + bad.length + (bad.length > 1 ? ' highlighted fields.' : ' highlighted field.');
        bad[0].focus();
        return;
      }
      var fd = new FormData(form), lines = [];
      $$('[name]', form).forEach(function (el) {
        var label = $('label[for="' + el.id + '"]', form).textContent.replace('*', '').trim();
        var val = fd.get(el.name);
        if (val) lines.push(label + ': ' + val);
      });
      var subject = 'Website enquiry (' + fd.get('type') + ') - ' + fd.get('name');
      var href = 'mailto:' + form.dataset.to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      form.setAttribute('data-mailto', href);
      window.location.href = href;
      note.textContent = 'Your email app should now open with the message ready to send. If it does not, please write to ' + form.dataset.to + '.';
    });
  }

  var y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  /* ---------------- Investors: filter + section counts ---------------- */
  var filter = $('#doc-filter');
  if (filter) {
    var items = $$('[data-doc]'), total = items.length, status = $('#doc-count'), empty = $('[data-empty]');
    var norm = function (s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); };
    items.forEach(function (li) {
      var g = li.closest('[data-ig]');
      li._t = norm(li.textContent + ' ' + (g ? $('.ig__t', g).textContent : ''));
    });
    var run = function () {
      var q = norm(filter.value), words = q ? q.split(' ') : [], shown = 0;
      items.forEach(function (li) {
        var ok = words.every(function (w) { return li._t.indexOf(w) > -1; });
        li.hidden = !ok; if (ok) shown++;
      });
      $$('[data-ig]').forEach(function (g) {
        var n = $$('[data-doc]', g).filter(function (li) { return !li.hidden; }).length;
        g.hidden = n === 0;
        $('[data-ig-count]', g).textContent = n;
        var link = $('.invnav a[href="#' + g.id + '"] .invnav__c');
        if (link) link.textContent = n;
        $$('.ig__sub', g).forEach(function (h) {
          var ul = h.nextElementSibling;
          h.hidden = ul && $$('[data-doc]', ul).every(function (li) { return li.hidden; });
        });
      });
      status.textContent = q ? ('Showing ' + shown + ' of ' + total + ' documents') : ('Showing all ' + total + ' documents');
      empty.hidden = shown !== 0;
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    };
    filter.addEventListener('input', run);
  }

  /* ---------------- Scroll spy (main nav + investor nav) ---------------- */
  var spyLinks = $$('.nav__list a[href^="#"], .invnav a[href^="#"]');
  if (spyLinks.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        spyLinks.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + en.target.id;
          a.classList.toggle('is-active', on);
          if (a.closest('.invnav')) { if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); }
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    spyLinks.forEach(function (a) { var t = document.getElementById(a.getAttribute('href').slice(1)); if (t) spy.observe(t); });
  }

  /* =================================================================
     MOTION — only when GSAP loaded and motion is on
     ================================================================= */
  var G = window.gsap, ST = window.ScrollTrigger;
  var animated = [];
  var started = false;

  function startLenis() {
    if (lenis || !window.Lenis || !motionOn()) return;
    lenis = new window.Lenis({ lerp: 0.11, wheelMultiplier: 0.95, smoothWheel: true });
    if (ST) lenis.on('scroll', ST.update);
    if (G) { G.ticker.add(lenisRaf); G.ticker.lagSmoothing(0); }
    else { (function raf(t) { if (lenis) { lenis.raf(t); requestAnimationFrame(raf); } })(performance.now()); }
  }
  function lenisRaf(t) { if (lenis) lenis.raf(t * 1000); }
  function stopLenis() { if (!lenis) return; if (G) G.ticker.remove(lenisRaf); lenis.destroy(); lenis = null; root.classList.remove('lenis', 'lenis-smooth'); }

  function countUp(el) {
    var end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
    var fmt = function (v) { return v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
    var o = { v: 0 };
    el.textContent = fmt(0);
    animated.push(el);
    G.to(o, { v: end, duration: 1.6, ease: 'power2.out', onUpdate: function () { el.textContent = fmt(o.v); }, onComplete: function () { el.textContent = fmt(end); },
      scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    el._final = fmt(end);
  }

  function draw(svg, opts) {
    var parts = $$('path, circle, ellipse, line, polyline', svg).filter(function (p) { return !p.classList.contains('lf-fill'); });
    if (!parts.length) return;
    animated = animated.concat(parts);
    G.set(parts, { drawSVG: '0%' });
    var fills = $$('.lf-fill', svg);
    if (fills.length) { animated = animated.concat(fills); G.set(fills, { opacity: 0 }); }
    var tl = G.timeline(opts.trigger ? { scrollTrigger: opts.trigger } : { delay: opts.delay || 0 });
    tl.to(parts, { drawSVG: '100%', duration: opts.dur || 1.6, ease: 'power1.inOut', stagger: opts.stagger || 0.03,
      onComplete: function () { G.set(parts, { clearProps: 'strokeDasharray,strokeDashoffset' }); } });
    if (fills.length) tl.to(fills, { opacity: 1, duration: 1.2, stagger: 0.05, ease: 'sine.out' }, 0.4);
    return tl;
  }

  function startMotion() {
    if (!G) root.classList.add('ready');
    if (started || !G || !motionOn()) return;
    started = true;
    try {
      if (ST) G.registerPlugin(ST);
      if (window.DrawSVGPlugin) G.registerPlugin(window.DrawSVGPlugin);
    } catch (e) { return; }
    startLenis();
    G.delayedCall(0, function () { root.classList.add('ready'); });
    var hasDraw = !!window.DrawSVGPlugin;
    var vh = window.innerHeight;
    var below = function (el) { return el.getBoundingClientRect().top > vh * 0.92; };

    /* Hero intro */
    var heroBits = $$('[data-hero]');
    if (heroBits.length) {
      animated = animated.concat(heroBits);
      var tl = G.timeline({ defaults: { ease: 'power3.out' } });
      tl.from(heroBits, { y: 22, opacity: 0, duration: 1.1, stagger: 0.09 }, 0.1);
      var art = $('[data-hero-art] .arch');
      if (art) { animated.push(art); tl.from(art, { opacity: 0, y: 26, scale: 0.985, duration: 1.4, ease: 'power2.out' }, 0); }
      var pack = $('.arch__pack');
      if (pack) { animated.push(pack); tl.from(pack, { opacity: 0, y: 30, duration: 1.3 }, 0.45); }
      var card = $('[data-hero-card]');
      if (card) { animated.push(card); tl.from(card, { opacity: 0, y: 24, duration: 1 }, 0.9); }
      var lines = $('[data-draw-hero]');
      if (lines && hasDraw) draw(lines, { delay: 0.35, dur: 2.2, stagger: 0.02 });
      var fol = $$('.arch__fill .lf-fill');
      if (fol.length) { animated = animated.concat(fol); tl.from(fol, { opacity: 0, duration: 1.6, stagger: 0.08, ease: 'sine.out' }, 0.5); }
      // gentle parallax of the still life
      if (ST && pack && window.matchMedia('(min-width: 761px)').matches) {
        G.to(pack, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
        if (card) G.to(card, { yPercent: -30, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      }
    }

    if (!ST) return;

    /* Line drawings on scroll */
    if (hasDraw) {
      $$('[data-draw]').forEach(function (svg) {
        if (svg.hasAttribute('data-draw-hero')) return;
        if (!below(svg)) return; // already visible on load: leave as is
        draw(svg, { trigger: { trigger: svg, start: 'top 88%', once: true }, dur: 1.5, stagger: 0.025 });
      });
      var roof = $('[data-draw-scrub]');
      if (roof) {
        var parts = $$('path, circle', roof).filter(function (p) { return !p.classList.contains('lf-fill'); });
        animated = animated.concat(parts);
        G.fromTo(parts, { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', stagger: 0.02,
          scrollTrigger: { trigger: roof, start: 'top 90%', end: 'bottom 45%', scrub: 0.8 } });
      }
    }

    /* Reveals (batch, once) */
    var rv = $$('.rv').filter(below);
    if (rv.length) {
      animated = animated.concat(rv);
      G.set(rv, { opacity: 0, y: 18 });
      ST.batch(rv, { start: 'top 92%', once: true, onEnter: function (b) { G.to(b, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out', stagger: 0.07, overwrite: true }); } });
    }

    /* Counters */
    $$('[data-count]').forEach(function (el) { if (below(el)) countUp(el); });

    /* Growth bars */
    $$('.bar__fill').forEach(function (b, i) {
      if (!below(b)) return;
      animated.push(b);
      G.from(b, { scaleX: 0, duration: 1.4, delay: i * 0.15, ease: 'power3.out', scrollTrigger: { trigger: b, start: 'top 92%', once: true } });
    });

    /* Image drift inside rounded frames */
    if (window.matchMedia('(min-width: 761px)').matches) {
      $$('.archframe img, .infra__a img, .infra__b img').forEach(function (img) {
        animated.push(img);
        G.fromTo(img, { yPercent: -4, scale: 1.08 }, { yPercent: 4, scale: 1.08, ease: 'none', scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }

    window.addEventListener('load', function () { ST.refresh(); });
    // layout changes (lazy images, fonts, accordions, text-size changes) → recompute trigger positions
    var rT;
    var refresh = function () { clearTimeout(rT); rT = setTimeout(function () { ST.refresh(); }, 150); };
    if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(document.body);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    // safety net: anything on screen that is still hidden gets revealed
    if ('IntersectionObserver' in window && rv.length) {
      var net = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target;
          setTimeout(function () { if (motionOn() && +getComputedStyle(el).opacity < 0.05) G.to(el, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }); }, 900);
          net.unobserve(el);
        });
      }, { rootMargin: '0px 0px -5% 0px' });
      rv.forEach(function (el) { net.observe(el); });
    }
  }

  /* Switch motion off at runtime: finish everything, clear transforms, stop smooth scroll */
  function stopMotion() {
    stopLenis();
    if (!G) return;
    if (ST) ST.getAll().forEach(function (t) { t.kill(true); });
    G.globalTimeline.getChildren(true, true, true).forEach(function (t) { try { t.progress(1); t.kill(); } catch (e) {} });
    G.set(animated, { clearProps: 'transform,opacity,visibility,strokeDasharray,strokeDashoffset' });
    root.classList.add('ready');
    $$('[data-count]').forEach(function (el) { if (el._final) el.textContent = el._final; });
    animated = [];
  }

  document.addEventListener('calm:motion', function (e) {
    if (e.detail === 'reduce') stopMotion();
    else { if (!started) startMotion(); else startLenis(); }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startMotion); else startMotion();
})();
