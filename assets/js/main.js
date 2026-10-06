// H R Hygiene Products Ltd. — site behaviour (no dependencies)
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Header: solid on scroll (pages without a hero start solid)
  var header = $('.header');
  var alwaysSolid = header.classList.contains('is-solid');
  function onScroll() {
    if (!alwaysSolid) header.classList.toggle('is-solid', window.scrollY > 40);
    if (window.scrollY < 200) $$('.nav a.is-active[href^="#"]').forEach(function (l) { l.classList.remove('is-active'); });
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile nav
  var burger = $('.burger'), nav = $('.nav');
  function setNav(open) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
  }
  burger.addEventListener('click', function () { setNav(!nav.classList.contains('is-open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });

  // Reveal on scroll
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  // Active nav link for in-page sections
  var links = $$('.nav a[href^="#"]:not(.btn), .inv__nav a[href^="#"]');
  var targets = links.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);
  if (targets.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    targets.forEach(function (t) { spy.observe(t); });
  }

  // Hero product slider
  var slides = $$('.slide');
  if (slides.length) {
    var i = 0, timer, count = $('.stage__count b');
    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
      count.textContent = ('0' + (i + 1)).slice(-2);
    }
    function play() {
      clearInterval(timer);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        timer = setInterval(function () { show(i + 1); }, 4500);
      }
    }
    $('[data-prev]').addEventListener('click', function () { show(i - 1); play(); });
    $('[data-next]').addEventListener('click', function () { show(i + 1); play(); });
    var stage = $('.stage');
    stage.addEventListener('mouseenter', function () { clearInterval(timer); });
    stage.addEventListener('mouseleave', play);
    play();
  }

  // Count-up numbers
  $$('[data-count]').forEach(function (el) {
    var end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
    var fmt = function (v) { return v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.textContent = fmt(0);
    new IntersectionObserver(function (entries, o) {
      if (!entries[0].isIntersecting) return;
      o.disconnect();
      var t0 = performance.now();
      (function tick(t) {
        var p = Math.min((t - t0) / 1400, 1);
        el.textContent = fmt(end * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    }).observe(el);
  });

  // Management filter tabs
  var tabs = $$('.tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.toggle('is-active', t === tab); t.setAttribute('aria-pressed', t === tab); });
      $$('.person').forEach(function (p) {
        p.hidden = tab.dataset.group !== 'all' && p.dataset.group !== tab.dataset.group;
      });
    });
  });

  // Profile dialog
  var bio = $('#bio');
  if (bio) {
    $$('.person [data-bio]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.person');
        $('h3', bio).textContent = $('h3', card).textContent;
        $('.person__role', bio).textContent = $('.person__role', card).textContent;
        $('p:last-of-type', bio).textContent = $('.person__bio', card).textContent;
        bio.showModal();
      });
    });
  }

  // Press clipping lightbox
  var box = $('#lightbox');
  if (box) {
    $$('.clip').forEach(function (clip) {
      clip.addEventListener('click', function () {
        var img = $('img', clip);
        $('img', box).src = img.src;
        $('img', box).alt = img.alt;
        box.showModal();
      });
    });
  }

  // Dialogs: close button and backdrop click
  $$('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.closest('[data-close]')) d.close();
    });
  });

  // Enquiry form: static site, so compose an email in the visitor's mail app
  var form = $('#enquiry');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(form), lines = [];
      $$('[name]', form).forEach(function (el) {
        var label = $('label[for="' + el.id + '"]', form).textContent.replace('*', '').trim();
        if (f.get(el.name)) lines.push(label + ': ' + f.get(el.name));
      });
      var subject = 'Website enquiry (' + f.get('type') + ') - ' + f.get('name');
      window.location.href = 'mailto:' + form.dataset.to +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(lines.join('\n'));
      $('.form__foot p', form).textContent = 'Your email app should now open with the message ready to send. If it does not, please write to ' + form.dataset.to + '.';
    });
  }

  var y = $('#year');
  if (y) y.textContent = new Date().getFullYear();
})();
