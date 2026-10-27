/* H R Hygiene — Showroom: page behaviour (no build step) */
(function () {
  'use strict';
  var d = document, w = window, root = d.documentElement;
  var HR = w.HR = w.HR || {};
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var RM = root.classList.contains('rm');
  var hasIO = 'IntersectionObserver' in w;
  var finePointer = w.matchMedia('(pointer: fine)').matches;

  $$('.year').forEach(function (y) { y.textContent = new Date().getFullYear(); });

  /* ---------- split headings into words ---------- */
  function split(el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/), frag = d.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(d.createTextNode(' ')); return; }
            var o = d.createElement('span'), inn = d.createElement('span');
            o.className = 'w'; inn.textContent = p; o.style.setProperty('--i', i++);
            o.appendChild(inn); frag.appendChild(o);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') { walk(n); }
      });
    })(el);
  }
  if (!RM) $$('[data-split]').forEach(split);

  /* ---------- intro curtain ---------- */
  var ready = false;
  function setReady() {
    if (ready) return; ready = true;
    root.classList.add('is-ready');
    var t = $('.hero__title'); if (t) t.classList.add('in');
    if (HR.onReady) HR.onReady();
  }
  HR.isReady = function () { return ready; };
  if (RM) setReady();
  else {
    var minT = new Promise(function (r) { setTimeout(r, 900); });
    var fontsP = (d.fonts && d.fonts.ready) ? d.fonts.ready : Promise.resolve();
    Promise.all([minT, fontsP]).then(setReady);
    setTimeout(setReady, 2200);
  }

  /* ---------- header ---------- */
  var hdr = $('#hdr'), lastY = 0;
  function onScroll() {
    var y = w.scrollY || 0;
    hdr.classList.toggle('is-solid', y > 30);
    if (!d.body.classList.contains('menu-open')) hdr.classList.toggle('is-hidden', y > 500 && y > lastY + 4);
    if (y < lastY - 4 || y < 500) hdr.classList.remove('is-hidden');
    lastY = y;
  }
  onScroll();
  w.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- mobile menu ---------- */
  var burger = $('.burger'), nav = $('#nav');
  function setNav(open, noFocus) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    d.body.classList.toggle('menu-open', open);
    if (open) hdr.classList.remove('is-hidden');
    if (HR.lenis) { open ? HR.lenis.stop() : HR.lenis.start(); }
    if (open) { var f = $('a', nav); if (f) f.focus(); }
    else if (!noFocus) burger.focus();
  }
  if (burger && nav) {
    burger.addEventListener('click', function () { setNav(!nav.classList.contains('is-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a') && nav.classList.contains('is-open')) setNav(false, true); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) setNav(false); });
    w.addEventListener('resize', function () { if (w.innerWidth > 959 && nav.classList.contains('is-open')) setNav(false, true); });
  }

  /* ---------- reveal on scroll ---------- */
  var revs = $$('.rv, [data-split]:not(.hero__title)');
  if (hasIO && !RM) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    revs.forEach(function (el) { io.observe(el); });
    // stagger siblings in grids
    ['.brands', '.plaques', '.exhibits', '.why', '.portraits', '.wall', '.prints', '.floor', '.segs'].forEach(function (g) {
      $$(g).forEach(function (grid) { $$(':scope > .rv', grid).forEach(function (el, k) { el.style.setProperty('--d', (k % 4) * 0.08 + 's'); }); });
    });
  } else revs.forEach(function (el) { el.classList.add('in'); });

  /* ---------- counters ---------- */
  $$('[data-count]').forEach(function (el) {
    if (!hasIO || RM) return;
    var end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
    var fmt = function (v) { return v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
    var final = el.textContent;
    el.textContent = fmt(0);
    new IntersectionObserver(function (es, o) {
      if (!es[0].isIntersecting) return;
      o.disconnect();
      var t0 = performance.now();
      (function tick(t) {
        var p = Math.min((t - t0) / 1600, 1);
        el.textContent = p < 1 ? fmt(end * (1 - Math.pow(1 - p, 4))) : final;
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    }, { threshold: 0.4 }).observe(el);
  });

  /* ---------- pointer-lit plaques (numbers + awards) ---------- */
  if (finePointer && !RM) {
    $$('.plq').forEach(function (p) {
      var inn = $('.plq__in', p);
      p.addEventListener('pointermove', function (e) {
        var r = p.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        inn.style.setProperty('--ry', ((x - .5) * 10).toFixed(2) + 'deg');
        inn.style.setProperty('--rx', ((.5 - y) * 8).toFixed(2) + 'deg');
        inn.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        inn.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
      p.addEventListener('pointerleave', function () { inn.style.setProperty('--rx', '0deg'); inn.style.setProperty('--ry', '0deg'); });
    });
    $$('.plaque').forEach(function (p) {
      p.addEventListener('pointermove', function (e) {
        var r = p.getBoundingClientRect();
        p.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        p.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    // soft warm torch following the cursor
    var torch = d.createElement('div'); torch.className = 'torch'; torch.setAttribute('aria-hidden', 'true'); d.body.appendChild(torch);
    var tx = 0, ty = 0, cx = 0, cy = 0, tRaf = 0;
    w.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY; torch.classList.add('on');
      if (!tRaf) tRaf = requestAnimationFrame(moveTorch);
    }, { passive: true });
    d.addEventListener('pointerleave', function () { torch.classList.remove('on'); });
    function moveTorch() {
      cx += (tx - cx) * .18; cy += (ty - cy) * .18;
      torch.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      tRaf = (Math.abs(tx - cx) + Math.abs(ty - cy) > .5) ? requestAnimationFrame(moveTorch) : 0;
    }
  }

  /* ---------- hero brand picker / caption ---------- */
  var BR = $$('.brand').map(function (b) {
    return { name: $('h3', b).textContent, seg: $('.brand__seg', b).lastChild.textContent.trim(), desc: $('p:last-child', b).textContent, c: b.style.getPropertyValue('--c') };
  });
  var cap = $('.cap'), pick = $$('.picker__b'), stills = $$('.still__item'), cur = 0;
  HR.brands = BR;
  HR.setBrand = function (i, src) {
    if (i === cur && src !== 'init') return;
    cur = i;
    var b = BR[i]; if (!b || !cap) return;
    pick.forEach(function (p, k) { p.classList.toggle('is-on', k === i); p.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    stills.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
    cap.style.setProperty('--cap-c', b.c);
    $('.cap__no', cap).textContent = 'Exhibit 0' + (i + 1) + ' / 04';
    $('.cap__seg', cap).textContent = b.seg;
    $('.cap__name', cap).textContent = b.name;
    $('.cap__desc', cap).textContent = b.desc;
    cap.classList.remove('swap'); void cap.offsetWidth; cap.classList.add('swap');
    if (src !== 'stage' && HR.stage) HR.stage.select(i);
  };
  pick.forEach(function (p) {
    p.addEventListener('click', function () { HR.setBrand(+p.dataset.brand, 'ui'); if (HR.stage) HR.stage.hold(); });
    p.addEventListener('mouseenter', function () { if (HR.stage) HR.stage.hold(); });
  });
  stills.forEach(function (s) { s.addEventListener('click', function () { HR.setBrand(+s.dataset.i, 'ui'); }); });
  HR.setBrand(0, 'init');
  // fallback composition gently cycles too (not under reduced motion)
  if (!RM) {
    setInterval(function () {
      if (!root.classList.contains('has-stage') && !d.hidden && w.scrollY < w.innerHeight) HR.setBrand((cur + 1) % 4, 'auto');
    }, 4200);
  }

  /* ---------- product filter + detail ---------- */
  var exs = $$('.ex');
  $$('.filter__b').forEach(function (b, _, all) {
    b.addEventListener('click', function () {
      var f = b.dataset.filter;
      all.forEach(function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      exs.forEach(function (ex) { ex.hidden = !(f === 'all' || ex.dataset.brand === f); if (!ex.hidden) ex.classList.add('in'); });
      if (w.ScrollTrigger) w.ScrollTrigger.refresh();
    });
  });
  var pd = $('#product');
  $$('[data-product]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var ex = btn.closest('.ex'), img = $('img', ex), pimg = $('.pd__art img', pd);
      pimg.src = img.currentSrc || img.src; pimg.alt = img.alt;
      pimg.width = img.naturalWidth || img.width; pimg.height = img.naturalHeight || img.height;
      $('.pd__cat', pd).textContent = $('.ex__cat', ex).textContent;
      $('h3', pd).textContent = $('h3', ex).textContent;
      $('.pd__spec', pd).innerHTML = $('.spec', ex).innerHTML;
      pd.style.setProperty('--c', ex.style.getPropertyValue('--c'));
      openDlg(pd, btn);
    });
  });

  /* ---------- management ---------- */
  var tabs = $$('.tab'), wings = $$('.wing');
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) { x.classList.toggle('is-on', x === t); x.setAttribute('aria-pressed', x === t ? 'true' : 'false'); });
      wings.forEach(function (wg) {
        wg.hidden = !(t.dataset.group === 'all' || wg.dataset.group === t.dataset.group);
        if (!wg.hidden) $$('.rv', wg).forEach(function (el) { el.classList.add('in'); });
      });
      if (w.ScrollTrigger) w.ScrollTrigger.refresh();
    });
  });
  var bio = $('#bio');
  function openBio(person, opener) {
    var wing = person.closest('.wing');
    $('.bio__grp', bio).textContent = wing ? $('.wing__t', wing).lastChild.textContent.trim() : '';
    $('#bio-name').textContent = $('h4', person).textContent;
    $('.bio__role', bio).textContent = $('.person__role', person).textContent;
    $('.bio__body', bio).textContent = $('.person__bio', person).textContent;
    var art = $('.bio__art', bio); art.innerHTML = '';
    var fr = $('.pframe', person).cloneNode(true);
    fr.removeAttribute('class'); fr.className = fr.querySelector('img') ? '' : 'pframe pframe--mono';
    if (fr.querySelector('img')) { var im = fr.querySelector('img'); im.removeAttribute('loading'); art.appendChild(im); }
    else art.appendChild(fr);
    openDlg(bio, opener);
  }
  $$('.person').forEach(function (p) {
    var b = $('[data-bio]', p);
    b.addEventListener('click', function () { openBio(p, b); });
    $('.pframe', p).addEventListener('click', function () { openBio(p, b); });
  });

  /* ---------- press lightbox ---------- */
  var lb = $('#lightbox'), clips = $$('.print'), li = 0;
  function showClip(i) {
    li = (i + clips.length) % clips.length;
    var src = $('img', clips[li]), im = $('img', lb);
    im.src = src.currentSrc || src.src; im.alt = src.alt;
    im.width = src.naturalWidth || 850; im.height = src.naturalHeight || 1107;
    $('figcaption', lb).textContent = 'Press clipping ' + (li + 1) + ' of ' + clips.length;
  }
  clips.forEach(function (c, i) { c.addEventListener('click', function () { showClip(i); openDlg(lb, c); }); });
  $$('[data-lb]', lb).forEach(function (b) { b.addEventListener('click', function () { showClip(li + (+b.dataset.lb)); }); });
  lb.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') showClip(li + 1);
    if (e.key === 'ArrowLeft') showClip(li - 1);
  });

  /* ---------- dialogs ---------- */
  var lastOpener = null;
  function openDlg(dlg, opener) {
    lastOpener = opener || null;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    if (HR.lenis) HR.lenis.stop();
    var x = $('.dlg__x', dlg); if (x) x.focus();
  }
  $$('dialog').forEach(function (dl) {
    dl.addEventListener('click', function (e) {
      if (e.target === dl || e.target.closest('[data-close]')) {
        dl.close();
        var a = e.target.closest('a[href^="#"]');
        if (a) { e.preventDefault(); goTo(a.getAttribute('href')); }
      }
    });
    dl.addEventListener('close', function () {
      if (HR.lenis) HR.lenis.start();
      if (lastOpener && d.contains(lastOpener)) lastOpener.focus({ preventScroll: true });
    });
  });

  /* ---------- enquiry form -> mailto ---------- */
  var form = $('#enquiry');
  if (form) {
    var need = $$('[required]', form);
    function check(el) {
      var ok = el.checkValidity() && String(el.value).trim() !== '';
      var f = el.closest('.field'); if (f) f.classList.toggle('is-bad', !ok);
      var err = f && $('.field__err', f);
      if (err) { if (!ok) { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', err.id); } else { el.removeAttribute('aria-invalid'); } }
      return ok;
    }
    need.forEach(function (el) { el.addEventListener('blur', function () { if (el.value) check(el); }); el.addEventListener('input', function () { if (el.closest('.field').classList.contains('is-bad')) check(el); }); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = need.filter(function (el) { return !check(el); });
      if (bad.length) { bad[0].focus(); $('.form__note', form).textContent = 'Please complete the highlighted fields.'; return; }
      var f = new FormData(form), lines = [];
      $$('[name]', form).forEach(function (el) {
        var label = $('label[for="' + el.id + '"]', form).textContent.replace('*', '').trim();
        if (f.get(el.name)) lines.push(label + ': ' + f.get(el.name));
      });
      var subject = 'Website enquiry (' + f.get('type') + ') - ' + f.get('name');
      var href = 'mailto:' + form.dataset.to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      form.setAttribute('data-last-mailto', href);
      $('.form__note', form).textContent = 'Your email app should now open with the message ready to send. If it does not, please write to ' + form.dataset.to + '.';
      w.location.href = href;
    });
  }

  /* ---------- active nav ---------- */
  var navLinks = $$('.nav__list a[href^="#"]');
  if (hasIO && navLinks.length) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) { var t = $(a.getAttribute('href')); if (t) spy.observe(t); });
  }

  /* ---------- infrastructure bars (non-fly) ---------- */
  var growth = $('.growth');
  if (growth && hasIO) {
    new IntersectionObserver(function (es, o) { if (es[0].isIntersecting && !root.classList.contains('fly')) { growth.classList.add('bars-in'); o.disconnect(); } }, { threshold: .5 }).observe(growth);
  } else if (growth) growth.classList.add('bars-in');

  /* ---------- smooth scroll (Lenis) + ScrollTrigger ---------- */
  var gsap = w.gsap, ST = w.ScrollTrigger;
  if (gsap && ST) gsap.registerPlugin(ST);
  if (!RM && w.Lenis && gsap && ST) {
    try {
      var lenis = new w.Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 1 });
      HR.lenis = lenis;
      lenis.on('scroll', ST.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } catch (e) { HR.lenis = null; }
  }
  function goTo(hash) {
    var t = hash && hash.length > 1 ? $(hash) : null;
    if (!t) return;
    if (HR.lenis) HR.lenis.scrollTo(t, { offset: -(hdr.offsetHeight + 8), duration: 1.4 });
    else t.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', hash);
  }
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.closest('dialog')) return;
    var h = a.getAttribute('href');
    if (h.length < 2 || !$(h)) return;
    if (HR.lenis) { e.preventDefault(); goTo(h); }
  });

  /* ---------- infrastructure fly-through (desktop + WebGL) ---------- */
  var steps = $$('.step'), prog = $('.infra__prog'), progSpans = prog ? $$('span', prog) : [];
  HR.infra = { progress: 0, active: false };
  function setStep(p) {
    var k = p < .36 ? 0 : p < .7 ? 1 : 2;
    steps.forEach(function (s, i) { s.classList.toggle('is-on', i === k); });
    progSpans.forEach(function (s, i) { s.classList.toggle('on', i === k); });
    if (prog) prog.style.setProperty('--p', p.toFixed(3));
    if (k === 2 && growth) growth.classList.add('bars-in');
  }
  var flyTrigger = null;
  HR.setupFly = function () {
    if (flyTrigger || !root.classList.contains('fly') || !gsap || !ST) return false;
    flyTrigger = ST.create({
      trigger: '.infra__pin', start: 'top top', end: '+=260%', pin: true, scrub: true, anticipatePin: 1,
      onUpdate: function (self) { HR.infra.progress = self.progress; setStep(self.progress); },
      onToggle: function (self) { HR.infra.active = self.isActive; }
    });
    ST.refresh();
    return true;
  };
  HR.killFly = function () {
    if (flyTrigger) { flyTrigger.kill(true); flyTrigger = null; }
    steps.forEach(function (s) { s.classList.add('is-on'); });
    if (growth) growth.classList.add('bars-in');
    if (ST) ST.refresh();
  };
  // stage.js reports in; if it never does, show the still composition
  HR.stageReady = function () { root.classList.remove('gl-failed'); root.classList.add('has-stage'); if (HR.setupFly()) setStep(0); };
  HR.stageFailed = function () {
    root.classList.add('gl-failed'); root.classList.remove('has-stage');
    if (root.classList.contains('fly')) { root.classList.remove('fly'); HR.killFly(); }
  };
  if (root.classList.contains('gl')) setTimeout(function () { if (!root.classList.contains('has-stage')) HR.stageFailed(); }, 6000);
  if (HR._pendingReady) HR.stageReady();
  if (HR._pendingFail) HR.stageFailed();

  w.addEventListener('load', function () { if (ST) ST.refresh(); });
})();
