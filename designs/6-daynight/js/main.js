/* H R Hygiene Products Ltd. — shared behaviour (no library dependencies) */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mobile menu ---------- */
  var hdr = $('.hdr'), burger = $('.burger'), nav = $('#nav');
  function setNav(open, silent) {
    if (!nav || !burger) return;
    nav.classList.toggle('is-open', open);
    hdr.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (window.__lenis) { open ? window.__lenis.stop() : window.__lenis.start(); }
    if (open) { var f = $('a', nav); if (f) setTimeout(function () { f.focus(); }, 60); }
    else if (!silent) burger.focus();
  }
  if (burger) {
    burger.addEventListener('click', function () { setNav(!nav.classList.contains('is-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a') && nav.classList.contains('is-open')) setNav(false, true); });
    document.addEventListener('keydown', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (e.key === 'Escape') { setNav(false); return; }
      if (e.key === 'Tab') { // keep focus inside the open menu
        var items = [burger].concat($$('a', nav));
        var i = items.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 1040 && nav.classList.contains('is-open')) setNav(false, true); });
  }

  /* ---------- Reveal on scroll ---------- */
  var rvs = $$('.rv, .growth');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    rvs.forEach(function (el) { io.observe(el); });
  } else { rvs.forEach(function (el) { el.classList.add('is-in'); }); }

  /* ---------- Scene illustrations play only while visible ---------- */
  var scenes = $$('.scene, .ihero');
  if ('IntersectionObserver' in window && !reduce) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-play', en.isIntersecting); });
    }, { rootMargin: '80px 0px' });
    scenes.forEach(function (s) { sio.observe(s); });
  }

  /* ---------- Active link spy ---------- */
  var links = $$('.nav a[href^="#"]:not(.nav__cta), .lib__nav a[href^="#"]');
  var targets = links.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);
  if (targets.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    targets.forEach(function (t) { spy.observe(t); });
  }

  /* ---------- Count-up numbers ---------- */
  window.__countUp = function (el) {
    if (el.__done) return; el.__done = true;
    var end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
    var fmt = function (v) { return v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
    if (reduce) { el.textContent = fmt(end); return; }
    var t0 = performance.now();
    (function tick(t) {
      var p = Math.min((t - t0) / 1500, 1);
      el.textContent = fmt(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  };

  /* ---------- Profile dialog ---------- */
  var bio = $('#bio');
  if (bio && bio.showModal) {
    $$('.person [data-bio]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.person');
        $('#bio-name').textContent = $('h4', card).textContent;
        $('.modal__role', bio).textContent = $('.person__role', card).textContent;
        $('.modal__bio', bio).textContent = $('.person__bio', card).textContent;
        var av = $('.modal__av', bio); av.innerHTML = '';
        var src = $('.person__photo img, .person__photo .mono', card);
        if (src) { var c = src.cloneNode(true); if (c.tagName === 'IMG') { c.alt = ''; c.removeAttribute('loading'); } av.appendChild(c); }
        bio.showModal();
      });
    });
  }

  /* ---------- Press lightbox ---------- */
  var box = $('#lightbox');
  if (box && box.showModal) {
    $$('.clip').forEach(function (clip) {
      clip.addEventListener('click', function () {
        var img = $('img', clip), big = $('img', box);
        big.src = img.currentSrc || img.src; big.alt = img.alt;
        big.width = img.naturalWidth || 850; big.height = img.naturalHeight || 1107;
        box.showModal();
      });
    });
  }
  $$('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
    d.addEventListener('close', function () { if (window.__lenis) window.__lenis.start(); });
    d.addEventListener('cancel', function () { if (window.__lenis) window.__lenis.start(); });
  });
  // stop smooth scroll while a dialog is open
  var _show = window.HTMLDialogElement && HTMLDialogElement.prototype.showModal;
  if (_show) HTMLDialogElement.prototype.showModal = function () { if (window.__lenis) window.__lenis.stop(); return _show.apply(this, arguments); };

  /* ---------- Enquiry form → compose email ---------- */
  var form = $('#enquiry');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.checkValidity && !form.checkValidity()) { form.reportValidity(); return; }
      var f = new FormData(form), lines = [];
      $$('[name]', form).forEach(function (el) {
        var label = $('label[for="' + el.id + '"]', form).textContent.replace('*', '').trim();
        if (f.get(el.name)) lines.push(label + ': ' + f.get(el.name));
      });
      var subject = 'Website enquiry (' + f.get('type') + ') - ' + f.get('name');
      var href = 'mailto:' + form.dataset.to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      form.dataset.mailto = href;
      window.location.href = href;
      $('.form__note', form).textContent = 'Your email app should now open with the message ready to send. If it does not, please write to ' + form.dataset.to + '.';
    });
  }

  /* ---------- Magnetic buttons (fine pointers only) ---------- */
  if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.magnet').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px');
        b.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', function () { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
    });
  }

  /* ---------- Investors: quick filter ---------- */
  var finder = $('#docfilter');
  if (finder) {
    var items = $$('.lib .docs li, .lib .offer a');
    var count = $('.finder__count'), empty = $('.empty');
    finder.addEventListener('input', function () {
      var q = finder.value.trim().toLowerCase(), shown = 0;
      items.forEach(function (it) { var ok = !q || it.textContent.toLowerCase().indexOf(q) > -1; it.hidden = !ok; if (ok) shown++; });
      $$('.lib .docs, .lib .offer').forEach(function (list) {
        var any = $$(list.classList.contains('offer') ? 'a' : 'li', list).some(function (x) { return !x.hidden; });
        list.hidden = !any;
        var prev = list.previousElementSibling; if (prev && prev.tagName === 'H3') prev.hidden = !any;
      });
      $$('.igroup').forEach(function (g) { g.hidden = !$$('.docs li, .offer a', g).some(function (x) { return !x.hidden; }); });
      count.textContent = q ? shown + ' of ' + items.length + ' documents match' : '';
      empty.classList.toggle('is-on', shown === 0);
    });
  }

  var y = $('#year');
  if (y) y.textContent = new Date().getFullYear();
})();
