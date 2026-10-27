/* H R Hygiene Products Ltd. — "Film" design: site behaviour.
   Works without GSAP/Lenis (progressive enhancement); motion is skipped under reduced motion. */
(function () {
  'use strict';
  var html = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (RM) html.classList.add('rm');
  var G = window.gsap, ST = window.ScrollTrigger;
  var motion = !RM && G && ST;
  if (motion) G.registerPlugin(ST);

  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- Smooth scroll (Lenis) ---------- */
  var lenis = null;
  if (motion && window.Lenis) {
    try {
      lenis = new window.Lenis({ duration: 1.1, smoothWheel: true, wheelMultiplier: 1 });
      lenis.on('scroll', ST.update);
      G.ticker.add(function (t) { lenis.raf(t * 1000); });
      G.ticker.lagSmoothing(0);
    } catch (e) { lenis = null; }
  }
  window.__lenis = lenis;
  var hdrH = function () { var h = $('.hdr'); return h ? h.offsetHeight : 0; };
  function goTo(target) {
    if (lenis) lenis.scrollTo(target, { offset: -hdrH() + 1, duration: 1.4 });
    else target.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var t = document.getElementById(id.slice(1));
    if (!t) return;
    e.preventDefault();
    goTo(t);
    if (history.replaceState) history.replaceState(null, '', id);
    if (t.matches('form, section') && t.id === 'enquiry') { var f = $('select, input', t); if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 900); }
  });

  /* ---------- Header: dark over dark chapters ---------- */
  var hdr = $('.hdr');
  var darks = $$('[data-dark]');
  if (hdr && darks.length) {
    var hdTick = false;
    var hdCheck = function () {
      hdTick = false;
      var line = hdr.offsetHeight / 2, d = false;
      for (var i = 0; i < darks.length; i++) { var r = darks[i].getBoundingClientRect(); if (r.top <= line && r.bottom > line) { d = true; break; } }
      hdr.classList.toggle('is-dark', d);
    };
    window.addEventListener('scroll', function () { if (!hdTick) { hdTick = true; requestAnimationFrame(hdCheck); } }, { passive: true });
    window.addEventListener('resize', hdCheck);
    hdCheck();
  }

  /* ---------- Mobile menu ---------- */
  var burger = $('.burger'), nav = $('#nav');
  function setNav(open, focusBack) {
    if (!burger || !nav) return;
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    html.classList.toggle('nav-open', open);
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open) { var f = $('a', nav); if (f) f.focus(); }
    else if (focusBack) burger.focus();
  }
  if (burger && nav) {
    burger.addEventListener('click', function () { setNav(!nav.classList.contains('is-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) setNav(false, true); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1023 && nav.classList.contains('is-open')) setNav(false); });
  }

  /* ---------- Scrollspy ---------- */
  var spyLinks = $$('.hdr__nav a[href^="#"]:not(.pill), .inv-index a[href^="#"]');
  var spyTargets = spyLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  if (spyTargets.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (!x.isIntersecting) return;
        spyLinks.forEach(function (a) {
          var act = a.getAttribute('href') === '#' + x.target.id;
          a.classList.toggle('is-active', act);
          if (act) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
          var bar = act && a.closest('.inv-index');
          if (bar && bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: a.offsetLeft - (bar.clientWidth - a.offsetWidth) / 2, behavior: RM ? 'auto' : 'smooth' });
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    spyTargets.forEach(function (t) { spy.observe(t); });
  }

  /* ---------- Reveal ---------- */
  var fx = $$('.fx');
  if (!RM && 'IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); rio.unobserve(x.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    fx.forEach(function (el, i) {
      var sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.setProperty('--d', Math.min(sib, 5) * 0.07 + 's');
      rio.observe(el);
    });
  } else fx.forEach(function (el) { el.classList.add('in'); });

  /* ---------- About: words light up as you read ---------- */
  var lead = $('[data-words]');
  if (lead && motion) {
    var words = lead.textContent.trim().split(/\s+/);
    lead.textContent = '';
    words.forEach(function (w, i) {
      var s = document.createElement('span'); s.className = 'w'; s.textContent = w;
      lead.appendChild(s);
      if (i < words.length - 1) lead.appendChild(document.createTextNode(' '));
    });
    var spans = $$('.w', lead);
    ST.create({
      trigger: lead, start: 'top 82%', end: 'bottom 45%', scrub: true,
      onUpdate: function (self) {
        var n = self.progress * spans.length * 1.05;
        for (var i = 0; i < spans.length; i++) spans[i].style.opacity = Math.max(0.16, Math.min(1, n - i + 0.16)).toFixed(2);
      }
    });
  }

  /* ---------- Range: segment chips + rail ---------- */
  var rail = $('.rail'), segBtns = $$('.range .seg');
  function railState() {
    if (!rail) return;
    var prev = $('[data-rail="-1"]'), next = $('[data-rail="1"]');
    if (prev) prev.disabled = rail.scrollLeft < 8;
    if (next) next.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8;
  }
  segBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var seg = b.dataset.seg;
      segBtns.forEach(function (x) { var a = x === b; x.classList.toggle('is-on', a); x.setAttribute('aria-pressed', a ? 'true' : 'false'); });
      $$('.rail .card').forEach(function (c) { c.hidden = seg !== 'all' && c.dataset.seg !== seg; });
      $$('[data-segnote]').forEach(function (n) { n.hidden = n.dataset.segnote !== seg; });
      if (rail) rail.scrollTo({ left: 0, behavior: RM ? 'auto' : 'smooth' });
      if (motion) G.fromTo('.rail .card:not([hidden])', { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out', clearProps: 'transform,opacity' });
      setTimeout(railState, 450);
    });
  });
  $$('[data-rail]').forEach(function (b) {
    b.addEventListener('click', function () {
      var card = $('.rail .card:not([hidden])');
      var step = card ? card.getBoundingClientRect().width + 20 : rail.clientWidth * 0.8;
      rail.scrollBy({ left: step * Number(b.dataset.rail), behavior: RM ? 'auto' : 'smooth' });
    });
  });
  if (rail) { rail.addEventListener('scroll', railState, { passive: true }); railState(); window.addEventListener('resize', railState); }

  /* ---------- Numbers: count with scroll ---------- */
  if (motion) {
    $$('[data-count]').forEach(function (el) {
      var end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
      var fmt = function (v) { return v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
      var st = el.closest('.stat') || el;
      var o = { v: 0 };
      el.textContent = fmt(0);
      // Count once to the true figure when it enters view; never rest on an intermediate value.
      G.to(o, {
        v: end, duration: 1.6, ease: 'power3.out',
        scrollTrigger: { trigger: st, start: 'top 80%', once: true },
        onUpdate: function () { el.textContent = fmt(o.v); },
        onComplete: function () { el.textContent = fmt(end); }
      });
    });
    $$('.stat').forEach(function (s) {
      G.fromTo(s.querySelector('.stat__label'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, ease: 'none', scrollTrigger: { trigger: s, start: 'top 75%', end: 'center 60%', scrub: true } });
    });

    // growth chart
    var chart = $('.growth__chart');
    if (chart) {
      var tl = G.timeline({ scrollTrigger: { trigger: chart, start: 'top 80%', end: 'center 50%', scrub: 0.8 } });
      tl.fromTo($$('.gc-bar', chart), { scaleY: 0 }, { scaleY: 1, duration: 1, stagger: 0.35, ease: 'power2.out' })
        .fromTo($$('.gc-val, .gc-dot', chart), { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.1 }, '-=0.4')
        .fromTo($('.gc-line', chart), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.6, ease: 'none' }, '-=0.3');
    }

    // infrastructure: slow zoom + frame opening
    var pin = $('.infra__pin');
    if (pin) {
      G.fromTo('.infra__img', { scale: 1.22 }, { scale: 1.0, ease: 'none', scrollTrigger: { trigger: pin, start: 'top bottom', end: 'bottom top', scrub: true } });
      G.fromTo('.infra__frame', { clipPath: 'inset(7% 7% 7% 7% round 32px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: pin, start: 'top 95%', end: 'top 15%', scrub: true } });
      G.fromTo('.infra__over', { y: 80, opacity: 0 }, { y: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: pin, start: 'top 55%', end: 'top 5%', scrub: true } });
    }

    // display headings: gentle rise
    $$('.sec .display, .numbers__title, .closing').forEach(function (h) {
      G.fromTo(h, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
    });

    // refresh after fonts/images settle
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
    window.addEventListener('load', function () { ST.refresh(); });
  }

  /* ---------- Management: groups + profile dialog ---------- */
  var teamBtns = $$('.segs--team .seg');
  teamBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var g = b.dataset.group;
      teamBtns.forEach(function (x) { var a = x === b; x.classList.toggle('is-on', a); x.setAttribute('aria-pressed', a ? 'true' : 'false'); });
      $$('.team').forEach(function (t) { t.hidden = g !== 'all' && t.dataset.group !== g; });
      if (motion) G.fromTo('.team:not([hidden]) .person', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.04, ease: 'power3.out', clearProps: 'all' });
      if (ST) ST.refresh();
    });
  });

  var bio = $('#bio'), lastFocus = null;
  function openDialog(d) {
    lastFocus = document.activeElement;
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    if (lenis) lenis.stop();
  }
  $$('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
    d.addEventListener('close', function () { if (lenis) lenis.start(); if (lastFocus) lastFocus.focus({ preventScroll: true }); });
  });
  if (bio) {
    $$('[data-bio]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = btn.closest('.person');
        $('#bio-name').textContent = $('h4', p).textContent;
        $('.modal__role', bio).textContent = $('.person__role', p).textContent;
        $('.modal__bio', bio).textContent = $('.person__bio', p).textContent;
        var ph = $('.modal__ph', bio); ph.innerHTML = '';
        var img = $('.person__ph img', p);
        if (img) { var c = document.createElement('img'); c.src = img.src; c.alt = ''; c.width = 88; c.height = 88; ph.appendChild(c); }
        else { var s = document.createElement('span'); s.textContent = $('.person__ph span', p).textContent; ph.appendChild(s); }
        openDialog(bio);
      });
    });
  }

  /* ---------- Press lightbox ---------- */
  var box = $('#lightbox'), clips = $$('.clip'), ci = 0;
  function showClip(i) {
    ci = (i + clips.length) % clips.length;
    var src = $('img', clips[ci]), im = $('img', box);
    im.src = src.currentSrc || src.src; im.alt = src.alt;
    im.width = src.naturalWidth || src.width; im.height = src.naturalHeight || src.height;
  }
  if (box && clips.length) {
    clips.forEach(function (c, i) { c.addEventListener('click', function () { showClip(i); openDialog(box); }); });
    $('.lb-prev', box).addEventListener('click', function () { showClip(ci - 1); });
    $('.lb-next', box).addEventListener('click', function () { showClip(ci + 1); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') showClip(ci - 1);
      if (e.key === 'ArrowRight') showClip(ci + 1);
    });
  }

  /* ---------- Enquiry form → mailto ---------- */
  var form = $('#enquiry');
  if (form) {
    var emailOk = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); };
    var check = function (el) {
      var v = el.value.trim(), ok = true;
      if (el.required && !v) ok = false;
      if (ok && el.type === 'email' && v && !emailOk(v)) ok = false;
      var f = el.closest('.field'); if (f) f.classList.toggle('invalid', !ok);
      var err = f && $('.err', f);
      if (err) { if (!ok) { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', err.id); } else { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); } }
      return ok;
    };
    $$('input[required], textarea[required]', form).forEach(function (el) {
      el.addEventListener('blur', function () { if (el.value) check(el); });
      el.addEventListener('input', function () { if (el.closest('.field').classList.contains('invalid')) check(el); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = $$('input[required], textarea[required]', form).filter(function (el) { return !check(el); });
      var note = $('.form__note', form);
      if (bad.length) { bad[0].focus(); note.textContent = 'Please complete the highlighted fields.'; return; }
      var fd = new FormData(form), lines = [];
      $$('[name]', form).forEach(function (el) {
        var label = $('label[for="' + el.id + '"]', form).textContent.replace('*', '').trim();
        var v = fd.get(el.name);
        if (v) lines.push(label + ': ' + v);
      });
      var subject = 'Website enquiry (' + fd.get('type') + ') - ' + fd.get('name');
      var href = 'mailto:' + form.dataset.to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      form.setAttribute('data-last-mailto', href);
      window.location.href = href;
      note.textContent = 'Your email app should now open with the message ready to send. If it does not, please write to ' + form.dataset.to + '.';
    });
  }

  /* ---------- Investors: filter ---------- */
  var q = $('#doc-q');
  if (q) {
    var groups = $$('.inv-group');
    var empty = $('.inv-empty');
    q.addEventListener('input', function () {
      var term = q.value.trim().toLowerCase(), total = 0;
      groups.forEach(function (g) {
        var n = 0;
        $$('.doc', g).forEach(function (d) {
          var hit = !term || d.textContent.toLowerCase().indexOf(term) > -1 || (g.dataset.title || '').toLowerCase().indexOf(term) > -1;
          d.hidden = !hit; if (hit) n++;
        });
        $$('.inv-sub', g).forEach(function (s) {
          var list = s.nextElementSibling; s.hidden = list && !$$('.doc:not([hidden])', list).length;
        });
        g.hidden = n === 0; total += n;
      });
      if (empty) empty.hidden = total > 0;
      var c = $('.inv-count'); if (c) c.textContent = term ? total + ' of 95 documents' : '95 documents';
      if (ST) ST.refresh();
    });
  }
})();
